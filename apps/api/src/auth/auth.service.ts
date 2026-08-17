import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { ROLE_LABELS, ROLE_PERMISSIONS, USER_ROLES, type UserRole } from "@smeta/shared";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { DealerEntity } from "../dealers/entities/dealer.entity";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationOutboxEntity } from "../notifications/entities/notification-outbox.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { RequestRecipientEntity } from "../offers/entities/request-recipient.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { StoreEntity } from "../stores/entities/store.entity";
import { UserEntity } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { ConfirmBrowserLoginDto, CreateBrowserLoginDto } from "./dto/browser-login.dto";
import { TelegramExchangeDto } from "./dto/telegram-exchange.dto";
import { AuthLoginNonceEntity } from "./entities/auth-login-nonce.entity";
import { AuthSessionEntity } from "./entities/auth-session.entity";
import { TelegramUpdateEntity } from "./entities/telegram-update.entity";
import { TelegramBotService } from "../telegram/telegram-bot.service";

type TelegramInitUser = {
  first_name?: string;
  id: number | string;
  last_name?: string;
  username?: string;
};

type BotShortcut = "finance" | "notifications" | "orders" | "requests" | "support";

type TelegramProfile = {
  dealer: DealerEntity | null;
  roles: UserRole[];
  store: StoreEntity | null;
  telegramUserId: string;
  user: UserEntity;
};

export type AuthenticatedSession = {
  accountStatus: string;
  approvedRoles: UserRole[];
  displayName: string;
  permissions: string[];
  role: UserRole;
  roleLabel: string;
  source: string;
  userId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly sessionsRepository: Repository<AuthSessionEntity>,
    @InjectRepository(AuthLoginNonceEntity)
    private readonly loginNonceRepository: Repository<AuthLoginNonceEntity>,
    @InjectRepository(TelegramUpdateEntity)
    private readonly telegramUpdatesRepository: Repository<TelegramUpdateEntity>,
    @InjectRepository(MaterialRequestEntity)
    private readonly materialRequestsRepository: Repository<MaterialRequestEntity>,
    @InjectRepository(RequestRecipientEntity)
    private readonly requestRecipientsRepository: Repository<RequestRecipientEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly storeOffersRepository: Repository<StoreOfferEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(NotificationOutboxEntity)
    private readonly notificationsRepository: Repository<NotificationOutboxEntity>,
    @InjectRepository(FinanceLedgerEntity)
    private readonly financeLedgerRepository: Repository<FinanceLedgerEntity>,
    @InjectRepository(DealerEntity)
    private readonly dealersRepository: Repository<DealerEntity>,
    @InjectRepository(StoreEntity)
    private readonly storesRepository: Repository<StoreEntity>,
    private readonly auditService: AuditService,
    private readonly telegramBotService: TelegramBotService,
    private readonly usersService: UsersService
  ) {}

  async getSession(input: { role?: string; sessionToken?: string }) {
    if (input.sessionToken) {
      return this.verifySessionToken(input.sessionToken);
    }

    return this.getLocalPreviewSession(input.role);
  }

  getPermissionMatrix() {
    return USER_ROLES.map((role) => ({
      permissions: ROLE_PERMISSIONS[role],
      role,
      roleLabel: ROLE_LABELS[role]
    }));
  }

  async exchangeTelegramInitData(dto: TelegramExchangeDto) {
    const telegramUser = this.verifyTelegramInitData(dto.initData);
    const telegramUserId = String(telegramUser.id);
    const displayName = this.formatTelegramName(telegramUser);
    const user = await this.usersService.upsertTelegramUser({
      displayName,
      telegramUserId,
      telegramUsername: telegramUser.username ?? null
    });
    const role = this.resolveApprovedRole(user, dto.requestedRole);
    const session = this.toSession(user, role, "telegram_init_data");
    const { accessToken, expiresAt } = await this.createStoredSessionToken(user, session);

    await this.auditService.record({
      action: "auth.telegram_exchange_succeeded",
      actorId: user.id,
      actorRole: role,
      entityId: user.id,
      entityType: "user",
      metadata: {
        requestedRole: dto.requestedRole ?? null,
        telegramUserId,
        telegramUsername: telegramUser.username ?? null
      }
    });

    return {
      accessToken,
      expiresAt,
      session
    };
  }

  async createBrowserLogin(dto: CreateBrowserLoginDto) {
    const nonce = randomToken(32);
    const expiresAt = new Date(Date.now() + Number(process.env.BROWSER_LOGIN_NONCE_TTL_SECONDS ?? 180) * 1000);
    const login = await this.loginNonceRepository.save(
      this.loginNonceRepository.create({
        canceledAt: null,
        confirmedAt: null,
        confirmedRole: null,
        confirmedUser: null,
        consumedAt: null,
        expiresAt,
        nonceHash: this.hashToken(nonce),
        requestedRole: dto.requestedRole ?? null,
        status: "pending"
      })
    );
    const links = this.loginLinks(nonce);

    await this.auditService.record({
      action: "auth.browser_login_created",
      entityId: login.id,
      entityType: "auth_login_nonce",
      metadata: {
        expiresAt,
        requestedRole: dto.requestedRole ?? null
      }
    });

    return {
      appLink: links.appLink,
      deepLink: links.appLink,
      expiresAt,
      nonce,
      qrPayload: links.webLink,
      returnUrl: links.returnUrl,
      status: login.status
    };
  }

  async pollBrowserLogin(nonce: string) {
    const login = await this.findLoginNonce(nonce);

    if (this.loginExpired(login)) {
      login.status = "expired";
      await this.loginNonceRepository.save(login);
      return {
        status: "expired"
      };
    }

    if (login.canceledAt) {
      return {
        status: "canceled"
      };
    }

    if (login.consumedAt) {
      return {
        status: "consumed"
      };
    }

    if (!login.confirmedUser || !login.confirmedRole || login.status !== "confirmed") {
      return {
        status: "pending"
      };
    }

    const role = this.resolveApprovedRole(login.confirmedUser, login.confirmedRole as UserRole);
    const session = this.toSession(login.confirmedUser, role, "telegram_browser_login");
    const { accessToken, expiresAt } = await this.createStoredSessionToken(login.confirmedUser, session);

    login.status = "consumed";
    login.consumedAt = new Date();
    await this.loginNonceRepository.save(login);

    await this.auditService.record({
      action: "auth.browser_login_consumed",
      actorId: login.confirmedUser.id,
      actorRole: role,
      entityId: login.id,
      entityType: "auth_login_nonce"
    });

    return {
      accessToken,
      expiresAt,
      session,
      status: "authenticated"
    };
  }

  async cancelBrowserLogin(nonce: string) {
    const login = await this.findLoginNonce(nonce);

    if (!login.consumedAt) {
      login.canceledAt = new Date();
      login.status = "canceled";
      await this.loginNonceRepository.save(login);
    }

    return {
      status: login.status
    };
  }

  async confirmBrowserLogin(nonce: string, dto: ConfirmBrowserLoginDto) {
    const login = await this.findLoginNonce(nonce);

    if (this.loginExpired(login) || login.canceledAt || login.consumedAt) {
      throw new BadRequestException("Login nonce faol emas");
    }

    const telegramUser = dto.initData
      ? this.verifyTelegramInitData(dto.initData)
      : this.devTelegramUser(dto.telegramUserId, dto.displayName, dto.telegramUsername);
    const user = await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(telegramUser),
      telegramUserId: String(telegramUser.id),
      telegramUsername: telegramUser.username ?? null
    });
    const role = this.resolveApprovedRole(user, login.requestedRole as UserRole | undefined);

    login.confirmedAt = new Date();
    login.confirmedRole = role;
    login.confirmedUser = user;
    login.status = "confirmed";
    await this.loginNonceRepository.save(login);

    await this.auditService.record({
      action: "auth.browser_login_confirmed",
      actorId: user.id,
      actorRole: role,
      entityId: login.id,
      entityType: "auth_login_nonce",
      metadata: {
        telegramUserId: user.telegramUserId
      }
    });

    return {
      displayName: user.displayName,
      role,
      roleLabel: ROLE_LABELS[role],
      status: "confirmed"
    };
  }

  async processTelegramWebhook(update: unknown, secretToken?: string) {
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret && secretToken !== configuredSecret) {
      throw new UnauthorizedException("Telegram webhook secret noto'g'ri");
    }

    const normalized = update as {
      callback_query?: {
        data?: string;
        from?: TelegramInitUser;
        id?: string;
      };
      message?: {
        from?: TelegramInitUser;
        text?: string;
      };
      update_id?: number | string;
    };
    const updateId = normalized.update_id;

    if (updateId === undefined || updateId === null) {
      throw new BadRequestException("Telegram update_id topilmadi");
    }

    const existing = await this.telegramUpdatesRepository.findOne({
      where: {
        updateId: String(updateId)
      }
    });

    if (existing) {
      return {
        duplicate: true,
        ok: true,
        status: existing.status
      };
    }

    let eventType = "ignored";
    let status = "processed";
    let error: string | null = null;

    try {
      const text = normalized.message?.text ?? normalized.callback_query?.data ?? "";
      const from = normalized.message?.from ?? normalized.callback_query?.from;
      const loginNonce = this.extractLoginNonce(text);

      if (loginNonce && from) {
        const confirmation = await this.confirmBrowserLogin(loginNonce, {
          displayName: this.formatTelegramName(from),
          telegramUserId: String(from.id),
          telegramUsername: from.username
        });
        await this.sendLoginSuccessMessage(String(from.id), loginNonce, confirmation);
        eventType = "browser_login_confirmed";
      } else if (text.startsWith("/start") && from) {
        await this.sendWelcomeMessage(from, this.extractStartPayload(text));
        eventType = "start_message";
      } else if (text.startsWith("/menu") && from) {
        await this.sendWelcomeMessage(from, null);
        eventType = "role_menu";
      } else if (this.isBotCommand(text, "status") && from) {
        await this.sendStatusMessage(from);
        eventType = "status_message";
      } else if (this.isBotCommand(text, "requests") && from) {
        await this.sendShortcutMessage(from, "requests");
        eventType = "requests_shortcut";
      } else if (this.isBotCommand(text, "orders") && from) {
        await this.sendShortcutMessage(from, "orders");
        eventType = "orders_shortcut";
      } else if ((this.isBotCommand(text, "earnings") || this.isBotCommand(text, "finance")) && from) {
        await this.sendShortcutMessage(from, "finance");
        eventType = "finance_shortcut";
      } else if (this.isBotCommand(text, "notifications") && from) {
        await this.sendShortcutMessage(from, "notifications");
        eventType = "notifications_shortcut";
      } else if (this.isBotCommand(text, "support") && from) {
        await this.sendShortcutMessage(from, "support");
        eventType = "support_shortcut";
      } else if (this.isBotCommand(text, "apply_dealer") && from) {
        await this.sendApplicationGuide(from, "dealer");
        eventType = "dealer_application_guide";
      } else if (this.isBotCommand(text, "apply_store") && from) {
        await this.sendApplicationGuide(from, "store");
        eventType = "store_application_guide";
      } else if (this.isBotCommand(text, "help") && from) {
        await this.sendHelpMessage(from);
        eventType = "help_message";
      }
    } catch (webhookError) {
      status = "failed";
      error = webhookError instanceof Error ? webhookError.message : "Webhook processing failed";
    }

    await this.telegramUpdatesRepository.save(
      this.telegramUpdatesRepository.create({
        error,
        eventType,
        payload: update,
        status,
        updateId: String(updateId)
      })
    );

    return {
      eventType,
      ok: status === "processed",
      status
    };
  }

  async revokeSessionToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException("Sessiya tokeni topilmadi");
    }

    const session = await this.sessionsRepository.findOne({
      where: {
        tokenHash: this.hashToken(token)
      }
    });

    if (!session || session.revokedAt) {
      return {
        revoked: true
      };
    }

    session.revokedAt = new Date();
    await this.sessionsRepository.save(session);
    await this.auditService.record({
      action: "auth.session_revoked",
      actorId: session.user.id,
      actorRole: session.role,
      entityId: session.id,
      entityType: "auth_session"
    });

    return {
      revoked: true
    };
  }

  async revokeAllSessionsForUser(userId: string) {
    const sessions = await this.sessionsRepository.find({
      where: {
        user: {
          id: userId
        }
      }
    });

    const now = new Date();
    const activeSessions = sessions.filter((session) => !session.revokedAt);

    for (const session of activeSessions) {
      session.revokedAt = now;
    }

    await this.sessionsRepository.save(activeSessions);
    await this.auditService.record({
      action: "auth.user_sessions_revoked",
      entityId: userId,
      entityType: "user",
      metadata: {
        revokedCount: activeSessions.length
      }
    });

    return {
      revokedCount: activeSessions.length
    };
  }

  async switchRole(token: string | undefined, requestedRole: UserRole) {
    if (!token) {
      throw new UnauthorizedException("Sessiya tokeni topilmadi");
    }

    const currentSession = await this.verifySessionToken(token);

    if (!currentSession.userId) {
      throw new UnauthorizedException("Role switch uchun real user sessiyasi kerak");
    }

    const user = await this.usersService.findById(currentSession.userId);

    if (!user) {
      throw new UnauthorizedException("User topilmadi");
    }

    const role = this.resolveApprovedRole(user, requestedRole);
    const session = this.toSession(user, role, "role_switch");
    const { accessToken, expiresAt } = await this.createStoredSessionToken(user, session);

    await this.revokeSessionToken(token);
    await this.auditService.record({
      action: "auth.role_switched",
      actorId: user.id,
      actorRole: role,
      entityId: user.id,
      entityType: "user",
      metadata: {
        fromRole: currentSession.role,
        toRole: role
      }
    });

    return {
      accessToken,
      expiresAt,
      session
    };
  }

  verifyTelegramContext(token: string) {
    if (!token) {
      throw new BadRequestException("Telegram context tokeni majburiy");
    }

    try {
      return this.telegramBotService.verifyWebAppContext(token);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Telegram context noto'g'ri");
    }
  }

  async verifySessionToken(token: string): Promise<AuthenticatedSession> {
    const [payloadPart, signature] = token.split(".");

    if (!payloadPart || !signature) {
      throw new UnauthorizedException("Sessiya tokeni noto'g'ri");
    }

    const expectedSignature = this.signValue(payloadPart, this.sessionSecret());

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException("Sessiya tokeni imzosi noto'g'ri");
    }

    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as AuthenticatedSession & {
      exp: number;
    };

    if (Date.now() > payload.exp) {
      throw new UnauthorizedException("Sessiya muddati tugagan");
    }

    if (!USER_ROLES.includes(payload.role)) {
      throw new UnauthorizedException("Sessiya roli noto'g'ri");
    }

    if (payload.accountStatus !== "active") {
      throw new UnauthorizedException("Account faol emas");
    }

    const storedSession = await this.sessionsRepository.findOne({
      where: {
        tokenHash: this.hashToken(token)
      }
    });

    if (!storedSession || storedSession.revokedAt || storedSession.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Sessiya bekor qilingan yoki muddati tugagan");
    }

    return {
      accountStatus: payload.accountStatus,
      approvedRoles: payload.approvedRoles ?? [payload.role],
      displayName: payload.displayName,
      permissions: ROLE_PERMISSIONS[payload.role],
      role: payload.role,
      roleLabel: ROLE_LABELS[payload.role],
      source: payload.source,
      userId: payload.userId
    };
  }

  getLocalPreviewSession(role?: string): AuthenticatedSession {
    if (process.env.NODE_ENV !== "development" || process.env.ALLOW_LOCAL_ROLE_PREVIEW !== "true") {
      throw new UnauthorizedException("Sessiya topilmadi");
    }

    const currentRole = this.normalizeRole(role);

    return {
      accountStatus: "active",
      approvedRoles: USER_ROLES.map((item) => item),
      displayName: ROLE_LABELS[currentRole],
      permissions: ROLE_PERMISSIONS[currentRole],
      role: currentRole,
      roleLabel: ROLE_LABELS[currentRole],
      source: "local_role_preview",
      userId: null
    };
  }

  private verifyTelegramInitData(initData: string): TelegramInitUser {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new BadRequestException("TELEGRAM_BOT_TOKEN sozlanmagan");
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) {
      throw new UnauthorizedException("Telegram initData hash topilmadi");
    }

    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (!this.safeEqual(hash, expectedHash)) {
      throw new UnauthorizedException("Telegram initData imzosi noto'g'ri");
    }

    const authDate = Number(params.get("auth_date"));
    const maxAgeSeconds = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? "300");

    if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) {
      throw new UnauthorizedException("Telegram initData muddati o'tgan");
    }

    const rawUser = params.get("user");

    if (!rawUser) {
      throw new UnauthorizedException("Telegram user ma'lumoti topilmadi");
    }

    return JSON.parse(rawUser) as TelegramInitUser;
  }

  private devTelegramUser(telegramUserId?: string, displayName?: string, telegramUsername?: string | null): TelegramInitUser {
    if (process.env.NODE_ENV !== "development") {
      throw new UnauthorizedException("Bot login confirm faqat Telegram webhook yoki initData orqali bajariladi");
    }

    if (!telegramUserId) {
      throw new BadRequestException("telegramUserId majburiy");
    }

    return {
      first_name: displayName || `Telegram ${telegramUserId}`,
      id: telegramUserId,
      username: telegramUsername ?? undefined
    };
  }

  private resolveApprovedRole(user: UserEntity, requestedRole?: UserRole): UserRole {
    if (!user.active || user.status !== "active") {
      throw new UnauthorizedException("Account hali tasdiqlanmagan yoki faol emas");
    }

    const roles = this.normalizedRoles(user);
    const role = requestedRole && roles.includes(requestedRole) ? requestedRole : roles[0];

    if (!role) {
      throw new UnauthorizedException("Accountga tasdiqlangan rol biriktirilmagan");
    }

    return role;
  }

  private toSession(user: UserEntity, role: UserRole, source: string): AuthenticatedSession {
    return {
      accountStatus: user.status,
      approvedRoles: this.normalizedRoles(user),
      displayName: user.displayName,
      permissions: ROLE_PERMISSIONS[role],
      role,
      roleLabel: ROLE_LABELS[role],
      source,
      userId: user.id
    };
  }

  private async createStoredSessionToken(user: UserEntity, session: AuthenticatedSession) {
    const lifetimeSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? "900");
    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);
    const payload = Buffer.from(
      JSON.stringify({
        ...session,
        exp: expiresAt.getTime()
      })
    ).toString("base64url");
    const accessToken = `${payload}.${this.signValue(payload, this.sessionSecret())}`;

    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        expiresAt,
        revokedAt: null,
        role: session.role,
        source: session.source,
        tokenHash: this.hashToken(accessToken),
        user
      })
    );

    return {
      accessToken,
      expiresAt
    };
  }

  private sessionSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret || secret === "change-me-in-production") {
      if (process.env.NODE_ENV === "production") {
        throw new BadRequestException("JWT_ACCESS_SECRET production uchun sozlanmagan");
      }

      return "local-development-session-secret";
    }

    return secret;
  }

  private normalizedRoles(user: UserEntity): UserRole[] {
    const roles = user.roles?.length ? user.roles : [user.role];
    return roles.filter((role): role is UserRole => USER_ROLES.includes(role as UserRole));
  }

  private normalizeRole(role?: string): UserRole {
    return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "superadmin";
  }

  private formatTelegramName(user: TelegramInitUser) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return name || user.username || `Telegram ${user.id}`;
  }

  private async findLoginNonce(nonce: string) {
    const login = await this.loginNonceRepository.findOne({
      where: {
        nonceHash: this.hashToken(nonce)
      }
    });

    if (!login) {
      throw new BadRequestException("Login nonce topilmadi");
    }

    return login;
  }

  private loginExpired(login: AuthLoginNonceEntity) {
    return login.expiresAt.getTime() <= Date.now();
  }

  private loginLinks(nonce: string) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "smeta_market_bot";
    const payload = `login_${encodeURIComponent(nonce)}`;

    return {
      appLink: `tg://resolve?domain=${botUsername}&start=${payload}`,
      returnUrl: `${this.telegramWebAppUrl()}?loginNonce=${encodeURIComponent(nonce)}`,
      webLink: `https://t.me/${botUsername}?start=${payload}`
    };
  }

  private async sendLoginSuccessMessage(
    chatId: string,
    nonce: string,
    confirmation: {
      displayName: string;
      role: UserRole;
      roleLabel: string;
      status: string;
    }
  ) {
    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.loginSuccessButtons(nonce),
      chatId,
      text: `Muvaffaqiyatli kirdingiz.\n\nUser: ${confirmation.displayName}\nRol: ${confirmation.roleLabel}\n\nPlatformaga qaytish uchun tugmani bosing.`,
    });
  }

  private async sendWelcomeMessage(from: TelegramInitUser, startPayload: string | null) {
    const user = await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(from),
      role: "customer",
      telegramUserId: String(from.id),
      telegramUsername: from.username ?? null
    });
    const roles = this.normalizedRoles(user);

    if (startPayload?.startsWith("ref_")) {
      const referralCode = startPayload.replace(/^ref_/, "").trim();
      await this.telegramBotService.sendMessageIfConfigured({
        buttons: [
          [
            {
              text: "Referral orqali so'rov yuborish",
              url: this.telegramBotService.webAppLink({
                kind: "referral",
                ref: referralCode,
                role: "customer"
              })
            }
          ]
        ],
        chatId: String(from.id),
        text: `Referral havola qabul qilindi.\n\nKod: ${referralCode}\n\nMaterial so'rovini Web App ichida yuboring.`
      });
      return;
    }

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: [
        ...this.telegramBotService.buildMainMenu({
          roles,
          status: user.status
        }),
        ...this.telegramBotService.buildApplicationButtons()
      ],
      chatId: String(from.id),
      text: `${this.telegramBotService.roleStatusText({
        displayName: user.displayName,
        roles,
        status: user.status
      })}\n\nBuyruqlar:\n/status - profil holati\n/requests - so'rovlar va navbat\n/orders - buyurtmalar\n/earnings - usta/moliya\n/notifications - bildirishnomalar\n/support - yordam\n\nHar bir buyruq Telegram ichida qisqa dashboard beradi. Batafsil forma kerak bo'lgan joyda bot aniq keyingi qadamni aytadi.`
    });
  }

  private async sendStatusMessage(from: TelegramInitUser) {
    const user = await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(from),
      role: "customer",
      telegramUserId: String(from.id),
      telegramUsername: from.username ?? null
    });
    const roles = this.normalizedRoles(user);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles,
        status: user.status
      }),
      chatId: String(from.id),
      text: `${this.telegramBotService.roleStatusText({
        displayName: user.displayName,
        roles,
        status: user.status
      })}\n\nAgar rolingiz pending bo'lsa, admin tasdiqlagandan keyin mos bo'limlar ochiladi.`
    });
  }

  private async sendShortcutMessage(from: TelegramInitUser, shortcut: BotShortcut) {
    const profile = await this.telegramProfile(from);
    const textByShortcut: Record<BotShortcut, () => Promise<string>> = {
      finance: () => this.renderFinanceDashboard(profile),
      notifications: () => this.renderNotificationsDashboard(profile),
      orders: () => this.renderOrdersDashboard(profile),
      requests: () => this.renderRequestsDashboard(profile),
      support: () => this.renderSupportDashboard(profile)
    };

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      }),
      chatId: String(from.id),
      text: await textByShortcut[shortcut]()
    });
  }

  private async sendApplicationGuide(from: TelegramInitUser, kind: "dealer" | "store") {
    const profile = await this.telegramProfile(from);
    const text = kind === "dealer" ? this.dealerApplicationText(profile.dealer) : this.storeApplicationText(profile.store);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      }),
      chatId: String(from.id),
      text
    });
  }

  private dealerApplicationText(dealer: DealerEntity | null) {
    if (!dealer) {
      return "Usta/dealer arizasi botda boshlanadi.\n\nYuborish formati:\n/apply_dealer Ism Familiya | Hudud | Telefon | Brigada yoki kompaniya\n\nMisol:\n/apply_dealer Ali Valiyev | Namangan sh. | +998901234567 | Valiyev brigada";
    }

    return `Usta/dealer arizangiz topildi.\n\nNomi: ${dealer.displayName}\nHudud: ${dealer.region}\nHolat: ${dealer.status}\nReferral kod: ${dealer.referralCode}\n\nKeyingi tekshiruvlar:\n/requests - referral so'rovlar\n/earnings - reward va payout`;
  }

  private storeApplicationText(store: StoreEntity | null) {
    if (!store) {
      return "Do'kon arizasi botda boshlanadi.\n\nYuborish formati:\n/apply_store Do'kon nomi | Hududlar | Kategoriyalar | Telefon\n\nMisol:\n/apply_store Baraka Qurilish | Namangan sh., Chust | Qurilish materiallari, Elektrika | +998901234567";
    }

    return `Do'kon arizangiz topildi.\n\nDo'kon: ${store.name}\nHolat: ${store.status}\nHududlar: ${store.serviceRegions.join(", ")}\nKategoriyalar: ${store.categories.join(", ")}\n\nKeyingi tekshiruvlar:\n/requests - do'kon inbox\n/orders - buyurtmalar`;
  }

  private async sendHelpMessage(from: TelegramInitUser) {
    const profile = await this.telegramProfile(from);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      }),
      chatId: String(from.id),
      text:
        "Smeta Market bot buyruqlari:\n\n/status - profil, rollar va tasdiq holati\n/requests - so'rovlar dashboardi\n/orders - buyurtmalar dashboardi\n/earnings - usta reward yoki moliya\n/notifications - oxirgi outbox va delivery holati\n/support - dispute, xavf va yordam navbati\n/apply_dealer - usta arizasi yo'riqnomasi\n/apply_store - do'kon arizasi yo'riqnomasi\n\nBot link tashlab qo'yish uchun emas: har buyruq Telegram ichida real holatni qisqa va amaliy qilib chiqaradi."
    });
  }

  private async telegramProfile(from: TelegramInitUser): Promise<TelegramProfile> {
    const telegramUserId = String(from.id);
    const user = await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(from),
      role: "customer",
      telegramUserId,
      telegramUsername: from.username ?? null
    });
    const [dealer, store] = await Promise.all([
      this.dealersRepository.findOne({
        where: {
          telegramUserId
        }
      }),
      this.storesRepository.findOne({
        where: {
          telegramUserId
        }
      })
    ]);
    const roleSet = new Set<UserRole>(this.normalizedRoles(user));

    if (dealer) {
      roleSet.add("dealer");
    }

    if (store) {
      roleSet.add("store");
    }

    return {
      dealer,
      roles: [...roleSet].filter((role): role is UserRole => USER_ROLES.includes(role)),
      store,
      telegramUserId,
      user
    };
  }

  private async renderRequestsDashboard(profile: TelegramProfile) {
    if (this.hasAnyRole(profile, ["admin", "superadmin"])) {
      const requests = await this.materialRequestsRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 80
      });
      const queue = requests.filter((request) => ["submitted", "under_review", "correction_required", "disputed"].includes(request.status)).slice(0, 5);

      return [
        "So'rovlar dashboardi",
        "",
        `Jami oxirgi so'rovlar: ${requests.length}`,
        `Statuslar: ${this.statusCounts(requests)}`,
        "",
        queue.length ? "Admin e'tiboridagi oxirgi so'rovlar:" : "Admin e'tiborida turgan yangi so'rov yo'q.",
        ...queue.map((request) => `- ${request.publicCode}: ${request.customerName}, ${request.region}, ${request.category}, ${request.status}`),
        "",
        "Keyingi amallar: /orders - buyurtmalar, /notifications - outbox, /support - dispute navbati."
      ].join("\n");
    }

    if (profile.store) {
      const [recipients, offers] = await Promise.all([
        this.requestRecipientsRepository.find({
          order: {
            assignedAt: "DESC"
          },
          relations: {
            request: true
          },
          take: 50,
          where: {
            store: {
              id: profile.store.id
            }
          }
        }),
        this.storeOffersRepository.find({
          relations: {
            request: true
          },
          take: 50,
          where: {
            store: {
              id: profile.store.id
            }
          }
        })
      ]);
      const offeredRequestIds = new Set(offers.map((offer) => offer.request.id));
      const pending = recipients.filter((recipient) => !offeredRequestIds.has(recipient.request.id)).slice(0, 5);

      return [
        `${profile.store.name} uchun so'rovlar`,
        "",
        `Tayinlangan: ${recipients.length}`,
        `Taklif berilgan: ${offers.length}`,
        `Hali taklif kutilmoqda: ${pending.length}`,
        "",
        pending.length ? "Taklif kerak bo'lgan oxirgi so'rovlar:" : "Hozir taklif kutilayotgan yangi so'rov yo'q.",
        ...pending.map((recipient) => `- ${recipient.request.publicCode}: ${recipient.request.region}, ${recipient.request.category}, ${recipient.request.status}`),
        "",
        "Keyingi amallar: /orders - qabul/bajarish holati, /support - nizolar."
      ].join("\n");
    }

    if (profile.dealer) {
      const requests = await this.materialRequestsRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 50,
        where: {
          dealer: {
            id: profile.dealer.id
          }
        }
      });

      return [
        `${profile.dealer.displayName} referral so'rovlari`,
        "",
        `Referral kod: ${profile.dealer.referralCode}`,
        `Holat: ${profile.dealer.status}`,
        `Jami: ${requests.length}`,
        `Statuslar: ${this.statusCounts(requests)}`,
        "",
        requests.length ? "Oxirgi so'rovlar:" : "Hali referral orqali so'rov tushmagan.",
        ...requests.slice(0, 5).map((request) => `- ${request.publicCode}: ${request.region}, ${request.category}, ${request.status}`),
        "",
        "Keyingi amallar: /earnings - reward, /orders - yakunlangan orderlar."
      ].join("\n");
    }

    return [
      "Mijoz so'rovlari",
      "",
      "Bu Telegram profilingizga doimiy mijoz tarixi hali bog'lanmagan.",
      "Agar sizda secure request link bo'lsa, o'sha link orqali request ochiladi; bot esa /notifications orqali kelgan xabarlarni ko'rsatadi.",
      "",
      "Yangi so'rov uchun usta referral havolasi yoki /support orqali operator yordamini so'rang."
    ].join("\n");
  }

  private async renderOrdersDashboard(profile: TelegramProfile) {
    if (this.hasAnyRole(profile, ["admin", "superadmin"])) {
      const orders = await this.ordersRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 80
      });
      const active = orders.filter((order) => !["completed", "canceled"].includes(order.status)).slice(0, 5);

      return [
        "Buyurtmalar dashboardi",
        "",
        `Jami oxirgi orderlar: ${orders.length}`,
        `Statuslar: ${this.statusCounts(orders)}`,
        "",
        active.length ? "Faol orderlar:" : "Faol order yo'q.",
        ...active.map((order) => `- ${order.publicCode}: ${order.store.name}, ${this.formatMoney(order.acceptedAmountUzs)}, ${order.status}`),
        "",
        "Keyingi amallar: /support - disputed orderlar, /earnings - moliya ko'rinishi."
      ].join("\n");
    }

    if (profile.store) {
      const orders = await this.ordersRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 30,
        where: {
          store: {
            id: profile.store.id
          }
        }
      });
      const actionNeeded = orders.filter((order) => ["pending_store_acceptance", "delivered_pending_confirmation", "disputed"].includes(order.status));

      return [
        `${profile.store.name} buyurtmalari`,
        "",
        `Jami: ${orders.length}`,
        `E'tibor kerak: ${actionNeeded.length}`,
        `Statuslar: ${this.statusCounts(orders)}`,
        "",
        orders.length ? "Oxirgi buyurtmalar:" : "Hali buyurtma yo'q.",
        ...orders.slice(0, 5).map((order) => `- ${order.publicCode}: ${this.formatMoney(order.acceptedAmountUzs)}, ${order.status}`),
        "",
        "Qabul qilish, tayyorlash va yetkazish statuslari shu order navbatiga qarab yuritiladi."
      ].join("\n");
    }

    if (profile.dealer) {
      const orders = (
        await this.ordersRepository.find({
          order: {
            createdAt: "DESC"
          },
          relations: {
            request: {
              dealer: true
            }
          },
          take: 80
        })
      ).filter((order) => order.request.dealer?.id === profile.dealer?.id);

      return [
        `${profile.dealer.displayName} referral orderlari`,
        "",
        `Jami: ${orders.length}`,
        `Yakunlangan: ${orders.filter((order) => order.status === "completed").length}`,
        `Statuslar: ${this.statusCounts(orders)}`,
        "",
        orders.length ? "Oxirgi orderlar:" : "Hali referral order yo'q.",
        ...orders.slice(0, 5).map((order) => `- ${order.publicCode}: ${order.store.name}, ${this.formatMoney(order.acceptedAmountUzs)}, ${order.status}`)
      ].join("\n");
    }

    return "Buyurtmalar Telegram profilingizga hali bog'lanmagan. Agar order secure sahifadan yaratilgan bo'lsa, xabar kelganda /notifications ichida ko'rinadi.";
  }

  private async renderFinanceDashboard(profile: TelegramProfile) {
    if (this.hasAnyRole(profile, ["finance", "admin", "superadmin"])) {
      const ledgers = await this.financeLedgerRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 100
      });
      const remainingDebt = ledgers.reduce((sum, ledger) => sum + Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0), 0);
      const dealerReward = ledgers.reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);

      return [
        "Moliya dashboardi",
        "",
        `Ledgerlar: ${ledgers.length}`,
        `Qoldiq store qarzi: ${this.formatMoney(remainingDebt)}`,
        `Dealer reward jami: ${this.formatMoney(dealerReward)}`,
        `Statuslar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi ledgerlar:" : "Ledger yozuvi hali yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: ${ledger.order.publicCode}, qarz ${this.formatMoney(Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0))}, ${ledger.status}`)
      ].join("\n");
    }

    if (profile.dealer) {
      const ledgers = await this.financeLedgerRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 50,
        where: [
          {
            dealerId: profile.dealer.id
          },
          {
            dealerReferral: profile.dealer.displayName
          }
        ]
      });
      const reward = ledgers.reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);
      const payable = ledgers.filter((ledger) => ledger.status === "paid" || ledger.status === "partial_paid").reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);

      return [
        `${profile.dealer.displayName} reward dashboardi`,
        "",
        `Hisoblangan reward: ${this.formatMoney(reward)}`,
        `Payable taxmin: ${this.formatMoney(payable)}`,
        `Ledgerlar: ${ledgers.length}`,
        `Statuslar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi yozuvlar:" : "Reward ledger hali yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: reward ${this.formatMoney(ledger.dealerRewardUzs)}, ${ledger.status}`)
      ].join("\n");
    }

    if (profile.store) {
      const ledgers = (
        await this.financeLedgerRepository.find({
          order: {
            createdAt: "DESC"
          },
          take: 100
        })
      ).filter((ledger) => ledger.order.store.id === profile.store?.id);
      const remainingDebt = ledgers.reduce((sum, ledger) => sum + Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0), 0);

      return [
        `${profile.store.name} moliya holati`,
        "",
        `Ledgerlar: ${ledgers.length}`,
        `Qoldiq qarz: ${this.formatMoney(remainingDebt)}`,
        `Statuslar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi yozuvlar:" : "Hali finance ledger yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: ${this.formatMoney(Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0))}, ${ledger.status}`)
      ].join("\n");
    }

    return "Moliya bo'limi sizning Telegram profilingizga biriktirilmagan. Usta/dealer bo'lsangiz /apply_dealer holatini tekshiring yoki admin tasdiqini kuting.";
  }

  private async renderNotificationsDashboard(profile: TelegramProfile) {
    const latest = await this.notificationsRepository.find({
      order: {
        createdAt: "DESC"
      },
      take: this.hasAnyRole(profile, ["admin", "finance", "superadmin"]) ? 80 : 30
    });
    const visible = this.hasAnyRole(profile, ["admin", "finance", "superadmin"])
      ? latest
      : latest.filter((notification) => notification.recipientRef === profile.telegramUserId || profile.roles.includes(notification.recipientRole as UserRole));

    return [
      "Bildirishnomalar dashboardi",
      "",
      `Ko'rinadigan yozuvlar: ${visible.length}`,
      `Statuslar: ${this.statusCounts(visible)}`,
      "",
      visible.length ? "Oxirgi xabarlar:" : "Sizga bog'langan notification hozircha yo'q.",
      ...visible.slice(0, 7).map((notification) => `- ${notification.titleUz}: ${notification.status}, ${this.formatDate(notification.createdAt)}`),
      "",
      visible.some((notification) => notification.status === "failed" || notification.status === "dead_letter")
        ? "Diqqat: failed/dead_letter bor. Admin /support orqali delivery muammosini ko'radi."
        : "Delivery navbati normal ko'rinyapti."
    ].join("\n");
  }

  private async renderSupportDashboard(profile: TelegramProfile) {
    const [requests, orders, failedNotifications] = await Promise.all([
      this.materialRequestsRepository.find({
        order: {
          updatedAt: "DESC"
        },
        take: 80
      }),
      this.ordersRepository.find({
        order: {
          updatedAt: "DESC"
        },
        take: 80
      }),
      this.notificationsRepository.find({
        order: {
          updatedAt: "DESC"
        },
        take: 30,
        where: [
          {
            status: "failed"
          },
          {
            status: "dead_letter"
          }
        ]
      })
    ]);
    const disputedRequests = requests.filter((request) => request.status === "disputed");
    const disputedOrders = orders.filter((order) => order.status === "disputed");

    if (this.hasAnyRole(profile, ["admin", "superadmin"])) {
      return [
        "Support va dispute dashboardi",
        "",
        `Disputed requestlar: ${disputedRequests.length}`,
        `Disputed orderlar: ${disputedOrders.length}`,
        `Failed notificationlar: ${failedNotifications.length}`,
        "",
        disputedRequests.length || disputedOrders.length ? "E'tibor kerak:" : "Hozir katta support navbati yo'q.",
        ...disputedRequests.slice(0, 3).map((request) => `- Request ${request.publicCode}: ${request.customerName}, ${request.region}`),
        ...disputedOrders.slice(0, 3).map((order) => `- Order ${order.publicCode}: ${order.store.name}, ${order.status}`),
        "",
        "Tez tekshiruv: /requests, /orders, /notifications."
      ].join("\n");
    }

    return [
      "Yordam",
      "",
      "Muammo bo'lsa xabaringizda request/order kodi, telefon va qisqa sababni yozing.",
      "Masalan: REQ-00012 bo'yicha taklif ko'rinmayapti.",
      "",
      profile.store ? `Do'kon: ${profile.store.name}, holat: ${profile.store.status}` : null,
      profile.dealer ? `Usta: ${profile.dealer.displayName}, holat: ${profile.dealer.status}` : null,
      "",
      "Tez tekshiruv: /status, /requests, /orders, /notifications."
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  private hasAnyRole(profile: TelegramProfile, roles: string[]) {
    return profile.roles.some((role) => roles.includes(role));
  }

  private statusCounts(items: Array<{ status: string }>) {
    if (items.length === 0) {
      return "yo'q";
    }

    const counts = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `${status}: ${count}`)
      .join(", ");
  }

  private formatMoney(amount: number) {
    return `${new Intl.NumberFormat("uz-UZ").format(amount)} UZS`;
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Tashkent"
    }).format(date);
  }

  private webAppUrl() {
    return (process.env.WEB_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
  }

  private telegramWebAppUrl() {
    return (process.env.TELEGRAM_WEB_APP_URL ?? this.webAppUrl()).replace(/\/$/, "");
  }

  private extractLoginNonce(text: string) {
    const match = text.match(/^\/start\s+login_(\S+)$/) ?? text.match(/^\/login\s+(\S+)$/);
    return match?.[1] ?? null;
  }

  private extractStartPayload(text: string) {
    const match = text.match(/^\/start(?:\s+(\S+))?/);
    return match?.[1] ?? null;
  }

  private isBotCommand(text: string, command: string) {
    return new RegExp(`^/${command}(?:@\\w+)?(?:\\s|$)`, "i").test(text.trim());
  }

  private signValue(value: string, secret: string | Buffer) {
    return createHmac("sha256", secret).update(value).digest("base64url");
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}

function randomToken(bytes: number) {
  return randomBytes(bytes).toString("base64url");
}

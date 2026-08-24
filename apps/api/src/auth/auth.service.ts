import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { DEFAULT_STORE_COMMISSION_RATE, MATERIAL_CATEGORIES, ROLE_LABELS, ROLE_PERMISSIONS, USER_ROLES, type UserRole } from "@smeta/shared";
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
import { TelegramApplicationDraftEntity } from "./entities/telegram-application-draft.entity";
import { TelegramUpdateEntity } from "./entities/telegram-update.entity";
import { TelegramBotService } from "../telegram/telegram-bot.service";

type TelegramInitUser = {
  first_name?: string;
  id: number | string;
  last_name?: string;
  username?: string;
};

type BotShortcut = "finance" | "notifications" | "orders" | "requests" | "support";

type DealerApplicationInput = {
  companyName: string | null;
  displayName: string;
  phone: string;
  region: string;
};

type StoreApplicationInput = {
  categories: string[];
  name: string;
  phone: string;
  serviceRegions: string[];
};

type TelegramProfile = {
  dealer: DealerEntity | null;
  roles: UserRole[];
  store: StoreEntity | null;
  telegramUserId: string;
  user: UserEntity;
};

type ApplicationDraftStep = "displayName" | "region" | "phone" | "companyName" | "storeName" | "serviceRegions" | "categories";

const APPLICATION_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati"
];

const APPLICATION_CATEGORIES = MATERIAL_CATEGORIES.map((category) => String(category));

export type AuthenticatedSession = {
  accountStatus: string;
  approvedRoles: UserRole[];
  displayName: string;
  permissions: string[];
  role: UserRole;
  roleLabel: string;
  source: string;
  telegramUserId: string | null;
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
    @InjectRepository(TelegramApplicationDraftEntity)
    private readonly applicationDraftsRepository: Repository<TelegramApplicationDraftEntity>,
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
    const user = await this.syncTelegramOwnedRoles(
      await this.usersService.upsertTelegramUser({
        displayName,
        telegramUserId,
        telegramUsername: telegramUser.username ?? null
      })
    );
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
    const user = await this.syncTelegramOwnedRoles(
      await this.usersService.upsertTelegramUser({
        displayName: this.formatTelegramName(telegramUser),
        telegramUserId: String(telegramUser.id),
        telegramUsername: telegramUser.username ?? null
      })
    );
    let role: UserRole;

    try {
      role = this.resolveApprovedRole(user, login.requestedRole as UserRole | undefined);
    } catch (roleError) {
      login.canceledAt = new Date();
      login.status = "canceled";
      await this.loginNonceRepository.save(login);
      await this.auditService.record({
        action: "auth.browser_login_rejected",
        actorId: user.id,
        actorRole: user.role,
        entityId: login.id,
        entityType: "auth_login_nonce",
        metadata: {
          reason: roleError instanceof Error ? roleError.message : "Role tasdiqlanmagan",
          requestedRole: login.requestedRole,
          telegramUserId: user.telegramUserId
        }
      });
      throw roleError;
    }

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
        contact?: {
          phone_number?: string;
          user_id?: number | string;
        };
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
      const text = (normalized.message?.text ?? normalized.callback_query?.data ?? "").trim();
      const contactPhone = normalized.message?.contact?.phone_number?.trim() ?? "";
      const from = normalized.message?.from ?? normalized.callback_query?.from;
      const loginNonce = this.extractLoginNonce(text);

      if (this.isBotCommand(text, "cancel") && from) {
        eventType = await this.cancelApplicationDraft(from);
      } else if (loginNonce && from) {
        try {
          const confirmation = await this.confirmBrowserLogin(loginNonce, {
            displayName: this.formatTelegramName(from),
            telegramUserId: String(from.id),
            telegramUsername: from.username
          });
          await this.sendLoginSuccessMessage(String(from.id), loginNonce, confirmation);
          eventType = "browser_login_confirmed";
        } catch (loginError) {
          await this.sendLoginRejectedMessage(String(from.id), loginError instanceof Error ? loginError.message : "Login tasdiqlanmadi");
          eventType = "browser_login_rejected";
        }
      } else if (from && (contactPhone || text.startsWith("draft:") || (text && !text.startsWith("/"))) && (await this.hasActiveApplicationDraft(from))) {
        eventType = await this.handleApplicationDraftAnswer(from, contactPhone || text, Boolean(contactPhone));
      } else if (this.isBotCommand(text, "start") && from) {
        await this.sendWelcomeMessage(from, this.extractStartPayload(text));
        eventType = "start_message";
      } else if (this.isBotCommand(text, "menu") && from) {
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
        eventType = await this.handleDealerApplication(from, text);
      } else if (this.isBotCommand(text, "apply_store") && from) {
        eventType = await this.handleStoreApplication(from, text);
      } else if (this.isBotCommand(text, "help") && from) {
        await this.sendHelpMessage(from);
        eventType = "help_message";
      } else if (from && text) {
        await this.sendUnknownCommandMessage(from);
        eventType = "unknown_command";
      }

      await this.telegramBotService.answerCallbackQueryIfConfigured(normalized.callback_query?.id);
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
      relations: {
        user: true
      },
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
      telegramUserId: payload.telegramUserId ?? storedSession.user?.telegramUserId ?? null,
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
      telegramUserId: null,
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

    if (requestedRole && !roles.includes(requestedRole)) {
      const roleLabel = ROLE_LABELS[requestedRole];
      throw new UnauthorizedException(
        `${roleLabel} huquqi profilingizga hali biriktirilmagan. ${requestedRole === "dealer" || requestedRole === "store" ? "Avval ariza yuboring va tasdiqni kuting." : "Bu huquqni superadmin beradi."}`
      );
    }

    const role = requestedRole ?? roles[0];

    if (!role) {
      throw new UnauthorizedException("Accountga tasdiqlangan rol biriktirilmagan");
    }

    return role;
  }

  private async syncTelegramOwnedRoles(user: UserEntity) {
    if (!user.telegramUserId) {
      return user;
    }

    let syncedUser = user;
    const [dealer, store] = await Promise.all([
      this.dealersRepository.findOne({
        where: {
          telegramUserId: user.telegramUserId
        }
      }),
      this.storesRepository.findOne({
        where: {
          telegramUserId: user.telegramUserId
        }
      })
    ]);

    if (dealer?.status === "approved") {
      syncedUser = (await this.usersService.addRoleByTelegramUserId(user.telegramUserId, "dealer")) ?? syncedUser;
    } else if (dealer) {
      syncedUser = (await this.usersService.removeRoleByTelegramUserId(user.telegramUserId, "dealer")) ?? syncedUser;
    }

    if (store?.status === "approved" && store.active) {
      syncedUser = (await this.usersService.addRoleByTelegramUserId(user.telegramUserId, "store")) ?? syncedUser;
    } else if (store) {
      syncedUser = (await this.usersService.removeRoleByTelegramUserId(user.telegramUserId, "store")) ?? syncedUser;
    }

    return syncedUser;
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
      telegramUserId: user.telegramUserId,
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
    const roles = [user.role, ...(user.roles?.length ? user.roles : [])].filter(Boolean);
    const normalized = roles.filter((role): role is UserRole => USER_ROLES.includes(role as UserRole));
    return Array.from(new Set(normalized));
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
      text: [
        "Kirish tasdiqlandi.",
        "",
        `Profil: ${confirmation.displayName}`,
        `Rol: ${confirmation.roleLabel}`,
        "",
        "Brauzerdagi sessiya ochildi. Davom etish uchun platformaga qayting."
      ].join("\n"),
    });
  }

  private async sendLoginRejectedMessage(chatId: string, message: string) {
    const internalRole = message.includes("superadmin beradi");

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: internalRole ? this.telegramBotService.buildProfileHelpButtons() : this.telegramBotService.buildApplicationHelpButtons(),
      chatId,
      text: internalRole
        ? `${message}\n\nBu rol uchun botda ochiq ariza yo'q. Superadmin saytdagi Xavfsizlik bo'limidan foydalanuvchiga rol biriktiradi.`
        : `${message}\n\nDo'kon yoki usta sifatida ishlash uchun ariza yuboring. Admin tasdiqlagandan keyin qayta login qiling.`
    });
  }

  private async sendWelcomeMessage(from: TelegramInitUser, startPayload: string | null) {
    await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(from),
      role: "customer",
      telegramUserId: String(from.id),
      telegramUsername: from.username ?? null
    });

    if (startPayload?.startsWith("ref_")) {
      const referralCode = startPayload.replace(/^ref_/, "").trim();
      await this.telegramBotService.sendMessageIfConfigured({
        buttons: [
          [
            {
              text: "Material ro'yxatini yuborish",
              url: this.telegramBotService.webAppLink({
                kind: "referral",
                ref: referralCode,
                role: "customer"
              })
            }
          ]
        ],
        chatId: String(from.id),
        text: [
          "Referral havola qabul qilindi.",
          "",
          `Kod: ${referralCode}`,
          "",
          "Material ro'yxati rasm, PDF yoki Excel fayl bo'lishi mumkin. Kontakt va aniq manzil faqat g'olib do'kon tasdiqlangandan keyin ochiladi."
        ].join("\n")
      });
      return;
    }

    const profile = await this.telegramProfile(from);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: [
        ...this.telegramBotService.buildMainMenu({
          roles: profile.roles,
          status: profile.user.status
        }),
        ...this.telegramBotService.buildApplicationButtons()
      ],
      chatId: String(from.id),
      text: `${this.telegramBotService.roleStatusText({
        displayName: profile.user.displayName,
        roles: profile.roles,
        status: profile.user.status
      })}\n\nBu bot login, ariza va muhim xabarlar uchun rasmiy kanal. Asosiy ishlar Mini App ichida bajariladi.\n\nUsta yoki do'kon sifatida ishlash uchun ariza yuboring. Admin tasdiqlagandan keyin mos kabinet ochiladi.`
    });
  }

  private async sendStatusMessage(from: TelegramInitUser) {
    const profile = await this.telegramProfile(from);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      }),
      chatId: String(from.id),
      text: `${this.telegramBotService.roleStatusText({
        displayName: profile.user.displayName,
        roles: profile.roles,
        status: profile.user.status
      })}\n\nTasdiqlangan rollar Mini App ichida alohida ruxsat bilan ishlaydi. Ariza tekshiruvda bo'lsa, admin qaroridan keyin tegishli kabinet avtomatik ochiladi.`
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
      buttons: this.shortcutButtons(profile, shortcut),
      chatId: String(from.id),
      text: await textByShortcut[shortcut]()
    });
  }

  private async sendApplicationGuide(from: TelegramInitUser, kind: "dealer" | "store") {
    const profile = await this.telegramProfile(from);
    const text = kind === "dealer" ? this.dealerApplicationText(profile.dealer) : this.storeApplicationText(profile.store);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildApplicationHelpButtons(),
      chatId: String(from.id),
      text
    });
  }

  private async handleDealerApplication(from: TelegramInitUser, text: string) {
    const profile = await this.telegramProfile(from);
    const body = this.commandBody(text, "apply_dealer");
    const parsed = this.parseDealerApplication(text);

    if (profile.dealer) {
      await this.sendApplicationGuide(from, "dealer");
      return "dealer_application_guide";
    }

    if (!body || !parsed) {
      await this.startApplicationDraft(profile, "dealer");
      return "dealer_application_started";
    }

    return this.createDealerApplication(profile, parsed);
  }

  private async createDealerApplication(profile: TelegramProfile, parsed: DealerApplicationInput) {
    const dealer = this.dealersRepository.create({
      adminNote: "Telegram bot orqali yuborilgan ariza admin tekshiruvini kutmoqda",
      companyName: parsed.companyName,
      displayName: parsed.displayName,
      phone: parsed.phone,
      referralActive: false,
      referralCode: await this.generateDealerReferralCode(parsed.displayName),
      region: parsed.region,
      status: "pending",
      telegramUserId: profile.telegramUserId
    });
    const saved = await this.dealersRepository.save(dealer);

    await this.auditService.record({
      action: "dealer.application_created_from_bot",
      actorId: profile.user.id,
      actorRole: "customer",
      entityId: saved.id,
      entityType: "dealer",
      metadata: {
        displayName: saved.displayName,
        referralCode: saved.referralCode,
        region: saved.region,
        telegramUserId: profile.telegramUserId
      }
    });

    await this.enqueueAdminNotification({
      bodyUz: `${saved.displayName} ${saved.region} hududidan Telegram bot orqali usta arizasini yubordi.`,
      eventType: "dealer.application_created",
      metadata: {
        dealerId: saved.id,
        referralCode: saved.referralCode,
        source: "telegram_bot"
      },
      titleUz: "Yangi usta arizasi"
    });

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildApplicationHelpButtons(),
      chatId: profile.telegramUserId,
      text: `Usta arizangiz qabul qilindi.\n\nHolat: Admin tekshiruvida\nIsm: ${saved.displayName}\nHudud: ${saved.region}\nTelefon: ${saved.phone}\nReferral kod: ${saved.referralCode}\n\nAdmin tasdiqlagandan keyin usta kabineti va referral havola ochiladi.`
    });

    return "dealer_application_created";
  }

  private async handleStoreApplication(from: TelegramInitUser, text: string) {
    const profile = await this.telegramProfile(from);
    const body = this.commandBody(text, "apply_store");
    const parsed = this.parseStoreApplication(text);

    if (profile.store && profile.store.status !== "rejected") {
      await this.sendApplicationGuide(from, "store");
      return "store_application_guide";
    }

    if (!body || !parsed) {
      await this.startApplicationDraft(profile, "store");
      return "store_application_started";
    }

    return this.createStoreApplication(profile, parsed);
  }

  private async createStoreApplication(profile: TelegramProfile, parsed: StoreApplicationInput) {
    const resubmittedStore = profile.store?.status === "rejected" ? profile.store : null;
    const store = resubmittedStore ?? this.storesRepository.create();

    Object.assign(store, {
      active: false,
      address: null,
      adminNote: resubmittedStore
        ? "Rad etilgan ariza Telegram bot orqali qayta yuborildi va admin tekshiruvini kutmoqda"
        : "Telegram bot orqali yuborilgan do'kon arizasi admin tekshiruvini kutmoqda",
      categories: parsed.categories,
      commissionRate: DEFAULT_STORE_COMMISSION_RATE,
      name: parsed.name,
      ownerName: profile.user.displayName,
      phone: parsed.phone,
      serviceRegions: parsed.serviceRegions,
      status: "pending",
      telegramUserId: profile.telegramUserId,
      verifiedAt: null
    });
    const saved = await this.storesRepository.save(store);

    await this.auditService.record({
      action: resubmittedStore ? "store.application_resubmitted_from_bot" : "store.application_created_from_bot",
      actorId: profile.user.id,
      actorRole: "customer",
      entityId: saved.id,
      entityType: "store",
      metadata: {
        categories: saved.categories,
        name: saved.name,
        regionCount: saved.serviceRegions.length,
        telegramUserId: profile.telegramUserId
      }
    });

    await this.enqueueAdminNotification({
      bodyUz: `${saved.name} do'koni Telegram bot orqali ariza yubordi. Hududlar: ${saved.serviceRegions.join(", ")}.`,
      eventType: "store.application_created",
      metadata: {
        source: "telegram_bot",
        storeId: saved.id
      },
      titleUz: "Yangi do'kon arizasi"
    });

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildApplicationHelpButtons(),
      chatId: profile.telegramUserId,
      text: `${resubmittedStore ? "Do'kon arizangiz qayta yuborildi." : "Do'kon arizangiz qabul qilindi."}\n\nHolat: Admin tekshiruvida\nDo'kon: ${saved.name}\nTelefon: ${saved.phone}\nHududlar: ${saved.serviceRegions.join(", ")}\nKategoriyalar: ${saved.categories.join(", ")}\n\nAdmin tasdiqlagandan keyin do'kon kabineti va so'rovlar ro'yxati ochiladi.`
    });

    return "store_application_created";
  }

  private async startApplicationDraft(profile: TelegramProfile, kind: "dealer" | "store") {
    const activeDraft = await this.findActiveApplicationDraft(profile.telegramUserId);

    if (activeDraft) {
      activeDraft.status = "canceled";
      await this.applicationDraftsRepository.save(activeDraft);
    }

    const step = kind === "dealer" ? "region" : "storeName";
    const draft = await this.applicationDraftsRepository.save(
      this.applicationDraftsRepository.create({
        data: kind === "dealer" ? { displayName: profile.user.displayName } : {},
        kind,
        status: "active",
        step,
        telegramUserId: profile.telegramUserId
      })
    );

    await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, `${kind === "dealer" ? "Usta" : "Do'kon"} arizasini boshladik.`);
  }

  private async handleApplicationDraftAnswer(from: TelegramInitUser, text: string, sharedContact = false) {
    const profile = await this.telegramProfile(from);
    const draft = await this.findActiveApplicationDraft(profile.telegramUserId);

    if (!draft) {
      await this.sendUnknownCommandMessage(from);
      return "unknown_command";
    }

    if (sharedContact && draft.step !== "phone") {
      await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Telefon raqamni keyingi bosqichda ulashasiz. Hozir quyidagi savolga javob bering.");
      return `${draft.kind}_application_step_invalid`;
    }

    if (draft.step === "categories" && draft.data.awaitingCustomCategory === true && !text.startsWith("draft:")) {
      const customCategory = text.trim();

      if (!this.isValidField(customCategory, 80)) {
        await this.telegramBotService.sendMessageIfConfigured({
          buttons: [
            [
              {
                callbackData: "/cancel",
                text: "Bekor qilish"
              }
            ]
          ],
          chatId: profile.telegramUserId,
          text: "Kategoriya nomi juda uzun yoki noto'g'ri. Qisqa nom yozing."
        });
        return `${draft.kind}_application_step_invalid`;
      }

      draft.data = {
        ...draft.data,
        awaitingCustomCategory: false,
        categories: [customCategory]
      };
      draft.step = this.nextApplicationDraftStep(draft.kind, draft.step) ?? draft.step;
      await this.applicationDraftsRepository.save(draft);
      await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, `"${customCategory}" kategoriyasi qabul qilindi.`);
      return `${draft.kind}_application_step_saved`;
    }

    const selectionHandled = await this.handleApplicationDraftSelection(profile, draft, text);

    if (selectionHandled) {
      return selectionHandled;
    }

    const accepted = this.acceptApplicationDraftAnswer(draft, text, sharedContact);

    if (!accepted.ok) {
      await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, accepted.message);
      return `${draft.kind}_application_step_invalid`;
    }

    draft.data = {
      ...draft.data,
      [draft.step]: accepted.value
    };
    const nextStep = this.nextApplicationDraftStep(draft.kind, draft.step);

    if (nextStep) {
      draft.step = nextStep;
      await this.applicationDraftsRepository.save(draft);

      if (sharedContact) {
        await this.telegramBotService.sendMessageIfConfigured({
          chatId: profile.telegramUserId,
          removeKeyboard: true,
          text: "Telefon raqam qabul qilindi."
        });
      }

      await this.sendApplicationDraftQuestion(profile.telegramUserId, draft);
      return `${draft.kind}_application_step_saved`;
    }

    draft.status = "completed";
    await this.applicationDraftsRepository.save(draft);

    if (sharedContact) {
      await this.telegramBotService.sendMessageIfConfigured({
        chatId: profile.telegramUserId,
        removeKeyboard: true,
        text: "Telefon raqam qabul qilindi."
      });
    }

    if (draft.kind === "dealer") {
      const data = draft.data as Partial<Record<ApplicationDraftStep, unknown>>;
      return this.createDealerApplication(profile, {
        companyName: String(data.companyName ?? ""),
        displayName: String(data.displayName ?? ""),
        phone: String(data.phone ?? ""),
        region: String(data.region ?? "")
      });
    }

    const data = draft.data as Partial<Record<ApplicationDraftStep, unknown>>;
    return this.createStoreApplication(profile, {
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      name: String(data.storeName ?? ""),
      phone: String(data.phone ?? ""),
      serviceRegions: Array.isArray(data.serviceRegions) ? data.serviceRegions.map(String) : []
    });
  }

  private async cancelApplicationDraft(from: TelegramInitUser) {
    const draft = await this.findActiveApplicationDraft(String(from.id));

    if (draft) {
      draft.status = "canceled";
      await this.applicationDraftsRepository.save(draft);
    }

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildApplicationHelpButtons(),
      chatId: String(from.id),
      text: draft ? "Ariza to'ldirish bekor qilindi." : "Hozir to'ldirilayotgan ariza yo'q."
    });

    return "application_draft_canceled";
  }

  private async hasActiveApplicationDraft(from: TelegramInitUser) {
    return Boolean(await this.findActiveApplicationDraft(String(from.id)));
  }

  private findActiveApplicationDraft(telegramUserId: string) {
    return this.applicationDraftsRepository.findOne({
      order: {
        updatedAt: "DESC"
      },
      where: {
        status: "active",
        telegramUserId
      }
    });
  }

  private async sendApplicationDraftQuestion(chatId: string, draft: TelegramApplicationDraftEntity, intro?: string) {
    const keyboard = this.applicationDraftKeyboard(draft);
    await this.telegramBotService.sendMessageIfConfigured({
      ...keyboard,
      chatId,
      text: [intro, this.applicationDraftQuestion(draft.kind, draft.step)].filter(Boolean).join("\n\n")
    });
  }

  private applicationDraftKeyboard(draft: TelegramApplicationDraftEntity) {
    if (draft.step === "phone") {
      return {
        replyKeyboard: [
          [
            {
              requestContact: true,
              text: "Telefon raqamni ulashish"
            }
          ],
          [
            {
              text: "/cancel"
            }
          ]
        ]
      };
    }

    if (draft.step === "region" || draft.step === "serviceRegions") {
      return {
        buttons: [
          ...APPLICATION_REGIONS.map((region, index) => [
            {
              callbackData: `draft:region:${index}`,
              text: region
            }
          ]),
          [
            {
              callbackData: "/cancel",
              text: "Bekor qilish"
            }
          ]
        ]
      };
    }

    if (draft.step === "categories") {
      return {
        buttons: [
          ...APPLICATION_CATEGORIES.map((category, index) => [
            {
              callbackData: `draft:category:${index}`,
              text: category
            }
          ]),
          [
            {
              callbackData: "draft:category_other",
              text: "Boshqa kategoriya"
            }
          ],
          [
            {
              callbackData: "/cancel",
              text: "Bekor qilish"
            }
          ]
        ]
      };
    }

    if (draft.step === "companyName") {
      return {
        buttons: [
          [
            {
              callbackData: "draft:skip",
              text: "O'tkazib yuborish"
            },
            {
              callbackData: "/cancel",
              text: "Bekor qilish"
            }
          ]
        ]
      };
    }

    return {
      buttons: this.telegramBotService.buildProfileHelpButtons()
    };
  }

  private async handleApplicationDraftSelection(profile: TelegramProfile, draft: TelegramApplicationDraftEntity, text: string) {
    if (!text.startsWith("draft:")) {
      return null;
    }

    if (text === "draft:skip" && draft.step === "companyName") {
      draft.data = {
        ...draft.data,
        companyName: null
      };
      draft.status = "completed";
      await this.applicationDraftsRepository.save(draft);

      return this.createDealerApplication(profile, {
        companyName: null,
        displayName: String(draft.data.displayName ?? profile.user.displayName),
        phone: String(draft.data.phone ?? ""),
        region: String(draft.data.region ?? "")
      });
    }

    if (text.startsWith("draft:region:")) {
      const region = APPLICATION_REGIONS[Number(text.split(":")[2])];

      if (!region) {
        await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Hudud topilmadi. Iltimos, ro'yxatdan tanlang.");
        return `${draft.kind}_application_step_invalid`;
      }

      if (draft.step === "region") {
        draft.data = {
          ...draft.data,
          region
        };
        draft.step = this.nextApplicationDraftStep(draft.kind, draft.step) ?? draft.step;
        await this.applicationDraftsRepository.save(draft);
        await this.sendApplicationDraftQuestion(profile.telegramUserId, draft);
        return `${draft.kind}_application_step_saved`;
      }

      if (draft.step === "serviceRegions") {
        draft.data = {
          ...draft.data,
          serviceRegions: [region]
        };
        draft.step = this.nextApplicationDraftStep(draft.kind, draft.step) ?? draft.step;
        await this.applicationDraftsRepository.save(draft);
        await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Hudud qabul qilindi.");
        return `${draft.kind}_application_step_saved`;
      }
    }

    if (text.startsWith("draft:category:") && draft.step === "categories") {
      const category = APPLICATION_CATEGORIES[Number(text.split(":")[2])];

      if (!category) {
        await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Kategoriya topilmadi. Iltimos, ro'yxatdan tanlang.");
        return `${draft.kind}_application_step_invalid`;
      }

      draft.data = {
        ...draft.data,
        awaitingCustomCategory: false,
        categories: [category]
      };
      draft.step = this.nextApplicationDraftStep(draft.kind, draft.step) ?? draft.step;
      await this.applicationDraftsRepository.save(draft);
      await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Kategoriya qabul qilindi.");
      return `${draft.kind}_application_step_saved`;
    }

    if (text === "draft:category_other" && draft.step === "categories") {
      draft.data = {
        ...draft.data,
        awaitingCustomCategory: true
      };
      await this.applicationDraftsRepository.save(draft);
      await this.telegramBotService.sendMessageIfConfigured({
        buttons: [
          [
            {
              callbackData: "/cancel",
              text: "Bekor qilish"
            }
          ]
        ],
        chatId: profile.telegramUserId,
        text: "Ro'yxatda yo'q kategoriya nomini yozing.\n\nMasalan: Temir mahsulotlari"
      });
      return `${draft.kind}_application_custom_category_started`;
    }

    await this.sendApplicationDraftQuestion(profile.telegramUserId, draft, "Bu tugma hozirgi bosqichga mos emas.");
    return `${draft.kind}_application_step_invalid`;
  }

  private acceptApplicationDraftAnswer(draft: TelegramApplicationDraftEntity, text: string, sharedContact = false) {
    const value = text.trim();

    if (!value) {
      return {
        message: "Bu maydon bo'sh bo'lmasligi kerak.",
        ok: false as const
      };
    }

    if (draft.step === "phone") {
      const phone = this.normalizePhone(value);

      if (!phone) {
        return {
          message: sharedContact ? "Kontakt ichida telefon raqam topilmadi." : "Telefon raqam noto'g'ri. Tugma orqali kontakt ulashing yoki +998901234567 ko'rinishida yuboring.",
          ok: false as const
        };
      }

      return {
        ok: true as const,
        value: phone
      };
    }

    if (draft.step === "serviceRegions" || draft.step === "categories") {
      return {
        message: draft.step === "categories" ? "Kategoriyani tugmalardan tanlang yoki \"Boshqa kategoriya\"ni bosing." : "Hududni tugmalardan tanlang.",
        ok: false as const
      };
    }

    if (!this.isValidField(value, 160)) {
      return {
        message: "Matn juda uzun. Iltimos, qisqaroq yozing.",
        ok: false as const
      };
    }

    return {
      ok: true as const,
      value
    };
  }

  private nextApplicationDraftStep(kind: "dealer" | "store", currentStep: string) {
    const steps = kind === "dealer" ? ["region", "phone", "companyName"] : ["storeName", "serviceRegions", "categories", "phone"];
    const index = steps.indexOf(currentStep);
    return index >= 0 ? steps[index + 1] : undefined;
  }

  private applicationDraftQuestion(kind: "dealer" | "store", step: string) {
    const steps = kind === "dealer" ? ["region", "phone", "companyName"] : ["storeName", "serviceRegions", "categories", "phone"];
    const index = Math.max(steps.indexOf(step), 0) + 1;
    const prefix = `${index}/${steps.length}.`;
    const cancelText = "\n\nBekor qilish uchun /cancel yozing.";
    const questions: Record<string, string> = {
      categories: `${prefix} Asosiy mahsulot kategoriyasini tanlang. Ro'yxatda yo'q bo'lsa, "Boshqa kategoriya"ni bosing.`,
      companyName: `${prefix} Brigada yoki kompaniya nomini yozing. Agar yo'q bo'lsa, "O'tkazib yuborish"ni bosing.`,
      phone: `${prefix} Telefon raqamni tugma orqali ulashing. Bu admin siz bilan bog'lanishi uchun kerak.`,
      region: `${prefix} Qaysi hududda ishlaysiz? Ro'yxatdan tanlang.`,
      serviceRegions: `${prefix} Asosiy xizmat hududini tanlang. Qo'shimcha hududlarni keyin admin do'kon profiliga qo'sha oladi.`,
      storeName: `${prefix} Do'kon nomini yozing.\nMasalan: Baraka Qurilish`
    };

    return `${questions[step] ?? "Ma'lumotni yozing."}${cancelText}`;
  }

  private dealerApplicationText(dealer: DealerEntity | null) {
    if (!dealer) {
      return [
        "Usta sifatida kirish uchun ariza topshiring.",
        "",
        "Bot ma'lumotlarni bosqichma-bosqich oladi:",
        "1. Hududni tugmadan tanlaysiz",
        "2. Telefon raqamni kontakt orqali ulashasiz",
        "3. Brigada yoki kompaniya nomini yozasiz yoki o'tkazib yuborasiz",
        "",
        "Ism Telegram profilingizdan olinadi. Ariza admin tekshiruviga tushadi. Tasdiqlangandan keyin usta kabineti ochiladi.",
        "",
        "Boshlash uchun pastdagi \"Usta bo'lish\" tugmasini bosing."
      ].join("\n");
    }

    return `Usta arizangiz mavjud.\n\nHolat: ${this.applicationStatusLabel(dealer.status)}\nIsm: ${dealer.displayName}\nHudud: ${dealer.region}\nReferral kod: ${dealer.referralCode}\n\n${this.applicationNextStepText(dealer.status, "usta")}`;
  }

  private storeApplicationText(store: StoreEntity | null) {
    if (!store) {
      return [
        "Do'kon sifatida kirish uchun ariza topshiring.",
        "",
        "Bot ma'lumotlarni bosqichma-bosqich oladi:",
        "1. Do'kon nomini yozasiz",
        "2. Asosiy xizmat hududini tugma orqali tanlaysiz",
        "3. Asosiy kategoriyani tugma orqali tanlaysiz. Mos kelmasa, \"Boshqa kategoriya\" orqali o'zingiz yozasiz",
        "4. Telefon raqamni kontakt orqali ulashasiz",
        "",
        "Ariza admin tekshiruviga tushadi. Tasdiqlangandan keyin do'kon kabineti ochiladi. Qo'shimcha hududlarni admin do'kon profiliga qo'shishi mumkin.",
        "",
        "Boshlash uchun pastdagi \"Do'kon bo'lish\" tugmasini bosing."
      ].join("\n");
    }

    return `Do'kon arizangiz mavjud.\n\nHolat: ${this.applicationStatusLabel(store.status)}\nDo'kon: ${store.name}\nHududlar: ${store.serviceRegions.join(", ")}\nKategoriyalar: ${store.categories.join(", ")}\n\n${this.applicationNextStepText(store.status, "do'kon")}`;
  }

  private applicationStatusLabel(status: string) {
    const labels: Record<string, string> = {
      accepted: "Qabul qilindi",
      active: "Faol",
      approved: "Tasdiqlangan",
      archived: "Arxivlangan",
      canceled: "Bekor qilingan",
      collecting_offers: "Takliflar yig'ilyapti",
      completed: "Yakunlangan",
      correction_required: "Tuzatish kerak",
      dead_letter: "Yuborib bo'lmadi",
      delivered_pending_confirmation: "Mijoz tasdiqlashi kerak",
      dispatched: "Yetkazishga chiqarildi",
      disputed: "Nizo ochilgan",
      expired: "Muddati o'tgan",
      failed: "Yuborilmadi",
      paid: "To'langan",
      partial_paid: "Qisman to'langan",
      pending: "Admin tekshiruvida",
      pending_store_acceptance: "Do'kon qabul qilishi kerak",
      preparing: "Tayyorlanmoqda",
      published: "Do'konlarga yuborilgan",
      ready: "Tayyor",
      rejected: "Rad etilgan",
      selected: "Tanlangan",
      selection_open: "Tanlash ochiq",
      sent: "Yuborildi",
      skipped: "O'tkazilgan",
      submitted: "Yuborilgan",
      suspended: "To'xtatilgan"
    };

    return labels[status] ?? status;
  }

  private applicationNextStepText(status: string, kind: "do'kon" | "usta") {
    if (status === "approved") {
      return kind === "do'kon"
        ? "Endi saytda Do'kon rolini tanlab Telegram orqali kiring."
        : "Endi saytda Usta rolini tanlab Telegram orqali kiring.";
    }

    if (status === "pending") {
      return "Hozir admin tekshiruvi kutilmoqda. Tasdiqlangandan keyin qayta login qiling.";
    }

    if (status === "rejected") {
      return kind === "do'kon"
        ? "Ariza rad etilgan. Yangi ma'lumot bilan qayta yuborish uchun pastdagi \"Do'kon arizasi\" tugmasini bosing."
        : "Ariza rad etilgan. Ma'lumotlarni tuzatib, admin bilan bog'laning yoki yordamga yozing.";
    }

    return "Rol vaqtincha faol emas. Yordam bo'limi orqali admin bilan bog'laning.";
  }

  private async sendHelpMessage(from: TelegramInitUser) {
    const profile = await this.telegramProfile(from);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      }),
      chatId: String(from.id),
      text: [
        "Smeta Market yordam markazi",
        "",
        "Botning vazifasi: loginni tasdiqlash, ariza qabul qilish va muhim ish holatlarini xabar qilish.",
        "",
        "Profil va ruxsatlar - tasdiqlangan rollaringiz.",
        "Mijoz so'rovlari - sizga tegishli material ro'yxatlari.",
        "Buyurtmalar - qabul, tayyorlash, yetkazish va yakunlash holati.",
        "Daromadim / Moliya - usta daromadi, do'kon qarzi yoki finance nazorati.",
        "Xabarlar - yuborilgan va kutilayotgan bildirishnomalar.",
        "",
        "Narxlar va maxfiy takliflar faqat ruxsatli rolga ko'rsatiladi. Muammo bo'lsa, so'rov yoki buyurtma kodini yozib yuboring."
      ].join("\n")
    });
  }

  private async sendUnknownCommandMessage(from: TelegramInitUser) {
    const profile = await this.telegramProfile(from);

    await this.telegramBotService.sendMessageIfConfigured({
      buttons: [
        ...this.telegramBotService.buildMainMenu({
          roles: profile.roles,
          status: profile.user.status
        }),
        ...this.telegramBotService.buildApplicationButtons()
      ],
      chatId: String(from.id),
      text: "Buyruq topilmadi.\n\nKerakli bo'limni pastdagi tugmalardan tanlang yoki /help orqali qisqa yo'riqnomani oching."
    });
  }

  private async telegramProfile(from: TelegramInitUser): Promise<TelegramProfile> {
    const telegramUserId = String(from.id);
    const user = await this.syncTelegramOwnedRoles(
      await this.usersService.upsertTelegramUser({
      displayName: this.formatTelegramName(from),
      role: "customer",
      telegramUserId,
      telegramUsername: from.username ?? null
      })
    );
    const [dealer, store] = await Promise.all([
      this.dealersRepository.findOne({
        where: {
          telegramUserId
        }
      }),
      this.storesRepository.findOne({
        order: {
          updatedAt: "DESC"
        },
        where: {
          telegramUserId
        }
      })
    ]);
    const roleSet = new Set<UserRole>(this.normalizedRoles(user));

    if (dealer?.status === "approved") {
      roleSet.add("dealer");
    } else if (dealer) {
      roleSet.delete("dealer");
    }

    if (store?.status === "approved" && store.active) {
      roleSet.add("store");
    } else if (store) {
      roleSet.delete("store");
    }
    const roles = [...roleSet].filter((role): role is UserRole => USER_ROLES.includes(role));

    return {
      dealer,
      roles: roles.length ? roles : ["customer"],
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
        "So'rovlar holati",
        "",
        `Oxirgi so'rovlar: ${requests.length}`,
        `Holatlar: ${this.statusCounts(requests)}`,
        "",
        queue.length ? "Tekshiruv kerak bo'lgan so'rovlar:" : "Hozir tekshiruv kutayotgan yangi so'rov yo'q.",
        ...queue.map((request) => `- ${request.publicCode}: ${request.customerName}, ${request.region}, ${request.category}, ${this.applicationStatusLabel(request.status)}`),
        "",
        "Batafsil boshqaruv uchun saytdagi Admin navbati bo'limini oching."
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
        ...pending.map((recipient) => `- ${recipient.request.publicCode}: ${recipient.request.region}, ${recipient.request.category}, ${this.applicationStatusLabel(recipient.request.status)}`),
        "",
        "Taklif berish uchun saytdagi Do'kon takliflari bo'limini oching."
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
        `${profile.dealer.displayName} mijoz so'rovlari`,
        "",
        `Referral kod: ${profile.dealer.referralCode}`,
        `Holat: ${this.applicationStatusLabel(profile.dealer.status)}`,
        `Jami: ${requests.length}`,
        `Holatlar: ${this.statusCounts(requests)}`,
        "",
        requests.length ? "Oxirgi so'rovlar:" : "Hali referral orqali so'rov tushmagan.",
        ...requests.slice(0, 5).map((request) => `- ${request.publicCode}: ${request.region}, ${request.category}, ${this.applicationStatusLabel(request.status)}`),
        "",
        "Daromad hisobini ko'rish uchun Daromadim bo'limini oching."
      ].join("\n");
    }

    return [
      "Mijoz so'rovlari",
      "",
      "Bu Telegram profilingizga doimiy mijoz tarixi hali bog'lanmagan.",
      "Agar sizga maxsus havola yuborilgan bo'lsa, so'rov o'sha havola orqali ochiladi.",
      "",
      "Yangi so'rov yuborish uchun usta havolasi orqali kiring yoki Yordam markaziga yozing."
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
        "Buyurtmalar holati",
        "",
        `Oxirgi buyurtmalar: ${orders.length}`,
        `Holatlar: ${this.statusCounts(orders)}`,
        "",
        active.length ? "Faol buyurtmalar:" : "Hozir faol buyurtma yo'q.",
        ...active.map((order) => `- ${order.publicCode}: ${order.store.name}, ${this.formatMoney(order.acceptedAmountUzs)}, ${this.applicationStatusLabel(order.status)}`),
        "",
        "Batafsil boshqaruv uchun saytdagi Buyurtmalar bo'limini oching."
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
        `Holatlar: ${this.statusCounts(orders)}`,
        "",
        orders.length ? "Oxirgi buyurtmalar:" : "Hali buyurtma yo'q.",
        ...orders.slice(0, 5).map((order) => `- ${order.publicCode}: ${this.formatMoney(order.acceptedAmountUzs)}, ${this.applicationStatusLabel(order.status)}`),
        "",
        "Qabul qilish, tayyorlash va yetkazish ishlari saytdagi Buyurtmalar bo'limida yuritiladi."
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
        `${profile.dealer.displayName} mijoz buyurtmalari`,
        "",
        `Jami: ${orders.length}`,
        `Yakunlangan: ${orders.filter((order) => order.status === "completed").length}`,
        `Holatlar: ${this.statusCounts(orders)}`,
        "",
        orders.length ? "Oxirgi buyurtmalar:" : "Hali referral orqali buyurtma yo'q.",
        ...orders.slice(0, 5).map((order) => `- ${order.publicCode}: ${order.store.name}, ${this.formatMoney(order.acceptedAmountUzs)}, ${this.applicationStatusLabel(order.status)}`)
      ].join("\n");
    }

    return "Buyurtmalar Telegram profilingizga hali bog'lanmagan. Buyurtma bo'yicha xabar kelganda Xabarlar bo'limida ko'rinadi.";
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
        "Moliya holati",
        "",
        `Hisob yozuvlari: ${ledgers.length}`,
        `Do'konlardan qoldiq qarz: ${this.formatMoney(remainingDebt)}`,
        `Ustalarga hisoblangan daromad: ${this.formatMoney(dealerReward)}`,
        `Holatlar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi yozuvlar:" : "Hali moliya yozuvi yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: ${ledger.order.publicCode}, qarz ${this.formatMoney(Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0))}, ${this.applicationStatusLabel(ledger.status)}`)
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
        `${profile.dealer.displayName} daromadi`,
        "",
        `Hisoblangan daromad: ${this.formatMoney(reward)}`,
        `To'lovga tayyor summa: ${this.formatMoney(payable)}`,
        `Hisob yozuvlari: ${ledgers.length}`,
        `Holatlar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi yozuvlar:" : "Hali daromad yozuvi yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: daromad ${this.formatMoney(ledger.dealerRewardUzs)}, ${this.applicationStatusLabel(ledger.status)}`)
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
        `Hisob yozuvlari: ${ledgers.length}`,
        `Qoldiq qarz: ${this.formatMoney(remainingDebt)}`,
        `Holatlar: ${this.statusCounts(ledgers)}`,
        "",
        ledgers.length ? "Oxirgi yozuvlar:" : "Hali moliya yozuvi yo'q.",
        ...ledgers.slice(0, 5).map((ledger) => `- ${ledger.publicCode}: ${this.formatMoney(Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0))}, ${this.applicationStatusLabel(ledger.status)}`)
      ].join("\n");
    }

    return "Moliya bo'limi profilingizga biriktirilmagan. Moliya huquqini faqat superadmin beradi.";
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
      "Xabarlar holati",
      "",
      `Sizga ko'rinadigan xabarlar: ${visible.length}`,
      `Holatlar: ${this.statusCounts(visible)}`,
      "",
      visible.length ? "Oxirgi xabarlar:" : "Sizga bog'langan xabar hozircha yo'q.",
      ...visible.slice(0, 7).map((notification) => `- ${notification.titleUz}: ${this.applicationStatusLabel(notification.status)}, ${this.formatDate(notification.createdAt)}`),
      "",
      visible.some((notification) => notification.status === "failed" || notification.status === "dead_letter")
        ? "Diqqat: ayrim xabarlar yuborilmagan. Admin Yordam markazi orqali tekshiradi."
        : "Xabar yuborish holati normal."
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
        "Yordam markazi",
        "",
        `Nizo ochilgan so'rovlar: ${disputedRequests.length}`,
        `Nizo ochilgan buyurtmalar: ${disputedOrders.length}`,
        `Yuborilmagan xabarlar: ${failedNotifications.length}`,
        "",
        disputedRequests.length || disputedOrders.length || failedNotifications.length ? "E'tibor kerak bo'lgan oxirgi holatlar:" : "Hozir shoshilinch murojaat yoki nizo yo'q.",
        ...disputedRequests.slice(0, 3).map((request) => `- So'rov ${request.publicCode}: ${request.customerName}, ${request.region}`),
        ...disputedOrders.slice(0, 3).map((order) => `- Buyurtma ${order.publicCode}: ${order.store.name}, ${this.applicationStatusLabel(order.status)}`),
        ...failedNotifications.slice(0, 3).map((notification) => `- Xabar: ${notification.titleUz}, ${this.applicationStatusLabel(notification.status)}`),
        "",
        "Batafsil ko'rish uchun saytdagi Admin navbati, Buyurtmalar yoki Xabarlar bo'limini oching."
      ].join("\n");
    }

    return [
      "Yordam markazi",
      "",
      "Muammo bo'lsa, bitta xabarda so'rov yoki buyurtma kodi, telefon raqam va qisqa sababni yozing.",
      "Masalan: REQ-00012 bo'yicha taklif ko'rinmayapti.",
      "",
      profile.store ? `Do'kon: ${profile.store.name}. Holat: ${this.applicationStatusLabel(profile.store.status)}.` : null,
      profile.dealer ? `Usta: ${profile.dealer.displayName}. Holat: ${this.applicationStatusLabel(profile.dealer.status)}.` : null,
      "",
      "Profil, so'rovlar va xabarlarni pastdagi tugmalar orqali tekshirishingiz mumkin."
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  }

  private shortcutButtons(profile: TelegramProfile, shortcut: BotShortcut) {
    const role = profile.roles[0] ?? "customer";
    const kindByShortcut: Record<BotShortcut, "request" | "order" | "finance" | "support" | "notifications"> = {
      finance: "finance",
      notifications: "notifications",
      orders: "order",
      requests: "request",
      support: "support"
    };
    const labelByShortcut: Record<BotShortcut, string> = {
      finance: "Moliya bo'limini ochish",
      notifications: "Xabarlarni ochish",
      orders: "Buyurtmalarni ochish",
      requests: profile.store ? "Do'kon so'rovlarini ochish" : profile.dealer ? "Usta so'rovlarini ochish" : "So'rovlarni ochish",
      support: "Yordam bo'limini ochish"
    };

    return [
      [
        {
          text: labelByShortcut[shortcut],
          url: this.telegramBotService.webAppLink({
            kind: kindByShortcut[shortcut],
            role
          })
        }
      ],
      ...this.telegramBotService.buildMainMenu({
        roles: profile.roles,
        status: profile.user.status
      })
    ];
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
      .map(([status, count]) => `${this.applicationStatusLabel(status)}: ${count}`)
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

  private parseDealerApplication(text: string): DealerApplicationInput | null {
    const body = this.commandBody(text, "apply_dealer");

    if (!body) {
      return null;
    }

    const parts = this.splitApplicationParts(body, 4);

    if (!parts) {
      return null;
    }

    const [displayName, region, rawPhone, companyName] = parts;
    const phone = this.normalizePhone(rawPhone);

    if (!this.isValidField(displayName, 120) || !this.isValidField(region, 120) || !phone || !this.isValidField(companyName, 120)) {
      return null;
    }

    return {
      companyName,
      displayName,
      phone,
      region
    };
  }

  private parseStoreApplication(text: string): StoreApplicationInput | null {
    const body = this.commandBody(text, "apply_store");

    if (!body) {
      return null;
    }

    const parts = this.splitApplicationParts(body, 4);

    if (!parts) {
      return null;
    }

    const [name, rawRegions, rawCategories, rawPhone] = parts;
    const serviceRegions = this.parseCommaList(rawRegions, 20);
    const categories = this.parseCommaList(rawCategories, 20);
    const phone = this.normalizePhone(rawPhone);

    if (!this.isValidField(name, 160) || serviceRegions.length === 0 || categories.length === 0 || !phone) {
      return null;
    }

    return {
      categories,
      name,
      phone,
      serviceRegions
    };
  }

  private commandBody(text: string, command: string) {
    const match = text.trim().match(new RegExp(`^/${command}(?:@\\w+)?(?:\\s+([\\s\\S]+))?$`, "i"));
    return match?.[1]?.trim() ?? null;
  }

  private splitApplicationParts(body: string, expectedCount: number) {
    const parts = body
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length === expectedCount ? parts : null;
  }

  private parseCommaList(value: string, maxItems: number) {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => this.isValidField(item, 120))
      )
    ].slice(0, maxItems);
  }

  private normalizePhone(value: string) {
    const normalized = value.replace(/[\s().-]/g, "");
    const digits = normalized.replace(/\D/g, "");

    if (digits.length === 9) {
      return `+998${digits}`;
    }

    if (digits.length === 10 && digits.startsWith("0")) {
      return `+998${digits.slice(1)}`;
    }

    if (digits.length === 12 && digits.startsWith("998")) {
      return `+${digits}`;
    }

    if (!/^\+?\d{9,15}$/.test(normalized) || digits.length < 9 || digits.length > 15) {
      return null;
    }

    return `+${digits}`;
  }

  private isValidField(value: string, maxLength: number) {
    return value.trim().length > 0 && value.trim().length <= maxLength;
  }

  private async generateDealerReferralCode(displayName: string) {
    const base =
      displayName
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .join("-")
        .toUpperCase()
        .replace(/_/g, "-")
        .slice(0, 18) || "USTA";

    for (let index = 1; index <= 20; index += 1) {
      const candidate = `${base}-${randomInt(1000, 10000)}`;
      const exists = await this.dealersRepository.exist({
        where: {
          referralCode: candidate
        }
      });

      if (!exists) {
        return candidate;
      }
    }

    return `USTA-${Date.now()}`;
  }

  private async enqueueAdminNotification(input: { bodyUz: string; eventType: string; metadata: Record<string, unknown>; titleUz: string }) {
    await this.notificationsRepository.save(
      this.notificationsRepository.create({
        bodyUz: input.bodyUz,
        channel: "web",
        eventType: input.eventType,
        metadata: input.metadata,
        recipientRef: null,
        recipientRole: "admin",
        scheduledAt: null,
        status: "pending",
        titleUz: input.titleUz
      })
    );
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

import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { RequirePermissions } from "./require-permissions.decorator";
import { AuthService } from "./auth.service";
import { ConfirmBrowserLoginDto, CreateBrowserLoginDto } from "./dto/browser-login.dto";
import { TelegramExchangeDto } from "./dto/telegram-exchange.dto";
import { SwitchRoleDto } from "./dto/switch-role.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  me(@Headers("x-smeta-role") role?: string, @Headers("x-smeta-session") sessionToken?: string) {
    return this.authService.getSession({
      role,
      sessionToken
    });
  }

  @Get("permissions")
  permissions() {
    return this.authService.getPermissionMatrix();
  }

  @Post("telegram/exchange")
  exchangeTelegram(@Body() dto: TelegramExchangeDto) {
    return this.authService.exchangeTelegramInitData(dto);
  }

  @Get("telegram/context")
  verifyTelegramContext(@Query("token") token: string) {
    return this.authService.verifyTelegramContext(token);
  }

  @Post("browser-login")
  createBrowserLogin(@Body() dto: CreateBrowserLoginDto) {
    return this.authService.createBrowserLogin(dto);
  }

  @Get("browser-login/:nonce")
  pollBrowserLogin(@Param("nonce") nonce: string) {
    return this.authService.pollBrowserLogin(nonce);
  }

  @Post("browser-login/:nonce/confirm")
  confirmBrowserLogin(@Param("nonce") nonce: string, @Body() dto: ConfirmBrowserLoginDto) {
    return this.authService.confirmBrowserLogin(nonce, dto);
  }

  @Post("browser-login/:nonce/cancel")
  cancelBrowserLogin(@Param("nonce") nonce: string) {
    return this.authService.cancelBrowserLogin(nonce);
  }

  @Post("telegram/webhook")
  telegramWebhook(@Headers("x-telegram-bot-api-secret-token") secretToken: string | undefined, @Body() update: unknown) {
    return this.authService.processTelegramWebhook(update, secretToken);
  }

  @Post("logout")
  logout(@Headers("x-smeta-session") sessionToken?: string) {
    return this.authService.revokeSessionToken(sessionToken);
  }

  @Post("switch-role")
  switchRole(@Headers("x-smeta-session") sessionToken: string | undefined, @Body() dto: SwitchRoleDto) {
    return this.authService.switchRole(sessionToken, dto.role);
  }

  @Post("users/:userId/revoke-sessions")
  @RequirePermissions("settings.manage")
  revokeAllSessions(@Param("userId") userId: string) {
    return this.authService.revokeAllSessionsForUser(userId);
  }
}

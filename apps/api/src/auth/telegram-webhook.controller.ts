import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("integrations/telegram")
export class TelegramWebhookController {
  constructor(private readonly authService: AuthService) {}

  @Post("webhook/:secret")
  webhookBySecret(@Param("secret") secret: string, @Body() update: unknown) {
    return this.authService.processTelegramWebhook(update, secret);
  }

  @Post("webhook")
  webhookByHeader(@Headers("x-telegram-bot-api-secret-token") secretToken: string | undefined, @Body() update: unknown) {
    return this.authService.processTelegramWebhook(update, secretToken);
  }
}

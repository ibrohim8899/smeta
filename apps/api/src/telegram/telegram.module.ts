import { Module } from "@nestjs/common";
import { TelegramBotService } from "./telegram-bot.service";

@Module({
  exports: [TelegramBotService],
  providers: [TelegramBotService]
})
export class TelegramModule {}

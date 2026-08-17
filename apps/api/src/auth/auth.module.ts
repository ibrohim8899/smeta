import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { DealerEntity } from "../dealers/entities/dealer.entity";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationOutboxEntity } from "../notifications/entities/notification-outbox.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { RequestRecipientEntity } from "../offers/entities/request-recipient.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { StoreEntity } from "../stores/entities/store.entity";
import { TelegramModule } from "../telegram/telegram.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthLoginNonceEntity } from "./entities/auth-login-nonce.entity";
import { AuthSessionEntity } from "./entities/auth-session.entity";
import { TelegramUpdateEntity } from "./entities/telegram-update.entity";
import { AuthService } from "./auth.service";
import { PermissionsGuard } from "./permissions.guard";
import { TelegramWebhookController } from "./telegram-webhook.controller";

@Module({
  controllers: [AuthController, TelegramWebhookController],
  exports: [AuthService],
  imports: [
    AuditModule,
    TelegramModule,
    TypeOrmModule.forFeature([
      AuthLoginNonceEntity,
      AuthSessionEntity,
      DealerEntity,
      FinanceLedgerEntity,
      MaterialRequestEntity,
      NotificationOutboxEntity,
      OrderEntity,
      RequestRecipientEntity,
      StoreEntity,
      StoreOfferEntity,
      TelegramUpdateEntity
    ]),
    UsersModule
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ]
})
export class AuthModule {}

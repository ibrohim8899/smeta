import "reflect-metadata";
import { DataSource } from "typeorm";
import { AuditLogEntity } from "./audit/entities/audit-log.entity";
import { AuthLoginNonceEntity } from "./auth/entities/auth-login-nonce.entity";
import { AuthSessionEntity } from "./auth/entities/auth-session.entity";
import { TelegramApplicationDraftEntity } from "./auth/entities/telegram-application-draft.entity";
import { TelegramUpdateEntity } from "./auth/entities/telegram-update.entity";
import { DealerEntity } from "./dealers/entities/dealer.entity";
import { FinanceAdjustmentEntity } from "./finance/entities/finance-adjustment.entity";
import { FinanceLedgerEntity } from "./finance/entities/finance-ledger.entity";
import { FinancePaymentEntity } from "./finance/entities/finance-payment.entity";
import { FinancePayoutEntity } from "./finance/entities/finance-payout.entity";
import { MaterialRequestEntity } from "./material-requests/entities/material-request.entity";
import { RequestAttachmentEntity } from "./material-requests/entities/request-attachment.entity";
import { NotificationOutboxEntity } from "./notifications/entities/notification-outbox.entity";
import { StoreOfferEntity } from "./offers/entities/store-offer.entity";
import { RequestRecipientEntity } from "./offers/entities/request-recipient.entity";
import { OrderEntity } from "./orders/entities/order.entity";
import { AppSettingEntity } from "./settings/entities/app-setting.entity";
import { StoreEntity } from "./stores/entities/store.entity";
import { UserEntity } from "./users/entities/user.entity";
import { InitialV1Schema2026081400010 } from "./migrations/202608140001-initial-v1-schema";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [
    AppSettingEntity,
    AuditLogEntity,
    AuthLoginNonceEntity,
    AuthSessionEntity,
    DealerEntity,
    FinanceAdjustmentEntity,
    FinanceLedgerEntity,
    FinancePaymentEntity,
    FinancePayoutEntity,
    MaterialRequestEntity,
    NotificationOutboxEntity,
    OrderEntity,
    RequestAttachmentEntity,
    RequestRecipientEntity,
    StoreEntity,
    StoreOfferEntity,
    TelegramApplicationDraftEntity,
    TelegramUpdateEntity,
    UserEntity
  ],
  migrations: [InitialV1Schema2026081400010],
  synchronize: false
});

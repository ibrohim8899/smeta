import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { StoresModule } from "../stores/stores.module";
import { RequestRecipientEntity } from "./entities/request-recipient.entity";
import { StoreOfferEntity } from "./entities/store-offer.entity";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";

@Module({
  controllers: [OffersController],
  imports: [AuditModule, NotificationsModule, StoresModule, TypeOrmModule.forFeature([MaterialRequestEntity, RequestRecipientEntity, StoreOfferEntity])],
  providers: [OffersService]
})
export class OffersModule {}

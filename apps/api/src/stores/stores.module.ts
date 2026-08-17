import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RequestRecipientEntity } from "../offers/entities/request-recipient.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { StoreEntity } from "./entities/store.entity";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  controllers: [StoresController],
  exports: [StoresService, TypeOrmModule],
  imports: [AuditModule, NotificationsModule, TypeOrmModule.forFeature([StoreEntity, RequestRecipientEntity, StoreOfferEntity])],
  providers: [StoresService]
})
export class StoresModule {}

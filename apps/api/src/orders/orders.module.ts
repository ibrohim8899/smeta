import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { FinanceModule } from "../finance/finance.module";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { OrderEntity } from "./entities/order.entity";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController],
  imports: [AuditModule, FinanceModule, NotificationsModule, TypeOrmModule.forFeature([MaterialRequestEntity, StoreOfferEntity, OrderEntity])],
  providers: [OrdersService]
})
export class OrdersModule {}

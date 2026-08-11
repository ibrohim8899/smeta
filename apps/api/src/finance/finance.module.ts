import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrderEntity } from "../orders/entities/order.entity";
import { FinanceLedgerEntity } from "./entities/finance-ledger.entity";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  controllers: [FinanceController],
  exports: [FinanceService],
  imports: [AuditModule, NotificationsModule, TypeOrmModule.forFeature([FinanceLedgerEntity, OrderEntity])],
  providers: [FinanceService]
})
export class FinanceModule {}

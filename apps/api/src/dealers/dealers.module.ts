import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { DealersController } from "./dealers.controller";
import { DealersService } from "./dealers.service";
import { DealerEntity } from "./entities/dealer.entity";

@Module({
  controllers: [DealersController],
  exports: [DealersService, TypeOrmModule],
  imports: [AuditModule, NotificationsModule, UsersModule, TypeOrmModule.forFeature([DealerEntity, FinanceLedgerEntity, MaterialRequestEntity])],
  providers: [DealersService]
})
export class DealersModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DealerEntity } from "../dealers/entities/dealer.entity";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { StoreEntity } from "../stores/entities/store.entity";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  imports: [TypeOrmModule.forFeature([DealerEntity, FinanceLedgerEntity, MaterialRequestEntity, OrderEntity, StoreEntity, StoreOfferEntity])],
  providers: [ReportsService]
})
export class ReportsModule {}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DealerEntity } from "../dealers/entities/dealer.entity";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { StoreEntity } from "../stores/entities/store.entity";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly offersRepository: Repository<StoreOfferEntity>,
    @InjectRepository(StoreEntity)
    private readonly storesRepository: Repository<StoreEntity>,
    @InjectRepository(DealerEntity)
    private readonly dealersRepository: Repository<DealerEntity>,
    @InjectRepository(FinanceLedgerEntity)
    private readonly ledgerRepository: Repository<FinanceLedgerEntity>
  ) {}

  async v1Summary() {
    const [requests, orders, offers, stores, dealers, ledgers] = await Promise.all([
      this.requestsRepository.find({
        order: {
          createdAt: "DESC"
        },
        relations: {
          dealer: true
        },
        take: 200
      }),
      this.ordersRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 200
      }),
      this.offersRepository.find({
        order: {
          createdAt: "DESC"
        },
        take: 200
      }),
      this.storesRepository.find(),
      this.dealersRepository.find(),
      this.ledgerRepository.find()
    ]);
    const financeTotals = ledgers.reduce(
      (accumulator, ledger) => ({
        dealerRewardUzs: accumulator.dealerRewardUzs + ledger.dealerRewardUzs,
        paidAmountUzs: accumulator.paidAmountUzs + ledger.paidAmountUzs,
        platformCommissionUzs: accumulator.platformCommissionUzs + ledger.platformCommissionUzs,
        platformNetUzs: accumulator.platformNetUzs + ledger.platformNetUzs,
        remainingDebtUzs: accumulator.remainingDebtUzs + Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0),
        storeDebtUzs: accumulator.storeDebtUzs + ledger.storeDebtUzs
      }),
      {
        dealerRewardUzs: 0,
        paidAmountUzs: 0,
        platformCommissionUzs: 0,
        platformNetUzs: 0,
        remainingDebtUzs: 0,
        storeDebtUzs: 0
      }
    );
    const disputes = [
      ...requests
        .filter((request) => request.status === "disputed")
        .map((request) => ({
          adminNote: request.adminNote,
          createdAt: request.createdAt,
          entity: "material_request",
          id: request.id,
          publicCode: request.publicCode,
          status: request.status
        })),
      ...orders
        .filter((order) => order.status === "disputed")
        .map((order) => ({
          adminNote: order.statusNote,
          createdAt: order.createdAt,
          entity: "order",
          id: order.id,
          publicCode: order.publicCode,
          status: order.status
        }))
    ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return {
      generatedAt: new Date(),
      counts: {
        activeStores: stores.filter((store) => store.active && store.status === "approved").length,
        approvedDealers: dealers.filter((dealer) => dealer.status === "approved" && dealer.referralActive).length,
        dealers: dealers.length,
        disputes: disputes.length,
        ledgers: ledgers.length,
        offers: offers.length,
        orders: orders.length,
        requests: requests.length,
        stores: stores.length
      },
      dealerStatusCounts: this.countBy(dealers, (dealer) => dealer.status),
      disputeQueue: disputes.slice(0, 50),
      financeTotals,
      offerStatusCounts: this.countBy(offers, (offer) => offer.status),
      orderStatusCounts: this.countBy(orders, (order) => order.status),
      requestStatusCounts: this.countBy(requests, (request) => request.status),
      storeStatusCounts: this.countBy(stores, (store) => store.status)
    };
  }

  async v1SummaryCsv() {
    const summary = await this.v1Summary();
    const rows = [
      ["section", "metric", "value"],
      ...Object.entries(summary.counts).map(([metric, value]) => ["counts", metric, String(value)]),
      ...Object.entries(summary.financeTotals).map(([metric, value]) => ["finance", metric, String(value)]),
      ...Object.entries(summary.requestStatusCounts).map(([metric, value]) => ["request_status", metric, String(value)]),
      ...Object.entries(summary.orderStatusCounts).map(([metric, value]) => ["order_status", metric, String(value)]),
      ...Object.entries(summary.offerStatusCounts).map(([metric, value]) => ["offer_status", metric, String(value)]),
      ...Object.entries(summary.storeStatusCounts).map(([metric, value]) => ["store_status", metric, String(value)]),
      ...Object.entries(summary.dealerStatusCounts).map(([metric, value]) => ["dealer_status", metric, String(value)])
    ];

    return rows.map((row) => row.map((cell) => this.csvCell(cell)).join(",")).join("\n");
  }

  private countBy<T>(items: T[], getKey: (item: T) => string) {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      const key = getKey(item);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }

  private csvCell(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
  }
}

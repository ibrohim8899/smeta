import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DEFAULT_DEALER_REWARD_RATE, DEFAULT_STORE_COMMISSION_RATE } from "@smeta/shared";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { FinanceLedgerEntity } from "./entities/finance-ledger.entity";

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceLedgerEntity)
    private readonly ledgerRepository: Repository<FinanceLedgerEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createSnapshotForOrder(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId
      }
    });

    if (!order) {
      throw new NotFoundException("Buyurtma topilmadi");
    }

    if (order.status !== "completed") {
      throw new BadRequestException("Ledger faqat yakunlangan buyurtma uchun yaratiladi");
    }

    const existingLedger = await this.ledgerRepository.findOne({
      where: {
        order: {
          id: order.id
        }
      }
    });

    if (existingLedger) {
      return this.toResponse(existingLedger);
    }

    const storeCommissionRate = Number(process.env.DEFAULT_STORE_COMMISSION_RATE ?? DEFAULT_STORE_COMMISSION_RATE);
    const dealerRewardRate = Number(process.env.DEFAULT_DEALER_REWARD_RATE ?? DEFAULT_DEALER_REWARD_RATE);
    const baseAmountUzs = order.acceptedAmountUzs;
    const platformCommissionUzs = Math.round(baseAmountUzs * storeCommissionRate);
    const dealerRewardUzs = order.request.dealerReferral ? Math.round(baseAmountUzs * dealerRewardRate) : 0;
    const platformNetUzs = platformCommissionUzs - dealerRewardUzs;

    const ledger = this.ledgerRepository.create({
      baseAmountUzs,
      dealerReferral: order.request.dealerReferral,
      dealerRewardRateBps: Math.round(dealerRewardRate * 10000),
      dealerRewardUzs,
      order,
      paidAmountUzs: 0,
      paymentNote: null,
      platformCommissionUzs,
      platformNetUzs,
      publicCode: await this.nextPublicCode(),
      status: "payable",
      storeCommissionRateBps: Math.round(storeCommissionRate * 10000),
      storeDebtUzs: platformCommissionUzs
    });

    const saved = await this.ledgerRepository.save(ledger);

    await this.auditService.record({
      action: "finance.snapshot_created",
      entityId: saved.id,
      entityType: "finance_ledger",
      metadata: {
        baseAmountUzs: saved.baseAmountUzs,
        platformCommissionUzs: saved.platformCommissionUzs,
        publicCode: saved.publicCode,
        storeDebtUzs: saved.storeDebtUzs
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.publicCode} bo'yicha do'kon qarzi ${saved.storeDebtUzs.toLocaleString("uz-UZ")} UZS qilib hisoblandi.`,
      eventType: "finance.snapshot_created",
      metadata: {
        ledgerId: saved.id,
        orderId: order.id,
        storeDebtUzs: saved.storeDebtUzs
      },
      recipientRole: "finance",
      titleUz: `Moliya yozuvi: ${saved.publicCode}`
    });

    return this.toResponse(saved);
  }

  async findAll() {
    const ledgers = await this.ledgerRepository.find({
      order: {
        createdAt: "DESC"
      },
      take: 100
    });

    return ledgers.map((ledger) => this.toResponse(ledger));
  }

  async summary() {
    const ledgers = await this.ledgerRepository.find();

    const totals = ledgers.reduce(
      (accumulator, ledger) => ({
        baseAmountUzs: accumulator.baseAmountUzs + ledger.baseAmountUzs,
        dealerRewardUzs: accumulator.dealerRewardUzs + ledger.dealerRewardUzs,
        paidAmountUzs: accumulator.paidAmountUzs + ledger.paidAmountUzs,
        platformCommissionUzs: accumulator.platformCommissionUzs + ledger.platformCommissionUzs,
        platformNetUzs: accumulator.platformNetUzs + ledger.platformNetUzs,
        storeDebtUzs: accumulator.storeDebtUzs + Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0)
      }),
      {
        baseAmountUzs: 0,
        dealerRewardUzs: 0,
        paidAmountUzs: 0,
        platformCommissionUzs: 0,
        platformNetUzs: 0,
        storeDebtUzs: 0
      }
    );

    return {
      ...totals,
      ledgerCount: ledgers.length,
      payableCount: ledgers.filter((ledger) => ledger.status === "payable" || ledger.status === "partial_paid").length,
      paidCount: ledgers.filter((ledger) => ledger.status === "paid").length
    };
  }

  async recordPayment(ledgerId: string, dto: RecordPaymentDto) {
    const ledger = await this.ledgerRepository.findOne({
      where: {
        id: ledgerId
      }
    });

    if (!ledger) {
      throw new NotFoundException("Ledger yozuvi topilmadi");
    }

    if (dto.amountUzs > ledger.storeDebtUzs - ledger.paidAmountUzs) {
      throw new BadRequestException("To'lov qoldiq qarzdan katta bo'lishi mumkin emas");
    }

    ledger.paidAmountUzs += dto.amountUzs;
    ledger.paymentNote = dto.note || ledger.paymentNote;
    ledger.status = ledger.paidAmountUzs >= ledger.storeDebtUzs ? "paid" : "partial_paid";

    const saved = await this.ledgerRepository.save(ledger);

    await this.auditService.record({
      action: "finance.payment_recorded",
      entityId: saved.id,
      entityType: "finance_ledger",
      metadata: {
        amountUzs: dto.amountUzs,
        paidAmountUzs: saved.paidAmountUzs,
        publicCode: saved.publicCode,
        status: saved.status
      },
      reason: dto.note ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.publicCode} bo'yicha ${dto.amountUzs.toLocaleString("uz-UZ")} UZS to'lov yozildi. Status: ${saved.status}.`,
      eventType: "finance.payment_recorded",
      metadata: {
        amountUzs: dto.amountUzs,
        ledgerId: saved.id,
        status: saved.status
      },
      recipientRole: "finance",
      titleUz: "To'lov yozildi"
    });

    return this.toResponse(saved);
  }

  private async nextPublicCode() {
    const count = await this.ledgerRepository.count();
    return `FIN-${String(count + 1).padStart(5, "0")}`;
  }

  private toResponse(ledger: FinanceLedgerEntity) {
    return {
      baseAmountUzs: ledger.baseAmountUzs,
      createdAt: ledger.createdAt,
      dealerReferral: ledger.dealerReferral,
      dealerRewardRateBps: ledger.dealerRewardRateBps,
      dealerRewardUzs: ledger.dealerRewardUzs,
      id: ledger.id,
      order: {
        id: ledger.order.id,
        publicCode: ledger.order.publicCode,
        requestPublicCode: ledger.order.request.publicCode,
        status: ledger.order.status
      },
      paidAmountUzs: ledger.paidAmountUzs,
      paymentNote: ledger.paymentNote,
      platformCommissionUzs: ledger.platformCommissionUzs,
      platformNetUzs: ledger.platformNetUzs,
      publicCode: ledger.publicCode,
      status: ledger.status,
      store: {
        id: ledger.order.store.id,
        name: ledger.order.store.name
      },
      storeCommissionRateBps: ledger.storeCommissionRateBps,
      storeDebtUzs: ledger.storeDebtUzs,
      updatedAt: ledger.updatedAt
    };
  }
}

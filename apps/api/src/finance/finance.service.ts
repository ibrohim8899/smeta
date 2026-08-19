import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DEFAULT_DEALER_REWARD_RATE, DEFAULT_STORE_COMMISSION_RATE } from "@smeta/shared";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { CreatePayoutDto } from "./dto/create-payout.dto";
import { RecordAdjustmentDto } from "./dto/record-adjustment.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { UpdatePayoutStatusDto } from "./dto/update-payout-status.dto";
import { FinanceAdjustmentEntity } from "./entities/finance-adjustment.entity";
import { FinanceLedgerEntity } from "./entities/finance-ledger.entity";
import { FinancePaymentEntity } from "./entities/finance-payment.entity";
import { FinancePayoutEntity } from "./entities/finance-payout.entity";

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceLedgerEntity)
    private readonly ledgerRepository: Repository<FinanceLedgerEntity>,
    @InjectRepository(FinancePaymentEntity)
    private readonly paymentsRepository: Repository<FinancePaymentEntity>,
    @InjectRepository(FinanceAdjustmentEntity)
    private readonly adjustmentsRepository: Repository<FinanceAdjustmentEntity>,
    @InjectRepository(FinancePayoutEntity)
    private readonly payoutsRepository: Repository<FinancePayoutEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createSnapshotForOrder(orderId: string) {
    const order = await this.ordersRepository.findOne({
      relations: {
        request: {
          dealer: true
        }
      },
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
      relations: {
        adjustments: true,
        payments: true
      },
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
    const baseAmountUzs = order.finalAmountUzs || order.acceptedAmountUzs;
    const platformCommissionUzs = Math.round(baseAmountUzs * storeCommissionRate);
    const dealerRewardUzs = order.request.dealerReferral ? Math.round(baseAmountUzs * dealerRewardRate) : 0;
    const platformNetUzs = platformCommissionUzs - dealerRewardUzs;

    const ledger = this.ledgerRepository.create({
      baseAmountUzs,
      dealerId: order.request.dealer?.id ?? null,
      dealerReferral: order.request.dealerReferral,
      dealerRewardRateBps: Math.round(dealerRewardRate * 10000),
      dealerRewardUzs,
      order,
      paidAmountUzs: 0,
      paymentNote: null,
      platformCommissionUzs,
      platformNetUzs,
      publicCode: await this.nextPublicCode(),
      dueAt: this.defaultDueAt(),
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
      relations: {
        adjustments: true,
        payments: true
      },
      take: 100
    });

    return ledgers.map((ledger) => this.toResponse(ledger));
  }

  async summary() {
    const ledgers = await this.ledgerRepository.find({
      relations: {
        adjustments: true,
        payments: true
      }
    });

    const totals = ledgers.reduce(
      (accumulator, ledger) => ({
        baseAmountUzs: accumulator.baseAmountUzs + ledger.baseAmountUzs,
        dealerPayableUzs: accumulator.dealerPayableUzs + this.dealerPayableForLedger(ledger),
        dealerRewardUzs: accumulator.dealerRewardUzs + ledger.dealerRewardUzs,
        overdueDebtUzs: accumulator.overdueDebtUzs + (this.isOverdue(ledger) ? this.remainingDebt(ledger) : 0),
        paidAmountUzs: accumulator.paidAmountUzs + ledger.paidAmountUzs,
        platformCommissionUzs: accumulator.platformCommissionUzs + ledger.platformCommissionUzs,
        platformNetUzs: accumulator.platformNetUzs + ledger.platformNetUzs,
        remainingDebtUzs: accumulator.remainingDebtUzs + this.remainingDebt(ledger),
        storeDebtUzs: accumulator.storeDebtUzs + ledger.storeDebtUzs
      }),
      {
        baseAmountUzs: 0,
        dealerPayableUzs: 0,
        dealerRewardUzs: 0,
        overdueDebtUzs: 0,
        paidAmountUzs: 0,
        platformCommissionUzs: 0,
        platformNetUzs: 0,
        remainingDebtUzs: 0,
        storeDebtUzs: 0
      }
    );

    return {
      ...totals,
      agingBuckets: this.agingBuckets(ledgers),
      ledgerCount: ledgers.length,
      payableCount: ledgers.filter((ledger) => ledger.status === "payable" || ledger.status === "partial_paid").length,
      paidCount: ledgers.filter((ledger) => ledger.status === "paid").length
    };
  }

  async recordPayment(ledgerId: string, dto: RecordPaymentDto) {
    const ledger = await this.ledgerRepository.findOne({
      relations: {
        payments: true
      },
      where: {
        id: ledgerId
      }
    });

    if (!ledger) {
      throw new NotFoundException("Ledger yozuvi topilmadi");
    }

    this.assertLedgerNotFrozen(ledger);
    const remainingDebtUzs = this.remainingDebt(ledger);

    if (ledger.status === "paid" || remainingDebtUzs <= 0) {
      throw new BadRequestException("Bu ledger bo'yicha qarz allaqachon yopilgan");
    }

    if (dto.amountUzs > remainingDebtUzs) {
      throw new BadRequestException("To'lov qoldiq qarzdan katta bo'lishi mumkin emas");
    }

    ledger.paidAmountUzs += dto.amountUzs;
    ledger.paymentNote = dto.note || ledger.paymentNote;
    ledger.status = this.statusForPayment(ledger.paidAmountUzs, ledger.storeDebtUzs);

    const saved = await this.ledgerRepository.save(ledger);
    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        amountUzs: dto.amountUzs,
        ledger: saved,
        method: dto.method || null,
        note: dto.note || null,
        proofFileName: dto.proofFileName || null,
        reference: dto.reference || null
      })
    );

    await this.auditService.record({
      action: "finance.payment_recorded",
      entityId: payment.id,
      entityType: "finance_payment",
      metadata: {
        amountUzs: dto.amountUzs,
        ledgerId: saved.id,
        method: dto.method ?? null,
        paidAmountUzs: saved.paidAmountUzs,
        proofFileName: dto.proofFileName ?? null,
        publicCode: saved.publicCode,
        reference: dto.reference ?? null,
        remainingDebtUzs: this.remainingDebt(saved),
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

    const reloaded = await this.ledgerRepository.findOne({
      relations: {
        adjustments: true,
        payments: true
      },
      where: {
        id: saved.id
      }
    });

    return this.toResponse(reloaded ?? saved);
  }

  async findPayments(ledgerId: string) {
    const ledger = await this.ledgerRepository.findOne({
      where: {
        id: ledgerId
      }
    });

    if (!ledger) {
      throw new NotFoundException("Ledger yozuvi topilmadi");
    }

    const payments = await this.paymentsRepository.find({
      order: {
        createdAt: "DESC"
      },
      where: {
        ledger: {
          id: ledger.id
        }
      }
    });

    return payments.map((payment) => this.toPaymentResponse(payment));
  }

  async recordAdjustment(ledgerId: string, dto: RecordAdjustmentDto) {
    const ledger = await this.ledgerRepository.findOne({
      relations: {
        adjustments: true,
        payments: true
      },
      where: {
        id: ledgerId
      }
    });

    if (!ledger) {
      throw new NotFoundException("Ledger yozuvi topilmadi");
    }

    this.assertLedgerNotFrozen(ledger);

    if (!dto.reason.trim()) {
      throw new BadRequestException("Adjustment sababi majburiy");
    }

    const nextDebt = ledger.storeDebtUzs + dto.amountUzs;

    if (nextDebt < ledger.paidAmountUzs) {
      throw new BadRequestException("Adjustment to'langan summadan past qarz yaratishi mumkin emas");
    }

    ledger.storeDebtUzs = nextDebt;
    ledger.platformCommissionUzs = nextDebt;
    ledger.platformNetUzs = nextDebt - ledger.dealerRewardUzs;
    ledger.status = this.statusForPayment(ledger.paidAmountUzs, ledger.storeDebtUzs);
    const saved = await this.ledgerRepository.save(ledger);

    const adjustment = await this.adjustmentsRepository.save(
      this.adjustmentsRepository.create({
        amountUzs: dto.amountUzs,
        ledger: saved,
        proofFileName: dto.proofFileName || null,
        reason: dto.reason.trim(),
        type: dto.type
      })
    );

    await this.auditService.record({
      action: "finance.adjustment_recorded",
      entityId: adjustment.id,
      entityType: "finance_adjustment",
      metadata: {
        amountUzs: dto.amountUzs,
        ledgerId: saved.id,
        publicCode: saved.publicCode,
        remainingDebtUzs: this.remainingDebt(saved),
        status: saved.status,
        type: dto.type
      },
      reason: dto.reason
    });

    const reloaded = await this.ledgerRepository.findOne({
      relations: {
        adjustments: true,
        payments: true
      },
      where: {
        id: saved.id
      }
    });

    return this.toResponse(reloaded ?? saved);
  }

  async storeStatement(storeId: string) {
    const ledgers = await this.ledgerRepository.find({
      relations: {
        adjustments: true,
        payments: true
      },
      where: {
        order: {
          store: {
            id: storeId
          }
        }
      }
    });

    return this.statementResponse(ledgers);
  }

  async dealerStatement(dealerId: string) {
    const [ledgers, payouts] = await Promise.all([
      this.ledgerRepository.find({
        relations: {
          adjustments: true,
          payments: true
        },
        where: {
          dealerId
        }
      }),
      this.payoutsRepository.find({
        order: {
          createdAt: "DESC"
        },
        where: {
          dealerId
        }
      })
    ]);

    const grossRewardUzs = ledgers.reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);
    const payableUzs = ledgers.reduce((sum, ledger) => sum + this.dealerPayableForLedger(ledger), 0);
    const paidPayoutUzs = payouts.filter((payout) => payout.status === "paid").reduce((sum, payout) => sum + payout.amountUzs, 0);
    const reservedPayoutUzs = payouts.filter((payout) => payout.status === "approved").reduce((sum, payout) => sum + payout.amountUzs, 0);

    return {
      dealerId,
      generatedAt: new Date(),
      grossRewardUzs,
      paidPayoutUzs,
      payableUzs,
      pendingPayoutUzs: reservedPayoutUzs,
      remainingPayableUzs: Math.max(payableUzs - paidPayoutUzs - reservedPayoutUzs, 0),
      payouts: payouts.map((payout) => this.toPayoutResponse(payout)),
      rows: ledgers.map((ledger) => this.toResponse(ledger))
    };
  }

  async findPayouts(dealerId?: string) {
    const payouts = await this.payoutsRepository.find({
      order: {
        createdAt: "DESC"
      },
      ...(dealerId
        ? {
            where: {
              dealerId
            }
          }
        : {})
    });

    return payouts.map((payout) => this.toPayoutResponse(payout));
  }

  async createPayout(dto: CreatePayoutDto) {
    const statement = await this.dealerStatement(dto.dealerId);

    if (dto.amountUzs > statement.remainingPayableUzs) {
      throw new BadRequestException("Payout payable qoldiqdan katta bo'lishi mumkin emas");
    }

    const dealerName = statement.rows.find((ledger) => ledger.dealerId === dto.dealerId)?.dealerReferral ?? null;
    const payout = await this.payoutsRepository.save(
      this.payoutsRepository.create({
        amountUzs: dto.amountUzs,
        dealerId: dto.dealerId,
        dealerName,
        method: dto.method || null,
        note: dto.note || null,
        paidAt: null,
        proofFileName: dto.proofFileName || null,
        publicCode: await this.nextPayoutPublicCode(),
        reference: dto.reference || null,
        status: "approved"
      })
    );

    await this.auditService.record({
      action: "finance.payout_created",
      entityId: payout.id,
      entityType: "finance_payout",
      metadata: {
        amountUzs: payout.amountUzs,
        dealerId: payout.dealerId,
        publicCode: payout.publicCode
      },
      reason: dto.note ?? null
    });

    return this.toPayoutResponse(payout);
  }

  async updatePayoutStatus(payoutId: string, dto: UpdatePayoutStatusDto) {
    const payout = await this.payoutsRepository.findOne({
      where: {
        id: payoutId
      }
    });

    if (!payout) {
      throw new NotFoundException("Payout topilmadi");
    }

    if (payout.status === "paid" && dto.status !== "paid") {
      throw new BadRequestException("Paid payout qayta ochilmaydi");
    }

    const previousStatus = payout.status;
    payout.status = dto.status;
    payout.reference = dto.reference || payout.reference;
    payout.proofFileName = dto.proofFileName || payout.proofFileName;
    payout.note = dto.note || payout.note;
    payout.paidAt = dto.status === "paid" ? payout.paidAt ?? new Date() : payout.paidAt;
    const saved = await this.payoutsRepository.save(payout);

    await this.auditService.record({
      action: "finance.payout_status_updated",
      entityId: saved.id,
      entityType: "finance_payout",
      metadata: {
        nextStatus: saved.status,
        previousStatus,
        publicCode: saved.publicCode
      },
      reason: dto.note ?? null
    });

    return this.toPayoutResponse(saved);
  }

  private async nextPublicCode() {
    const count = await this.ledgerRepository.count();
    return `FIN-${String(count + 1).padStart(5, "0")}`;
  }

  private async nextPayoutPublicCode() {
    const count = await this.payoutsRepository.count();
    return `PAY-${String(count + 1).padStart(5, "0")}`;
  }

  private toResponse(ledger: FinanceLedgerEntity) {
    const remainingDebtUzs = this.remainingDebt(ledger);

    return {
      baseAmountUzs: ledger.baseAmountUzs,
      createdAt: ledger.createdAt,
      adjustments: ledger.adjustments?.map((adjustment) => this.toAdjustmentResponse(adjustment)) ?? [],
      agingBucket: this.agingBucket(ledger),
      dealerId: ledger.dealerId,
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
      payments: ledger.payments?.map((payment) => this.toPaymentResponse(payment)) ?? [],
      platformCommissionUzs: ledger.platformCommissionUzs,
      platformNetUzs: ledger.platformNetUzs,
      publicCode: ledger.publicCode,
      remainingDebtUzs,
      status: ledger.status,
      store: {
        id: ledger.order.store.id,
        name: ledger.order.store.name
      },
      storeCommissionRateBps: ledger.storeCommissionRateBps,
      storeDebtUzs: ledger.storeDebtUzs,
      dueAt: ledger.dueAt,
      updatedAt: ledger.updatedAt
    };
  }

  private remainingDebt(ledger: FinanceLedgerEntity) {
    return Math.max(ledger.storeDebtUzs - ledger.paidAmountUzs, 0);
  }

  private statusForPayment(paidAmountUzs: number, storeDebtUzs: number) {
    if (paidAmountUzs <= 0) {
      return "payable";
    }

    return paidAmountUzs >= storeDebtUzs ? "paid" : "partial_paid";
  }

  private defaultDueAt() {
    const debtDueDays = Number(process.env.DEBT_DUE_DAYS ?? 7);
    return new Date(Date.now() + debtDueDays * 24 * 60 * 60 * 1000);
  }

  private assertLedgerNotFrozen(ledger: FinanceLedgerEntity) {
    if (ledger.status === "frozen" || ledger.order.status === "disputed" || ledger.order.request.status === "disputed") {
      throw new BadRequestException("Nizo holatidagi ledger settlement uchun muzlatilgan");
    }
  }

  private dealerPayableForLedger(ledger: FinanceLedgerEntity) {
    if (!ledger.dealerId || ledger.status === "frozen" || ledger.order.status === "disputed" || ledger.order.request.status === "disputed") {
      return 0;
    }

    if (ledger.storeDebtUzs <= 0) {
      return 0;
    }

    const paidRatio = Math.min(ledger.paidAmountUzs / ledger.storeDebtUzs, 1);
    return Math.floor(ledger.dealerRewardUzs * paidRatio);
  }

  private isOverdue(ledger: FinanceLedgerEntity) {
    return Boolean(ledger.dueAt && ledger.dueAt.getTime() < Date.now() && this.remainingDebt(ledger) > 0 && ledger.status !== "paid");
  }

  private agingBuckets(ledgers: FinanceLedgerEntity[]) {
    return ledgers.reduce(
      (buckets, ledger) => {
        buckets[this.agingBucket(ledger)] += this.remainingDebt(ledger);
        return buckets;
      },
      {
        current: 0,
        overdue_1_7: 0,
        overdue_8_30: 0,
        overdue_31_plus: 0,
        paid: 0
      }
    );
  }

  private agingBucket(ledger: FinanceLedgerEntity): "current" | "overdue_1_7" | "overdue_8_30" | "overdue_31_plus" | "paid" {
    if (this.remainingDebt(ledger) <= 0 || ledger.status === "paid") {
      return "paid";
    }

    if (!ledger.dueAt || ledger.dueAt.getTime() >= Date.now()) {
      return "current";
    }

    const overdueDays = Math.floor((Date.now() - ledger.dueAt.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    if (overdueDays <= 7) {
      return "overdue_1_7";
    }

    if (overdueDays <= 30) {
      return "overdue_8_30";
    }

    return "overdue_31_plus";
  }

  private statementResponse(ledgers: FinanceLedgerEntity[]) {
    const rows = ledgers.map((ledger) => this.toResponse(ledger));

    return {
      generatedAt: new Date(),
      overdueDebtUzs: rows.filter((row) => row.agingBucket !== "current" && row.agingBucket !== "paid").reduce((sum, row) => sum + row.remainingDebtUzs, 0),
      paidAmountUzs: rows.reduce((sum, row) => sum + row.paidAmountUzs, 0),
      remainingDebtUzs: rows.reduce((sum, row) => sum + row.remainingDebtUzs, 0),
      rows,
      storeDebtUzs: rows.reduce((sum, row) => sum + row.storeDebtUzs, 0)
    };
  }

  private toPaymentResponse(payment: FinancePaymentEntity) {
    return {
      amountUzs: payment.amountUzs,
      createdAt: payment.createdAt,
      id: payment.id,
      method: payment.method,
      proofFileName: payment.proofFileName,
      reference: payment.reference,
      note: payment.note
    };
  }

  private toAdjustmentResponse(adjustment: FinanceAdjustmentEntity) {
    return {
      amountUzs: adjustment.amountUzs,
      createdAt: adjustment.createdAt,
      id: adjustment.id,
      proofFileName: adjustment.proofFileName,
      reason: adjustment.reason,
      type: adjustment.type
    };
  }

  private toPayoutResponse(payout: FinancePayoutEntity) {
    return {
      amountUzs: payout.amountUzs,
      createdAt: payout.createdAt,
      dealerId: payout.dealerId,
      dealerName: payout.dealerName,
      id: payout.id,
      method: payout.method,
      note: payout.note,
      paidAt: payout.paidAt,
      proofFileName: payout.proofFileName,
      publicCode: payout.publicCode,
      reference: payout.reference,
      status: payout.status,
      updatedAt: payout.updatedAt
    };
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { FinanceLedgerEntity } from "../finance/entities/finance-ledger.entity";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UsersService } from "../users/users.service";
import { CreateDealerDto } from "./dto/create-dealer.dto";
import { UpdateDealerStatusDto } from "./dto/update-dealer-status.dto";
import { DealerEntity } from "./entities/dealer.entity";

@Injectable()
export class DealersService {
  constructor(
    @InjectRepository(DealerEntity)
    private readonly dealersRepository: Repository<DealerEntity>,
    @InjectRepository(FinanceLedgerEntity)
    private readonly financeLedgerRepository: Repository<FinanceLedgerEntity>,
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService
  ) {}

  async create(dto: CreateDealerDto) {
    const dealer = this.dealersRepository.create({
      adminNote: "Ariza admin tekshiruvini kutmoqda",
      companyName: dto.companyName || null,
      displayName: dto.displayName,
      phone: dto.phone || null,
      referralActive: false,
      referralCode: await this.generateReferralCode(dto.displayName),
      region: dto.region,
      status: "pending",
      telegramUserId: dto.telegramUserId || null
    });

    const saved = await this.dealersRepository.save(dealer);

    await this.auditService.record({
      action: "dealer.application_created",
      entityId: saved.id,
      entityType: "dealer",
      metadata: {
        displayName: saved.displayName,
        referralCode: saved.referralCode,
        region: saved.region
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.displayName} ${saved.region} hududidan usta arizasini yubordi.`,
      eventType: "dealer.application_created",
      metadata: {
        dealerId: saved.id,
        referralCode: saved.referralCode
      },
      recipientRole: "admin",
      titleUz: "Yangi usta arizasi"
    });

    return this.toResponse(saved);
  }

  async findAll() {
    const dealers = await this.dealersRepository.find({
      order: {
        createdAt: "DESC"
      },
      take: 100
    });

    return dealers.map((dealer) => this.toResponse(dealer));
  }

  async findApprovedByReferralCode(referralCode?: string) {
    if (!referralCode) {
      return null;
    }

    const dealer = await this.dealersRepository.findOne({
      where: {
        referralCode: referralCode.trim().toUpperCase()
      }
    });

    if (!dealer || dealer.status !== "approved" || !dealer.referralActive) {
      return null;
    }

    return dealer;
  }

  async findByReferralCode(referralCode: string) {
    const dealer = await this.dealersRepository.findOne({
      where: {
        referralCode: referralCode.trim().toUpperCase()
      }
    });

    if (!dealer || dealer.status !== "approved" || !dealer.referralActive) {
      throw new NotFoundException("Usta topilmadi");
    }

    return this.toPublicReferralResponse(dealer);
  }

  async updateStatus(id: string, dto: UpdateDealerStatusDto) {
    const dealer = await this.dealersRepository.findOne({
      where: {
        id
      }
    });

    if (!dealer) {
      throw new NotFoundException("Usta topilmadi");
    }

    const previousStatus = dealer.status;
    dealer.status = dto.status;
    dealer.adminNote = dto.adminNote || dealer.adminNote;
    dealer.referralActive = dto.referralActive ?? dto.status === "approved";

    const saved = await this.dealersRepository.save(dealer);

    if (saved.status === "approved") {
      await this.usersService.addRoleByTelegramUserId(saved.telegramUserId, "dealer");
    } else {
      await this.usersService.removeRoleByTelegramUserId(saved.telegramUserId, "dealer");
    }

    await this.auditService.record({
      action: "dealer.status_updated",
      entityId: saved.id,
      entityType: "dealer",
      metadata: {
        nextStatus: saved.status,
        previousStatus,
        referralActive: saved.referralActive,
        referralCode: saved.referralCode
      },
      reason: dto.adminNote ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.displayName} statusi "${saved.status}" ga o'zgardi. Referral: ${saved.referralActive ? "aktiv" : "to'xtatilgan"}.`,
      channel: saved.telegramUserId ? "telegram" : "web",
      eventType: "dealer.status_updated",
      metadata: {
        dealerId: saved.id,
        buttonText: "Usta kabinetini ochish",
        nextStatus: saved.status,
        previousStatus,
        referralActive: saved.referralActive
      },
      recipientRole: "dealer",
      recipientRef: saved.telegramUserId ?? saved.id,
      titleUz: "Usta statusi yangilandi"
    });

    return this.toResponse(saved);
  }

  async referralTools(id: string) {
    const dealer = await this.getDealer(id);
    return this.toReferralToolsResponse(dealer);
  }

  async rotateReferral(id: string) {
    const dealer = await this.getDealer(id);

    if (dealer.status !== "approved") {
      throw new BadRequestException("Faqat tasdiqlangan usta referral kodi almashtiriladi");
    }

    const previousCode = dealer.referralCode;
    dealer.referralCode = await this.generateReferralCode(dealer.displayName);
    dealer.referralActive = true;
    dealer.adminNote = "Referral kodi xavfsizlik uchun yangilandi";
    const saved = await this.dealersRepository.save(dealer);

    await this.auditService.record({
      action: "dealer.referral_rotated",
      entityId: saved.id,
      entityType: "dealer",
      metadata: {
        nextCode: saved.referralCode,
        previousCode
      },
      reason: "Referral rotate"
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.displayName} uchun referral kodi yangilandi. Eski kod ishlatilmaydi.`,
      channel: saved.telegramUserId ? "telegram" : "web",
      eventType: "dealer.referral_rotated",
      metadata: {
        buttonText: "Referralni ochish",
        dealerId: saved.id,
        referralCode: saved.referralCode
      },
      recipientRole: "dealer",
      recipientRef: saved.telegramUserId ?? saved.id,
      titleUz: "Referral kodi yangilandi"
    });

    return this.toResponse(saved);
  }

  async attributedRequests(id: string) {
    const dealer = await this.getDealer(id);
    const requests = await this.requestsRepository.find({
      order: {
        createdAt: "DESC"
      },
      where: {
        dealer: {
          id: dealer.id
        }
      },
      take: 100
    });

    return requests.map((request) => ({
      businessStatus: this.toDealerBusinessStatus(request.status),
      category: request.category,
      createdAt: request.createdAt,
      customerDisplay: this.maskCustomer(request.customerName, request.phone),
      id: request.id,
      publicCode: request.publicCode,
      region: request.region,
      source: request.source,
      status: request.status
    }));
  }

  async summary(id: string) {
    const dealer = await this.getDealer(id);
    const requests = await this.requestsRepository.find({
      where: {
        dealer: {
          id: dealer.id
        }
      }
    });
    const ledgers = await this.financeLedgerRepository.find({
      where: [
        {
          dealerId: dealer.id
        },
        {
          dealerId: IsNull(),
          dealerReferral: dealer.displayName
        }
      ]
    });
    const completedCount = requests.filter((request) => request.status === "completed").length;
    const selectedCount = requests.filter((request) => request.status === "selected" || request.status === "completed").length;
    const paidEarningsUzs = ledgers
      .filter((ledger) => ledger.status === "paid")
      .reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);
    const approvedEarningsUzs = ledgers.reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0);

    return {
      approvedEarningsUzs,
      completedCount,
      conversionRate: requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0,
      paidEarningsUzs,
      payableEarningsUzs: ledgers
        .filter((ledger) => ledger.status === "paid" || ledger.status === "partial_paid")
        .reduce((sum, ledger) => sum + ledger.dealerRewardUzs, 0),
      pendingEarningsUzs: Math.max(approvedEarningsUzs - paidEarningsUzs, 0),
      referredRequestCount: requests.length,
      selectedCount
    };
  }

  private async getDealer(id: string) {
    const dealer = await this.dealersRepository.findOne({
      where: {
        id
      }
    });

    if (!dealer) {
      throw new NotFoundException("Usta topilmadi");
    }

    return dealer;
  }

  private async generateReferralCode(displayName: string) {
    const base = displayName
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join("-")
      .toUpperCase()
      .replace(/_/g, "-")
      .slice(0, 18) || "USTA";

    for (let index = 1; index <= 20; index += 1) {
      const suffix = String(randomInt(1000, 10000));
      const candidate = `${base}-${suffix}`;
      const exists = await this.dealersRepository.exist({
        where: {
          referralCode: candidate
        }
      });

      if (!exists) {
        return candidate;
      }
    }

    return `USTA-${Date.now()}`;
  }
  private toResponse(dealer: DealerEntity) {
    const referralTools = this.toReferralToolsResponse(dealer);

    return {
      adminNote: dealer.adminNote,
      companyName: dealer.companyName,
      createdAt: dealer.createdAt,
      displayName: dealer.displayName,
      id: dealer.id,
      phone: dealer.phone,
      referralActive: dealer.referralActive,
      referralCode: dealer.referralCode,
      referralLink: referralTools.referralLink,
      qrPayload: referralTools.qrPayload,
      region: dealer.region,
      telegramLinked: Boolean(dealer.telegramUserId),
      telegramShareUrl: referralTools.telegramShareUrl,
      status: dealer.status,
      updatedAt: dealer.updatedAt
    };
  }

  private toPublicReferralResponse(dealer: DealerEntity) {
    const referralTools = this.toReferralToolsResponse(dealer);

    return {
      companyName: dealer.companyName,
      displayName: dealer.displayName,
      id: dealer.id,
      referralCode: dealer.referralCode,
      referralLink: referralTools.referralLink,
      region: dealer.region,
      status: dealer.status
    };
  }

  private toReferralToolsResponse(dealer: DealerEntity) {
    const webAppUrl = (process.env.WEB_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
    const referralLink = `${webAppUrl}?ref=${encodeURIComponent(dealer.referralCode)}`;
    const shareText = `SMETA MARKET orqali material ro'yxatingizni yuboring. Usta: ${dealer.displayName}`;

    return {
      qrPayload: referralLink,
      referralCode: dealer.referralCode,
      referralLink,
      shareText,
      telegramShareUrl: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
    };
  }

  private maskCustomer(customerName: string, phone: string | null) {
    if (phone) {
      return `${customerName} (${phone.slice(0, 7)}***${phone.slice(-2)})`;
    }

    const [firstName] = customerName.trim().split(/\s+/);
    return `${firstName || "Mijoz"} ***`;
  }

  private toDealerBusinessStatus(status: string) {
    const labels: Record<string, string> = {
      canceled: "Bekor qilingan",
      completed: "Yakunlangan",
      disputed: "Nizo",
      selected: "Do'kon tanlangan",
      selection_open: "Taklif tanlash",
      submitted: "Yuborilgan",
      under_review: "Tekshiruvda"
    };

    return labels[status] ?? status;
  }
}

import { Injectable, NotFoundException, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateDealerDto } from "./dto/create-dealer.dto";
import { UpdateDealerStatusDto } from "./dto/update-dealer-status.dto";
import { DealerEntity } from "./entities/dealer.entity";

@Injectable()
export class DealersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(DealerEntity)
    private readonly dealersRepository: Repository<DealerEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultDealers();
  }

  async create(dto: CreateDealerDto) {
    const dealer = this.dealersRepository.create({
      adminNote: "Ariza admin tekshiruvini kutmoqda",
      companyName: dto.companyName || null,
      displayName: dto.displayName,
      phone: dto.phone || null,
      referralActive: false,
      referralCode: await this.generateReferralCode(dto.displayName),
      region: dto.region,
      status: "pending"
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

    if (!dealer) {
      throw new NotFoundException("Usta topilmadi");
    }

    return this.toResponse(dealer);
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
      eventType: "dealer.status_updated",
      metadata: {
        dealerId: saved.id,
        nextStatus: saved.status,
        previousStatus,
        referralActive: saved.referralActive
      },
      recipientRole: "dealer",
      recipientRef: saved.id,
      titleUz: "Usta statusi yangilandi"
    });

    return this.toResponse(saved);
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
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
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

  private async seedDefaultDealers() {
    const count = await this.dealersRepository.count();

    if (count > 0) {
      return;
    }

    const dealers = [
      {
        adminNote: "Default tasdiqlangan usta",
        companyName: "Jamshid brigadasi",
        displayName: "Usta Jamshid",
        phone: "+998 90 111 22 33",
        referralActive: true,
        referralCode: "USTA-JAM-24",
        region: "Namangan sh.",
        status: "approved"
      },
      {
        adminNote: "Default tasdiqlangan usta",
        companyName: "Akmal qurilish guruhi",
        displayName: "Usta Akmal",
        phone: "+998 91 444 55 66",
        referralActive: true,
        referralCode: "USTA-AKM-24",
        region: "Uychi",
        status: "approved"
      }
    ];

    await this.dealersRepository.save(dealers.map((dealer) => this.dealersRepository.create(dealer)));
  }

  private toResponse(dealer: DealerEntity) {
    return {
      adminNote: dealer.adminNote,
      companyName: dealer.companyName,
      createdAt: dealer.createdAt,
      displayName: dealer.displayName,
      id: dealer.id,
      phone: dealer.phone,
      referralActive: dealer.referralActive,
      referralCode: dealer.referralCode,
      referralLink: `${process.env.WEB_APP_URL ?? "http://localhost:5173"}?ref=${dealer.referralCode}`,
      region: dealer.region,
      status: dealer.status,
      updatedAt: dealer.updatedAt
    };
  }
}

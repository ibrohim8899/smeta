import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DEFAULT_STORE_COMMISSION_RATE } from "@smeta/shared";
import { In, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { RequestRecipientEntity } from "../offers/entities/request-recipient.entity";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreProfileDto } from "./dto/update-store-profile.dto";
import { UpdateStoreStatusDto } from "./dto/update-store-status.dto";
import { StoreEntity } from "./entities/store.entity";

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storesRepository: Repository<StoreEntity>,
    @InjectRepository(RequestRecipientEntity)
    private readonly recipientsRepository: Repository<RequestRecipientEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly offersRepository: Repository<StoreOfferEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService
  ) {}

  async create(dto: CreateStoreDto) {
    const store = this.storesRepository.create({
      active: dto.active ?? true,
      address: dto.address || null,
      adminNote: "Admin tomonidan yaratilgan do'kon",
      categories: dto.categories,
      commissionRate: dto.commissionRate ?? DEFAULT_STORE_COMMISSION_RATE,
      name: dto.name,
      ownerName: dto.ownerName || null,
      phone: dto.phone || null,
      serviceRegions: dto.serviceRegions,
      status: dto.active === false ? "suspended" : "approved",
      telegramUserId: dto.telegramUserId || null,
      verifiedAt: dto.active === false ? null : new Date()
    });

    const saved = await this.storesRepository.save(store);

    if (saved.status === "approved" && saved.active) {
      await this.usersService.addRoleByTelegramUserId(saved.telegramUserId, "store");
    } else {
      await this.usersService.removeRoleByTelegramUserId(saved.telegramUserId, "store");
    }

    await this.auditService.record({
      action: "store.created",
      entityId: saved.id,
      entityType: "store",
      metadata: {
        active: saved.active,
        categories: saved.categories,
        name: saved.name,
        serviceRegions: saved.serviceRegions,
        status: saved.status
      }
    });

    return this.toResponse(saved);
  }

  async apply(dto: CreateStoreDto) {
    const store = this.storesRepository.create({
      active: false,
      address: dto.address || null,
      adminNote: "Do'kon arizasi admin tekshiruvini kutmoqda",
      categories: dto.categories,
      commissionRate: DEFAULT_STORE_COMMISSION_RATE,
      name: dto.name,
      ownerName: dto.ownerName || null,
      phone: dto.phone || null,
      serviceRegions: dto.serviceRegions,
      status: "pending",
      telegramUserId: dto.telegramUserId || null,
      verifiedAt: null
    });

    const saved = await this.storesRepository.save(store);

    await this.auditService.record({
      action: "store.application_created",
      entityId: saved.id,
      entityType: "store",
      metadata: {
        categories: saved.categories,
        name: saved.name,
        regionCount: saved.serviceRegions.length
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.name} do'koni ariza yubordi. Hududlar: ${saved.serviceRegions.join(", ")}.`,
      eventType: "store.application_created",
      metadata: {
        storeId: saved.id
      },
      recipientRole: "admin",
      titleUz: "Yangi do'kon arizasi"
    });

    return this.toResponse(saved);
  }

  async findAll() {
    const stores = await this.storesRepository.find({
      order: {
        name: "ASC"
      }
    });

    return stores.map((store) => this.toResponse(store));
  }

  async findOne(id: string) {
    return this.toResponse(await this.getStore(id));
  }

  async updateProfile(id: string, dto: UpdateStoreProfileDto) {
    const store = await this.getStore(id);

    store.address = dto.address ?? store.address;
    store.categories = dto.categories ?? store.categories;
    store.name = dto.name ?? store.name;
    store.ownerName = dto.ownerName ?? store.ownerName;
    store.phone = dto.phone ?? store.phone;
    store.serviceRegions = dto.serviceRegions ?? store.serviceRegions;

    const saved = await this.storesRepository.save(store);

    await this.auditService.record({
      action: "store.profile_updated",
      entityId: saved.id,
      entityType: "store",
      metadata: {
        categories: saved.categories,
        name: saved.name,
        serviceRegions: saved.serviceRegions,
        status: saved.status
      }
    });

    return this.toResponse(saved);
  }

  async updateStatus(id: string, dto: UpdateStoreStatusDto) {
    const store = await this.getStore(id);
    const previousStatus = store.status;

    store.status = dto.status;
    store.active = dto.active ?? dto.status === "approved";
    store.adminNote = dto.adminNote || store.adminNote;
    store.verifiedAt = dto.status === "approved" ? store.verifiedAt ?? new Date() : null;

    const saved = await this.storesRepository.save(store);

    if (saved.status === "approved" && saved.active) {
      await this.usersService.addRoleByTelegramUserId(saved.telegramUserId, "store");
    } else {
      await this.usersService.removeRoleByTelegramUserId(saved.telegramUserId, "store");
    }

    await this.auditService.record({
      action: "store.status_updated",
      entityId: saved.id,
      entityType: "store",
      metadata: {
        active: saved.active,
        nextStatus: saved.status,
        previousStatus
      },
      reason: dto.adminNote ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.name} statusi "${saved.status}" ga o'zgardi. Taklif yuborish: ${saved.active ? "aktiv" : "to'xtatilgan"}.`,
      channel: saved.telegramUserId ? "telegram" : "web",
      eventType: "store.status_updated",
      metadata: {
        active: saved.active,
        buttonText: "Do'kon kabinetini ochish",
        nextStatus: saved.status,
        previousStatus,
        storeId: saved.id
      },
      recipientRole: "store",
      recipientRef: saved.telegramUserId ?? saved.id,
      titleUz: "Do'kon statusi yangilandi"
    });

    return this.toResponse(saved);
  }

  async inbox(id: string) {
    const store = await this.getStore(id);
    const recipients = await this.recipientsRepository.find({
      order: {
        assignedAt: "DESC"
      },
      relations: {
        request: {
          attachments: true,
          dealer: true
        }
      },
      where: {
        store: {
          id: store.id
        }
      },
      take: 100
    });
    const requestIds = recipients.map((recipient) => recipient.request.id);
    const offers = requestIds.length
      ? await this.offersRepository.find({
          relations: {
            request: true
          },
          where: {
            request: {
              id: In(requestIds)
            },
            store: {
              id: store.id
            }
          }
        })
      : [];
    const offerByRequestId = new Map(offers.map((offer) => [offer.request.id, offer]));

    return recipients.map((recipient) => {
      const request = recipient.request;
      const offer = offerByRequestId.get(request.id);

      return {
        assignedAt: recipient.assignedAt,
        attachments: request.attachments?.map((attachment) => ({
          fileName: attachment.fileName,
          id: attachment.id,
          mimeType: attachment.mimeType,
          scanStatus: attachment.scanStatus,
          sizeBytes: attachment.sizeBytes
        })) ?? [],
        category: request.category,
        createdAt: request.createdAt,
        customerDisplay: this.maskCustomer(request.customerName, request.phone),
        dealer: request.dealer
          ? {
              displayName: request.dealer.displayName,
              id: request.dealer.id,
              referralCode: request.dealer.referralCode
            }
          : null,
        description: request.description,
        offer: offer ? this.toStoreOfferResponse(offer) : null,
        publicCode: request.publicCode,
        recipientId: recipient.id,
        recipientStatus: recipient.status,
        region: request.region,
        requestId: request.id,
        requestStatus: request.status
      };
    });
  }

  async findActiveMatching(region: string, category: string) {
    const stores = await this.storesRepository.find({
      where: {
        active: true,
        status: "approved"
      }
    });

    return stores.filter(
      (store) =>
        store.serviceRegions.includes(region) &&
        store.categories.some((storeCategory) => storeCategory.toLowerCase() === category.toLowerCase())
    );
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const stores = await this.storesRepository.find();
    return stores.filter((store) => ids.includes(store.id));
  }
  private toResponse(store: StoreEntity) {
    return {
      active: store.active,
      address: store.address,
      adminNote: store.adminNote,
      categories: store.categories,
      commissionRate: store.commissionRate,
      createdAt: store.createdAt,
      id: store.id,
      name: store.name,
      ownerName: store.ownerName,
      phone: store.phone,
      serviceRegions: store.serviceRegions,
      status: store.status,
      telegramLinked: Boolean(store.telegramUserId),
      updatedAt: store.updatedAt,
      verifiedAt: store.verifiedAt
    };
  }

  private async getStore(id: string) {
    const store = await this.storesRepository.findOne({
      where: {
        id
      }
    });

    if (!store) {
      throw new NotFoundException("Do'kon topilmadi");
    }

    return store;
  }

  private toStoreOfferResponse(offer: StoreOfferEntity) {
    const materialSubtotalUzs = offer.materialSubtotalUzs || offer.totalAmountUzs;
    const deliveryFeeUzs = offer.deliveryFeeUzs || 0;
    const finalTotalUzs = materialSubtotalUzs + deliveryFeeUzs;

    return {
      completeListAvailable: offer.completeListAvailable ?? true,
      createdAt: offer.createdAt,
      deliveryEstimate: offer.deliveryEstimate,
      deliveryFeeUzs,
      deliveryIncluded: offer.deliveryIncluded,
      finalTotalUzs,
      id: offer.id,
      materialSubtotalUzs,
      note: offer.note,
      status: offer.status,
      totalAmountUzs: finalTotalUzs,
      updatedAt: offer.updatedAt,
      validityHours: offer.validityHours
    };
  }

  private maskCustomer(customerName: string, phone: string | null) {
    if (phone) {
      return `${customerName} (${phone.slice(0, 7)}***${phone.slice(-2)})`;
    }

    const [firstName] = customerName.trim().split(/\s+/);
    return `${firstName || "Mijoz"} ***`;
  }
}

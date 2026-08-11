import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { StoresService } from "../stores/stores.service";
import { AssignStoresDto } from "./dto/assign-stores.dto";
import { CreateStoreOfferDto } from "./dto/create-store-offer.dto";
import { RequestRecipientEntity } from "./entities/request-recipient.entity";
import { StoreOfferEntity } from "./entities/store-offer.entity";

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    @InjectRepository(RequestRecipientEntity)
    private readonly recipientsRepository: Repository<RequestRecipientEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly offersRepository: Repository<StoreOfferEntity>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly storesService: StoresService
  ) {}

  async assignStores(requestId: string, dto: AssignStoresDto) {
    const request = await this.getRequest(requestId);
    const stores = dto.storeIds?.length
      ? await this.storesService.findByIds(dto.storeIds)
      : await this.storesService.findActiveMatching(request.region, request.category);

    if (stores.length === 0) {
      throw new BadRequestException("Mos do'kon topilmadi");
    }

    const existingRecipients = await this.recipientsRepository.find({
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        }
      }
    });
    const existingStoreIds = new Set(existingRecipients.map((recipient) => recipient.store.id));
    const newRecipients = stores
      .filter((store) => !existingStoreIds.has(store.id))
      .map((store) =>
        this.recipientsRepository.create({
          request,
          status: "assigned",
          store
        })
      );

    if (newRecipients.length > 0) {
      await this.recipientsRepository.save(newRecipients);
    }

    request.status = "published";
    request.adminNote = "Mos do'konlarga yuborildi";
    await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.assigned_to_stores",
      entityId: request.id,
      entityType: "material_request",
      metadata: {
        assignedStoreCount: stores.length,
        publicCode: request.publicCode,
        status: request.status
      }
    });

    await Promise.all(
      stores.map((store) =>
        this.notificationsService.enqueue({
          bodyUz: `${request.publicCode} bo'yicha ${request.category} so'rovi sizga yuborildi. Narx taklifini kiriting.`,
          eventType: "material_request.assigned_to_store",
          metadata: {
            requestId: request.id,
            storeId: store.id
          },
          recipientRole: "store",
          recipientRef: store.id,
          titleUz: `Yangi so'rov: ${request.publicCode}`
        })
      )
    );

    return this.findRecipients(request.id);
  }

  async findRecipients(requestId: string) {
    const request = await this.getRequest(requestId);
    const recipients = await this.recipientsRepository.find({
      order: {
        assignedAt: "DESC"
      },
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        }
      }
    });

    return recipients.map((recipient) => ({
      assignedAt: recipient.assignedAt,
      id: recipient.id,
      status: recipient.status,
      store: recipient.store
    }));
  }

  async createOffer(requestId: string, dto: CreateStoreOfferDto) {
    const request = await this.getRequest(requestId);
    const [store] = await this.storesService.findByIds([dto.storeId]);

    if (!store) {
      throw new NotFoundException("Do'kon topilmadi");
    }

    const existingOffer = await this.offersRepository.findOne({
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        },
        store: {
          id: store.id
        },
        status: "submitted"
      }
    });

    if (existingOffer) {
      existingOffer.deliveryIncluded = dto.deliveryIncluded ?? false;
      existingOffer.note = dto.note || null;
      existingOffer.totalAmountUzs = dto.totalAmountUzs;
      existingOffer.validityHours = dto.validityHours ?? 48;
      const saved = await this.offersRepository.save(existingOffer);

      await this.auditService.record({
        action: "store_offer.updated",
        entityId: saved.id,
        entityType: "store_offer",
        metadata: {
          requestPublicCode: request.publicCode,
          storeName: store.name,
          totalAmountUzs: saved.totalAmountUzs
        }
      });

      await this.notificationsService.enqueue({
        bodyUz: `${store.name} ${request.publicCode} uchun taklifini yangiladi. Yangi summa: ${saved.totalAmountUzs.toLocaleString("uz-UZ")} UZS.`,
        eventType: "store_offer.updated",
        metadata: {
          offerId: saved.id,
          requestId: request.id,
          totalAmountUzs: saved.totalAmountUzs
        },
        recipientRole: "admin",
        titleUz: "Do'kon taklifi yangilandi"
      });

      return this.toOfferResponse(saved);
    }

    const offer = this.offersRepository.create({
      deliveryIncluded: dto.deliveryIncluded ?? false,
      note: dto.note || null,
      request,
      status: "submitted",
      store,
      totalAmountUzs: dto.totalAmountUzs,
      validityHours: dto.validityHours ?? 48
    });

    await this.markRecipientResponded(request.id, store.id);

    const saved = await this.offersRepository.save(offer);

    await this.auditService.record({
      action: "store_offer.created",
      entityId: saved.id,
      entityType: "store_offer",
      metadata: {
        requestPublicCode: request.publicCode,
        storeName: store.name,
        totalAmountUzs: saved.totalAmountUzs
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${store.name} ${request.publicCode} uchun ${saved.totalAmountUzs.toLocaleString("uz-UZ")} UZS taklif yubordi.`,
      eventType: "store_offer.created",
      metadata: {
        offerId: saved.id,
        requestId: request.id,
        totalAmountUzs: saved.totalAmountUzs
      },
      recipientRole: "admin",
      titleUz: "Yangi do'kon taklifi"
    });

    return this.toOfferResponse(saved);
  }

  async findOffers(requestId: string) {
    const request = await this.getRequest(requestId);
    const offers = await this.offersRepository.find({
      order: {
        totalAmountUzs: "ASC"
      },
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        }
      }
    });

    return offers.map((offer) => this.toOfferResponse(offer));
  }

  private async getRequest(requestId: string) {
    const request = await this.requestsRepository.findOne({
      where: {
        id: requestId
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    return request;
  }

  private async markRecipientResponded(requestId: string, storeId: string) {
    const recipient = await this.recipientsRepository.findOne({
      relations: {
        request: true
      },
      where: {
        request: {
          id: requestId
        },
        store: {
          id: storeId
        }
      }
    });

    if (recipient) {
      recipient.status = "responded";
      await this.recipientsRepository.save(recipient);
    }
  }

  private toOfferResponse(offer: StoreOfferEntity) {
    return {
      createdAt: offer.createdAt,
      deliveryIncluded: offer.deliveryIncluded,
      id: offer.id,
      note: offer.note,
      status: offer.status,
      store: offer.store,
      totalAmountUzs: offer.totalAmountUzs,
      validityHours: offer.validityHours
    };
  }
}

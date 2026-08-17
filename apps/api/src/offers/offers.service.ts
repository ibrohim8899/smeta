import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UserRole } from "@smeta/shared";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { StoresService } from "../stores/stores.service";
import { AssignStoresDto } from "./dto/assign-stores.dto";
import { CreateStoreOfferDto } from "./dto/create-store-offer.dto";
import { DeclineRequestDto } from "./dto/decline-request.dto";
import { WithdrawOfferDto } from "./dto/withdraw-offer.dto";
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
          channel: store.telegramUserId ? "telegram" : "web",
          eventType: "material_request.assigned_to_store",
          metadata: {
            buttonText: "So'rovni ochish",
            requestId: request.id,
            storeId: store.id
          },
          recipientRole: "store",
          recipientRef: store.telegramUserId ?? store.id,
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

    await this.assertStoreCanRespond(request.id, store.id);

    const materialSubtotalUzs = dto.materialSubtotalUzs ?? dto.totalAmountUzs;
    const deliveryFeeUzs = dto.deliveryFeeUzs ?? 0;
    const completeListAvailable = dto.completeListAvailable ?? true;

    if (!materialSubtotalUzs) {
      throw new BadRequestException("Material subtotal summasi kiritilishi kerak");
    }

    if (!completeListAvailable) {
      throw new BadRequestException("V1 taklif butun material ro'yxatini qamrab olishi kerak");
    }

    const finalTotalUzs = materialSubtotalUzs + deliveryFeeUzs;

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
      }
    });

    if (existingOffer) {
      if (existingOffer.status !== "submitted") {
        throw new BadRequestException("Bu taklif tanlov bosqichidan keyin qayta tahrirlanmaydi");
      }

      existingOffer.completeListAvailable = completeListAvailable;
      existingOffer.deliveryEstimate = dto.deliveryEstimate || null;
      existingOffer.deliveryFeeUzs = deliveryFeeUzs;
      existingOffer.deliveryIncluded = dto.deliveryIncluded ?? false;
      existingOffer.materialSubtotalUzs = materialSubtotalUzs;
      existingOffer.note = dto.note || null;
      existingOffer.totalAmountUzs = finalTotalUzs;
      existingOffer.validityHours = dto.validityHours ?? 48;
      const saved = await this.offersRepository.save(existingOffer);

      await this.auditService.record({
        action: "store_offer.updated",
        entityId: saved.id,
        entityType: "store_offer",
        metadata: {
          deliveryFeeUzs: saved.deliveryFeeUzs,
          finalTotalUzs: saved.totalAmountUzs,
          materialSubtotalUzs: saved.materialSubtotalUzs,
          requestPublicCode: request.publicCode,
          storeName: store.name
        }
      });

      await this.notificationsService.enqueue({
        bodyUz: `${store.name} ${request.publicCode} uchun taklifini yangiladi. Yakuniy summa: ${saved.totalAmountUzs.toLocaleString("uz-UZ")} UZS.`,
        eventType: "store_offer.updated",
        metadata: {
          finalTotalUzs: saved.totalAmountUzs,
          offerId: saved.id,
          requestId: request.id
        },
        recipientRole: "admin",
        titleUz: "Do'kon taklifi yangilandi"
      });

      return this.toOfferResponse(saved);
    }

    const offer = this.offersRepository.create({
      completeListAvailable,
      deliveryEstimate: dto.deliveryEstimate || null,
      deliveryFeeUzs,
      deliveryIncluded: dto.deliveryIncluded ?? false,
      materialSubtotalUzs,
      note: dto.note || null,
      request,
      status: "submitted",
      store,
      totalAmountUzs: finalTotalUzs,
      validityHours: dto.validityHours ?? 48
    });

    await this.markRecipientResponded(request.id, store.id);

    const saved = await this.offersRepository.save(offer);

    await this.auditService.record({
      action: "store_offer.created",
      entityId: saved.id,
      entityType: "store_offer",
      metadata: {
        deliveryFeeUzs: saved.deliveryFeeUzs,
        finalTotalUzs: saved.totalAmountUzs,
        materialSubtotalUzs: saved.materialSubtotalUzs,
        requestPublicCode: request.publicCode,
        storeName: store.name
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${store.name} ${request.publicCode} uchun ${saved.totalAmountUzs.toLocaleString("uz-UZ")} UZS yakuniy taklif yubordi.`,
      eventType: "store_offer.created",
      metadata: {
        finalTotalUzs: saved.totalAmountUzs,
        offerId: saved.id,
        requestId: request.id
      },
      recipientRole: "admin",
      titleUz: "Yangi do'kon taklifi"
    });

    return this.toOfferResponse(saved);
  }

  async declineRequest(requestId: string, storeId: string, dto: DeclineRequestDto) {
    const request = await this.getRequest(requestId);
    const [store] = await this.storesService.findByIds([storeId]);

    if (!store) {
      throw new NotFoundException("Do'kon topilmadi");
    }

    const recipient = await this.getRecipient(request.id, store.id);

    if (recipient.status === "responded") {
      throw new BadRequestException("Taklif yuborgan do'kon bu so'rovni decline qila olmaydi");
    }

    recipient.status = "declined";
    await this.recipientsRepository.save(recipient);

    await this.auditService.record({
      action: "request_recipient.declined",
      entityId: recipient.id,
      entityType: "request_recipient",
      metadata: {
        publicCode: request.publicCode,
        storeName: store.name
      },
      reason: dto.reason ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${store.name} ${request.publicCode} so'rovini rad etdi.${dto.reason ? ` Sabab: ${dto.reason}` : ""}`,
      eventType: "request_recipient.declined",
      metadata: {
        requestId: request.id,
        storeId: store.id
      },
      recipientRole: "admin",
      titleUz: "Do'kon so'rovni rad etdi"
    });

    return {
      assignedAt: recipient.assignedAt,
      id: recipient.id,
      status: recipient.status,
      store: recipient.store
    };
  }

  async withdrawOffer(requestId: string, offerId: string, dto: WithdrawOfferDto) {
    const request = await this.getRequest(requestId);
    const offer = await this.offersRepository.findOne({
      relations: {
        request: true
      },
      where: {
        id: offerId,
        request: {
          id: request.id
        }
      }
    });

    if (!offer) {
      throw new NotFoundException("Taklif topilmadi");
    }

    if (offer.status !== "submitted") {
      throw new BadRequestException("Faqat hali tanlanmagan submitted taklif withdraw qilinadi");
    }

    offer.status = "withdrawn";
    const saved = await this.offersRepository.save(offer);

    const recipient = await this.recipientsRepository.findOne({
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        },
        store: {
          id: offer.store.id
        }
      }
    });

    if (recipient) {
      recipient.status = "withdrawn";
      await this.recipientsRepository.save(recipient);
    }

    await this.auditService.record({
      action: "store_offer.withdrawn",
      entityId: saved.id,
      entityType: "store_offer",
      metadata: {
        finalTotalUzs: saved.totalAmountUzs,
        requestPublicCode: request.publicCode,
        storeName: saved.store.name
      },
      reason: dto.reason ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.store.name} ${request.publicCode} uchun taklifini qaytarib oldi.${dto.reason ? ` Sabab: ${dto.reason}` : ""}`,
      eventType: "store_offer.withdrawn",
      metadata: {
        offerId: saved.id,
        requestId: request.id
      },
      recipientRole: "admin",
      titleUz: "Do'kon taklifi qaytarib olindi"
    });

    return this.toOfferResponse(saved);
  }

  async findOffers(requestId: string, scope?: { role?: UserRole; storeId?: string }) {
    const request = await this.getRequest(requestId);
    const storeScoped = scope?.role === "store";

    if (storeScoped && !scope.storeId) {
      throw new BadRequestException("Do'kon takliflarini ko'rish uchun storeId kerak");
    }

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
        },
        ...(storeScoped
          ? {
              store: {
                id: scope.storeId
              }
            }
          : {})
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

  private async assertStoreCanRespond(requestId: string, storeId: string) {
    const recipient = await this.getRecipient(requestId, storeId);

    if (recipient.status === "declined" || recipient.status === "withdrawn") {
      throw new BadRequestException("Bu do'kon ushbu so'rov bo'yicha imkoniyatni yopgan");
    }
  }

  private async getRecipient(requestId: string, storeId: string) {
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

    if (!recipient) {
      throw new BadRequestException("Do'kon bu so'rovga biriktirilmagan");
    }

    if (!recipient.store.active || recipient.store.status !== "approved") {
      throw new BadRequestException("Faol bo'lmagan do'kon taklif yubora olmaydi");
    }

    return recipient;
  }

  private toOfferResponse(offer: StoreOfferEntity) {
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
      store: offer.store,
      totalAmountUzs: finalTotalUzs,
      validityHours: offer.validityHours
    };
  }
}

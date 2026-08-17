import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { FinanceService } from "../finance/finance.service";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { ConfirmDeliveryDto } from "./dto/confirm-delivery.dto";
import { ResolveOrderDisputeDto } from "./dto/resolve-order-dispute.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderEntity } from "./entities/order.entity";

const ORDER_TRANSITIONS: Record<string, string[]> = {
  accepted: ["preparing", "ready", "canceled", "disputed"],
  canceled: [],
  completed: [],
  delivered_pending_confirmation: ["disputed"],
  disputed: [],
  dispatched: ["delivered_pending_confirmation", "disputed"],
  pending_store_acceptance: ["accepted", "canceled", "disputed"],
  preparing: ["ready", "canceled", "disputed"],
  ready: ["dispatched", "delivered_pending_confirmation", "canceled", "disputed"]
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly offersRepository: Repository<StoreOfferEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly auditService: AuditService,
    private readonly financeService: FinanceService,
    private readonly notificationsService: NotificationsService
  ) {}

  async selectOffer(requestId: string, offerId: string) {
    const request = await this.requestsRepository.findOne({
      where: {
        id: requestId
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    const existingOrder = await this.ordersRepository.findOne({
      where: {
        request: {
          id: request.id
        }
      }
    });

    if (existingOrder) {
      return this.toResponse(existingOrder);
    }

    const selectedOffer = await this.offersRepository.findOne({
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

    if (!selectedOffer) {
      throw new NotFoundException("Taklif topilmadi");
    }

    if (selectedOffer.status !== "submitted") {
      throw new BadRequestException("Faqat faol submitted taklif tanlanadi");
    }

    if (!selectedOffer.completeListAvailable) {
      throw new BadRequestException("To'liq ro'yxatni qamrab olmagan taklif tanlanmaydi");
    }

    const offers = await this.offersRepository.find({
      relations: {
        request: true
      },
      where: {
        request: {
          id: request.id
        }
      }
    });

    for (const offer of offers) {
      offer.status = offer.id === selectedOffer.id ? "selected" : "not_selected";
    }

    await this.offersRepository.save(offers);

    request.status = "selected";
    request.adminNote = `Taklif tanlandi: ${selectedOffer.store.name}`;
    await this.requestsRepository.save(request);

    const order = this.ordersRepository.create({
      acceptedAmountUzs: selectedOffer.totalAmountUzs,
      confirmedAt: null,
      deliveredAt: null,
      deliveryProofFileName: null,
      deliveryProofNote: null,
      finalAmountUzs: selectedOffer.totalAmountUzs,
      publicCode: await this.nextPublicCode(),
      request,
      selectedOffer,
      status: "pending_store_acceptance",
      statusNote: "Do'kon qabul qilishini kutmoqda",
      store: selectedOffer.store
    });

    const saved = await this.ordersRepository.save(order);

    await this.auditService.record({
      action: "order.created_from_offer",
      entityId: saved.id,
      entityType: "order",
      metadata: {
        acceptedAmountUzs: saved.acceptedAmountUzs,
        deliveryFeeUzs: selectedOffer.deliveryFeeUzs,
        materialSubtotalUzs: selectedOffer.materialSubtotalUzs || selectedOffer.totalAmountUzs,
        offerId: selectedOffer.id,
        publicCode: saved.publicCode,
        requestPublicCode: request.publicCode,
        storeName: selectedOffer.store.name
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.publicCode} yaratildi. Do'kon: ${selectedOffer.store.name}. Summa: ${saved.acceptedAmountUzs.toLocaleString("uz-UZ")} UZS.`,
      channel: selectedOffer.store.telegramUserId ? "telegram" : "web",
      eventType: "order.created",
      metadata: {
        buttonText: "Buyurtmani ochish",
        orderId: saved.id,
        publicCode: saved.publicCode,
        requestId: request.id
      },
      recipientRole: "store",
      recipientRef: selectedOffer.store.telegramUserId ?? selectedOffer.store.id,
      titleUz: `Buyurtma yaratildi: ${saved.publicCode}`
    });

    return this.toResponse(saved);
  }

  async findAll() {
    const orders = await this.ordersRepository.find({
      order: {
        createdAt: "DESC"
      },
      take: 50
    });

    return orders.map((order) => this.toResponse(order));
  }

  async findByRequest(requestId: string) {
    const order = await this.ordersRepository.findOne({
      where: {
        request: {
          id: requestId
        }
      }
    });

    return order ? this.toResponse(order) : null;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId
      }
    });

    if (!order) {
      throw new NotFoundException("Buyurtma topilmadi");
    }

    const previousStatus = order.status;
    this.assertTransition(previousStatus, dto.status);

    if (dto.status === "completed") {
      throw new BadRequestException("Buyurtmani yakunlash uchun mijoz tasdiqlash endpointidan foydalaning");
    }

    if (dto.status === "delivered_pending_confirmation" && !dto.proofNote && !dto.proofFileName) {
      throw new BadRequestException("Yetkazilganini tasdiqlash uchun proof note yoki fayl nomi kerak");
    }

    order.status = dto.status;
    order.statusNote = dto.note || order.statusNote;
    order.finalAmountUzs = dto.finalAmountUzs ?? order.finalAmountUzs ?? order.acceptedAmountUzs;

    if (dto.status === "delivered_pending_confirmation") {
      order.deliveredAt = order.deliveredAt ?? new Date();
      order.deliveryProofFileName = dto.proofFileName || order.deliveryProofFileName;
      order.deliveryProofNote = dto.proofNote || order.deliveryProofNote;
    }

    if (dto.status === "canceled") {
      order.request.status = "canceled";
      order.request.adminNote = "Buyurtma bekor qilindi";
      await this.requestsRepository.save(order.request);
    }

    if (dto.status === "disputed") {
      order.request.status = "disputed";
      order.request.adminNote = "Buyurtma bo'yicha nizo ochildi";
      await this.requestsRepository.save(order.request);
    }

    const savedOrder = await this.ordersRepository.save(order);

    await this.auditService.record({
      action: "order.status_updated",
      entityId: savedOrder.id,
      entityType: "order",
      metadata: {
        nextStatus: savedOrder.status,
        previousStatus,
        publicCode: savedOrder.publicCode
      },
      reason: dto.note ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${savedOrder.publicCode} holati "${savedOrder.status}" ga o'zgardi.${dto.note ? ` Izoh: ${dto.note}` : ""}`,
      eventType: "order.status_updated",
      metadata: {
        nextStatus: savedOrder.status,
        orderId: savedOrder.id,
        previousStatus
      },
      recipientRole: "customer",
      titleUz: "Buyurtma holati yangilandi"
    });

    return this.toResponse(savedOrder);
  }

  async confirmDelivery(orderId: string, dto: ConfirmDeliveryDto) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId
      }
    });

    if (!order) {
      throw new NotFoundException("Buyurtma topilmadi");
    }

    if (order.status !== "delivered_pending_confirmation") {
      throw new BadRequestException("Mijoz faqat yetkazilgan buyurtmani tasdiqlaydi");
    }

    const previousStatus = order.status;
    order.status = "completed";
    order.statusNote = dto.note || "Mijoz buyurtmani tasdiqladi";
    order.finalAmountUzs = dto.finalAmountUzs ?? order.finalAmountUzs ?? order.acceptedAmountUzs;
    order.confirmedAt = new Date();
    order.request.status = "completed";
    order.request.adminNote = "Buyurtma mijoz tomonidan tasdiqlandi";

    await this.requestsRepository.save(order.request);
    const savedOrder = await this.ordersRepository.save(order);
    await this.financeService.createSnapshotForOrder(savedOrder.id);

    await this.auditService.record({
      action: "order.delivery_confirmed",
      entityId: savedOrder.id,
      entityType: "order",
      metadata: {
        finalAmountUzs: savedOrder.finalAmountUzs,
        previousStatus,
        publicCode: savedOrder.publicCode
      },
      reason: dto.note ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${savedOrder.publicCode} mijoz tomonidan tasdiqlandi. Moliya snapshot yaratildi.`,
      eventType: "order.delivery_confirmed",
      metadata: {
        finalAmountUzs: savedOrder.finalAmountUzs,
        orderId: savedOrder.id
      },
      recipientRole: "finance",
      titleUz: "Buyurtma yakunlandi"
    });

    return this.toResponse(savedOrder);
  }

  async resolveDispute(orderId: string, dto: ResolveOrderDisputeDto) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId
      }
    });

    if (!order) {
      throw new NotFoundException("Buyurtma topilmadi");
    }

    if (order.status !== "disputed" && order.request.status !== "disputed") {
      throw new BadRequestException("Faqat nizo holatidagi buyurtma resolve qilinadi");
    }

    if (!dto.reason.trim()) {
      throw new BadRequestException("Resolve sababi majburiy");
    }

    const previousStatus = order.status;

    if (dto.outcome === "complete") {
      order.status = "completed";
      order.finalAmountUzs = dto.finalAmountUzs ?? order.finalAmountUzs ?? order.acceptedAmountUzs;
      order.confirmedAt = order.confirmedAt ?? new Date();
      order.request.status = "completed";
      order.request.adminNote = `Nizo hal qilindi: ${dto.reason}`;
    }

    if (dto.outcome === "cancel") {
      order.status = "canceled";
      order.request.status = "canceled";
      order.request.adminNote = `Nizo cancel bilan yopildi: ${dto.reason}`;
    }

    if (dto.outcome === "reopen") {
      order.status = "accepted";
      order.request.status = "selected";
      order.request.adminNote = `Nizo qayta ochildi: ${dto.reason}`;
    }

    order.statusNote = dto.reason;
    await this.requestsRepository.save(order.request);
    const savedOrder = await this.ordersRepository.save(order);

    if (dto.outcome === "complete") {
      await this.financeService.createSnapshotForOrder(savedOrder.id);
    }

    await this.auditService.record({
      action: "order.dispute_resolved",
      entityId: savedOrder.id,
      entityType: "order",
      metadata: {
        outcome: dto.outcome,
        previousStatus,
        publicCode: savedOrder.publicCode,
        status: savedOrder.status
      },
      reason: dto.reason
    });

    return this.toResponse(savedOrder);
  }

  async processAcceptanceTimeouts(input?: { now?: Date }) {
    const now = input?.now ?? new Date();
    const timeoutSeconds = Number(process.env.STORE_ACCEPTANCE_TIMEOUT_SECONDS ?? "7200");
    const cutoff = new Date(now.getTime() - timeoutSeconds * 1000);
    const orders = await this.ordersRepository.find({
      order: {
        createdAt: "ASC"
      },
      take: 100,
      where: {
        createdAt: LessThanOrEqual(cutoff),
        status: "pending_store_acceptance"
      }
    });
    const results: Array<{ id: string; publicCode: string; requestStatus: string; status: string }> = [];

    for (const order of orders) {
      const offers = await this.offersRepository.find({
        relations: {
          request: true
        },
        where: {
          request: {
            id: order.request.id
          }
        }
      });

      for (const offer of offers) {
        if (offer.id === order.selectedOffer.id) {
          offer.status = "withdrawn";
        } else if (offer.status === "not_selected") {
          offer.status = "submitted";
        }
      }

      await this.offersRepository.save(offers);

      const previousStatus = order.status;
      order.status = "canceled";
      order.statusNote = "Do'kon qabul qilish muddati tugadi";
      order.request.status = offers.some((offer) => offer.id !== order.selectedOffer.id && offer.status === "submitted") ? "selection_open" : "expired";
      order.request.adminNote = "Tanlangan do'kon qabul qilish muddati tugadi";
      await this.requestsRepository.save(order.request);
      const savedOrder = await this.ordersRepository.save(order);

      await this.auditService.record({
        action: "order.acceptance_timeout_processed",
        entityId: savedOrder.id,
        entityType: "order",
        metadata: {
          nextStatus: savedOrder.status,
          previousStatus,
          publicCode: savedOrder.publicCode,
          requestStatus: savedOrder.request.status,
          timeoutSeconds
        },
        reason: "Internal deadline worker"
      });

      await this.notificationsService.enqueue({
        bodyUz: `${savedOrder.publicCode} uchun do'kon qabul qilish muddati tugadi. So'rov holati: ${savedOrder.request.status}.`,
        eventType: "order.acceptance_timeout_processed",
        metadata: {
          orderId: savedOrder.id,
          requestId: savedOrder.request.id,
          requestStatus: savedOrder.request.status
        },
        recipientRole: "admin",
        titleUz: "Buyurtma qabul qilish muddati tugadi"
      });

      results.push({
        id: savedOrder.id,
        publicCode: savedOrder.publicCode,
        requestStatus: savedOrder.request.status,
        status: savedOrder.status
      });
    }

    return {
      processed: results.length,
      results
    };
  }

  private async nextPublicCode() {
    const count = await this.ordersRepository.count();
    return `ORD-${String(count + 1).padStart(5, "0")}`;
  }

  private assertTransition(previousStatus: string, nextStatus: string) {
    const allowed = ORDER_TRANSITIONS[previousStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Buyurtma statusi "${previousStatus}" dan "${nextStatus}" ga o'tkazilmaydi`);
    }
  }

  private toResponse(order: OrderEntity) {
    return {
      acceptedAmountUzs: order.acceptedAmountUzs,
      confirmedAt: order.confirmedAt,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      deliveryProofFileName: order.deliveryProofFileName,
      deliveryProofNote: order.deliveryProofNote,
      finalAmountUzs: order.finalAmountUzs ?? order.acceptedAmountUzs,
      id: order.id,
      publicCode: order.publicCode,
      request: {
        id: order.request.id,
        publicCode: order.request.publicCode,
        status: order.request.status
      },
      selectedOffer: {
        id: order.selectedOffer.id,
        deliveryFeeUzs: order.selectedOffer.deliveryFeeUzs || 0,
        finalTotalUzs: order.selectedOffer.totalAmountUzs,
        materialSubtotalUzs: order.selectedOffer.materialSubtotalUzs || order.selectedOffer.totalAmountUzs,
        totalAmountUzs: order.selectedOffer.totalAmountUzs
      },
      status: order.status,
      statusNote: order.statusNote,
      store: {
        id: order.store.id,
        name: order.store.name
      }
    };
  }
}

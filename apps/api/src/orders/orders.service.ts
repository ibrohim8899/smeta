import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { FinanceService } from "../finance/finance.service";
import { MaterialRequestEntity } from "../material-requests/entities/material-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrderEntity } from "./entities/order.entity";

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
      throw new BadRequestException("Bu so'rov uchun buyurtma allaqachon yaratilgan");
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
        offerId: selectedOffer.id,
        publicCode: saved.publicCode,
        requestPublicCode: request.publicCode,
        storeName: selectedOffer.store.name
      }
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.publicCode} yaratildi. Do'kon: ${selectedOffer.store.name}. Summa: ${saved.acceptedAmountUzs.toLocaleString("uz-UZ")} UZS.`,
      eventType: "order.created",
      metadata: {
        orderId: saved.id,
        publicCode: saved.publicCode,
        requestId: request.id
      },
      recipientRole: "store",
      recipientRef: selectedOffer.store.id,
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

    order.status = dto.status;
    order.statusNote = dto.note || order.statusNote;

    const shouldCreateFinanceSnapshot = dto.status === "completed" && previousStatus !== "completed";

    if (dto.status === "completed") {
      order.request.status = "completed";
      order.request.adminNote = "Buyurtma mijoz tomonidan tasdiqlandi";
      await this.requestsRepository.save(order.request);
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

    if (shouldCreateFinanceSnapshot) {
      await this.financeService.createSnapshotForOrder(savedOrder.id);
    }

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

  private async nextPublicCode() {
    const count = await this.ordersRepository.count();
    return `ORD-${String(count + 1).padStart(5, "0")}`;
  }

  private toResponse(order: OrderEntity) {
    return {
      acceptedAmountUzs: order.acceptedAmountUzs,
      createdAt: order.createdAt,
      id: order.id,
      publicCode: order.publicCode,
      request: {
        id: order.request.id,
        publicCode: order.request.publicCode,
        status: order.request.status
      },
      selectedOffer: {
        id: order.selectedOffer.id,
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

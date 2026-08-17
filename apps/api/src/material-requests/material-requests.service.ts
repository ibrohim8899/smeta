import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { readdir, stat, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { DealersService } from "../dealers/dealers.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";
import { StoreOfferEntity } from "../offers/entities/store-offer.entity";
import { CustomerCancelDto, CustomerDisputeDto, GuestConfirmDeliveryDto, UpdateGuestContactDto } from "./dto/customer-action.dto";
import { CreateMaterialRequestDto } from "./dto/create-material-request.dto";
import { ResolveRequestDisputeDto } from "./dto/resolve-request-dispute.dto";
import { UpdateMaterialRequestStatusDto } from "./dto/update-material-request-status.dto";
import { MaterialRequestEntity } from "./entities/material-request.entity";
import { RequestAttachmentEntity } from "./entities/request-attachment.entity";
import { getUploadDirectory, isAllowedUpload } from "./file-upload.policy";

const REQUEST_TRANSITIONS: Record<string, string[]> = {
  canceled: [],
  completed: [],
  collecting_offers: ["selection_open", "selected", "expired", "canceled", "disputed"],
  correction_required: ["under_review", "canceled", "disputed"],
  disputed: [],
  draft: ["submitted", "canceled"],
  expired: [],
  published: ["collecting_offers", "selection_open", "selected", "expired", "canceled", "disputed"],
  selected: ["completed", "canceled", "disputed"],
  selection_open: ["selected", "expired", "canceled", "disputed"],
  submitted: ["under_review", "canceled", "disputed"],
  under_review: ["correction_required", "published", "canceled", "disputed"]
};

const NOTE_REQUIRED_STATUSES = new Set(["correction_required", "canceled", "disputed"]);

@Injectable()
export class MaterialRequestsService {
  constructor(
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    @InjectRepository(StoreOfferEntity)
    private readonly offersRepository: Repository<StoreOfferEntity>,
    @InjectRepository(RequestAttachmentEntity)
    private readonly attachmentsRepository: Repository<RequestAttachmentEntity>,
    private readonly auditService: AuditService,
    private readonly dealersService: DealersService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersService: OrdersService
  ) {}

  async create(dto: CreateMaterialRequestDto, options?: { persistStorageKeys?: boolean }) {
    this.assertAttachmentRequirement(dto);
    const dealer = await this.dealersService.findApprovedByReferralCode(dto.dealerReferralCode);
    const guestAccess = this.createGuestAccess();
    const request = this.requestsRepository.create({
      attachments: dto.attachments.map((attachment) => {
        const trustedStorageKey = options?.persistStorageKeys ? attachment.storageKey ?? null : null;

        return Object.assign(new RequestAttachmentEntity(), {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          scanStatus: attachment.scanStatus ?? (trustedStorageKey ? "pending" : "metadata_only"),
          sizeBytes: attachment.sizeBytes,
          storageKey: trustedStorageKey
        });
      }),
      category: dto.category,
      customerName: dto.customerName,
      dealer,
      dealerReferral: dealer?.displayName ?? dto.dealerReferral ?? null,
      dealerReferralCode: dealer?.referralCode ?? dto.dealerReferralCode ?? null,
      description: dto.description || null,
      deliveryNote: dto.deliveryNote || null,
      phone: dto.phone || null,
      publicCode: await this.nextPublicCode(),
      region: dto.region,
      source: dto.source,
      status: "submitted",
      guestTokenExpiresAt: guestAccess.expiresAt,
      guestTokenHash: guestAccess.tokenHash,
      guestTokenRevokedAt: null
    });

    const saved = await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.created",
      entityId: saved.id,
      entityType: "material_request",
      metadata: {
        category: saved.category,
        fileCount: saved.attachments?.length ?? 0,
        publicCode: saved.publicCode,
        region: saved.region,
        source: saved.source
      }
    });

    await Promise.all(
      (saved.attachments ?? [])
        .filter((attachment) => attachment.storageKey)
        .map((attachment) =>
          this.auditService.record({
            action: "request_attachment.uploaded",
            entityId: attachment.id,
            entityType: "request_attachment",
            metadata: {
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              publicCode: saved.publicCode,
              scanStatus: attachment.scanStatus,
              sizeBytes: attachment.sizeBytes,
              storageProvider: attachment.storageProvider
            }
          })
        )
    );

    await this.notificationsService.enqueue({
      bodyUz: `${saved.customerName} ${saved.region} hududidan ${saved.category} bo'yicha so'rov yubordi. Fayllar: ${saved.attachments?.length ?? 0} ta.`,
      eventType: "material_request.created",
      metadata: {
        publicCode: saved.publicCode,
        requestId: saved.id
      },
      recipientRole: "admin",
      titleUz: `Yangi so'rov: ${saved.publicCode}`
    });

    return {
      ...this.toResponse(saved),
      guestAccessToken: guestAccess.token,
      guestAccessUrl: this.createGuestAccessUrl(guestAccess.token)
    };
  }

  async createWithUploadedFiles(
    dto: Omit<CreateMaterialRequestDto, "attachments">,
    files: Array<{
      filename: string;
      mimetype: string;
      originalname: string;
      size: number;
    }>
  ) {
    for (const file of files) {
      if (!isAllowedUpload(file.mimetype, file.originalname)) {
        throw new BadRequestException("Fayl turi yoki kengaytmasi ruxsat etilmagan");
      }
    }

    return this.create({
      ...dto,
      attachments: files.map((file) => ({
        fileName: file.originalname,
        mimeType: file.mimetype,
        scanStatus: "pending",
        sizeBytes: file.size,
        storageKey: file.filename
      }))
    }, {
      persistStorageKeys: true
    });
  }

  async findAll() {
    const requests = await this.requestsRepository.find({
      order: {
        createdAt: "DESC"
      },
      relations: {
        attachments: true,
        dealer: true
      },
      take: 50
    });

    return requests.map((request) => this.toResponse(request));
  }

  async findOne(id: string) {
    const request = await this.requestsRepository.findOne({
      relations: {
        attachments: true,
        dealer: true
      },
      where: {
        id
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    return this.toResponse(request);
  }

  async findByGuestToken(token: string) {
    const request = await this.findRequestByGuestToken(token);

    return this.toGuestResponse(request);
  }

  async updateGuestContact(token: string, dto: UpdateGuestContactDto) {
    const request = await this.findRequestByGuestToken(token);
    const phone = dto.phone.trim();

    if (!phone) {
      throw new BadRequestException("Aloqa telefoni majburiy");
    }

    request.phone = phone;
    request.deliveryNote = dto.deliveryNote?.trim() || request.deliveryNote;
    const saved = await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.guest_contact_updated",
      entityId: saved.id,
      entityType: "material_request",
      metadata: {
        publicCode: saved.publicCode
      }
    });

    return this.toGuestResponse(saved);
  }

  async findGuestOffers(token: string) {
    const request = await this.findRequestByGuestToken(token);
    const order = await this.ordersService.findByRequest(request.id);
    const offers = await this.offersRepository.find({
      order: {
        totalAmountUzs: "ASC",
        createdAt: "ASC"
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

    return offers
      .filter((offer) => (order ? ["submitted", "selected", "not_selected"].includes(offer.status) : offer.status === "submitted"))
      .map((offer) => this.toGuestOfferResponse(offer));
  }

  async selectGuestOffer(token: string, offerId: string) {
    const request = await this.findRequestByGuestToken(token);

    if (!request.phone) {
      throw new BadRequestException("Taklif tanlashdan oldin aloqa telefonini kiriting");
    }

    return this.ordersService.selectOffer(request.id, offerId);
  }

  async findGuestOrder(token: string) {
    const request = await this.findRequestByGuestToken(token);
    return this.ordersService.findByRequest(request.id);
  }

  async cancelByGuest(token: string, dto: CustomerCancelDto) {
    const request = await this.findRequestByGuestToken(token);
    const order = await this.ordersService.findByRequest(request.id);
    const note = `Mijoz bekor qildi${dto.reason?.trim() ? `: ${dto.reason.trim()}` : ""}`;

    if (order) {
      if (["dispatched", "delivered_pending_confirmation", "completed", "canceled", "disputed"].includes(order.status)) {
        throw new BadRequestException("Bu bosqichda bekor qilish uchun nizo oching");
      }

      return this.ordersService.updateStatus(order.id, {
        note,
        status: "canceled"
      });
    }

    return this.updateStatus(request.id, {
      note,
      status: "canceled"
    });
  }

  async disputeByGuest(token: string, dto: CustomerDisputeDto) {
    const request = await this.findRequestByGuestToken(token);
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException("Nizo sababi majburiy");
    }

    const order = await this.ordersService.findByRequest(request.id);
    const note = `Mijoz nizosi: ${reason}`;

    if (order) {
      if (["completed", "canceled", "disputed"].includes(order.status)) {
        throw new BadRequestException("Bu buyurtma uchun nizo ochib bo'lmaydi");
      }

      return this.ordersService.updateStatus(order.id, {
        note,
        status: "disputed"
      });
    }

    return this.updateStatus(request.id, {
      note,
      status: "disputed"
    });
  }

  async confirmGuestDelivery(token: string, orderId: string, dto: GuestConfirmDeliveryDto) {
    const request = await this.findRequestByGuestToken(token);
    const order = await this.ordersService.findByRequest(request.id);

    if (!order || order.id !== orderId) {
      throw new NotFoundException("Buyurtma topilmadi");
    }

    return this.ordersService.confirmDelivery(orderId, dto);
  }

  async revokeGuestToken(token: string) {
    const request = await this.findRequestByGuestToken(token);
    request.guestTokenRevokedAt = new Date();
    await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.guest_token_revoked",
      entityId: request.id,
      entityType: "material_request",
      metadata: {
        publicCode: request.publicCode
      }
    });

    return {
      revoked: true
    };
  }

  async rotateGuestToken(token: string) {
    const request = await this.findRequestByGuestToken(token);
    const guestAccess = this.createGuestAccess();

    request.guestTokenExpiresAt = guestAccess.expiresAt;
    request.guestTokenHash = guestAccess.tokenHash;
    request.guestTokenRevokedAt = null;
    await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.guest_token_rotated",
      entityId: request.id,
      entityType: "material_request",
      metadata: {
        publicCode: request.publicCode
      }
    });

    return {
      guestAccessToken: guestAccess.token,
      guestAccessUrl: this.createGuestAccessUrl(guestAccess.token)
    };
  }

  async updateStatus(id: string, dto: UpdateMaterialRequestStatusDto) {
    const request = await this.requestsRepository.findOne({
      relations: {
        attachments: true,
        dealer: true
      },
      where: {
        id
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    const previousStatus = request.status;
    this.assertModerationTransition(previousStatus, dto.status, dto.note);
    request.status = dto.status;
    request.adminNote = dto.note || request.adminNote;

    const saved = await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.status_updated",
      entityId: saved.id,
      entityType: "material_request",
      metadata: {
        nextStatus: saved.status,
        previousStatus,
        publicCode: saved.publicCode
      },
      reason: dto.note ?? null
    });

    await this.notificationsService.enqueue({
      bodyUz: `${saved.publicCode} holati "${saved.status}" ga o'zgardi.${dto.note ? ` Izoh: ${dto.note}` : ""}`,
      eventType: "material_request.status_updated",
      metadata: {
        nextStatus: saved.status,
        previousStatus,
        requestId: saved.id
      },
      recipientRole: "customer",
      recipientRef: saved.phone,
      titleUz: `So'rov holati yangilandi`
    });

    return this.toResponse(saved);
  }

  async resolveDispute(id: string, dto: ResolveRequestDisputeDto) {
    const request = await this.requestsRepository.findOne({
      relations: {
        attachments: true,
        dealer: true
      },
      where: {
        id
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    if (request.status !== "disputed") {
      throw new BadRequestException("Faqat nizo holatidagi so'rov resolve qilinadi");
    }

    if (!dto.reason.trim()) {
      throw new BadRequestException("Resolve sababi majburiy");
    }

    const previousStatus = request.status;
    request.status = dto.outcome === "cancel" ? "canceled" : "under_review";
    request.adminNote = `Nizo hal qilindi: ${dto.reason}`;
    const saved = await this.requestsRepository.save(request);

    await this.auditService.record({
      action: "material_request.dispute_resolved",
      entityId: saved.id,
      entityType: "material_request",
      metadata: {
        outcome: dto.outcome,
        previousStatus,
        publicCode: saved.publicCode,
        status: saved.status
      },
      reason: dto.reason
    });

    return this.toResponse(saved);
  }

  async cancel(id: string) {
    return this.updateStatus(id, {
      note: "Admin bekor qildi",
      status: "canceled"
    });
  }

  async processDeadlines(input?: { now?: Date }) {
    const now = input?.now ?? new Date();
    const deadlineSeconds = Number(process.env.REQUEST_DEADLINE_SECONDS ?? process.env.V1_REQUEST_DEADLINE_SECONDS ?? "86400");
    const cutoff = new Date(now.getTime() - deadlineSeconds * 1000);
    const requests = await this.requestsRepository.find({
      order: {
        updatedAt: "ASC"
      },
      relations: {
        attachments: true,
        dealer: true
      },
      take: 100,
      where: [
        {
          status: "published",
          updatedAt: LessThanOrEqual(cutoff)
        },
        {
          status: "collecting_offers",
          updatedAt: LessThanOrEqual(cutoff)
        },
        {
          status: "selection_open",
          updatedAt: LessThanOrEqual(cutoff)
        }
      ]
    });
    const results: Array<{ id: string; nextStatus: string; publicCode: string }> = [];

    for (const request of requests) {
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
      const hasSelectableOffer = offers.some((offer) => offer.status === "submitted" && offer.completeListAvailable);
      const previousStatus = request.status;
      request.status = hasSelectableOffer ? "selection_open" : "expired";
      request.adminNote = hasSelectableOffer ? "Taklif yig'ish muddati tugadi, mijoz tanlashi ochiq" : "Taklif muddati tugadi, faol taklif yo'q";
      const saved = await this.requestsRepository.save(request);

      await this.auditService.record({
        action: "material_request.deadline_processed",
        entityId: saved.id,
        entityType: "material_request",
        metadata: {
          deadlineSeconds,
          nextStatus: saved.status,
          previousStatus,
          publicCode: saved.publicCode
        },
        reason: "Internal deadline worker"
      });

      await this.notificationsService.enqueue({
        bodyUz: `${saved.publicCode} muddati qayta ishladi. Holat: ${saved.status}.`,
        eventType: "material_request.deadline_processed",
        metadata: {
          requestId: saved.id,
          status: saved.status
        },
        recipientRole: "admin",
        titleUz: "So'rov muddati qayta ishladi"
      });

      results.push({
        id: saved.id,
        nextStatus: saved.status,
        publicCode: saved.publicCode
      });
    }

    return {
      processed: results.length,
      results
    };
  }

  async cleanupUnreferencedUploads() {
    const uploadDirectory = resolve(getUploadDirectory());
    const retentionHours = Number(process.env.TEMP_UPLOAD_RETENTION_HOURS ?? "24");
    const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
    const referenced = new Set(
      (await this.attachmentsRepository.find({
        select: {
          storageKey: true
        }
      }))
        .map((attachment) => attachment.storageKey)
        .filter((storageKey): storageKey is string => Boolean(storageKey))
        .map((storageKey) => basename(storageKey))
    );

    let entries: Array<{ isFile(): boolean; name: string }>;

    try {
      entries = await readdir(uploadDirectory, {
        withFileTypes: true
      });
    } catch {
      return {
        deleted: 0,
        uploadDirectory
      };
    }

    const deleted: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || referenced.has(entry.name)) {
        continue;
      }

      const filePath = resolve(uploadDirectory, entry.name);

      if (!filePath.startsWith(uploadDirectory)) {
        continue;
      }

      const fileStat = await stat(filePath);

      if (fileStat.mtimeMs > cutoff) {
        continue;
      }

      await unlink(filePath);
      deleted.push(entry.name);
    }

    return {
      deleted: deleted.length,
      files: deleted,
      uploadDirectory
    };
  }

  async getAttachmentForDownload(requestId: string, attachmentId: string) {
    const request = await this.requestsRepository.findOne({
      relations: {
        attachments: true
      },
      where: {
        id: requestId
      }
    });

    if (!request) {
      throw new NotFoundException("Material so'rovi topilmadi");
    }

    const attachment = request.attachments.find((item) => item.id === attachmentId);

    if (!attachment || !attachment.storageKey) {
      throw new NotFoundException("Fayl topilmadi");
    }

    await this.auditService.record({
      action: "request_attachment.downloaded",
      entityId: attachment.id,
      entityType: "request_attachment",
      metadata: {
        fileName: attachment.fileName,
        publicCode: request.publicCode,
        requestId: request.id,
        scanStatus: attachment.scanStatus
      }
    });

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      scanStatus: attachment.scanStatus,
      storageKey: attachment.storageKey
    };
  }

  async getGuestAttachmentForDownload(token: string, attachmentId: string) {
    const request = await this.findRequestByGuestToken(token);
    const attachment = request.attachments.find((item) => item.id === attachmentId);

    if (!attachment || !attachment.storageKey) {
      throw new NotFoundException("Fayl topilmadi");
    }

    await this.auditService.record({
      action: "request_attachment.guest_downloaded",
      entityId: attachment.id,
      entityType: "request_attachment",
      metadata: {
        fileName: attachment.fileName,
        publicCode: request.publicCode,
        requestId: request.id,
        scanStatus: attachment.scanStatus
      }
    });

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      scanStatus: attachment.scanStatus,
      storageKey: attachment.storageKey
    };
  }

  private async nextPublicCode() {
    const count = await this.requestsRepository.count();
    return `REQ-${String(count + 1).padStart(5, "0")}`;
  }

  private assertAttachmentRequirement(dto: CreateMaterialRequestDto) {
    if (dto.source !== "dealer_assisted" && dto.attachments.length === 0) {
      throw new BadRequestException("Kamida bitta material ro'yxati fayli majburiy");
    }
  }

  private assertModerationTransition(previousStatus: string, nextStatus: string, note?: string) {
    if (previousStatus === nextStatus) {
      return;
    }

    if (NOTE_REQUIRED_STATUSES.has(nextStatus) && !note?.trim()) {
      throw new BadRequestException(`"${nextStatus}" statusi uchun admin izohi majburiy`);
    }

    const allowed = REQUEST_TRANSITIONS[previousStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`So'rov statusi "${previousStatus}" dan "${nextStatus}" ga o'tkazilmaydi`);
    }
  }

  private createGuestAccess() {
    const token = randomBytes(32).toString("base64url");
    const lifetimeDays = Number(process.env.GUEST_REQUEST_TOKEN_LIFETIME_DAYS ?? "90");

    return {
      expiresAt: new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000),
      token,
      tokenHash: this.hashGuestToken(token)
    };
  }

  private createGuestAccessUrl(token: string) {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";
    return `${webAppUrl.replace(/\/$/, "")}/?guestToken=${encodeURIComponent(token)}`;
  }

  private hashGuestToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async findRequestByGuestToken(token: string) {
    const request = await this.requestsRepository.findOne({
      relations: {
        attachments: true,
        dealer: true
      },
      where: {
        guestTokenHash: this.hashGuestToken(token)
      }
    });

    if (!request || request.guestTokenRevokedAt || !request.guestTokenExpiresAt || request.guestTokenExpiresAt.getTime() <= Date.now()) {
      throw new NotFoundException("Guest link topilmadi yoki muddati tugagan");
    }

    return request;
  }

  private toGuestResponse(request: MaterialRequestEntity) {
    return {
      attachments: request.attachments?.map((attachment) => ({
        fileName: attachment.fileName,
        id: attachment.id,
        mimeType: attachment.mimeType,
        scanStatus: attachment.scanStatus,
        sizeBytes: attachment.sizeBytes
      })) ?? [],
      category: request.category,
      createdAt: request.createdAt,
      customerName: request.customerName,
      dealer: request.dealer
        ? {
            displayName: request.dealer.displayName,
            id: request.dealer.id,
            referralCode: request.dealer.referralCode,
            status: request.dealer.status
          }
        : null,
      dealerReferral: request.dealerReferral,
      dealerReferralCode: request.dealerReferralCode,
      description: request.description,
      deliveryNote: request.deliveryNote,
      guestTokenExpiresAt: request.guestTokenExpiresAt,
      id: request.id,
      phone: request.phone,
      phoneRequiredBeforeSelection: !request.phone,
      publicCode: request.publicCode,
      region: request.region,
      source: request.source,
      status: request.status
    };
  }

  private toResponse(request: MaterialRequestEntity) {
    return {
      attachments: request.attachments?.map((attachment) => ({
        fileName: attachment.fileName,
        id: attachment.id,
        mimeType: attachment.mimeType,
        scanStatus: attachment.scanStatus,
        storageKey: attachment.storageKey,
        sizeBytes: attachment.sizeBytes
      })) ?? [],
      adminNote: request.adminNote,
      category: request.category,
      createdAt: request.createdAt,
      customerName: request.customerName,
      dealerReferral: request.dealerReferral,
      dealerReferralCode: request.dealerReferralCode,
      dealer: request.dealer
        ? {
            displayName: request.dealer.displayName,
            id: request.dealer.id,
            referralCode: request.dealer.referralCode,
            status: request.dealer.status
          }
        : null,
      description: request.description,
      deliveryNote: request.deliveryNote,
      id: request.id,
      phone: request.phone,
      publicCode: request.publicCode,
      region: request.region,
      source: request.source,
      status: request.status
    };
  }

  private toGuestOfferResponse(offer: StoreOfferEntity) {
    return {
      completeListAvailable: offer.completeListAvailable,
      createdAt: offer.createdAt,
      deliveryEstimate: offer.deliveryEstimate,
      deliveryFeeUzs: offer.deliveryFeeUzs || 0,
      deliveryIncluded: offer.deliveryIncluded,
      finalTotalUzs: offer.totalAmountUzs,
      id: offer.id,
      materialSubtotalUzs: offer.materialSubtotalUzs || offer.totalAmountUzs,
      note: offer.note,
      status: offer.status,
      store: {
        id: offer.store.id,
        name: offer.store.name
      },
      totalAmountUzs: offer.totalAmountUzs,
      validityHours: offer.validityHours
    };
  }
}

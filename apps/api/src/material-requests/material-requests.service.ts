import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { DealersService } from "../dealers/dealers.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateMaterialRequestDto } from "./dto/create-material-request.dto";
import { UpdateMaterialRequestStatusDto } from "./dto/update-material-request-status.dto";
import { MaterialRequestEntity } from "./entities/material-request.entity";
import { RequestAttachmentEntity } from "./entities/request-attachment.entity";
import { isAllowedUpload } from "./file-upload.policy";

@Injectable()
export class MaterialRequestsService {
  constructor(
    @InjectRepository(MaterialRequestEntity)
    private readonly requestsRepository: Repository<MaterialRequestEntity>,
    private readonly auditService: AuditService,
    private readonly dealersService: DealersService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(dto: CreateMaterialRequestDto, options?: { persistStorageKeys?: boolean }) {
    const dealer = await this.dealersService.findApprovedByReferralCode(dto.dealerReferralCode);
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
      phone: dto.phone || null,
      publicCode: await this.nextPublicCode(),
      region: dto.region,
      source: dto.source,
      status: "submitted"
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

    return this.toResponse(saved);
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

  async cancel(id: string) {
    return this.updateStatus(id, {
      note: "Admin bekor qildi",
      status: "canceled"
    });
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
      storageKey: attachment.storageKey
    };
  }

  private async nextPublicCode() {
    const count = await this.requestsRepository.count();
    return `REQ-${String(count + 1).padStart(5, "0")}`;
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
      id: request.id,
      phone: request.phone,
      publicCode: request.publicCode,
      region: request.region,
      source: request.source,
      status: request.status
    };
  }
}

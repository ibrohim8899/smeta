import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { diskStorage } from "multer";
import type { Response } from "express";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CustomerCancelDto, CustomerDisputeDto, GuestConfirmDeliveryDto, UpdateGuestContactDto } from "./dto/customer-action.dto";
import { CreateMaterialRequestDto } from "./dto/create-material-request.dto";
import { ResolveRequestDisputeDto } from "./dto/resolve-request-dispute.dto";
import {
  getSafeOriginalFileName,
  getUploadDirectory,
  getUploadExtension,
  isDownloadAllowed,
  isAllowedUpload,
  MAX_REQUEST_FILES,
  MAX_REQUEST_FILE_SIZE_BYTES
} from "./file-upload.policy";
import { UpdateMaterialRequestStatusDto } from "./dto/update-material-request-status.dto";
import { MaterialRequestsService } from "./material-requests.service";

const uploadDir = getUploadDirectory();

@Controller("material-requests")
export class MaterialRequestsController {
  constructor(private readonly materialRequestsService: MaterialRequestsService) {}

  @Post()
  create(@Body() dto: CreateMaterialRequestDto) {
    return this.materialRequestsService.create(dto);
  }

  @Post("with-files")
  @UseInterceptors(
    FilesInterceptor("attachments", MAX_REQUEST_FILES, {
      fileFilter: (_request, file, callback) => {
        if (!isAllowedUpload(file.mimetype, file.originalname)) {
          callback(new BadRequestException("Fayl turi yoki kengaytmasi ruxsat etilmagan"), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: MAX_REQUEST_FILE_SIZE_BYTES,
        files: MAX_REQUEST_FILES
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          mkdirSync(uploadDir, {
            recursive: true
          });
          callback(null, uploadDir);
        },
        filename: (_request, file, callback) => {
          const extension = getUploadExtension(file.originalname);
          const safeName = getSafeOriginalFileName(file.originalname);
          const safeBaseName = safeName.toLowerCase().endsWith(extension) ? safeName.slice(0, -extension.length).slice(0, 80) : safeName.slice(0, 80);
          callback(null, `${randomUUID()}-${safeBaseName}${extension}`);
        }
      })
    })
  )
  createWithFiles(@Body() body: Record<string, string>, @UploadedFiles() files: Express.Multer.File[]) {
    if (!body.customerName || !body.region || !body.category) {
      throw new BadRequestException("Mijoz ismi, hudud va kategoriya majburiy");
    }

    return this.materialRequestsService.createWithUploadedFiles(
      {
        category: body.category,
        customerName: body.customerName,
        dealerReferral: body.dealerReferral || undefined,
        dealerReferralCode: body.dealerReferralCode || undefined,
        description: body.description || undefined,
        deliveryNote: body.deliveryNote || undefined,
        phone: body.phone || undefined,
        region: body.region,
        source: (body.source as CreateMaterialRequestDto["source"]) || "guest_link"
      },
      files ?? []
    );
  }

  @Get("guest/:token")
  findByGuestToken(@Param("token") token: string) {
    return this.materialRequestsService.findByGuestToken(token);
  }

  @Patch("guest/:token/contact")
  updateGuestContact(@Param("token") token: string, @Body() dto: UpdateGuestContactDto) {
    return this.materialRequestsService.updateGuestContact(token, dto);
  }

  @Get("guest/:token/offers")
  findGuestOffers(@Param("token") token: string) {
    return this.materialRequestsService.findGuestOffers(token);
  }

  @Post("guest/:token/select-offer/:offerId")
  selectGuestOffer(@Param("token") token: string, @Param("offerId") offerId: string) {
    return this.materialRequestsService.selectGuestOffer(token, offerId);
  }

  @Get("guest/:token/order")
  findGuestOrder(@Param("token") token: string) {
    return this.materialRequestsService.findGuestOrder(token);
  }

  @Post("guest/:token/cancel")
  cancelByGuest(@Param("token") token: string, @Body() dto: CustomerCancelDto) {
    return this.materialRequestsService.cancelByGuest(token, dto);
  }

  @Post("guest/:token/dispute")
  disputeByGuest(@Param("token") token: string, @Body() dto: CustomerDisputeDto) {
    return this.materialRequestsService.disputeByGuest(token, dto);
  }

  @Post("guest/:token/orders/:orderId/confirm-delivery")
  confirmGuestDelivery(@Param("token") token: string, @Param("orderId") orderId: string, @Body() dto: GuestConfirmDeliveryDto) {
    return this.materialRequestsService.confirmGuestDelivery(token, orderId, dto);
  }

  @Post("guest/:token/rotate")
  rotateGuestToken(@Param("token") token: string) {
    return this.materialRequestsService.rotateGuestToken(token);
  }

  @Post("guest/:token/revoke")
  revokeGuestToken(@Param("token") token: string) {
    return this.materialRequestsService.revokeGuestToken(token);
  }

  @Get("guest/:token/attachments/:attachmentId/download")
  async downloadGuestAttachment(@Param("token") token: string, @Param("attachmentId") attachmentId: string, @Res() response: Response) {
    const attachment = await this.materialRequestsService.getGuestAttachmentForDownload(token, attachmentId);
    return this.streamAttachment(attachment, response);
  }

  @Get()
  @RequirePermissions("requests.read")
  findAll() {
    return this.materialRequestsService.findAll();
  }

  @Patch(":id/status")
  @RequirePermissions("requests.moderate")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateMaterialRequestStatusDto) {
    return this.materialRequestsService.updateStatus(id, dto);
  }

  @Post(":id/resolve-dispute")
  @RequirePermissions("requests.moderate")
  resolveDispute(@Param("id") id: string, @Body() dto: ResolveRequestDisputeDto) {
    return this.materialRequestsService.resolveDispute(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("requests.moderate")
  cancel(@Param("id") id: string) {
    return this.materialRequestsService.cancel(id);
  }

  @Get(":id")
  @RequirePermissions("requests.read")
  findOne(@Param("id") id: string) {
    return this.materialRequestsService.findOne(id);
  }

  @Get(":requestId/attachments/:attachmentId/download")
  @RequirePermissions("requests.read")
  async downloadAttachment(@Param("requestId") requestId: string, @Param("attachmentId") attachmentId: string, @Res() response: Response) {
    const attachment = await this.materialRequestsService.getAttachmentForDownload(requestId, attachmentId);
    return this.streamAttachment(attachment, response);
  }

  private streamAttachment(attachment: { fileName: string; mimeType: string; scanStatus: string; storageKey: string }, response: Response) {
    const baseUploadPath = resolve(uploadDir);
    const filePath = resolve(baseUploadPath, basename(attachment.storageKey));

    if (!filePath.startsWith(baseUploadPath)) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }

    if (!existsSync(filePath)) {
      throw new BadRequestException("Fayl storage ichida topilmadi");
    }

    if (!isDownloadAllowed(attachment.scanStatus)) {
      throw new BadRequestException("Fayl xavfsizlik tekshiruvidan o'tmagan");
    }

    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(getSafeOriginalFileName(attachment.fileName))}"`);
    return createReadStream(filePath).pipe(response);
  }
}

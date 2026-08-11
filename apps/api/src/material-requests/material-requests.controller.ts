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
import { CreateMaterialRequestDto } from "./dto/create-material-request.dto";
import {
  getSafeOriginalFileName,
  getUploadDirectory,
  getUploadExtension,
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
          callback(null, `${randomUUID()}${extension}`);
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
        phone: body.phone || undefined,
        region: body.region,
        source: (body.source as CreateMaterialRequestDto["source"]) || "guest_link"
      },
      files ?? []
    );
  }

  @Get()
  findAll() {
    return this.materialRequestsService.findAll();
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateMaterialRequestStatusDto) {
    return this.materialRequestsService.updateStatus(id, dto);
  }

  @Delete(":id")
  cancel(@Param("id") id: string) {
    return this.materialRequestsService.cancel(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.materialRequestsService.findOne(id);
  }

  @Get(":requestId/attachments/:attachmentId/download")
  async downloadAttachment(@Param("requestId") requestId: string, @Param("attachmentId") attachmentId: string, @Res() response: Response) {
    const attachment = await this.materialRequestsService.getAttachmentForDownload(requestId, attachmentId);
    const baseUploadPath = resolve(uploadDir);
    const filePath = resolve(baseUploadPath, basename(attachment.storageKey));

    if (!filePath.startsWith(baseUploadPath)) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }

    if (!existsSync(filePath)) {
      throw new BadRequestException("Fayl storage ichida topilmadi");
    }

    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(getSafeOriginalFileName(attachment.fileName))}"`);
    return createReadStream(filePath).pipe(response);
  }
}

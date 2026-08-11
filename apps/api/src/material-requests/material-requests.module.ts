import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { DealersModule } from "../dealers/dealers.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MaterialRequestEntity } from "./entities/material-request.entity";
import { RequestAttachmentEntity } from "./entities/request-attachment.entity";
import { MaterialRequestsController } from "./material-requests.controller";
import { MaterialRequestsService } from "./material-requests.service";

@Module({
  controllers: [MaterialRequestsController],
  imports: [AuditModule, DealersModule, NotificationsModule, TypeOrmModule.forFeature([MaterialRequestEntity, RequestAttachmentEntity])],
  providers: [MaterialRequestsService]
})
export class MaterialRequestsModule {}

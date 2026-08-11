import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditLogEntity } from "./entities/audit-log.entity";

@Module({
  controllers: [AuditController],
  exports: [AuditService],
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService]
})
export class AuditModule {}

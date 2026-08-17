import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AppSettingEntity } from "./entities/app-setting.entity";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  controllers: [SettingsController],
  exports: [SettingsService],
  imports: [AuditModule, TypeOrmModule.forFeature([AppSettingEntity])],
  providers: [SettingsService]
})
export class SettingsModule {}

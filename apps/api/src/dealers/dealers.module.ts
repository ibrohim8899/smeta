import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DealersController } from "./dealers.controller";
import { DealersService } from "./dealers.service";
import { DealerEntity } from "./entities/dealer.entity";

@Module({
  controllers: [DealersController],
  exports: [DealersService, TypeOrmModule],
  imports: [AuditModule, NotificationsModule, TypeOrmModule.forFeature([DealerEntity])],
  providers: [DealersService]
})
export class DealersModule {}

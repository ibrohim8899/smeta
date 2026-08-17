import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationOutboxEntity } from "../notifications/entities/notification-outbox.entity";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
  imports: [TypeOrmModule.forFeature([NotificationOutboxEntity])]
})
export class HealthModule {}

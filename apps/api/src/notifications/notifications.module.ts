import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationOutboxEntity } from "./entities/notification-outbox.entity";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  controllers: [NotificationsController],
  exports: [NotificationsService],
  imports: [TypeOrmModule.forFeature([NotificationOutboxEntity])],
  providers: [NotificationsService]
})
export class NotificationsModule {}

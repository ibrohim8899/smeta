import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationStatusDto } from "./dto/update-notification-status.dto";
import { NotificationOutboxEntity } from "./entities/notification-outbox.entity";

export type EnqueueNotificationInput = {
  bodyUz: string;
  channel?: "web" | "telegram";
  eventType: string;
  metadata?: Record<string, unknown> | null;
  recipientRef?: string | null;
  recipientRole: string;
  titleUz: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationOutboxEntity)
    private readonly notificationsRepository: Repository<NotificationOutboxEntity>
  ) {}

  async enqueue(input: EnqueueNotificationInput) {
    const notification = this.notificationsRepository.create({
      bodyUz: input.bodyUz,
      channel: input.channel ?? "web",
      eventType: input.eventType,
      metadata: input.metadata ?? null,
      recipientRef: input.recipientRef ?? null,
      recipientRole: input.recipientRole,
      scheduledAt: null,
      status: "pending",
      titleUz: input.titleUz
    });

    return this.toResponse(await this.notificationsRepository.save(notification));
  }

  async createManual(dto: CreateNotificationDto) {
    return this.enqueue({
      bodyUz: dto.bodyUz,
      channel: (dto.channel ?? "web") as "web" | "telegram",
      eventType: dto.eventType,
      metadata: dto.metadata ?? null,
      recipientRef: dto.recipientRef ?? null,
      recipientRole: dto.recipientRole,
      titleUz: dto.titleUz
    });
  }

  async findLatest(limit = 100, status?: string) {
    const take = Math.min(Math.max(limit, 1), 200);
    const notifications = await this.notificationsRepository.find({
      order: {
        createdAt: "DESC"
      },
      take,
      where: status ? { status } : undefined
    });

    return notifications.map((notification) => this.toResponse(notification));
  }

  async updateStatus(id: string, dto: UpdateNotificationStatusDto) {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id
      }
    });

    if (!notification) {
      throw new NotFoundException("Bildirishnoma topilmadi");
    }

    notification.status = dto.status;
    notification.lastError = dto.error ?? null;
    notification.attempts += dto.status === "failed" ? 1 : 0;
    notification.sentAt = dto.status === "sent" ? new Date() : notification.sentAt;

    return this.toResponse(await this.notificationsRepository.save(notification));
  }

  private toResponse(notification: NotificationOutboxEntity) {
    return {
      attempts: notification.attempts,
      bodyUz: notification.bodyUz,
      channel: notification.channel,
      createdAt: notification.createdAt,
      eventType: notification.eventType,
      id: notification.id,
      lastError: notification.lastError,
      metadata: notification.metadata,
      recipientRef: notification.recipientRef,
      recipientRole: notification.recipientRole,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      status: notification.status,
      titleUz: notification.titleUz,
      updatedAt: notification.updatedAt
    };
  }
}

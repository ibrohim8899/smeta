import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { TelegramBotService } from "../telegram/telegram-bot.service";
import { ClaimNotificationDto } from "./dto/claim-notification.dto";
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
  scheduledAt?: Date | null;
  titleUz: string;
};

const MAX_NOTIFICATION_ATTEMPTS = 5;
const DEFAULT_WORKER_LIMIT = 25;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationOutboxEntity)
    private readonly notificationsRepository: Repository<NotificationOutboxEntity>,
    private readonly telegramBotService: TelegramBotService
  ) {}

  async enqueue(input: EnqueueNotificationInput) {
    const notification = this.notificationsRepository.create({
      bodyUz: input.bodyUz,
      channel: input.channel ?? "web",
      eventType: input.eventType,
      metadata: input.metadata ?? null,
      recipientRef: input.recipientRef ?? null,
      recipientRole: input.recipientRole,
      scheduledAt: input.scheduledAt ?? null,
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
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      titleUz: dto.titleUz
    });
  }

  async findLatest(limit = 100, status?: string, channel?: string) {
    const take = Math.min(Math.max(limit, 1), 200);
    const notifications = await this.notificationsRepository.find({
      order: {
        createdAt: "DESC"
      },
      take,
      where: {
        ...(status
          ? {
              status
            }
          : {}),
        ...(channel
          ? {
              channel
            }
          : {})
      }
    });

    return notifications.map((notification) => this.toResponse(notification));
  }

  async findDue(limit = 50, channel?: string) {
    const now = new Date();
    const take = Math.min(Math.max(limit, 1), 100);
    const dueWhere = [
      {
        attempts: LessThanOrEqual(MAX_NOTIFICATION_ATTEMPTS - 1),
        scheduledAt: IsNull(),
        status: "pending",
        ...(channel ? { channel } : {})
      },
      {
        attempts: LessThanOrEqual(MAX_NOTIFICATION_ATTEMPTS - 1),
        scheduledAt: LessThanOrEqual(now),
        status: "pending",
        ...(channel ? { channel } : {})
      }
    ];
    const notifications = await this.notificationsRepository.find({
      order: {
        createdAt: "ASC"
      },
      take,
      where: dueWhere
    });

    return notifications.map((notification) => this.toResponse(notification));
  }

  async claimNext(dto: ClaimNotificationDto) {
    const [next] = await this.findDue(1, dto.channel);

    if (!next) {
      return null;
    }

    const notification = await this.notificationsRepository.findOne({
      where: {
        id: next.id
      }
    });

    if (!notification || notification.status !== "pending") {
      return null;
    }

    notification.status = "processing";
    notification.lastError = dto.workerId ? `claimed:${dto.workerId}` : "claimed";

    return this.toResponse(await this.notificationsRepository.save(notification));
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

    if (notification.status === "sent" && dto.status !== "sent") {
      throw new BadRequestException("Yuborilgan bildirishnoma qayta ochilmaydi");
    }

    if (dto.status === "failed" && notification.attempts + 1 >= MAX_NOTIFICATION_ATTEMPTS) {
      notification.status = "dead_letter";
    } else {
      notification.status = dto.status;
    }

    notification.lastError = dto.error ?? null;
    notification.attempts += dto.status === "failed" ? 1 : 0;
    notification.scheduledAt = dto.status === "failed" && notification.status !== "dead_letter" ? this.nextRetryAt(notification.attempts) : notification.scheduledAt;
    notification.sentAt = dto.status === "sent" ? new Date() : notification.sentAt;

    return this.toResponse(await this.notificationsRepository.save(notification));
  }

  async retry(id: string) {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id
      }
    });

    if (!notification) {
      throw new NotFoundException("Bildirishnoma topilmadi");
    }

    if (notification.status === "sent") {
      throw new BadRequestException("Yuborilgan bildirishnoma retry qilinmaydi");
    }

    notification.status = "pending";
    notification.scheduledAt = null;
    notification.lastError = null;

    return this.toResponse(await this.notificationsRepository.save(notification));
  }

  async processDue(input?: { channel?: string; limit?: number }) {
    const channel = input?.channel ?? "telegram";
    const limit = Math.min(Math.max(input?.limit ?? DEFAULT_WORKER_LIMIT, 1), 100);
    const due = await this.findDue(limit, channel);
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const item of due) {
      const notification = await this.notificationsRepository.findOne({
        where: {
          id: item.id
        }
      });

      if (!notification || notification.status !== "pending") {
        continue;
      }

      notification.status = "processing";
      notification.lastError = "claimed:internal-worker";
      await this.notificationsRepository.save(notification);

      try {
        await this.deliver(notification);
        const sent = await this.updateStatus(notification.id, {
          status: "sent"
        });
        results.push({
          id: sent.id,
          status: sent.status
        });
      } catch (error) {
        const failed = await this.updateStatus(notification.id, {
          error: error instanceof Error ? error.message : "Notification delivery failed",
          status: "failed"
        });
        results.push({
          error: failed.lastError ?? undefined,
          id: failed.id,
          status: failed.status
        });
      }
    }

    return {
      channel,
      processed: results.length,
      results
    };
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

  private nextRetryAt(attempts: number) {
    const delaySeconds = Math.min(60 * 30, 30 * 2 ** Math.max(attempts - 1, 0));
    return new Date(Date.now() + delaySeconds * 1000);
  }

  private async deliver(notification: NotificationOutboxEntity) {
    if (notification.channel !== "telegram") {
      return;
    }

    if (!notification.recipientRef) {
      throw new Error("Telegram recipientRef/chat_id topilmadi");
    }

    if (!/^\d+$/.test(notification.recipientRef)) {
      throw new Error("Telegram recipientRef chat_id emas; profil Telegram user ID bilan bog'lanmagan");
    }

    await this.telegramBotService.sendMessage({
      buttons: this.notificationButtons(notification),
      chatId: notification.recipientRef,
      text: `${notification.titleUz}\n\n${notification.bodyUz}`
    });
  }

  private notificationButtons(notification: NotificationOutboxEntity) {
    const metadata = notification.metadata ?? {};
    const directUrl = typeof metadata.url === "string" ? metadata.url : null;
    const deepLink = typeof metadata.deepLink === "string" ? metadata.deepLink : null;
    const buttonText = typeof metadata.buttonText === "string" ? metadata.buttonText : "Platformada ochish";
    const url = directUrl ?? deepLink ?? this.inferDeepLink(metadata);

    if (!url) {
      return undefined;
    }

    return [
      [
        {
          text: buttonText,
          url
        }
      ]
    ];
  }

  private inferDeepLink(metadata: Record<string, unknown>) {
    if (typeof metadata.orderId === "string") {
      return this.telegramBotService.webAppLink({
        kind: "order",
        ref: metadata.orderId
      });
    }

    if (typeof metadata.requestId === "string") {
      return this.telegramBotService.webAppLink({
        kind: "request",
        ref: metadata.requestId
      });
    }

    if (typeof metadata.ledgerId === "string") {
      return this.telegramBotService.webAppLink({
        kind: "finance",
        ref: metadata.ledgerId
      });
    }

    if (typeof metadata.dealerId === "string") {
      return this.telegramBotService.webAppLink({
        kind: "dealer",
        ref: metadata.dealerId
      });
    }

    if (typeof metadata.storeId === "string") {
      return this.telegramBotService.webAppLink({
        kind: "store",
        ref: metadata.storeId
      });
    }

    return null;
  }
}

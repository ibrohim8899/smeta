import { Controller, Get } from "@nestjs/common";
import { APP_CURRENCY, APP_TIMEZONE, STAGE_ONE_CHECKLIST } from "@smeta/shared";
import { existsSync } from "node:fs";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { getUploadDirectory } from "../material-requests/file-upload.policy";
import { NotificationOutboxEntity } from "../notifications/entities/notification-outbox.entity";

@Controller("health")
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationOutboxEntity)
    private readonly notificationsRepository: Repository<NotificationOutboxEntity>
  ) {}

  @Get()
  async getHealth() {
    await this.dataSource.query("select 1");

    return {
      status: "ok",
      database: "ok",
      app: "smeta-market",
      stage: 1,
      timezone: APP_TIMEZONE,
      currency: APP_CURRENCY,
      foundation: STAGE_ONE_CHECKLIST
    };
  }

  @Get("integrations")
  @RequirePermissions("settings.manage")
  async getIntegrationHealth() {
    await this.dataSource.query("select 1");
    const [pendingNotifications, failedNotifications, deadLetterNotifications] = await Promise.all([
      this.notificationsRepository.count({
        where: {
          status: "pending"
        }
      }),
      this.notificationsRepository.count({
        where: {
          status: "failed"
        }
      }),
      this.notificationsRepository.count({
        where: {
          status: "dead_letter"
        }
      })
    ]);
    const uploadDirectory = getUploadDirectory();
    const telegramBotConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    const objectStorageConfigured = Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

    return {
      checkedAt: new Date(),
      database: {
        status: "ok"
      },
      notifications: {
        deadLetter: deadLetterNotifications,
        failed: failedNotifications,
        pending: pendingNotifications,
        status: deadLetterNotifications > 0 ? "attention" : "ok"
      },
      objectStorage: {
        configured: objectStorageConfigured,
        mode: objectStorageConfigured ? "s3_compatible" : "local_private",
        status: objectStorageConfigured || process.env.NODE_ENV !== "production" ? "ok" : "missing_configuration"
      },
      telegram: {
        botConfigured: telegramBotConfigured,
        status: telegramBotConfigured || process.env.NODE_ENV !== "production" ? "ok" : "missing_configuration"
      },
      uploads: {
        directory: uploadDirectory,
        exists: existsSync(uploadDirectory),
        status: existsSync(uploadDirectory) || process.env.NODE_ENV !== "production" ? "ok" : "missing_directory"
      }
    };
  }
}

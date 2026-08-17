import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  APP_CURRENCY,
  APP_TIMEZONE,
  DEFAULT_DEALER_REWARD_RATE,
  DEFAULT_REGIONS,
  DEFAULT_STORE_COMMISSION_RATE,
  MATERIAL_CATEGORIES
} from "@smeta/shared";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { AppSettingEntity } from "./entities/app-setting.entity";

const SETTINGS_KEY = "v1_defaults";

type V1Settings = {
  categories: string[];
  currency: string;
  dealerRewardRate: number;
  debtDueDays: number;
  regions: string[];
  requestDeadlineSeconds: number;
  storeAcceptanceTimeoutSeconds: number;
  storeCommissionRate: number;
  timezone: string;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettingEntity)
    private readonly settingsRepository: Repository<AppSettingEntity>,
    private readonly auditService: AuditService
  ) {}

  async defaults(): Promise<V1Settings> {
    const stored = await this.settingsRepository.findOne({
      where: {
        key: SETTINGS_KEY
      }
    });

    return {
      ...this.defaultSettings(),
      ...((stored?.value as Partial<V1Settings> | undefined) ?? {})
    };
  }

  async update(dto: UpdateSettingsDto) {
    const previous = await this.defaults();
    const next = {
      ...previous,
      ...this.clean(dto)
    };
    let row = await this.settingsRepository.findOne({
      where: {
        key: SETTINGS_KEY
      }
    });

    if (!row) {
      row = this.settingsRepository.create({
        key: SETTINGS_KEY,
        value: next
      });
    } else {
      row.value = next;
    }

    const saved = await this.settingsRepository.save(row);

    await this.auditService.record({
      action: "settings.updated",
      entityId: saved.id,
      entityType: "app_setting",
      metadata: {
        key: SETTINGS_KEY,
        next,
        previous
      }
    });

    return next;
  }

  private defaultSettings(): V1Settings {
    return {
      categories: [...MATERIAL_CATEGORIES],
      currency: APP_CURRENCY,
      dealerRewardRate: Number(process.env.DEFAULT_DEALER_REWARD_RATE ?? DEFAULT_DEALER_REWARD_RATE),
      debtDueDays: Number(process.env.DEBT_DUE_DAYS ?? 7),
      regions: [...DEFAULT_REGIONS],
      requestDeadlineSeconds: Number(process.env.REQUEST_DEADLINE_SECONDS ?? 7200),
      storeAcceptanceTimeoutSeconds: Number(process.env.STORE_ACCEPTANCE_TIMEOUT_SECONDS ?? 3600),
      storeCommissionRate: Number(process.env.DEFAULT_STORE_COMMISSION_RATE ?? DEFAULT_STORE_COMMISSION_RATE),
      timezone: APP_TIMEZONE
    };
  }

  private clean(dto: UpdateSettingsDto): Partial<V1Settings> {
    return Object.fromEntries(
      Object.entries(dto)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : value])
    );
  }
}

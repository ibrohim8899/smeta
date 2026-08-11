import { Controller, Get } from "@nestjs/common";
import {
  APP_CURRENCY,
  APP_TIMEZONE,
  DEFAULT_DEALER_REWARD_RATE,
  DEFAULT_REGIONS,
  DEFAULT_STORE_COMMISSION_RATE,
  MATERIAL_CATEGORIES
} from "@smeta/shared";

@Controller("settings")
export class SettingsController {
  @Get("defaults")
  getDefaults() {
    return {
      categories: MATERIAL_CATEGORIES,
      currency: APP_CURRENCY,
      dealerRewardRate: Number(process.env.DEFAULT_DEALER_REWARD_RATE ?? DEFAULT_DEALER_REWARD_RATE),
      regions: DEFAULT_REGIONS,
      storeCommissionRate: Number(process.env.DEFAULT_STORE_COMMISSION_RATE ?? DEFAULT_STORE_COMMISSION_RATE),
      timezone: APP_TIMEZONE
    };
  }
}

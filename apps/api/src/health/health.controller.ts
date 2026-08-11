import { Controller, Get } from "@nestjs/common";
import { APP_CURRENCY, APP_TIMEZONE, STAGE_ONE_CHECKLIST } from "@smeta/shared";
import { DataSource } from "typeorm";

@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

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
}

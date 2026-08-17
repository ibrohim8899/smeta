import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("v1-summary")
  @RequirePermissions("reports.read")
  v1Summary() {
    return this.reportsService.v1Summary();
  }

  @Get("v1-summary.csv")
  @RequirePermissions("reports.read")
  async v1SummaryCsv(@Res() response: Response) {
    const csv = await this.reportsService.v1SummaryCsv();
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="smeta-market-v1-summary.csv"');
    return response.send(csv);
  }
}

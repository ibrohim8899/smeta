import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findLatest(@Query("limit") limit?: string) {
    return this.auditService.findLatest(limit ? Number(limit) : 100);
  }
}

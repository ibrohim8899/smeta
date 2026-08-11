import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions("audit.read")
  findLatest(@Query("limit") limit?: string) {
    return this.auditService.findLatest(limit ? Number(limit) : 100);
  }
}

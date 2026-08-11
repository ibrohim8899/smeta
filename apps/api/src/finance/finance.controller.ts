import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { FinanceService } from "./finance.service";

@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("ledger")
  @RequirePermissions("finance.read")
  findAll() {
    return this.financeService.findAll();
  }

  @Get("summary")
  @RequirePermissions("finance.read")
  summary() {
    return this.financeService.summary();
  }

  @Post("orders/:orderId/snapshot")
  @RequirePermissions("finance.record_payment")
  createSnapshotForOrder(@Param("orderId") orderId: string) {
    return this.financeService.createSnapshotForOrder(orderId);
  }

  @Patch("ledger/:ledgerId/payment")
  @RequirePermissions("finance.record_payment")
  recordPayment(@Param("ledgerId") ledgerId: string, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayment(ledgerId, dto);
  }
}

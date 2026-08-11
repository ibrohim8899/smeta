import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { FinanceService } from "./finance.service";

@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("ledger")
  findAll() {
    return this.financeService.findAll();
  }

  @Get("summary")
  summary() {
    return this.financeService.summary();
  }

  @Post("orders/:orderId/snapshot")
  createSnapshotForOrder(@Param("orderId") orderId: string) {
    return this.financeService.createSnapshotForOrder(orderId);
  }

  @Patch("ledger/:ledgerId/payment")
  recordPayment(@Param("ledgerId") ledgerId: string, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayment(ledgerId, dto);
  }
}

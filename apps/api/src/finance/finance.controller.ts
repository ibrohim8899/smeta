import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreatePayoutDto } from "./dto/create-payout.dto";
import { RecordAdjustmentDto } from "./dto/record-adjustment.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { UpdatePayoutStatusDto } from "./dto/update-payout-status.dto";
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

  @Get("ledger/:ledgerId/payments")
  @RequirePermissions("finance.read")
  findPayments(@Param("ledgerId") ledgerId: string) {
    return this.financeService.findPayments(ledgerId);
  }

  @Get("statements/store/:storeId")
  @RequirePermissions("finance.read")
  storeStatement(@Param("storeId") storeId: string) {
    return this.financeService.storeStatement(storeId);
  }

  @Get("statements/dealer/:dealerId")
  @RequirePermissions("finance.read")
  dealerStatement(@Param("dealerId") dealerId: string) {
    return this.financeService.dealerStatement(dealerId);
  }

  @Get("payouts")
  @RequirePermissions("finance.read")
  findPayouts() {
    return this.financeService.findPayouts();
  }

  @Get("dealers/:dealerId/payouts")
  @RequirePermissions("finance.read")
  findDealerPayouts(@Param("dealerId") dealerId: string) {
    return this.financeService.findPayouts(dealerId);
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

  @Post("ledger/:ledgerId/adjustment")
  @RequirePermissions("finance.record_payment")
  recordAdjustment(@Param("ledgerId") ledgerId: string, @Body() dto: RecordAdjustmentDto) {
    return this.financeService.recordAdjustment(ledgerId, dto);
  }

  @Post("payouts")
  @RequirePermissions("finance.record_payment")
  createPayout(@Body() dto: CreatePayoutDto) {
    return this.financeService.createPayout(dto);
  }

  @Patch("payouts/:payoutId/status")
  @RequirePermissions("finance.record_payment")
  updatePayoutStatus(@Param("payoutId") payoutId: string, @Body() dto: UpdatePayoutStatusDto) {
    return this.financeService.updatePayoutStatus(payoutId, dto);
  }
}

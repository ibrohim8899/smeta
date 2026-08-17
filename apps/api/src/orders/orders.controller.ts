import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ConfirmDeliveryDto } from "./dto/confirm-delivery.dto";
import { ResolveOrderDisputeDto } from "./dto/resolve-order-dispute.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("material-requests/:requestId/select-offer/:offerId")
  @RequirePermissions("offers.select")
  selectOffer(@Param("requestId") requestId: string, @Param("offerId") offerId: string) {
    return this.ordersService.selectOffer(requestId, offerId);
  }

  @Get("material-requests/:requestId/order")
  @RequirePermissions("orders.read")
  findByRequest(@Param("requestId") requestId: string) {
    return this.ordersService.findByRequest(requestId);
  }

  @Get("orders")
  @RequirePermissions("orders.read")
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch("orders/:orderId/status")
  @RequirePermissions("orders.fulfill")
  updateStatus(@Param("orderId") orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, dto);
  }

  @Post("orders/:orderId/confirm-delivery")
  @RequirePermissions("orders.confirm")
  confirmDelivery(@Param("orderId") orderId: string, @Body() dto: ConfirmDeliveryDto) {
    return this.ordersService.confirmDelivery(orderId, dto);
  }

  @Post("orders/:orderId/resolve-dispute")
  @RequirePermissions("requests.moderate")
  resolveDispute(@Param("orderId") orderId: string, @Body() dto: ResolveOrderDisputeDto) {
    return this.ordersService.resolveDispute(orderId, dto);
  }
}

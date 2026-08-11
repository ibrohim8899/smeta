import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("material-requests/:requestId/select-offer/:offerId")
  selectOffer(@Param("requestId") requestId: string, @Param("offerId") offerId: string) {
    return this.ordersService.selectOffer(requestId, offerId);
  }

  @Get("material-requests/:requestId/order")
  findByRequest(@Param("requestId") requestId: string) {
    return this.ordersService.findByRequest(requestId);
  }

  @Get("orders")
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch("orders/:orderId/status")
  updateStatus(@Param("orderId") orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(orderId, dto);
  }
}

import { Module } from "@nestjs/common";
import { MaterialRequestsModule } from "../material-requests/material-requests.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { InternalController } from "./internal.controller";

@Module({
  controllers: [InternalController],
  imports: [MaterialRequestsModule, NotificationsModule, OrdersModule]
})
export class InternalModule {}

import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { MaterialRequestsService } from "../material-requests/material-requests.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";

type WorkerBody = {
  channel?: string;
  limit?: number;
};

@Controller("internal")
export class InternalController {
  constructor(
    private readonly materialRequestsService: MaterialRequestsService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersService: OrdersService
  ) {}

  @Post("notifications/process")
  processNotifications(@Headers("x-internal-worker-secret") secret: string | undefined, @Body() body: WorkerBody) {
    this.assertInternalSecret(secret);
    return this.notificationsService.processDue({
      channel: body.channel,
      limit: body.limit
    });
  }

  @Post("deadlines/process")
  async processDeadlines(@Headers("x-internal-worker-secret") secret: string | undefined) {
    this.assertInternalSecret(secret);
    const [requests, orders] = await Promise.all([
      this.materialRequestsService.processDeadlines(),
      this.ordersService.processAcceptanceTimeouts()
    ]);

    return {
      orders,
      requests
    };
  }

  @Post("files/cleanup")
  cleanupFiles(@Headers("x-internal-worker-secret") secret: string | undefined) {
    this.assertInternalSecret(secret);
    return this.materialRequestsService.cleanupUnreferencedUploads();
  }

  private assertInternalSecret(secret: string | undefined) {
    const expected = process.env.INTERNAL_WORKER_SECRET;

    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Internal worker secret noto'g'ri yoki sozlanmagan");
    }
  }
}

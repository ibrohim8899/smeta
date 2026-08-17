import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ClaimNotificationDto } from "./dto/claim-notification.dto";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationStatusDto } from "./dto/update-notification-status.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions("notifications.read")
  findLatest(@Query("limit") limit?: string, @Query("status") status?: string, @Query("channel") channel?: string) {
    return this.notificationsService.findLatest(limit ? Number(limit) : 100, status, channel);
  }

  @Get("due")
  @RequirePermissions("notifications.manage")
  findDue(@Query("limit") limit?: string, @Query("channel") channel?: string) {
    return this.notificationsService.findDue(limit ? Number(limit) : 50, channel);
  }

  @Post("claim-next")
  @RequirePermissions("notifications.manage")
  claimNext(@Body() dto: ClaimNotificationDto) {
    return this.notificationsService.claimNext(dto);
  }

  @Post()
  @RequirePermissions("notifications.manage")
  createManual(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createManual(dto);
  }

  @Patch(":id/status")
  @RequirePermissions("notifications.manage")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateNotificationStatusDto) {
    return this.notificationsService.updateStatus(id, dto);
  }

  @Post(":id/retry")
  @RequirePermissions("notifications.manage")
  retry(@Param("id") id: string) {
    return this.notificationsService.retry(id);
  }
}

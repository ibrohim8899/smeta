import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationStatusDto } from "./dto/update-notification-status.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findLatest(@Query("limit") limit?: string, @Query("status") status?: string) {
    return this.notificationsService.findLatest(limit ? Number(limit) : 100, status);
  }

  @Post()
  createManual(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createManual(dto);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateNotificationStatusDto) {
    return this.notificationsService.updateStatus(id, dto);
  }
}

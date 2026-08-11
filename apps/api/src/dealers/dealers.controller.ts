import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateDealerDto } from "./dto/create-dealer.dto";
import { UpdateDealerStatusDto } from "./dto/update-dealer-status.dto";
import { DealersService } from "./dealers.service";

@Controller("dealers")
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Post()
  @RequirePermissions("dealers.apply")
  create(@Body() dto: CreateDealerDto) {
    return this.dealersService.create(dto);
  }

  @Get()
  @RequirePermissions("dealers.read")
  findAll() {
    return this.dealersService.findAll();
  }

  @Get("referral/:referralCode")
  findByReferralCode(@Param("referralCode") referralCode: string) {
    return this.dealersService.findByReferralCode(referralCode);
  }

  @Patch(":id/status")
  @RequirePermissions("dealers.moderate")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateDealerStatusDto) {
    return this.dealersService.updateStatus(id, dto);
  }
}

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

  @Get(":id/referral-tools")
  @RequirePermissions("dealers.read")
  referralTools(@Param("id") id: string) {
    return this.dealersService.referralTools(id);
  }

  @Post(":id/referral/rotate")
  @RequirePermissions("dealers.moderate")
  rotateReferral(@Param("id") id: string) {
    return this.dealersService.rotateReferral(id);
  }

  @Get(":id/requests")
  @RequirePermissions("dealers.read")
  attributedRequests(@Param("id") id: string) {
    return this.dealersService.attributedRequests(id);
  }

  @Get(":id/summary")
  @RequirePermissions("dealers.read")
  summary(@Param("id") id: string) {
    return this.dealersService.summary(id);
  }

  @Patch(":id/status")
  @RequirePermissions("dealers.moderate")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateDealerStatusDto) {
    return this.dealersService.updateStatus(id, dto);
  }
}

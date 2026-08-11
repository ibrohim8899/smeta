import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateDealerDto } from "./dto/create-dealer.dto";
import { UpdateDealerStatusDto } from "./dto/update-dealer-status.dto";
import { DealersService } from "./dealers.service";

@Controller("dealers")
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Post()
  create(@Body() dto: CreateDealerDto) {
    return this.dealersService.create(dto);
  }

  @Get()
  findAll() {
    return this.dealersService.findAll();
  }

  @Get("referral/:referralCode")
  findByReferralCode(@Param("referralCode") referralCode: string) {
    return this.dealersService.findByReferralCode(referralCode);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateDealerStatusDto) {
    return this.dealersService.updateStatus(id, dto);
  }
}

import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { UserRole } from "@smeta/shared";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { AssignStoresDto } from "./dto/assign-stores.dto";
import { CreateStoreOfferDto } from "./dto/create-store-offer.dto";
import { DeclineRequestDto } from "./dto/decline-request.dto";
import { WithdrawOfferDto } from "./dto/withdraw-offer.dto";
import { OffersService } from "./offers.service";

@Controller("material-requests/:requestId")
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post("assign-stores")
  @RequirePermissions("requests.assign_stores")
  assignStores(@Param("requestId") requestId: string, @Body() dto: AssignStoresDto) {
    return this.offersService.assignStores(requestId, dto);
  }

  @Get("recipients")
  @RequirePermissions("requests.read")
  findRecipients(@Param("requestId") requestId: string) {
    return this.offersService.findRecipients(requestId);
  }

  @Post("offers")
  @RequirePermissions("offers.create")
  createOffer(@Param("requestId") requestId: string, @Body() dto: CreateStoreOfferDto) {
    return this.offersService.createOffer(requestId, dto);
  }

  @Post("stores/:storeId/decline")
  @RequirePermissions("offers.create")
  declineRequest(@Param("requestId") requestId: string, @Param("storeId") storeId: string, @Body() dto: DeclineRequestDto) {
    return this.offersService.declineRequest(requestId, storeId, dto);
  }

  @Post("offers/:offerId/withdraw")
  @RequirePermissions("offers.create")
  withdrawOffer(@Param("requestId") requestId: string, @Param("offerId") offerId: string, @Body() dto: WithdrawOfferDto) {
    return this.offersService.withdrawOffer(requestId, offerId, dto);
  }

  @Get("offers")
  @RequirePermissions("offers.read")
  findOffers(
    @Param("requestId") requestId: string,
    @Query("storeId") storeId: string | undefined,
    @Req() request: { smetaAuth?: { role: UserRole; userId: string | null } }
  ) {
    return this.offersService.findOffers(requestId, {
      role: request.smetaAuth?.role,
      storeId
    });
  }
}

import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { AssignStoresDto } from "./dto/assign-stores.dto";
import { CreateStoreOfferDto } from "./dto/create-store-offer.dto";
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

  @Get("offers")
  @RequirePermissions("offers.read")
  findOffers(@Param("requestId") requestId: string) {
    return this.offersService.findOffers(requestId);
  }
}

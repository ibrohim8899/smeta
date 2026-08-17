import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreProfileDto } from "./dto/update-store-profile.dto";
import { UpdateStoreStatusDto } from "./dto/update-store-status.dto";
import { StoresService } from "./stores.service";

@Controller("stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @RequirePermissions("stores.manage")
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Post("apply")
  apply(@Body() dto: CreateStoreDto) {
    return this.storesService.apply(dto);
  }

  @Get()
  @RequirePermissions("stores.read")
  findAll() {
    return this.storesService.findAll();
  }

  @Get(":id")
  @RequirePermissions("stores.read")
  findOne(@Param("id") id: string) {
    return this.storesService.findOne(id);
  }

  @Patch(":id/profile")
  @RequirePermissions("stores.manage")
  updateProfile(@Param("id") id: string, @Body() dto: UpdateStoreProfileDto) {
    return this.storesService.updateProfile(id, dto);
  }

  @Patch(":id/status")
  @RequirePermissions("stores.manage")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateStoreStatusDto) {
    return this.storesService.updateStatus(id, dto);
  }

  @Get(":id/inbox")
  @RequirePermissions("stores.read")
  inbox(@Param("id") id: string) {
    return this.storesService.inbox(id);
  }
}

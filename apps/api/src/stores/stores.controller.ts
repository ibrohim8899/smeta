import { Body, Controller, Get, Post } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateStoreDto } from "./dto/create-store.dto";
import { StoresService } from "./stores.service";

@Controller("stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @RequirePermissions("stores.manage")
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get()
  @RequirePermissions("stores.read")
  findAll() {
    return this.storesService.findAll();
  }
}

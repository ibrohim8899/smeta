import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { UpdateUserAccessDto } from "./dto/update-user-access.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("settings.manage")
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(":id/access")
  @RequirePermissions("settings.manage")
  updateAccess(@Param("id") id: string, @Body() dto: UpdateUserAccessDto) {
    return this.usersService.updateAccess(id, dto);
  }
}

import { Body, Controller, Get, Patch } from "@nestjs/common";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("defaults")
  getDefaults() {
    return this.settingsService.defaults();
  }

  @Get()
  @RequirePermissions("settings.manage")
  getManagedSettings() {
    return this.settingsService.defaults();
  }

  @Patch()
  @RequirePermissions("settings.manage")
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}

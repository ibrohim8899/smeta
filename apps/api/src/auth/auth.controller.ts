import { Controller, Get, Headers } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  me(@Headers("x-smeta-role") role?: string) {
    return this.authService.getSession(role);
  }

  @Get("permissions")
  permissions() {
    return this.authService.getPermissionMatrix();
  }
}

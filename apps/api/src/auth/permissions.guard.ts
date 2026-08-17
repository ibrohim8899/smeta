import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_PERMISSIONS, type Permission, type UserRole } from "@smeta/shared";
import { AuthService } from "./auth.service";
import { REQUIRED_PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      smetaAuth?: { role: UserRole; userId: string | null };
    }>();
    const sessionToken = this.firstHeaderValue(request.headers["x-smeta-session"]);
    const session = sessionToken
      ? await this.authService.verifySessionToken(sessionToken)
      : this.authService.getLocalPreviewSession(this.firstHeaderValue(request.headers["x-smeta-role"]));
    const permissions = ROLE_PERMISSIONS[session.role];
    const allowed = requiredPermissions.every((permission) => permissions.includes(permission));

    if (!allowed) {
      throw new ForbiddenException("Bu amal uchun ruxsat yetarli emas");
    }

    request.smetaAuth = {
      role: session.role,
      userId: session.userId
    };

    return true;
  }

  private firstHeaderValue(headerValue: string | string[] | undefined) {
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  }
}

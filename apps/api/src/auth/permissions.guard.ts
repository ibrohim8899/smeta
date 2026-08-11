import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_PERMISSIONS, USER_ROLES, type Permission, type UserRole } from "@smeta/shared";
import { REQUIRED_PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const role = this.resolveRole(request.headers["x-smeta-role"]);
    const permissions = ROLE_PERMISSIONS[role];
    const allowed = requiredPermissions.every((permission) => permissions.includes(permission));

    if (!allowed) {
      throw new ForbiddenException("Bu amal uchun ruxsat yetarli emas");
    }

    return true;
  }

  private resolveRole(headerValue: string | string[] | undefined): UserRole {
    const rawRole = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (USER_ROLES.includes(rawRole as UserRole)) {
      return rawRole as UserRole;
    }

    if (process.env.NODE_ENV === "development") {
      return "superadmin";
    }

    throw new ForbiddenException("Sessiya yoki rol topilmadi");
  }
}

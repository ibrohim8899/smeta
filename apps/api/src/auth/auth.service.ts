import { Injectable } from "@nestjs/common";
import { ROLE_LABELS, ROLE_PERMISSIONS, USER_ROLES, type UserRole } from "@smeta/shared";

@Injectable()
export class AuthService {
  getSession(role?: string) {
    const currentRole = this.normalizeRole(role);

    return {
      accountStatus: "active",
      displayName: ROLE_LABELS[currentRole],
      permissions: ROLE_PERMISSIONS[currentRole],
      role: currentRole,
      roleLabel: ROLE_LABELS[currentRole],
      source: "local_role_preview"
    };
  }

  getPermissionMatrix() {
    return USER_ROLES.map((role) => ({
      permissions: ROLE_PERMISSIONS[role],
      role,
      roleLabel: ROLE_LABELS[role]
    }));
  }

  private normalizeRole(role?: string): UserRole {
    return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "superadmin";
  }
}

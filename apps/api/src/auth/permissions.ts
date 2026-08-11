import { ROLE_PERMISSIONS, type Permission, type UserRole } from "@smeta/shared";

export function roleCan(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleCanEvery(role: UserRole, permissions: Permission[]) {
  return permissions.every((permission) => roleCan(role, permission));
}

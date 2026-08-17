import { IsIn } from "class-validator";
import { USER_ROLES, type UserRole } from "@smeta/shared";

export class SwitchRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;
}

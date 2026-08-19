import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { ACCOUNT_STATUSES, USER_ROLES, type AccountStatus, type UserRole } from "@smeta/shared";

export class UpdateUserAccessDto {
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsArray()
  @IsIn(USER_ROLES, { each: true })
  @IsOptional()
  roles?: UserRole[];

  @IsIn(ACCOUNT_STATUSES)
  @IsOptional()
  status?: AccountStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

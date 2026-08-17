import { IsIn, IsOptional, IsString } from "class-validator";
import { USER_ROLES, type UserRole } from "@smeta/shared";

export class CreateBrowserLoginDto {
  @IsOptional()
  @IsIn(USER_ROLES)
  requestedRole?: UserRole;
}

export class ConfirmBrowserLoginDto {
  @IsOptional()
  @IsString()
  initData?: string;

  @IsOptional()
  @IsString()
  telegramUserId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  telegramUsername?: string;
}

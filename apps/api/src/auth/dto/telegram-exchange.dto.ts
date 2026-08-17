import { IsIn, IsOptional, IsString } from "class-validator";
import { USER_ROLES, type UserRole } from "@smeta/shared";

export class TelegramExchangeDto {
  @IsString()
  initData!: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  requestedRole?: UserRole;
}

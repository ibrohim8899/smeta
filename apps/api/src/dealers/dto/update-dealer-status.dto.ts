import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateDealerStatusDto {
  @IsIn(["pending", "approved", "rejected", "suspended", "archived"])
  status!: string;

  @IsOptional()
  @IsBoolean()
  referralActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

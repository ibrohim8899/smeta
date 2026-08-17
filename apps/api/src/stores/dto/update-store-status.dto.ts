import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStoreStatusDto {
  @IsIn(["pending", "approved", "rejected", "suspended", "archived"])
  status!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

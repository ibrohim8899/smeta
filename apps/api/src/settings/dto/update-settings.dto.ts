import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  regions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  storeCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  dealerRewardRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  debtDueDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  requestDeadlineSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  storeAcceptanceTimeoutSeconds?: number;
}

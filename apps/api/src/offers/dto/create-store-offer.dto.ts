import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateStoreOfferDto {
  @IsString()
  storeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  materialSubtotalUzs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  deliveryFeeUzs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  totalAmountUzs?: number;

  @IsOptional()
  @IsBoolean()
  completeListAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryEstimate?: string;

  @IsOptional()
  @IsBoolean()
  deliveryIncluded?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  validityHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

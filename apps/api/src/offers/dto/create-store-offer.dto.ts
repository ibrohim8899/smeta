import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateStoreOfferDto {
  @IsString()
  storeId!: string;

  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  totalAmountUzs!: number;

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

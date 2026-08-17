import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateStoreDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telegramUserId?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  serviceRegions!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categories!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;
}

import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";

class CreateAttachmentDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  storageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  scanStatus?: string;
}

export class CreateMaterialRequestDto {
  @IsString()
  @MaxLength(120)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MaxLength(120)
  region!: string;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dealerReferral?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dealerReferralCode?: string;

  @IsIn(["guest_link", "telegram_mini_app", "dealer_assisted"])
  source!: "guest_link" | "telegram_mini_app" | "dealer_assisted";

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments!: CreateAttachmentDto[];
}

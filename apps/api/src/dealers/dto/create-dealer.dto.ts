import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDealerDto {
  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MaxLength(120)
  region!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telegramUserId?: string;
}

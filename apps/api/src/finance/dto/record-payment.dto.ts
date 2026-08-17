import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class RecordPaymentDto {
  @IsInt()
  @IsPositive()
  amountUzs!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  proofFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

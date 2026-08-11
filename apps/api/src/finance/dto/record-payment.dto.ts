import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class RecordPaymentDto {
  @IsInt()
  @IsPositive()
  amountUzs!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

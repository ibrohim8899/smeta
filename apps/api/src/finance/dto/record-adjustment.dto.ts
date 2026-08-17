import { IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class RecordAdjustmentDto {
  @IsInt()
  amountUzs!: number;

  @IsIn(["adjustment", "waiver", "reversal"])
  type!: "adjustment" | "waiver" | "reversal";

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  proofFileName?: string;
}

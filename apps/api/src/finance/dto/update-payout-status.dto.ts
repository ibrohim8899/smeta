import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdatePayoutStatusDto {
  @IsIn(["approved", "paid", "canceled"])
  status!: "approved" | "paid" | "canceled";

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

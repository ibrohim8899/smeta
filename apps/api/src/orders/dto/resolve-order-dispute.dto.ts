import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ResolveOrderDisputeDto {
  @IsIn(["complete", "cancel", "reopen"])
  outcome!: "complete" | "cancel" | "reopen";

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  finalAmountUzs?: number;
}

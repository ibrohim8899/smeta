import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateOrderStatusDto {
  @IsIn([
    "pending_store_acceptance",
    "accepted",
    "preparing",
    "ready",
    "dispatched",
    "delivered_pending_confirmation",
    "completed",
    "canceled",
    "disputed"
  ])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  proofFileName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  finalAmountUzs?: number;
}

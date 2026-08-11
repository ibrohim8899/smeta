import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

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
}

import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMaterialRequestStatusDto {
  @IsIn([
    "submitted",
    "under_review",
    "correction_required",
    "published",
    "collecting_offers",
    "selection_open",
    "selected",
    "completed",
    "expired",
    "canceled",
    "disputed"
  ])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

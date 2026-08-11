import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateNotificationStatusDto {
  @IsIn(["pending", "sent", "failed", "skipped"])
  status!: string;

  @IsOptional()
  @IsString()
  error?: string;
}

import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateNotificationStatusDto {
  @IsIn(["pending", "processing", "sent", "failed", "skipped", "dead_letter"])
  status!: string;

  @IsOptional()
  @IsString()
  error?: string;
}

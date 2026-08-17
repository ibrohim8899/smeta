import { IsIn, IsOptional, IsString } from "class-validator";

export class ClaimNotificationDto {
  @IsOptional()
  @IsIn(["web", "telegram"])
  channel?: string;

  @IsOptional()
  @IsString()
  workerId?: string;
}

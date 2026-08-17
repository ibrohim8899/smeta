import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateNotificationDto {
  @IsIn(["web", "telegram"])
  @IsOptional()
  channel?: string;

  @IsNotEmpty()
  @IsString()
  recipientRole!: string;

  @IsOptional()
  @IsString()
  recipientRef?: string;

  @IsNotEmpty()
  @IsString()
  eventType!: string;

  @IsNotEmpty()
  @IsString()
  titleUz!: string;

  @IsNotEmpty()
  @IsString()
  bodyUz!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

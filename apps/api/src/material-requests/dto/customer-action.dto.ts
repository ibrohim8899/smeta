import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateGuestContactDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNote?: string;
}

export class CustomerCancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CustomerDisputeDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class GuestConfirmDeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  finalAmountUzs?: number;
}

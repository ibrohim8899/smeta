import { IsOptional, IsString, MaxLength } from "class-validator";

export class WithdrawOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

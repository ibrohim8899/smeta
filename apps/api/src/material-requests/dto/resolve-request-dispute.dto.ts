import { IsIn, IsString, MaxLength } from "class-validator";

export class ResolveRequestDisputeDto {
  @IsIn(["cancel", "reopen"])
  outcome!: "cancel" | "reopen";

  @IsString()
  @MaxLength(500)
  reason!: string;
}

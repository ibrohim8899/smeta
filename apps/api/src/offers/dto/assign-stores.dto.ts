import { ArrayMaxSize, IsArray, IsOptional, IsString } from "class-validator";

export class AssignStoresDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  storeIds?: string[];
}

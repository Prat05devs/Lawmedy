import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
export class RazorpayCredentialsDto {
  @IsOptional()
  @IsString()
  @Matches(/^rzp_(test|live)_[A-Za-z0-9]+$/)
  keyId?: string;
  @IsOptional() @IsString() @Length(16, 256) keySecret?: string;
  @IsOptional() @IsString() @Length(16, 256) webhookSecret?: string;
}
export class PaymentModeDto {
  @IsIn(["live", "test"]) mode!: "live" | "test";
}
export class GeminiKeyDto {
  @IsString() @Length(1, 80) label!: string;
  @IsOptional() @IsString() @Length(20, 256) apiKey?: string;
  @IsBoolean() enabled!: boolean;
  @IsInt() @Min(0) @Max(1000) priority!: number;
}
export class GeminiModelDto {
  @IsString() @Length(1, 120) @Matches(/^[A-Za-z0-9._/-]+$/) model!: string;
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @Length(1, 120, { each: true })
  @Matches(/^[A-Za-z0-9._/-]+$/, { each: true })
  fallbackModels!: string[];
}

import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsString,
  Length,
  MaxLength,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean,
  Equals,
  IsOptional,
  Matches,
  IsInt,
  Min,
  IsDateString,
} from "class-validator";
import { GovernmentLevel, MatterType } from "@prisma/client";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @IsString() @Length(8, 72) password!: string;
}
export class SignupDto extends LoginDto {
  @Transform(trim) @IsString() @Length(2, 100) fullName!: string;
}
export class CreateMatterDto {
  @IsEnum(MatterType) type!: MatterType;
}
export class StatementDto {
  @Transform(trim) @IsString() @Length(1, 20000) statement!: string;
}
export class IntakeAnswerDto {
  @IsUUID() questionId!: string;
  @Transform(trim) @IsString() @Length(1, 5000) answer!: string;
}
export class IntakeAnswersDto {
  @IsUUID() analysisId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => IntakeAnswerDto)
  answers!: IntakeAnswerDto[];
}
export class FactSelectionDto {
  @Transform(trim) @IsString() @Length(1, 80) type!: string;
  @IsUUID() caseFactId!: string;
}
export class RecipientDto {
  @Transform(trim) @IsString() @Length(2, 200) name!: string;
  @Transform(trim) @IsString() @Length(5, 2000) address!: string;
  @Transform(trim)
  @IsOptional()
  @Matches(/^[+0-9() -]{7,30}$/)
  phone?: string;
  @Transform(trim) @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}
export class ApplicantDto {
  @Transform(trim) @IsString() @Length(10, 2000) address!: string;
  @Transform(trim)
  @IsOptional()
  @Matches(/^[+0-9() -]{7,30}$/)
  phone?: string;
}
export class ConfirmReviewDto {
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant!: ApplicantDto;
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FactSelectionDto)
  selections!: FactSelectionDto[];
  @ValidateNested()
  @Type(() => RecipientDto)
  @IsOptional()
  recipient?: RecipientDto;
  @IsBoolean() @Equals(true) confirmed!: boolean;
}

export class RtiDetailDto {
  @IsEnum(GovernmentLevel) governmentLevel!: GovernmentLevel;
  @Transform(trim) @IsOptional() @IsString() @Length(2, 100) state?: string;
  @Transform(trim) @IsString() @Length(2, 300) department!: string;
  @IsUUID() publicAuthorityId!: string;
  @Transform(trim) @IsString() @Length(3, 1000) subject!: string;
  @IsOptional() @IsDateString({ strict: true }) periodFrom?: string;
  @IsOptional() @IsDateString({ strict: true }) periodTo?: string;
}

export class AdvocateParagraphDto {
  @Transform(trim) @IsString() @Length(1, 10000) text!: string;
}

export class AdvocateDraftDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @Transform(trim) @IsString() @Length(1, 300) senderName!: string;
  @Transform(trim) @IsOptional() @IsString() @Length(1, 2000) senderAddress?: string;
  @Transform(trim) @IsString() @Length(1, 300) recipientName!: string;
  @Transform(trim) @IsOptional() @IsString() @Length(1, 2000) recipientAddress?: string;
  @Transform(trim) @IsString() @Length(1, 1000) subject!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AdvocateParagraphDto)
  paragraphs!: AdvocateParagraphDto[];
  @Transform(trim) @IsString() @Length(1, 5000) demand!: string;
  @Transform(trim) @IsString() @Length(1, 500) responsePeriod!: string;
}

export class AdvocateRequestDto {
  @Transform(trim) @IsString() @Length(3, 5000) question!: string;
}

export class AdvocateApprovalDto {
  @IsBoolean() @Equals(true) confirmed!: boolean;
}

export class AdvocateResponseDto {
  @IsUUID() questionId!: string;
  @Transform(trim) @IsString() @Length(1, 5000) answer!: string;
}

export class PaymentVerifyDto {
  @IsString() @Length(5, 100) orderId!: string;
  @IsString() @Length(5, 100) paymentId!: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) signature!: string;
}
export class GoogleLoginDto {
  @IsString() @Length(20, 4096) idToken!: string;
}

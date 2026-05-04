import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum P11dBenefitType {
  COMPANY_CAR = 'COMPANY_CAR',
  MEDICAL_INSURANCE = 'MEDICAL_INSURANCE',
  LIFE_INSURANCE = 'LIFE_INSURANCE',
  GYM_MEMBERSHIP = 'GYM_MEMBERSHIP',
  INTEREST_FREE_LOAN = 'INTEREST_FREE_LOAN',
  VOUCHERS = 'VOUCHERS',
  ACCOMMODATION = 'ACCOMMODATION',
  TRAVEL_SUBSISTENCE = 'TRAVEL_SUBSISTENCE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER',
}

export class CreateP11dBenefitDto {
  @IsString()
  taxYear: string; // e.g. "2024-25"

  @IsEnum(P11dBenefitType)
  benefitType: P11dBenefitType;

  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cashEquivalent: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class P60QueryDto {
  @IsString()
  taxYear: string; // e.g. "2024-25"
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

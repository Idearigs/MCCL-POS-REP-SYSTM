import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePayrollRunDto {
  @ApiProperty({ example: '2025-04-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2025-04-30' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ example: '2025-04-25' })
  @IsDateString()
  payDate: string;

  @ApiPropertyOptional({ enum: ['WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY'], default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  payFrequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddPayslipAdjustmentsDto {
  @ApiPropertyOptional({ description: 'Overtime pay for this period' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  overtimePay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusPay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  commissionPay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sickPay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  holidayPay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otherAdditions?: number;

  @ApiPropertyOptional({ description: 'Additional deductions (e.g. salary advance repayment)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otherDeductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

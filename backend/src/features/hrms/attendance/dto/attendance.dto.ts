import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TimesheetEntryDto {
  @ApiProperty({ example: '2025-05-05' })
  @IsDateString()
  entryDate: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '17:30' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  @Type(() => Number)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Override hours (used for leave types when no start/end)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  @Type(() => Number)
  hoursWorked?: number;

  @ApiPropertyOptional({
    enum: ['REGULAR', 'OVERTIME', 'SICK', 'ANNUAL_LEAVE', 'BANK_HOLIDAY', 'TRAINING', 'UNPAID', 'OTHER'],
    default: 'REGULAR',
  })
  @IsOptional()
  @IsString()
  entryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpsertEntriesDto {
  @ApiProperty({ type: [TimesheetEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryDto)
  entries: TimesheetEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectTimesheetDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

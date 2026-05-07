import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FloatStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  BALANCED = 'BALANCED',
  DISCREPANCY = 'DISCREPANCY',
}

export enum FloatTransactionType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  SALE = 'SALE',
  REFUND = 'REFUND',
  EXPENSE = 'EXPENSE',
}

// DTO for opening a new float session
export class OpenFloatSessionDto {
  @ApiPropertyOptional({
    description: 'Register name or identifier',
    example: 'Register 1',
  })
  @IsOptional()
  @IsString()
  registerName?: string;

  @ApiProperty({
    description: 'Opening balance amount',
    example: 200.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance: number;

  @ApiPropertyOptional({
    description: 'Optional notes for opening',
    example: 'Starting shift at 9 AM',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for closing a float session
export class CloseFloatSessionDto {
  @ApiProperty({
    description: 'Actual closing balance counted',
    example: 1450.75,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualClosing: number;

  @ApiPropertyOptional({
    description: 'Notes about the closing',
    example: 'All denominations counted and verified',
  })
  @IsOptional()
  @IsString()
  closingNotes?: string;

  @ApiPropertyOptional({
    description: 'Cash denomination breakdown',
    example: { '50': 10, '20': 25, '10': 30, '5': 40, '1': 50, '0.5': 20 },
  })
  @IsOptional()
  denominationBreakdown?: Record<string, number>;
}

// DTO for recording a float transaction (cash in/out)
export class CreateFloatTransactionDto {
  @ApiProperty({
    description: 'Float session ID',
    example: 'cm5t3x9y8000008l6h9z1b2c3',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: FloatTransactionType,
    example: FloatTransactionType.CASH_IN,
  })
  @IsEnum(FloatTransactionType)
  type: FloatTransactionType;

  @ApiProperty({
    description: 'Transaction amount',
    example: 50.0,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Reason for transaction',
    example: 'Change fund replenishment',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Reference number or ID',
    example: 'REF-001',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Approved by manager',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for querying float sessions
export class GetFloatSessionsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FloatStatus,
  })
  @IsOptional()
  @IsEnum(FloatStatus)
  status?: FloatStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'cm5t3x9y8000008l6h9z1b2c3',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Response DTOs
export class FloatSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  floatNumber: string;

  @ApiPropertyOptional()
  registerName?: string;

  @ApiProperty()
  openingBalance: number;

  @ApiPropertyOptional()
  expectedClosing?: number;

  @ApiPropertyOptional()
  actualClosing?: number;

  @ApiPropertyOptional()
  difference?: number;

  @ApiProperty()
  totalSales: number;

  @ApiProperty()
  totalCashIn: number;

  @ApiProperty()
  totalCashOut: number;

  @ApiProperty()
  totalRefunds: number;

  @ApiProperty({ enum: FloatStatus })
  status: FloatStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  closingNotes?: string;

  @ApiProperty()
  openedAt: Date;

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  user?: any;

  @ApiPropertyOptional()
  transactions?: FloatTransactionResponseDto[];
}

export class FloatTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: FloatTransactionType })
  type: FloatTransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  reference?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  user?: any;
}

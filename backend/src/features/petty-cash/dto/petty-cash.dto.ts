import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PettyCashStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum PettyCashCategory {
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  TRANSPORT = 'TRANSPORT',
  MEALS = 'MEALS',
  UTILITIES = 'UTILITIES',
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  REFRESHMENTS = 'REFRESHMENTS',
  POSTAGE = 'POSTAGE',
  BANKING_FEES = 'BANKING_FEES',
  MISCELLANEOUS = 'MISCELLANEOUS',
  OTHER = 'OTHER',
}

// Account DTOs
export class CreatePettyCashAccountDto {
  @ApiProperty({
    description: 'Account name',
    example: 'Main Branch Petty Cash',
  })
  @IsString()
  accountName: string;

  @ApiPropertyOptional({
    description: 'Register name',
    example: 'Register 1',
  })
  @IsOptional()
  @IsString()
  registerName?: string;

  @ApiPropertyOptional({
    description: 'Location',
    example: 'London Office',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Opening balance',
    example: 500.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance: number;

  @ApiPropertyOptional({
    description: 'Monthly budget limit',
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyBudget?: number;

  @ApiPropertyOptional({
    description: 'Notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePettyCashAccountDto {
  @ApiPropertyOptional({
    description: 'Account name',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({
    description: 'Register name',
  })
  @IsOptional()
  @IsString()
  registerName?: string;

  @ApiPropertyOptional({
    description: 'Location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Monthly budget',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyBudget?: number;

  @ApiPropertyOptional({
    description: 'Is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReplenishPettyCashDto {
  @ApiProperty({
    description: 'Replenishment amount',
    example: 200.0,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Reason for replenishment',
    example: 'Monthly top-up',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Reference number',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

// Transaction DTOs
export class CreatePettyCashTransactionDto {
  @ApiProperty({
    description: 'Petty cash account ID',
    example: 'cm5t3x9y8000008l6h9z1b2c3',
  })
  @IsString()
  accountId: string;

  @ApiProperty({
    description: 'Expense category',
    enum: PettyCashCategory,
    example: PettyCashCategory.OFFICE_SUPPLIES,
  })
  @IsEnum(PettyCashCategory)
  category: PettyCashCategory;

  @ApiProperty({
    description: 'Amount',
    example: 25.5,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Description of expense',
    example: 'Printer paper and pens',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Vendor/payee name',
    example: 'Office Depot',
  })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Receipt number',
    example: 'RCP-12345',
  })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: 'Receipt image path',
  })
  @IsOptional()
  @IsString()
  receiptImage?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Transaction date',
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

export class ApprovePettyCashTransactionDto {
  @ApiPropertyOptional({
    description: 'Approval notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectPettyCashTransactionDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Missing receipt or insufficient documentation',
  })
  @IsString()
  rejectionReason: string;
}

export class GetPettyCashTransactionsDto {
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
    description: 'Filter by account ID',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PettyCashStatus,
  })
  @IsOptional()
  @IsEnum(PettyCashStatus)
  status?: PettyCashStatus;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: PettyCashCategory,
  })
  @IsOptional()
  @IsEnum(PettyCashCategory)
  category?: PettyCashCategory;

  @ApiPropertyOptional({
    description: 'Start date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Response DTOs
export class PettyCashAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  accountNumber: string;

  @ApiPropertyOptional()
  registerName?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  openingBalance: number;

  @ApiProperty()
  currentBalance: number;

  @ApiPropertyOptional()
  monthlyBudget?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  creator?: any;

  @ApiPropertyOptional()
  transactions?: PettyCashTransactionResponseDto[];
}

export class PettyCashTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  transactionNumber: string;

  @ApiProperty({ enum: PettyCashCategory })
  category: PettyCashCategory;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  vendor?: string;

  @ApiPropertyOptional()
  receiptNumber?: string;

  @ApiPropertyOptional()
  receiptImage?: string;

  @ApiProperty({ enum: PettyCashStatus })
  status: PettyCashStatus;

  @ApiProperty()
  requestedBy: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  approvalDate?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  transactionDate: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  requester?: any;

  @ApiPropertyOptional()
  approver?: any;

  @ApiPropertyOptional()
  account?: any;
}

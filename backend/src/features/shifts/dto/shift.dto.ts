import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { ShiftStatus, ShiftCashMovementType } from '@prisma/client';

export class StartShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  openingFloat: number;

  @IsOptional()
  @IsString()
  openingNotes?: string;
}

export class CloseShiftDto {
  // Physical cash counted via the denomination matrix.
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  closingFloat: number;

  // Snapshot of the note/coin count: { "<penceValue>": qty }.
  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;

  // Cashier-entered PDQ "Z-Read" card total for reconciliation.
  @IsOptional()
  @IsNumber()
  @Min(0)
  cardActual?: number;

  // Non-revenue cash taken during the shift.
  @IsOptional()
  @IsNumber()
  @Min(0)
  giftCardSales?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  layawayDeposits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashRefunds?: number;

  // Required (enforced server-side) when the variance is non-zero.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  varianceReason?: string;

  // Required (enforced server-side) when |variance| exceeds the threshold.
  @IsOptional()
  @IsString()
  managerPin?: string;

  @IsOptional()
  @IsString()
  closingNotes?: string;
}

export class CashMovementDto {
  @IsNotEmpty()
  @IsEnum(ShiftCashMovementType)
  type: ShiftCashMovementType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  reason: string;
}

export class AuditResolutionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  auditResolutionNote: string;
}

export class SetCashUpPinDto {
  // 4–6 digit PIN; empty/undefined clears it.
  @IsOptional()
  @IsString()
  pin?: string;
}

export class GetShiftsDto {
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsNotEmpty()
  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}

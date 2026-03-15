import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { ShiftStatus } from '@prisma/client';

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
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  closingFloat: number;

  @IsOptional()
  @IsString()
  closingNotes?: string;
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

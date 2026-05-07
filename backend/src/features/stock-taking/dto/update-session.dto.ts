import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum StockTakeStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  sessionName?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsEnum(StockTakeStatus)
  @IsOptional()
  status?: StockTakeStatus;
}

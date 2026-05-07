import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class ApproveSessionDto {
  @IsBoolean()
  @IsNotEmpty()
  approve: boolean;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsBoolean()
  @IsOptional()
  applyToInventory?: boolean = true;
}

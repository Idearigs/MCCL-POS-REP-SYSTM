import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGiftCardDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  initialBalance: number;

  @ApiPropertyOptional({ example: 'Jane Smith' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  purchasedBy?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Birthday gift' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RedeemGiftCardDto {
  @ApiProperty({ example: 'GC-ABC12345' })
  @IsString()
  code: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'SALE-001' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class ValidateGiftCardDto {
  @ApiProperty({ example: 'GC-ABC12345' })
  @IsString()
  code: string;
}

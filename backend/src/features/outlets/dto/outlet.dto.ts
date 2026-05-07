import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOutletDto {
  @ApiProperty({ example: 'London Outlet' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'LON', description: '2–8 uppercase letters' })
  @IsString()
  @Matches(/^[A-Z0-9]{2,8}$/, {
    message: 'Code must be 2–8 uppercase letters/digits',
  })
  code: string;

  @ApiProperty({ example: 'secure123', minLength: 4 })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateOutletDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,8}$/, {
    message: 'Code must be 2–8 uppercase letters/digits',
  })
  code?: string;

  @ApiPropertyOptional({ description: 'Omit to keep existing password' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class VerifyOutletPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}

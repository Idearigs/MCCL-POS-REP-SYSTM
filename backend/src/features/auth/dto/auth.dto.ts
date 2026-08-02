import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@buymejewellery.co.uk',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiProperty({
    description: 'Company code / subdomain (for multi-tenant login)',
    example: 'buymejewellery',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  companySlug?: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@buymejewellery.co.uk',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @ApiProperty({
    description: 'User role',
    enum: ['OWNER', 'MANAGER', 'STAFF', 'READONLY'],
    example: 'STAFF',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@buymejewellery.co.uk',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abc123def456...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  newPassword: string;
}

export class SetupDevicePinDto {
  @ApiProperty({
    description: 'Opaque device id (client-generated UUID) to bind this PIN to',
    example: '9f1c1e2a-7b3d-4c5e-8f9a-0b1c2d3e4f5a',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  deviceId: string;

  @ApiProperty({ description: '6-digit numeric PIN', example: '246813' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  pin: string;

  @ApiProperty({
    description: 'Human-readable device label',
    example: 'Front till — Chrome',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}

export class UnlockDevicePinDto {
  @ApiProperty({
    description: 'Opaque device id stored on this device at setup',
    example: '9f1c1e2a-7b3d-4c5e-8f9a-0b1c2d3e4f5a',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  deviceId: string;

  @ApiProperty({ description: '6-digit numeric PIN', example: '246813' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  pin: string;

  @ApiProperty({
    description: 'Company code / subdomain (for multi-tenant resolution)',
    example: 'buymejewellery',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  companySlug?: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  };

  @ApiProperty({
    description: 'Tenant information',
    required: false,
  })
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
  };

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
  })
  expiresIn: number;
}

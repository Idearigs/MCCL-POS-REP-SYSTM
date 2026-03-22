import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsDecimal,
  IsInt,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PaginationDto,
  SearchDto,
  SortDto,
} from '../../../shared/dto/pagination.dto';

export enum ContactType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SMS = 'SMS',
}

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer first name',
    example: 'Sarah',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'Customer last name',
    example: 'Johnson',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'sarah.johnson@email.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+44771234567',
  })
  @IsString()
  @MinLength(1, { message: 'Phone number is required' })
  phone: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: '123 Main Street, London',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'London',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'City must not exceed 50 characters' })
  city?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: 'SW1A 1AA',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Postal code must not exceed 20 characters' })
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United Kingdom',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Country must not exceed 50 characters' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Birth date',
    example: '1985-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Anniversary date',
    example: '2010-09-20',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;

  @ApiPropertyOptional({
    description: 'Customer notes',
    example: 'Preferred customer, likes gold jewelry',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Preferred contact method',
    enum: ContactType,
    example: ContactType.EMAIL,
  })
  @IsOptional()
  @IsEnum(ContactType)
  preferredContact?: ContactType;

  // GDPR Compliance fields
  @ApiProperty({
    description: 'Consent for email marketing',
    example: false,
    default: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  marketingEmail: boolean = false;

  @ApiProperty({
    description: 'Consent for SMS marketing',
    example: false,
    default: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  marketingSms: boolean = false;

  @ApiProperty({
    description: 'Consent for phone marketing',
    example: false,
    default: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  marketingPhone: boolean = false;

  @ApiProperty({
    description: 'Consent for data processing (GDPR required)',
    example: true,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  dataProcessingConsent: boolean;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({
    description: 'Mark customer as red flagged',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  redFlag?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for red flag',
    example: 'Payment issues',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Red flag reason must not exceed 200 characters' })
  redFlagReason?: string;

  @ApiPropertyOptional({
    description: 'Customer active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

export class CustomerQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search customers by name, email, or phone',
    example: 'Sarah Johnson',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by red flag status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  redFlag?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by preferred contact method',
    enum: ContactType,
  })
  @IsOptional()
  @IsEnum(ContactType)
  preferredContact?: ContactType;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'firstName',
      'lastName',
      'email',
      'totalSpent',
      'visitCount',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CustomerResponseDto {
  @ApiProperty({ example: 'clv123abc456' })
  id: string;

  @ApiProperty({ example: 'Sarah' })
  firstName: string;

  @ApiProperty({ example: 'Johnson' })
  lastName: string;

  @ApiPropertyOptional({ example: 'sarah.johnson@email.com' })
  email?: string;

  @ApiProperty({ example: '+44771234567' })
  phone: string;

  @ApiPropertyOptional({ example: '123 Main Street, London' })
  address?: string;

  @ApiPropertyOptional({ example: 'London' })
  city?: string;

  @ApiPropertyOptional({ example: 'SW1A 1AA' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'United Kingdom' })
  country?: string;

  @ApiPropertyOptional({ example: '1985-06-15' })
  birthDate?: string;

  @ApiPropertyOptional({ example: '2010-09-20' })
  anniversaryDate?: string;

  @ApiPropertyOptional({ example: 'Preferred customer, likes gold jewelry' })
  notes?: string;

  @ApiProperty({ example: 2850.0 })
  totalSpent: number;

  @ApiProperty({ example: 12 })
  visitCount: number;

  @ApiProperty({ example: 285 })
  loyaltyPoints: number;

  @ApiProperty({ enum: ContactType, example: ContactType.EMAIL })
  preferredContact: ContactType;

  @ApiProperty({ example: false })
  marketingEmail: boolean;

  @ApiProperty({ example: false })
  marketingSms: boolean;

  @ApiProperty({ example: false })
  marketingPhone: boolean;

  @ApiProperty({ example: true })
  dataProcessingConsent: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  consentDate?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  redFlag: boolean;

  @ApiPropertyOptional({ example: 'Payment issues' })
  redFlagReason?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: string;
}

export class CustomerStatsDto {
  @ApiProperty({ example: 1284 })
  totalCustomers: number;

  @ApiProperty({ example: 1200 })
  activeCustomers: number;

  @ApiProperty({ example: 84 })
  inactiveCustomers: number;

  @ApiProperty({ example: 12 })
  redFlaggedCustomers: number;

  @ApiProperty({ example: 45 })
  newCustomersThisMonth: number;

  @ApiProperty({ example: 234500.5 })
  totalSpentAllTime: number;

  @ApiProperty({ example: 182.45 })
  averageSpentPerCustomer: number;

  @ApiProperty({ example: 856 })
  customersWithEmailConsent: number;

  @ApiProperty({ example: 423 })
  customersWithSmsConsent: number;
}

export class GDPRExportDto {
  @ApiProperty({
    description: 'Customer ID to export data for',
    example: 'clv123abc456',
  })
  @IsString()
  customerId: string;
}

export class GDPRDeleteDto {
  @ApiProperty({
    description: 'Customer ID to delete data for',
    example: 'clv123abc456',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Confirmation that user wants to delete all data',
    example: true,
  })
  @IsBoolean()
  confirmDelete: boolean;
}

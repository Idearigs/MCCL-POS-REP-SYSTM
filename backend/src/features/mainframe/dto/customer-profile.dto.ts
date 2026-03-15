import { IsString, IsEmail, IsOptional, IsEnum, IsArray, IsBoolean, MinLength } from 'class-validator';

export enum CustomerProfileStatus {
  PENDING_SETUP = 'PENDING_SETUP',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  MAINTENANCE = 'MAINTENANCE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  BUSINESS = 'BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class CreateCustomerProfileDto {
  @IsString()
  @MinLength(2)
  businessName: string;

  @IsEmail()
  businessEmail: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  @MinLength(3)
  subdomain: string;

  @IsOptional()
  @IsString()
  customDomain?: string;

  @IsString()
  contactFirstName: string;

  @IsString()
  contactLastName: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  // Subscription details
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  // Features to enable
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featureKeys?: string[];
}

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  customDomain?: string;

  @IsOptional()
  @IsEnum(CustomerProfileStatus)
  status?: CustomerProfileStatus;

  @IsOptional()
  @IsString()
  contactFirstName?: string;

  @IsOptional()
  @IsString()
  contactLastName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class CreateCustomerUserDto {
  @IsString()
  customerProfileId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateCustomerUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CustomerProfileResponseDto {
  id: string;
  businessName: string;
  businessEmail: string;
  subdomain: string;
  fullDomain: string;
  status: CustomerProfileStatus;
  contactName: string;
  contactEmail: string;
  subscription?: {
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    currentUsers: number;
    maxUsers: number | null;
    isOnTrial: boolean;
    nextBillingDate: Date;
  };
  enabledFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
}

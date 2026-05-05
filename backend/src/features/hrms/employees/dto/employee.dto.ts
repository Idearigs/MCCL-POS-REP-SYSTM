import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmployeeStatus {
  PROBATION = 'PROBATION',
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  INACTIVE = 'INACTIVE',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  ZERO_HOURS = 'ZERO_HOURS',
  CASUAL = 'CASUAL',
  FIXED_TERM = 'FIXED_TERM',
  CONTRACTOR = 'CONTRACTOR',
  APPRENTICE = 'APPRENTICE',
  INTERN = 'INTERN',
}

export enum ContractType {
  PERMANENT = 'PERMANENT',
  FIXED_TERM = 'FIXED_TERM',
  CASUAL = 'CASUAL',
  AGENCY = 'AGENCY',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  ZERO_HOURS = 'ZERO_HOURS',
}

export enum PayFrequency {
  WEEKLY = 'WEEKLY',
  FORTNIGHTLY = 'FORTNIGHTLY',
  FOUR_WEEKLY = 'FOUR_WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum NiCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  H = 'H',
  J = 'J',
  M = 'M',
  Z = 'Z',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  CIVIL_PARTNERSHIP = 'CIVIL_PARTNERSHIP',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  SEPARATED = 'SEPARATED',
  OTHER = 'OTHER',
}

export enum TitleType {
  MR = 'MR',
  MRS = 'MRS',
  MS = 'MS',
  MISS = 'MISS',
  DR = 'DR',
  PROF = 'PROF',
  OTHER = 'OTHER',
}

export enum StarterDeclaration {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  SHARED_PARENTAL = 'SHARED_PARENTAL',
  COMPASSIONATE = 'COMPASSIONATE',
  JURY_DUTY = 'JURY_DUTY',
  STUDY = 'STUDY',
  UNPAID = 'UNPAID',
  OTHER = 'OTHER',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// ─── Create Employee ──────────────────────────────────────────────────────────

export class CreateEmployeeDto {
  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  title?: TitleType;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ default: 'GB' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @ApiPropertyOptional({ description: 'NI number — stored encrypted' })
  @IsOptional()
  @IsString()
  niNumber?: string;

  @ApiPropertyOptional({ default: '1257L' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ enum: NiCategory })
  @IsOptional()
  @IsEnum(NiCategory)
  niCategory?: NiCategory;

  @ApiPropertyOptional({ enum: PayFrequency })
  @IsOptional()
  @IsEnum(PayFrequency)
  payFrequency?: PayFrequency;

  @ApiPropertyOptional({ example: 28000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salary?: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 37.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  contractedHours?: number;

  @ApiPropertyOptional({ description: 'Bank account name — encrypted' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional({ description: 'Sort code XX-XX-XX — encrypted' })
  @IsOptional()
  @IsString()
  bankSortCode?: string;

  @ApiPropertyOptional({ description: 'Account number — encrypted' })
  @IsOptional()
  @IsString()
  bankAccountNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ enum: StarterDeclaration })
  @IsOptional()
  @IsEnum(StarterDeclaration)
  starterDeclaration?: StarterDeclaration;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  p45Received?: boolean;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualLeaveEntitlement?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentLoanPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rightToWorkChecked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  rightToWorkExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Update Employee ──────────────────────────────────────────────────────────

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ enum: TitleType })
  @IsOptional()
  @IsEnum(TitleType)
  title?: TitleType;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredName?: string;
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ethnicity?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() personalEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() workEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personalPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() county?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() positionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string;
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() niNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxCode?: string;
  @ApiPropertyOptional({ enum: NiCategory })
  @IsOptional()
  @IsEnum(NiCategory)
  niCategory?: NiCategory;
  @ApiPropertyOptional({ enum: PayFrequency })
  @IsOptional()
  @IsEnum(PayFrequency)
  payFrequency?: PayFrequency;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salary?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  hourlyRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  contractedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankSortCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional({ enum: StarterDeclaration })
  @IsOptional()
  @IsEnum(StarterDeclaration)
  starterDeclaration?: StarterDeclaration;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() p45Received?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualLeaveEntitlement?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() studentLoanPlan?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rightToWorkChecked?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  rightToWorkExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyRelation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export class EmployeeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class EmployeeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() employeeNumber: string;

  @ApiPropertyOptional() title?: string;
  @ApiProperty() firstName: string;
  @ApiPropertyOptional() middleName?: string;
  @ApiProperty() lastName: string;
  @ApiProperty() fullName: string;
  @ApiPropertyOptional() preferredName?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() dateOfBirth?: string;
  @ApiPropertyOptional() maritalStatus?: string;
  @ApiPropertyOptional() nationality?: string;
  @ApiPropertyOptional() ethnicity?: string;

  @ApiPropertyOptional() personalEmail?: string;
  @ApiPropertyOptional() workEmail?: string;
  @ApiPropertyOptional() personalPhone?: string;
  @ApiPropertyOptional() workPhone?: string;

  @ApiPropertyOptional() addressLine1?: string;
  @ApiPropertyOptional() addressLine2?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() county?: string;
  @ApiPropertyOptional() postcode?: string;
  @ApiProperty() country: string;

  @ApiPropertyOptional() departmentId?: string;
  @ApiPropertyOptional() departmentName?: string;
  @ApiPropertyOptional() positionId?: string;
  @ApiPropertyOptional() positionTitle?: string;
  @ApiPropertyOptional() managerId?: string;
  @ApiPropertyOptional() jobTitle?: string;

  @ApiProperty() status: string;
  @ApiProperty() employmentType: string;
  @ApiProperty() contractType: string;
  @ApiProperty() startDate: string;
  @ApiPropertyOptional() endDate?: string;
  @ApiPropertyOptional() probationEndDate?: string;
  @ApiPropertyOptional() noticePeriodDays?: number;

  @ApiPropertyOptional({ description: 'Masked NI number' })
  niNumberMasked?: string;
  @ApiPropertyOptional() taxCode?: string;
  @ApiPropertyOptional() niCategory?: string;
  @ApiPropertyOptional() payFrequency?: string;
  @ApiPropertyOptional() salary?: number;
  @ApiPropertyOptional() hourlyRate?: number;
  @ApiPropertyOptional() contractedHours?: number;

  @ApiPropertyOptional() bankName?: string;
  @ApiPropertyOptional({ description: 'Masked sort code' })
  bankSortCodeMasked?: string;
  @ApiPropertyOptional({ description: 'Masked account number' })
  bankAccountNoMasked?: string;

  @ApiPropertyOptional() starterDeclaration?: string;
  @ApiProperty() p45Received: boolean;

  @ApiProperty() pensionEligible: boolean;
  @ApiProperty() pensionEnrolled: boolean;
  @ApiPropertyOptional() employerPensionPct?: number;
  @ApiPropertyOptional() employeePensionPct?: number;

  @ApiProperty() annualLeaveEntitlement: number;
  @ApiPropertyOptional() studentLoanPlan?: string;
  @ApiProperty() rightToWorkChecked: boolean;
  @ApiPropertyOptional() rightToWorkExpiry?: string;

  @ApiPropertyOptional() emergencyName?: string;
  @ApiPropertyOptional() emergencyPhone?: string;
  @ApiPropertyOptional() emergencyRelation?: string;

  @ApiPropertyOptional() notes?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

// ─── Leave Request DTOs ───────────────────────────────────────────────────────

export class CreateLeaveRequestDto {
  @ApiProperty({ enum: LeaveType })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeaveStatusDto {
  @ApiProperty({
    enum: [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
  })
  @IsEnum(LeaveStatus)
  status: LeaveStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

// ─── Department DTOs ──────────────────────────────────────────────────────────

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}

export class DepartmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() code?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() managerId?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() employeeCount: number;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

// ─── Position DTOs ────────────────────────────────────────────────────────────

export class CreatePositionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdatePositionDto extends CreatePositionDto {}

export class PositionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() code?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() department?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

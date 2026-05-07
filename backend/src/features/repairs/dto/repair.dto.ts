import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsUUID,
  ArrayMinSize,
  IsDecimal,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RepairStatus {
  RECEIVED = 'RECEIVED',
  QUOTED = 'QUOTED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  READY_FOR_COLLECTION = 'READY_FOR_COLLECTION',
  COLLECTED = 'COLLECTED',
  CANCELLED = 'CANCELLED',
}

export enum RepairPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RepairType {
  CLEANING = 'CLEANING',
  POLISHING = 'POLISHING',
  SIZING = 'SIZING',
  STONE_SETTING = 'STONE_SETTING',
  PRONG_REPAIR = 'PRONG_REPAIR',
  CHAIN_REPAIR = 'CHAIN_REPAIR',
  CLASP_REPAIR = 'CLASP_REPAIR',
  ENGRAVING = 'ENGRAVING',
  RESTORATION = 'RESTORATION',
  CUSTOM_WORK = 'CUSTOM_WORK',
  OTHER = 'OTHER',
}

export class CreateRepairItemDto {
  @ApiPropertyOptional({
    description: 'Product ID if repairing existing inventory item',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    description: 'Description of the item being repaired',
    example: 'Gold wedding ring with diamond',
  })
  @IsString()
  itemDescription: string;

  @ApiProperty({
    description: 'Type of repair needed',
    enum: RepairType,
    example: RepairType.SIZING,
  })
  @IsEnum(RepairType)
  repairType: RepairType;

  @ApiProperty({
    description: 'Detailed description of the repair work',
    example: 'Resize ring from size 6 to size 7',
  })
  @IsString()
  repairDescription: string;

  @ApiProperty({
    description: 'Estimated cost for this repair item',
    example: 85.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @ApiPropertyOptional({
    description: 'Actual cost for this repair item',
    example: 90.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({
    description: 'Material type of the item',
    example: '14K Gold',
  })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({
    description: 'Weight of the item in grams',
    example: 5.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Special notes about this repair item',
    example: 'Customer mentioned sentimental value',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRepairDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Items to be repaired',
    type: [CreateRepairItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRepairItemDto)
  items: CreateRepairItemDto[];

  @ApiProperty({
    description: 'Problem description provided by customer',
    example: 'Ring is too small and clasp is broken',
  })
  @IsString()
  problemDescription: string;

  @ApiProperty({
    description: 'Priority level of the repair',
    enum: RepairPriority,
    example: RepairPriority.NORMAL,
  })
  @IsEnum(RepairPriority)
  priority: RepairPriority;

  @ApiPropertyOptional({
    description: 'Expected completion date',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Special instructions from customer',
    example: 'Handle with care, very fragile',
  })
  @IsOptional()
  @IsString()
  customerInstructions?: string;

  @ApiPropertyOptional({
    description: 'Internal notes about the repair',
    example: 'Check with senior jeweler before starting',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Deposit amount paid',
    example: 50.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Item description for single item repairs',
    example: 'Gold wedding ring',
  })
  @IsOptional()
  @IsString()
  itemDescription?: string;

  @ApiPropertyOptional({
    description: 'Estimated cost of repair',
    example: 125.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Insurance claim number',
    example: 'INS-2024-001',
  })
  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @ApiPropertyOptional({
    description: 'Insurance value of items',
    example: 1500.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;

  @ApiPropertyOptional({
    description: 'Custom tag ID for categorizing repair',
    example: '1',
  })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    description: 'RMA ID (Return Merchandise Authorization)',
    example: 'RMA-2024-001',
  })
  @IsOptional()
  @IsString()
  rmaId?: string;
}

export class UpdateRepairDto {
  @ApiPropertyOptional({
    description: 'Repair status',
    enum: RepairStatus,
    example: RepairStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({
    description: 'Priority level of the repair',
    enum: RepairPriority,
    example: RepairPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(RepairPriority)
  priority?: RepairPriority;

  @ApiPropertyOptional({
    description: 'Expected completion date',
    example: '2024-01-25',
  })
  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Actual completion date',
    example: '2024-01-22',
  })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Item description',
    example: 'Gold wedding ring',
  })
  @IsOptional()
  @IsString()
  itemDescription?: string;

  @ApiPropertyOptional({
    description: 'Problem description',
    example: 'Ring needs resizing',
  })
  @IsOptional()
  @IsString()
  problemDescription?: string;

  @ApiPropertyOptional({
    description: 'Estimated cost of repair',
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Status change notes',
    example: 'Completed repair successfully',
  })
  @IsOptional()
  @IsString()
  statusNotes?: string;

  @ApiPropertyOptional({
    description: 'Special instructions from customer',
    example: 'Customer called to expedite',
  })
  @IsOptional()
  @IsString()
  customerInstructions?: string;

  @ApiPropertyOptional({
    description: 'Internal notes about the repair',
    example: 'Started work on Monday',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Total cost of the repair',
    example: 125.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({
    description: 'Deposit amount paid',
    example: 75.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Insurance value of items',
    example: 1800.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;

  @ApiPropertyOptional({
    description: 'Assigned technician user ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({
    description: 'Custom tag ID for categorizing repair',
    example: '1',
  })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    description: 'RMA ID (Return Merchandise Authorization)',
    example: 'RMA-2024-001',
  })
  @IsOptional()
  @IsString()
  rmaId?: string;

  @ApiPropertyOptional({
    description: 'Notes about changes',
    example: 'Updated tag to Allied Gold',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRepairNoteDto {
  @ApiProperty({
    description: 'Note content',
    example: 'Started diagnosis, found additional damage to prongs',
  })
  @IsString()
  note: string;

  @ApiPropertyOptional({
    description: 'Whether note is visible to customer',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCustomerVisible?: boolean;
}

export class RepairQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search in repair number, customer name, or item description',
    example: 'RPR-2024-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by repair status',
    enum: RepairStatus,
    example: RepairStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: RepairPriority,
    example: RepairPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(RepairPriority)
  priority?: RepairPriority;

  @ApiPropertyOptional({
    description: 'Filter by repair type',
    enum: RepairType,
    example: RepairType.SIZING,
  })
  @IsOptional()
  @IsEnum(RepairType)
  repairType?: RepairType;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned technician ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter overdue repairs only',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overdue?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'repairNumber',
      'priority',
      'status',
      'expectedCompletionDate',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class RepairItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  itemDescription: string;

  @ApiProperty({ enum: RepairType })
  repairType: RepairType;

  @ApiProperty()
  repairDescription: string;

  @ApiProperty()
  estimatedCost: number;

  @ApiProperty()
  actualCost: number;

  @ApiProperty()
  material: string;

  @ApiProperty()
  weight: number;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class RepairNoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  note: string;

  @ApiProperty()
  isCustomerVisible: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdByName: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class RepairResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  repairNumber: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty({ enum: RepairStatus })
  status: RepairStatus;

  @ApiProperty({ enum: RepairPriority })
  priority: RepairPriority;

  @ApiProperty()
  itemDescription: string;

  @ApiProperty()
  problemDescription: string;

  @ApiProperty()
  estimatedCost: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  depositAmount: number;

  @ApiProperty()
  balanceDue: number;

  @ApiProperty()
  insuranceValue: number;

  @ApiProperty()
  expectedCompletionDate: string;

  @ApiProperty()
  actualCompletionDate: string;

  @ApiProperty()
  customerInstructions: string;

  @ApiProperty()
  internalNotes: string;

  @ApiProperty()
  assignedTechnicianId: string;

  @ApiProperty()
  assignedTechnicianName: string;

  @ApiProperty()
  isOverdue: boolean;

  @ApiProperty({ type: [RepairItemResponseDto] })
  items: RepairItemResponseDto[];

  @ApiProperty({ type: [RepairNoteResponseDto] })
  notes: RepairNoteResponseDto[];

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdByName: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({
    description:
      'All repair images (deprecated - use beforeImages, afterImages, progressImages)',
    type: [String],
  })
  images: string[];

  @ApiProperty({
    description: 'Images taken before repair work started',
    type: [String],
  })
  beforeImages: string[];

  @ApiProperty({
    description: 'Images taken after repair work completed',
    type: [String],
  })
  afterImages: string[];

  @ApiProperty({
    description: 'Images taken during repair work progress',
    type: [String],
  })
  progressImages: string[];

  @ApiProperty({
    description: 'Custom tag ID for categorizing repair',
    example: '1',
    required: false,
  })
  tagId?: string;

  @ApiProperty({
    description: 'RMA ID (Return Merchandise Authorization)',
    example: 'RMA-2024-001',
    required: false,
  })
  rmaId?: string;
}

export class RepairStatsDto {
  @ApiProperty({
    description: 'Total repairs count',
    example: 350,
  })
  totalRepairs: number;

  @ApiProperty({
    description: 'Active repairs count',
    example: 45,
  })
  activeRepairs: number;

  @ApiProperty({
    description: 'Completed repairs count',
    example: 280,
  })
  completedRepairs: number;

  @ApiProperty({
    description: 'Overdue repairs count',
    example: 8,
  })
  overdueRepairs: number;

  @ApiProperty({
    description: 'Repairs waiting for parts',
    example: 12,
  })
  waitingForParts: number;

  @ApiProperty({
    description: 'Average repair time in days',
    example: 7.5,
  })
  averageRepairTime: number;

  @ApiProperty({
    description: 'Total repair revenue',
    example: 15750.0,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Average repair cost',
    example: 125.5,
  })
  averageRepairCost: number;

  @ApiProperty({
    description: 'Repairs created this month',
    example: 25,
  })
  repairsThisMonth: number;

  @ApiProperty({
    description: 'Revenue this month',
    example: 3200.0,
  })
  revenueThisMonth: number;

  @ApiProperty({
    description: 'Status breakdown',
    example: {
      PENDING: 5,
      IN_PROGRESS: 15,
      COMPLETED: 280,
      CANCELLED: 10,
    },
  })
  statusBreakdown: Record<RepairStatus, number>;

  @ApiProperty({
    description: 'Priority breakdown',
    example: {
      LOW: 100,
      NORMAL: 200,
      HIGH: 40,
      URGENT: 10,
    },
  })
  priorityBreakdown: Record<RepairPriority, number>;

  @ApiProperty({
    description: 'Repair type breakdown',
    example: {
      SIZING: 120,
      CLEANING: 80,
      PRONG_REPAIR: 60,
      CHAIN_REPAIR: 45,
    },
  })
  repairTypeBreakdown: Record<RepairType, number>;

  @ApiProperty({
    description: 'Top technicians by completed repairs',
    example: [
      {
        technicianId: 'abc123',
        technicianName: 'John Smith',
        completedRepairs: 45,
      },
      {
        technicianId: 'def456',
        technicianName: 'Jane Doe',
        completedRepairs: 38,
      },
    ],
  })
  topTechnicians: Array<{
    technicianId: string;
    technicianName: string;
    completedRepairs: number;
  }>;
}

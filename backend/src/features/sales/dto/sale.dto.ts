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
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SaleStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  INSTALLMENT = 'INSTALLMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export class CreateSaleItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Unit price at the time of sale',
    example: 299.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Discount percentage (0-100)',
    example: 10.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed discount amount',
    example: 50.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax rate percentage (0-100)',
    example: 8.25,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Notes about this item',
    example: 'Custom engraving requested',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment amount',
    example: 599.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment reference number',
    example: 'TXN123456789',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Card last 4 digits (for card payments)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Card last 4 digits must be exactly 4 digits',
  })
  cardLast4?: string;

  @ApiPropertyOptional({
    description: 'Payment processor response',
    example: 'APPROVED',
  })
  @IsOptional()
  @IsString()
  processorResponse?: string;

  @ApiPropertyOptional({
    description: 'Payment notes',
    example: 'Contactless payment',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer ID (optional for walk-in sales)',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    description: 'Sale items',
    type: [CreateSaleItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({
    description: 'Payment details',
    type: [CreatePaymentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments: CreatePaymentDto[];

  @ApiPropertyOptional({
    description: 'Overall discount percentage (0-100)',
    example: 5.0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed discount amount',
    example: 25.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax rate percentage (0-100)',
    example: 8.25,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Sale notes',
    example: 'Customer requested gift wrapping',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Expected delivery/pickup date',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Customer name for walk-in sales',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  walkInCustomerName?: string;

  @ApiPropertyOptional({
    description: 'Customer phone for walk-in sales',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  walkInCustomerPhone?: string;

  @ApiPropertyOptional({
    description: 'Sale status (default: COMPLETED, use DRAFT to hold bill)',
    enum: SaleStatus,
    example: SaleStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({
    description: 'Client-generated UUID for idempotency (used by offline sync to prevent duplicate sales)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  clientSaleId?: string;
}

export class UpdateSaleDto {
  @ApiPropertyOptional({
    description: 'Sale status',
    enum: SaleStatus,
    example: SaleStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({
    description: 'Sale notes',
    example: 'Updated delivery instructions',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Expected delivery/pickup date',
    example: '2024-01-20',
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery/pickup date',
    example: '2024-01-18',
  })
  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Customer name for walk-in sales',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  walkInCustomerName?: string;

  @ApiPropertyOptional({
    description: 'Customer phone for walk-in sales',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  walkInCustomerPhone?: string;
}

export class RefundItemDto {
  @ApiProperty({
    description: 'Sale item ID to refund',
    example: 'clv123abc456',
  })
  @IsString()
  @IsUUID()
  saleItemId: string;

  @ApiProperty({
    description: 'Quantity to refund',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    example: 'Customer not satisfied',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRefundDto {
  @ApiProperty({
    description: 'Items to refund',
    type: [RefundItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items: RefundItemDto[];

  @ApiPropertyOptional({
    description: 'Refund reason',
    example: 'Defective product',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Refund notes',
    example: 'Customer provided receipt',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaleQueryDto {
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
    description: 'Search in sale number, customer name, or notes',
    example: 'SALE-2024-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by sale status',
    enum: SaleStatus,
    example: SaleStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by cashier ID (user who created the sale)',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  cashierId?: string;

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
    description: 'Minimum sale amount',
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum sale amount',
    example: 5000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'saleNumber', 'totalAmount', 'status'],
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

export class SaleItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productSku: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  discountPercentage: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  lineTotal: number;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  cardLast4: string;

  @ApiProperty()
  processorResponse: string;

  @ApiProperty()
  processedAt: string;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class SaleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  saleNumber: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  walkInCustomerName: string;

  @ApiProperty()
  walkInCustomerPhone: string;

  @ApiProperty({ enum: SaleStatus })
  status: SaleStatus;

  @ApiProperty({
    enum: [
      'CASH',
      'CARD',
      'BANK_TRANSFER',
      'CHEQUE',
      'DIGITAL_WALLET',
      'INSTALLMENT',
    ],
  })
  paymentMethod: string;

  @ApiProperty({
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  })
  paymentStatus: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  discountPercentage: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty()
  refundedAmount: number;

  @ApiProperty()
  balanceDue: number;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  expectedDeliveryDate: string;

  @ApiProperty()
  actualDeliveryDate: string;

  @ApiProperty({ type: [SaleItemResponseDto] })
  items: SaleItemResponseDto[];

  @ApiProperty({ type: [PaymentResponseDto] })
  payments: PaymentResponseDto[];

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdByName: string;

  @ApiProperty()
  cashierId: string;

  @ApiProperty()
  cashierName: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class SalesStatsDto {
  @ApiProperty({
    description: 'Total sales count',
    example: 1250,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Completed sales count',
    example: 1200,
  })
  completedSales: number;

  @ApiProperty({
    description: 'Pending sales count',
    example: 30,
  })
  pendingSales: number;

  @ApiProperty({
    description: 'Cancelled sales count',
    example: 20,
  })
  cancelledSales: number;

  @ApiProperty({
    description: 'Total sales amount',
    example: 125000.5,
  })
  totalSalesAmount: number;

  @ApiProperty({
    description: 'Total revenue (alias for totalSalesAmount)',
    example: 125000.5,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Average sale amount',
    example: 100.0,
  })
  averageSaleAmount: number;

  @ApiProperty({
    description: 'Total refunded amount',
    example: 5000.0,
  })
  totalRefundedAmount: number;

  @ApiProperty({
    description: 'Sales today',
    example: 15,
  })
  salesToday: number;

  @ApiProperty({
    description: 'Sales this month',
    example: 450,
  })
  salesThisMonth: number;

  @ApiProperty({
    description: 'Sales this year',
    example: 1250,
  })
  salesThisYear: number;

  @ApiProperty({
    description: 'Revenue today',
    example: 2500.0,
  })
  revenueToday: number;

  @ApiProperty({
    description: 'Revenue this month',
    example: 45000.0,
  })
  revenueThisMonth: number;

  @ApiProperty({
    description: 'Revenue this year',
    example: 125000.0,
  })
  revenueThisYear: number;

  @ApiProperty({
    description: 'Payment method breakdown',
    example: {
      CASH: 300,
      CREDIT_CARD: 700,
      DEBIT_CARD: 200,
      BANK_TRANSFER: 50,
    },
  })
  paymentMethodBreakdown: Record<PaymentMethod, number>;

  @ApiProperty({
    description: 'Top selling products',
    example: [
      {
        productId: 'abc123',
        productName: 'Gold Ring',
        quantity: 50,
        revenue: 25000,
      },
      {
        productId: 'def456',
        productName: 'Silver Necklace',
        quantity: 30,
        revenue: 15000,
      },
    ],
  })
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;

  @ApiProperty({
    description: 'Sales by hour (for today)',
    example: {
      '09': 2,
      '10': 5,
      '11': 3,
      '12': 4,
      '13': 6,
      '14': 8,
      '15': 7,
      '16': 5,
      '17': 3,
    },
  })
  salesByHour: Record<string, number>;
}

export class RecordInstallmentPaymentDto {
  @ApiProperty({ description: 'Payment amount', example: 50 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: ['CASH', 'CARD', 'BANK_TRANSFER'],
  })
  @IsString()
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER';

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

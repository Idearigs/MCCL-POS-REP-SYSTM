"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesStatsDto = exports.SaleResponseDto = exports.PaymentResponseDto = exports.SaleItemResponseDto = exports.SaleQueryDto = exports.CreateRefundDto = exports.RefundItemDto = exports.UpdateSaleDto = exports.CreateSaleDto = exports.CreatePaymentDto = exports.CreateSaleItemDto = exports.PaymentStatus = exports.PaymentMethod = exports.SaleStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var SaleStatus;
(function (SaleStatus) {
    SaleStatus["DRAFT"] = "DRAFT";
    SaleStatus["COMPLETED"] = "COMPLETED";
    SaleStatus["CANCELLED"] = "CANCELLED";
    SaleStatus["REFUNDED"] = "REFUNDED";
})(SaleStatus || (exports.SaleStatus = SaleStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CHEQUE"] = "CHEQUE";
    PaymentMethod["DIGITAL_WALLET"] = "DIGITAL_WALLET";
    PaymentMethod["INSTALLMENT"] = "INSTALLMENT";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
class CreateSaleItemDto {
    productId;
    quantity;
    unitPrice;
    discountPercentage;
    discountAmount;
    taxRate;
    notes;
}
exports.CreateSaleItemDto = CreateSaleItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity of the product',
        example: 2,
        minimum: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unit price at the time of sale',
        example: 299.99,
        minimum: 0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Discount percentage (0-100)',
        example: 10.5,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fixed discount amount',
        example: 50.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tax rate percentage (0-100)',
        example: 8.25,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes about this item',
        example: 'Custom engraving requested',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleItemDto.prototype, "notes", void 0);
class CreatePaymentDto {
    method;
    amount;
    reference;
    cardLast4;
    processorResponse;
    notes;
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method',
        enum: PaymentMethod,
        example: PaymentMethod.CARD,
    }),
    (0, class_validator_1.IsEnum)(PaymentMethod),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment amount',
        example: 599.99,
        minimum: 0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Payment reference number',
        example: 'TXN123456789',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Card last 4 digits (for card payments)',
        example: '1234',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}$/, {
        message: 'Card last 4 digits must be exactly 4 digits',
    }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "cardLast4", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Payment processor response',
        example: 'APPROVED',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "processorResponse", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Payment notes',
        example: 'Contactless payment',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "notes", void 0);
class CreateSaleDto {
    customerId;
    items;
    payments;
    discountPercentage;
    discountAmount;
    taxRate;
    notes;
    expectedDeliveryDate;
    walkInCustomerName;
    walkInCustomerPhone;
    status;
}
exports.CreateSaleDto = CreateSaleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer ID (optional for walk-in sales)',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sale items',
        type: [CreateSaleItemDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateSaleItemDto),
    __metadata("design:type", Array)
], CreateSaleDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment details',
        type: [CreatePaymentDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePaymentDto),
    __metadata("design:type", Array)
], CreateSaleDto.prototype, "payments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Overall discount percentage (0-100)',
        example: 5.0,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateSaleDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Fixed discount amount',
        example: 25.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSaleDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tax rate percentage (0-100)',
        example: 8.25,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateSaleDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sale notes',
        example: 'Customer requested gift wrapping',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expected delivery/pickup date',
        example: '2024-01-15',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer name for walk-in sales',
        example: 'John Doe',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "walkInCustomerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer phone for walk-in sales',
        example: '+1234567890',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "walkInCustomerPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sale status (default: COMPLETED, use DRAFT to hold bill)',
        enum: SaleStatus,
        example: SaleStatus.COMPLETED,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SaleStatus),
    __metadata("design:type", String)
], CreateSaleDto.prototype, "status", void 0);
class UpdateSaleDto {
    status;
    notes;
    expectedDeliveryDate;
    actualDeliveryDate;
    walkInCustomerName;
    walkInCustomerPhone;
}
exports.UpdateSaleDto = UpdateSaleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sale status',
        enum: SaleStatus,
        example: SaleStatus.COMPLETED,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SaleStatus),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sale notes',
        example: 'Updated delivery instructions',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expected delivery/pickup date',
        example: '2024-01-20',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Actual delivery/pickup date',
        example: '2024-01-18',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "actualDeliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer name for walk-in sales',
        example: 'John Doe',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "walkInCustomerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer phone for walk-in sales',
        example: '+1234567890',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSaleDto.prototype, "walkInCustomerPhone", void 0);
class RefundItemDto {
    saleItemId;
    quantity;
    reason;
}
exports.RefundItemDto = RefundItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sale item ID to refund',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RefundItemDto.prototype, "saleItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity to refund',
        example: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RefundItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reason for refund',
        example: 'Customer not satisfied',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefundItemDto.prototype, "reason", void 0);
class CreateRefundDto {
    items;
    reason;
    notes;
}
exports.CreateRefundDto = CreateRefundDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Items to refund',
        type: [RefundItemDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RefundItemDto),
    __metadata("design:type", Array)
], CreateRefundDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Refund reason',
        example: 'Defective product',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRefundDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Refund notes',
        example: 'Customer provided receipt',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRefundDto.prototype, "notes", void 0);
class SaleQueryDto {
    page;
    limit;
    search;
    status;
    paymentMethod;
    customerId;
    cashierId;
    startDate;
    endDate;
    minAmount;
    maxAmount;
    sortBy;
    sortOrder;
}
exports.SaleQueryDto = SaleQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Page number',
        example: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SaleQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Items per page',
        example: 10,
        minimum: 1,
        maximum: 1000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SaleQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search in sale number, customer name, or notes',
        example: 'SALE-2024-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by sale status',
        enum: SaleStatus,
        example: SaleStatus.COMPLETED,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SaleStatus),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by payment method',
        enum: PaymentMethod,
        example: PaymentMethod.CARD,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PaymentMethod),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by customer ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by cashier ID (user who created the sale)',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "cashierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start date for filtering (YYYY-MM-DD)',
        example: '2024-01-01',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End date for filtering (YYYY-MM-DD)',
        example: '2024-12-31',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Minimum sale amount',
        example: 100.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SaleQueryDto.prototype, "minAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum sale amount',
        example: 5000.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SaleQueryDto.prototype, "maxAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort field',
        example: 'createdAt',
        enum: ['createdAt', 'saleNumber', 'totalAmount', 'status'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        example: 'desc',
        enum: ['asc', 'desc'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaleQueryDto.prototype, "sortOrder", void 0);
class SaleItemResponseDto {
    id;
    productId;
    productName;
    productSku;
    quantity;
    unitPrice;
    discountPercentage;
    discountAmount;
    taxRate;
    taxAmount;
    lineTotal;
    notes;
    createdAt;
    updatedAt;
}
exports.SaleItemResponseDto = SaleItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "productSku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "taxAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleItemResponseDto.prototype, "lineTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleItemResponseDto.prototype, "updatedAt", void 0);
class PaymentResponseDto {
    id;
    method;
    amount;
    status;
    reference;
    cardLast4;
    processorResponse;
    processedAt;
    notes;
    createdAt;
    updatedAt;
}
exports.PaymentResponseDto = PaymentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PaymentMethod }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaymentResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PaymentStatus }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "cardLast4", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "processorResponse", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "processedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "updatedAt", void 0);
class SaleResponseDto {
    id;
    saleNumber;
    customerId;
    customerName;
    walkInCustomerName;
    walkInCustomerPhone;
    status;
    paymentMethod;
    paymentStatus;
    subtotal;
    discountPercentage;
    discountAmount;
    taxRate;
    taxAmount;
    totalAmount;
    paidAmount;
    refundedAmount;
    balanceDue;
    notes;
    expectedDeliveryDate;
    actualDeliveryDate;
    items;
    payments;
    createdBy;
    createdByName;
    cashierId;
    cashierName;
    createdAt;
    updatedAt;
}
exports.SaleResponseDto = SaleResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "saleNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "walkInCustomerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "walkInCustomerPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: SaleStatus }),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'CASH',
            'CARD',
            'BANK_TRANSFER',
            'CHEQUE',
            'DIGITAL_WALLET',
            'INSTALLMENT',
        ],
    }),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    }),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "subtotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "taxAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "paidAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "refundedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SaleResponseDto.prototype, "balanceDue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "actualDeliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SaleItemResponseDto] }),
    __metadata("design:type", Array)
], SaleResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PaymentResponseDto] }),
    __metadata("design:type", Array)
], SaleResponseDto.prototype, "payments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "createdByName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "cashierId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "cashierName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SaleResponseDto.prototype, "updatedAt", void 0);
class SalesStatsDto {
    totalSales;
    completedSales;
    pendingSales;
    cancelledSales;
    totalSalesAmount;
    totalRevenue;
    averageSaleAmount;
    totalRefundedAmount;
    salesToday;
    salesThisMonth;
    salesThisYear;
    revenueToday;
    revenueThisMonth;
    revenueThisYear;
    paymentMethodBreakdown;
    topSellingProducts;
    salesByHour;
}
exports.SalesStatsDto = SalesStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total sales count',
        example: 1250,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "totalSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Completed sales count',
        example: 1200,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "completedSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pending sales count',
        example: 30,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "pendingSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cancelled sales count',
        example: 20,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "cancelledSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total sales amount',
        example: 125000.5,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "totalSalesAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total revenue (alias for totalSalesAmount)',
        example: 125000.5,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Average sale amount',
        example: 100.0,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "averageSaleAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total refunded amount',
        example: 5000.0,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "totalRefundedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sales today',
        example: 15,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "salesToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sales this month',
        example: 450,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "salesThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Sales this year',
        example: 1250,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "salesThisYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Revenue today',
        example: 2500.0,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "revenueToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Revenue this month',
        example: 45000.0,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "revenueThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Revenue this year',
        example: 125000.0,
    }),
    __metadata("design:type", Number)
], SalesStatsDto.prototype, "revenueThisYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method breakdown',
        example: {
            CASH: 300,
            CREDIT_CARD: 700,
            DEBIT_CARD: 200,
            BANK_TRANSFER: 50,
        },
    }),
    __metadata("design:type", Object)
], SalesStatsDto.prototype, "paymentMethodBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
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
    }),
    __metadata("design:type", Array)
], SalesStatsDto.prototype, "topSellingProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
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
    }),
    __metadata("design:type", Object)
], SalesStatsDto.prototype, "salesByHour", void 0);
//# sourceMappingURL=sale.dto.js.map
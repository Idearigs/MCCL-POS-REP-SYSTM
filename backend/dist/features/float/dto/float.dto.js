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
exports.FloatTransactionResponseDto = exports.FloatSessionResponseDto = exports.GetFloatSessionsDto = exports.CreateFloatTransactionDto = exports.CloseFloatSessionDto = exports.OpenFloatSessionDto = exports.FloatTransactionType = exports.FloatStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var FloatStatus;
(function (FloatStatus) {
    FloatStatus["OPEN"] = "OPEN";
    FloatStatus["CLOSED"] = "CLOSED";
    FloatStatus["BALANCED"] = "BALANCED";
    FloatStatus["DISCREPANCY"] = "DISCREPANCY";
})(FloatStatus || (exports.FloatStatus = FloatStatus = {}));
var FloatTransactionType;
(function (FloatTransactionType) {
    FloatTransactionType["CASH_IN"] = "CASH_IN";
    FloatTransactionType["CASH_OUT"] = "CASH_OUT";
    FloatTransactionType["SALE"] = "SALE";
    FloatTransactionType["REFUND"] = "REFUND";
    FloatTransactionType["EXPENSE"] = "EXPENSE";
})(FloatTransactionType || (exports.FloatTransactionType = FloatTransactionType = {}));
class OpenFloatSessionDto {
    registerName;
    openingBalance;
    notes;
}
exports.OpenFloatSessionDto = OpenFloatSessionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Register name or identifier',
        example: 'Register 1',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OpenFloatSessionDto.prototype, "registerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Opening balance amount',
        example: 200.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], OpenFloatSessionDto.prototype, "openingBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional notes for opening',
        example: 'Starting shift at 9 AM',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OpenFloatSessionDto.prototype, "notes", void 0);
class CloseFloatSessionDto {
    actualClosing;
    closingNotes;
    denominationBreakdown;
}
exports.CloseFloatSessionDto = CloseFloatSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Actual closing balance counted',
        example: 1450.75,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CloseFloatSessionDto.prototype, "actualClosing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes about the closing',
        example: 'All denominations counted and verified',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloseFloatSessionDto.prototype, "closingNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Cash denomination breakdown',
        example: { '50': 10, '20': 25, '10': 30, '5': 40, '1': 50, '0.5': 20 },
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CloseFloatSessionDto.prototype, "denominationBreakdown", void 0);
class CreateFloatTransactionDto {
    sessionId;
    type;
    amount;
    reason;
    reference;
    notes;
}
exports.CreateFloatTransactionDto = CreateFloatTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Float session ID',
        example: 'cm5t3x9y8000008l6h9z1b2c3',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFloatTransactionDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction type',
        enum: FloatTransactionType,
        example: FloatTransactionType.CASH_IN,
    }),
    (0, class_validator_1.IsEnum)(FloatTransactionType),
    __metadata("design:type", String)
], CreateFloatTransactionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction amount',
        example: 50.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateFloatTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for transaction',
        example: 'Change fund replenishment',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFloatTransactionDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference number or ID',
        example: 'REF-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFloatTransactionDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Additional notes',
        example: 'Approved by manager',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFloatTransactionDto.prototype, "notes", void 0);
class GetFloatSessionsDto {
    page = 1;
    limit = 10;
    status;
    userId;
    startDate;
    endDate;
}
exports.GetFloatSessionsDto = GetFloatSessionsDto;
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
], GetFloatSessionsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Items per page',
        example: 10,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetFloatSessionsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by status',
        enum: FloatStatus,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(FloatStatus),
    __metadata("design:type", String)
], GetFloatSessionsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by user ID',
        example: 'cm5t3x9y8000008l6h9z1b2c3',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetFloatSessionsDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start date for date range filter',
        example: '2025-01-01',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GetFloatSessionsDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End date for date range filter',
        example: '2025-01-31',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GetFloatSessionsDto.prototype, "endDate", void 0);
class FloatSessionResponseDto {
    id;
    tenantId;
    userId;
    floatNumber;
    registerName;
    openingBalance;
    expectedClosing;
    actualClosing;
    difference;
    totalSales;
    totalCashIn;
    totalCashOut;
    totalRefunds;
    status;
    notes;
    closingNotes;
    openedAt;
    closedAt;
    createdAt;
    updatedAt;
    user;
    transactions;
}
exports.FloatSessionResponseDto = FloatSessionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "floatNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "registerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "openingBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "expectedClosing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "actualClosing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "difference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "totalSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "totalCashIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "totalCashOut", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatSessionResponseDto.prototype, "totalRefunds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FloatStatus }),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FloatSessionResponseDto.prototype, "closingNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FloatSessionResponseDto.prototype, "openedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Date)
], FloatSessionResponseDto.prototype, "closedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FloatSessionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FloatSessionResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FloatSessionResponseDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FloatSessionResponseDto.prototype, "transactions", void 0);
class FloatTransactionResponseDto {
    id;
    sessionId;
    tenantId;
    userId;
    type;
    amount;
    reason;
    reference;
    notes;
    createdAt;
    user;
}
exports.FloatTransactionResponseDto = FloatTransactionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FloatTransactionType }),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FloatTransactionResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FloatTransactionResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FloatTransactionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FloatTransactionResponseDto.prototype, "user", void 0);
//# sourceMappingURL=float.dto.js.map
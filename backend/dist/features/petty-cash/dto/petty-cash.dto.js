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
exports.PettyCashTransactionResponseDto = exports.PettyCashAccountResponseDto = exports.GetPettyCashTransactionsDto = exports.RejectPettyCashTransactionDto = exports.ApprovePettyCashTransactionDto = exports.CreatePettyCashTransactionDto = exports.ReplenishPettyCashDto = exports.UpdatePettyCashAccountDto = exports.CreatePettyCashAccountDto = exports.PettyCashCategory = exports.PettyCashStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PettyCashStatus;
(function (PettyCashStatus) {
    PettyCashStatus["PENDING"] = "PENDING";
    PettyCashStatus["APPROVED"] = "APPROVED";
    PettyCashStatus["REJECTED"] = "REJECTED";
    PettyCashStatus["CANCELLED"] = "CANCELLED";
})(PettyCashStatus || (exports.PettyCashStatus = PettyCashStatus = {}));
var PettyCashCategory;
(function (PettyCashCategory) {
    PettyCashCategory["OFFICE_SUPPLIES"] = "OFFICE_SUPPLIES";
    PettyCashCategory["TRANSPORT"] = "TRANSPORT";
    PettyCashCategory["MEALS"] = "MEALS";
    PettyCashCategory["UTILITIES"] = "UTILITIES";
    PettyCashCategory["MAINTENANCE"] = "MAINTENANCE";
    PettyCashCategory["CLEANING"] = "CLEANING";
    PettyCashCategory["REFRESHMENTS"] = "REFRESHMENTS";
    PettyCashCategory["POSTAGE"] = "POSTAGE";
    PettyCashCategory["BANKING_FEES"] = "BANKING_FEES";
    PettyCashCategory["MISCELLANEOUS"] = "MISCELLANEOUS";
    PettyCashCategory["OTHER"] = "OTHER";
})(PettyCashCategory || (exports.PettyCashCategory = PettyCashCategory = {}));
class CreatePettyCashAccountDto {
    accountName;
    registerName;
    location;
    openingBalance;
    monthlyBudget;
    notes;
}
exports.CreatePettyCashAccountDto = CreatePettyCashAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Account name',
        example: 'Main Branch Petty Cash',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Register name',
        example: 'Register 1',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashAccountDto.prototype, "registerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Location',
        example: 'London Office',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashAccountDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Opening balance',
        example: 500.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreatePettyCashAccountDto.prototype, "openingBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Monthly budget limit',
        example: 1000.0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreatePettyCashAccountDto.prototype, "monthlyBudget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashAccountDto.prototype, "notes", void 0);
class UpdatePettyCashAccountDto {
    accountName;
    registerName;
    location;
    monthlyBudget;
    isActive;
    notes;
}
exports.UpdatePettyCashAccountDto = UpdatePettyCashAccountDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Account name',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePettyCashAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Register name',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePettyCashAccountDto.prototype, "registerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Location',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePettyCashAccountDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Monthly budget',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePettyCashAccountDto.prototype, "monthlyBudget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Is active',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePettyCashAccountDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePettyCashAccountDto.prototype, "notes", void 0);
class ReplenishPettyCashDto {
    amount;
    reason;
    reference;
}
exports.ReplenishPettyCashDto = ReplenishPettyCashDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Replenishment amount',
        example: 200.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ReplenishPettyCashDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for replenishment',
        example: 'Monthly top-up',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReplenishPettyCashDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference number',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReplenishPettyCashDto.prototype, "reference", void 0);
class CreatePettyCashTransactionDto {
    accountId;
    category;
    amount;
    description;
    vendor;
    receiptNumber;
    receiptImage;
    notes;
    transactionDate;
}
exports.CreatePettyCashTransactionDto = CreatePettyCashTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Petty cash account ID',
        example: 'cm5t3x9y8000008l6h9z1b2c3',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Expense category',
        enum: PettyCashCategory,
        example: PettyCashCategory.OFFICE_SUPPLIES,
    }),
    (0, class_validator_1.IsEnum)(PettyCashCategory),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount',
        example: 25.5,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreatePettyCashTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of expense',
        example: 'Printer paper and pens',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Vendor/payee name',
        example: 'Office Depot',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "vendor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Receipt number',
        example: 'RCP-12345',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Receipt image path',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "receiptImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Additional notes',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Transaction date',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePettyCashTransactionDto.prototype, "transactionDate", void 0);
class ApprovePettyCashTransactionDto {
    notes;
}
exports.ApprovePettyCashTransactionDto = ApprovePettyCashTransactionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Approval notes',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApprovePettyCashTransactionDto.prototype, "notes", void 0);
class RejectPettyCashTransactionDto {
    rejectionReason;
}
exports.RejectPettyCashTransactionDto = RejectPettyCashTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for rejection',
        example: 'Missing receipt or insufficient documentation',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectPettyCashTransactionDto.prototype, "rejectionReason", void 0);
class GetPettyCashTransactionsDto {
    page = 1;
    limit = 10;
    accountId;
    status;
    category;
    startDate;
    endDate;
}
exports.GetPettyCashTransactionsDto = GetPettyCashTransactionsDto;
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
], GetPettyCashTransactionsDto.prototype, "page", void 0);
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
], GetPettyCashTransactionsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by account ID',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetPettyCashTransactionsDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by status',
        enum: PettyCashStatus,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PettyCashStatus),
    __metadata("design:type", String)
], GetPettyCashTransactionsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by category',
        enum: PettyCashCategory,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PettyCashCategory),
    __metadata("design:type", String)
], GetPettyCashTransactionsDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start date',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GetPettyCashTransactionsDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End date',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GetPettyCashTransactionsDto.prototype, "endDate", void 0);
class PettyCashAccountResponseDto {
    id;
    tenantId;
    accountName;
    accountNumber;
    registerName;
    location;
    openingBalance;
    currentBalance;
    monthlyBudget;
    isActive;
    notes;
    createdBy;
    createdAt;
    updatedAt;
    creator;
    transactions;
}
exports.PettyCashAccountResponseDto = PettyCashAccountResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "registerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PettyCashAccountResponseDto.prototype, "openingBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PettyCashAccountResponseDto.prototype, "currentBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], PettyCashAccountResponseDto.prototype, "monthlyBudget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PettyCashAccountResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashAccountResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PettyCashAccountResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PettyCashAccountResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PettyCashAccountResponseDto.prototype, "creator", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], PettyCashAccountResponseDto.prototype, "transactions", void 0);
class PettyCashTransactionResponseDto {
    id;
    tenantId;
    accountId;
    transactionNumber;
    category;
    amount;
    description;
    vendor;
    receiptNumber;
    receiptImage;
    status;
    requestedBy;
    approvedBy;
    rejectedBy;
    approvalDate;
    rejectionReason;
    notes;
    transactionDate;
    createdAt;
    updatedAt;
    requester;
    approver;
    account;
}
exports.PettyCashTransactionResponseDto = PettyCashTransactionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "transactionNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PettyCashCategory }),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PettyCashTransactionResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "vendor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "receiptImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PettyCashStatus }),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "requestedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "approvedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "rejectedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Date)
], PettyCashTransactionResponseDto.prototype, "approvalDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "rejectionReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], PettyCashTransactionResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PettyCashTransactionResponseDto.prototype, "transactionDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PettyCashTransactionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PettyCashTransactionResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PettyCashTransactionResponseDto.prototype, "requester", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PettyCashTransactionResponseDto.prototype, "approver", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PettyCashTransactionResponseDto.prototype, "account", void 0);
//# sourceMappingURL=petty-cash.dto.js.map
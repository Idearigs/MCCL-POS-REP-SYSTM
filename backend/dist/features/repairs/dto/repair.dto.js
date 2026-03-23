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
exports.RepairStatsDto = exports.RepairResponseDto = exports.RepairNoteResponseDto = exports.RepairItemResponseDto = exports.RepairQueryDto = exports.CreateRepairNoteDto = exports.UpdateRepairDto = exports.CreateRepairDto = exports.CreateRepairItemDto = exports.RepairType = exports.RepairPriority = exports.RepairStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var RepairStatus;
(function (RepairStatus) {
    RepairStatus["RECEIVED"] = "RECEIVED";
    RepairStatus["QUOTED"] = "QUOTED";
    RepairStatus["APPROVED"] = "APPROVED";
    RepairStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RepairStatus["COMPLETED"] = "COMPLETED";
    RepairStatus["READY_FOR_COLLECTION"] = "READY_FOR_COLLECTION";
    RepairStatus["COLLECTED"] = "COLLECTED";
    RepairStatus["CANCELLED"] = "CANCELLED";
})(RepairStatus || (exports.RepairStatus = RepairStatus = {}));
var RepairPriority;
(function (RepairPriority) {
    RepairPriority["LOW"] = "LOW";
    RepairPriority["NORMAL"] = "NORMAL";
    RepairPriority["HIGH"] = "HIGH";
    RepairPriority["URGENT"] = "URGENT";
})(RepairPriority || (exports.RepairPriority = RepairPriority = {}));
var RepairType;
(function (RepairType) {
    RepairType["CLEANING"] = "CLEANING";
    RepairType["POLISHING"] = "POLISHING";
    RepairType["SIZING"] = "SIZING";
    RepairType["STONE_SETTING"] = "STONE_SETTING";
    RepairType["PRONG_REPAIR"] = "PRONG_REPAIR";
    RepairType["CHAIN_REPAIR"] = "CHAIN_REPAIR";
    RepairType["CLASP_REPAIR"] = "CLASP_REPAIR";
    RepairType["ENGRAVING"] = "ENGRAVING";
    RepairType["RESTORATION"] = "RESTORATION";
    RepairType["CUSTOM_WORK"] = "CUSTOM_WORK";
    RepairType["OTHER"] = "OTHER";
})(RepairType || (exports.RepairType = RepairType = {}));
class CreateRepairItemDto {
    productId;
    itemDescription;
    repairType;
    repairDescription;
    estimatedCost;
    actualCost;
    material;
    weight;
    notes;
}
exports.CreateRepairItemDto = CreateRepairItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product ID if repairing existing inventory item',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the item being repaired',
        example: 'Gold wedding ring with diamond',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "itemDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of repair needed',
        enum: RepairType,
        example: RepairType.SIZING,
    }),
    (0, class_validator_1.IsEnum)(RepairType),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "repairType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the repair work',
        example: 'Resize ring from size 6 to size 7',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "repairDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Estimated cost for this repair item',
        example: 85.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairItemDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Actual cost for this repair item',
        example: 90.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairItemDto.prototype, "actualCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Material type of the item',
        example: '14K Gold',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Weight of the item in grams',
        example: 5.5,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairItemDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special notes about this repair item',
        example: 'Customer mentioned sentimental value',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairItemDto.prototype, "notes", void 0);
class CreateRepairDto {
    customerId;
    items;
    problemDescription;
    priority;
    expectedCompletionDate;
    customerInstructions;
    internalNotes;
    depositAmount;
    itemDescription;
    estimatedCost;
    insuranceNumber;
    insuranceValue;
    tagId;
    rmaId;
}
exports.CreateRepairDto = CreateRepairDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Items to be repaired',
        type: [CreateRepairItemDto],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateRepairItemDto),
    __metadata("design:type", Array)
], CreateRepairDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Problem description provided by customer',
        example: 'Ring is too small and clasp is broken',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "problemDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Priority level of the repair',
        enum: RepairPriority,
        example: RepairPriority.NORMAL,
    }),
    (0, class_validator_1.IsEnum)(RepairPriority),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expected completion date',
        example: '2024-01-20',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "expectedCompletionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special instructions from customer',
        example: 'Handle with care, very fragile',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "customerInstructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Internal notes about the repair',
        example: 'Check with senior jeweler before starting',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "internalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Deposit amount paid',
        example: 50.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairDto.prototype, "depositAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Item description for single item repairs',
        example: 'Gold wedding ring',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "itemDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Estimated cost of repair',
        example: 125.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Insurance claim number',
        example: 'INS-2024-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "insuranceNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Insurance value of items',
        example: 1500.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRepairDto.prototype, "insuranceValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Custom tag ID for categorizing repair',
        example: '1',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "tagId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'RMA ID (Return Merchandise Authorization)',
        example: 'RMA-2024-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairDto.prototype, "rmaId", void 0);
class UpdateRepairDto {
    status;
    priority;
    expectedCompletionDate;
    actualCompletionDate;
    itemDescription;
    problemDescription;
    estimatedCost;
    statusNotes;
    customerInstructions;
    internalNotes;
    totalCost;
    depositAmount;
    insuranceValue;
    assignedTechnicianId;
    tagId;
    rmaId;
    notes;
}
exports.UpdateRepairDto = UpdateRepairDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Repair status',
        enum: RepairStatus,
        example: RepairStatus.IN_PROGRESS,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RepairStatus),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Priority level of the repair',
        enum: RepairPriority,
        example: RepairPriority.HIGH,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RepairPriority),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expected completion date',
        example: '2024-01-25',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "expectedCompletionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Actual completion date',
        example: '2024-01-22',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "actualCompletionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Item description',
        example: 'Gold wedding ring',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "itemDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Problem description',
        example: 'Ring needs resizing',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "problemDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Estimated cost of repair',
        example: 100.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRepairDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Status change notes',
        example: 'Completed repair successfully',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "statusNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Special instructions from customer',
        example: 'Customer called to expedite',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "customerInstructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Internal notes about the repair',
        example: 'Started work on Monday',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "internalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Total cost of the repair',
        example: 125.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRepairDto.prototype, "totalCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Deposit amount paid',
        example: 75.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRepairDto.prototype, "depositAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Insurance value of items',
        example: 1800.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRepairDto.prototype, "insuranceValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Assigned technician user ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Custom tag ID for categorizing repair',
        example: '1',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "tagId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'RMA ID (Return Merchandise Authorization)',
        example: 'RMA-2024-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "rmaId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes about changes',
        example: 'Updated tag to Allied Gold',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRepairDto.prototype, "notes", void 0);
class CreateRepairNoteDto {
    note;
    isCustomerVisible;
}
exports.CreateRepairNoteDto = CreateRepairNoteDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Note content',
        example: 'Started diagnosis, found additional damage to prongs',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRepairNoteDto.prototype, "note", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether note is visible to customer',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRepairNoteDto.prototype, "isCustomerVisible", void 0);
class RepairQueryDto {
    page;
    limit;
    search;
    status;
    priority;
    repairType;
    customerId;
    assignedTechnicianId;
    startDate;
    endDate;
    overdue;
    sortBy;
    sortOrder;
}
exports.RepairQueryDto = RepairQueryDto;
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
], RepairQueryDto.prototype, "page", void 0);
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
], RepairQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search in repair number, customer name, or item description',
        example: 'RPR-2024-001',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by repair status',
        enum: RepairStatus,
        example: RepairStatus.IN_PROGRESS,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RepairStatus),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by priority',
        enum: RepairPriority,
        example: RepairPriority.HIGH,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RepairPriority),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by repair type',
        enum: RepairType,
        example: RepairType.SIZING,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RepairType),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "repairType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by customer ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by assigned technician ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start date for filtering (YYYY-MM-DD)',
        example: '2024-01-01',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End date for filtering (YYYY-MM-DD)',
        example: '2024-12-31',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter overdue repairs only',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], RepairQueryDto.prototype, "overdue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort field',
        example: 'createdAt',
        enum: [
            'createdAt',
            'repairNumber',
            'priority',
            'status',
            'expectedCompletionDate',
        ],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        example: 'desc',
        enum: ['asc', 'desc'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RepairQueryDto.prototype, "sortOrder", void 0);
class RepairItemResponseDto {
    id;
    productId;
    itemDescription;
    repairType;
    repairDescription;
    estimatedCost;
    actualCost;
    material;
    weight;
    notes;
    createdAt;
    updatedAt;
}
exports.RepairItemResponseDto = RepairItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "itemDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RepairType }),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "repairType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "repairDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairItemResponseDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairItemResponseDto.prototype, "actualCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairItemResponseDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairItemResponseDto.prototype, "updatedAt", void 0);
class RepairNoteResponseDto {
    id;
    note;
    isCustomerVisible;
    createdBy;
    createdByName;
    createdAt;
    updatedAt;
}
exports.RepairNoteResponseDto = RepairNoteResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "note", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RepairNoteResponseDto.prototype, "isCustomerVisible", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "createdByName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairNoteResponseDto.prototype, "updatedAt", void 0);
class RepairResponseDto {
    id;
    repairNumber;
    customerId;
    customerName;
    status;
    priority;
    itemDescription;
    problemDescription;
    estimatedCost;
    totalCost;
    depositAmount;
    balanceDue;
    insuranceValue;
    expectedCompletionDate;
    actualCompletionDate;
    customerInstructions;
    internalNotes;
    assignedTechnicianId;
    assignedTechnicianName;
    isOverdue;
    items;
    notes;
    createdBy;
    createdByName;
    createdAt;
    updatedAt;
    images;
    beforeImages;
    afterImages;
    progressImages;
    tagId;
    rmaId;
}
exports.RepairResponseDto = RepairResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "repairNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RepairStatus }),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RepairPriority }),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "itemDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "problemDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairResponseDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairResponseDto.prototype, "totalCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairResponseDto.prototype, "depositAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairResponseDto.prototype, "balanceDue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RepairResponseDto.prototype, "insuranceValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "expectedCompletionDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "actualCompletionDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "customerInstructions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "internalNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "assignedTechnicianName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], RepairResponseDto.prototype, "isOverdue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RepairItemResponseDto] }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RepairNoteResponseDto] }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "createdByName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'All repair images (deprecated - use beforeImages, afterImages, progressImages)',
        type: [String],
    }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Images taken before repair work started',
        type: [String],
    }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "beforeImages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Images taken after repair work completed',
        type: [String],
    }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "afterImages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Images taken during repair work progress',
        type: [String],
    }),
    __metadata("design:type", Array)
], RepairResponseDto.prototype, "progressImages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Custom tag ID for categorizing repair',
        example: '1',
        required: false,
    }),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "tagId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'RMA ID (Return Merchandise Authorization)',
        example: 'RMA-2024-001',
        required: false,
    }),
    __metadata("design:type", String)
], RepairResponseDto.prototype, "rmaId", void 0);
class RepairStatsDto {
    totalRepairs;
    activeRepairs;
    completedRepairs;
    overdueRepairs;
    waitingForParts;
    averageRepairTime;
    totalRevenue;
    averageRepairCost;
    repairsThisMonth;
    revenueThisMonth;
    statusBreakdown;
    priorityBreakdown;
    repairTypeBreakdown;
    topTechnicians;
}
exports.RepairStatsDto = RepairStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total repairs count',
        example: 350,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "totalRepairs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Active repairs count',
        example: 45,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "activeRepairs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Completed repairs count',
        example: 280,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "completedRepairs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Overdue repairs count',
        example: 8,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "overdueRepairs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repairs waiting for parts',
        example: 12,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "waitingForParts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Average repair time in days',
        example: 7.5,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "averageRepairTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total repair revenue',
        example: 15750.0,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Average repair cost',
        example: 125.5,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "averageRepairCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repairs created this month',
        example: 25,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "repairsThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Revenue this month',
        example: 3200.0,
    }),
    __metadata("design:type", Number)
], RepairStatsDto.prototype, "revenueThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status breakdown',
        example: {
            PENDING: 5,
            IN_PROGRESS: 15,
            COMPLETED: 280,
            CANCELLED: 10,
        },
    }),
    __metadata("design:type", Object)
], RepairStatsDto.prototype, "statusBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Priority breakdown',
        example: {
            LOW: 100,
            NORMAL: 200,
            HIGH: 40,
            URGENT: 10,
        },
    }),
    __metadata("design:type", Object)
], RepairStatsDto.prototype, "priorityBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repair type breakdown',
        example: {
            SIZING: 120,
            CLEANING: 80,
            PRONG_REPAIR: 60,
            CHAIN_REPAIR: 45,
        },
    }),
    __metadata("design:type", Object)
], RepairStatsDto.prototype, "repairTypeBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
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
    }),
    __metadata("design:type", Array)
], RepairStatsDto.prototype, "topTechnicians", void 0);
//# sourceMappingURL=repair.dto.js.map
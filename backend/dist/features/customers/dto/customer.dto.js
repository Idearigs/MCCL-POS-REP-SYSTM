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
exports.GDPRDeleteDto = exports.GDPRExportDto = exports.CustomerStatsDto = exports.CustomerResponseDto = exports.CustomerQueryDto = exports.UpdateCustomerDto = exports.CreateCustomerDto = exports.ContactType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const pagination_dto_1 = require("../../../shared/dto/pagination.dto");
var ContactType;
(function (ContactType) {
    ContactType["EMAIL"] = "EMAIL";
    ContactType["PHONE"] = "PHONE";
    ContactType["SMS"] = "SMS";
})(ContactType || (exports.ContactType = ContactType = {}));
class CreateCustomerDto {
    firstName;
    lastName;
    email;
    phone;
    address;
    city;
    postalCode;
    country;
    birthDate;
    anniversaryDate;
    notes;
    preferredContact;
    marketingEmail = false;
    marketingSms = false;
    marketingPhone = false;
    dataProcessingConsent;
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer first name',
        example: 'Sarah',
        minLength: 1,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'First name is required' }),
    (0, class_validator_1.MaxLength)(50, { message: 'First name must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer last name',
        example: 'Johnson',
        minLength: 1,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Last name is required' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Last name must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer email address',
        example: 'sarah.johnson@email.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer phone number',
        example: '+44771234567',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Phone number is required' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer address',
        example: '123 Main Street, London',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Address must not exceed 200 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'City',
        example: 'London',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'City must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Postal code',
        example: 'SW1A 1AA',
        maxLength: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20, { message: 'Postal code must not exceed 20 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Country',
        example: 'United Kingdom',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Country must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Birth date',
        example: '1985-06-15',
        type: 'string',
        format: 'date',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Anniversary date',
        example: '2010-09-20',
        type: 'string',
        format: 'date',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "anniversaryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer notes',
        example: 'Preferred customer, likes gold jewelry',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Notes must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Preferred contact method',
        enum: ContactType,
        example: ContactType.EMAIL,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ContactType),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "preferredContact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Consent for email marketing',
        example: false,
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "marketingEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Consent for SMS marketing',
        example: false,
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "marketingSms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Consent for phone marketing',
        example: false,
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "marketingPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Consent for data processing (GDPR required)',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "dataProcessingConsent", void 0);
class UpdateCustomerDto extends (0, swagger_1.PartialType)(CreateCustomerDto) {
    redFlag;
    redFlagReason;
    isActive;
}
exports.UpdateCustomerDto = UpdateCustomerDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Mark customer as red flagged',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], UpdateCustomerDto.prototype, "redFlag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reason for red flag',
        example: 'Payment issues',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Red flag reason must not exceed 200 characters' }),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "redFlagReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Customer active status',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], UpdateCustomerDto.prototype, "isActive", void 0);
class CustomerQueryDto extends pagination_dto_1.PaginationDto {
    search;
    isActive;
    redFlag;
    preferredContact;
    sortBy;
    sortOrder;
}
exports.CustomerQueryDto = CustomerQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search customers by name, email, or phone',
        example: 'Sarah Johnson',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by active status',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], CustomerQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by red flag status',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], CustomerQueryDto.prototype, "redFlag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by preferred contact method',
        enum: ContactType,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ContactType),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "preferredContact", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
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
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        enum: ['asc', 'desc'],
        example: 'desc',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortOrder", void 0);
class CustomerResponseDto {
    id;
    firstName;
    lastName;
    email;
    phone;
    address;
    city;
    postalCode;
    country;
    birthDate;
    anniversaryDate;
    notes;
    totalSpent;
    visitCount;
    loyaltyPoints;
    preferredContact;
    marketingEmail;
    marketingSms;
    marketingPhone;
    dataProcessingConsent;
    consentDate;
    isActive;
    redFlag;
    redFlagReason;
    createdAt;
    updatedAt;
}
exports.CustomerResponseDto = CustomerResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clv123abc456' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Sarah' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Johnson' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'sarah.johnson@email.com' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+44771234567' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123 Main Street, London' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'London' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SW1A 1AA' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'United Kingdom' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1985-06-15' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2010-09-20' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "anniversaryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Preferred customer, likes gold jewelry' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2850.0 }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "totalSpent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "visitCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 285 }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "loyaltyPoints", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ContactType, example: ContactType.EMAIL }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "preferredContact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "marketingEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "marketingSms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "marketingPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "dataProcessingConsent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-15T10:30:00Z' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "consentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], CustomerResponseDto.prototype, "redFlag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Payment issues' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "redFlagReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "updatedAt", void 0);
class CustomerStatsDto {
    totalCustomers;
    activeCustomers;
    inactiveCustomers;
    redFlaggedCustomers;
    newCustomersThisMonth;
    totalSpentAllTime;
    averageSpentPerCustomer;
    customersWithEmailConsent;
    customersWithSmsConsent;
}
exports.CustomerStatsDto = CustomerStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1284 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "totalCustomers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1200 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "activeCustomers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 84 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "inactiveCustomers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "redFlaggedCustomers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "newCustomersThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 234500.5 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "totalSpentAllTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 182.45 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "averageSpentPerCustomer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 856 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "customersWithEmailConsent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 423 }),
    __metadata("design:type", Number)
], CustomerStatsDto.prototype, "customersWithSmsConsent", void 0);
class GDPRExportDto {
    customerId;
}
exports.GDPRExportDto = GDPRExportDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer ID to export data for',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GDPRExportDto.prototype, "customerId", void 0);
class GDPRDeleteDto {
    customerId;
    confirmDelete;
}
exports.GDPRDeleteDto = GDPRDeleteDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer ID to delete data for',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GDPRDeleteDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Confirmation that user wants to delete all data',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GDPRDeleteDto.prototype, "confirmDelete", void 0);
//# sourceMappingURL=customer.dto.js.map
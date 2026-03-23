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
exports.EventListResponseDto = exports.EventResponseDto = exports.UpdateEventDto = exports.CreateEventDto = exports.EventType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var EventType;
(function (EventType) {
    EventType["REPAIR"] = "REPAIR";
    EventType["DELIVERY"] = "DELIVERY";
    EventType["APPOINTMENT"] = "APPOINTMENT";
    EventType["OTHER"] = "OTHER";
})(EventType || (exports.EventType = EventType = {}));
class CreateEventDto {
    title;
    description;
    eventDate;
    eventType;
    isAllDay;
    startTime;
    endTime;
    location;
    customerId;
    repairId;
    reminderId;
}
exports.CreateEventDto = CreateEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event title' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event date (ISO 8601 format)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: EventType, default: EventType.APPOINTMENT }),
    (0, class_validator_1.IsEnum)(EventType),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Is this an all-day event',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateEventDto.prototype, "isAllDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start time (HH:mm format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End time (HH:mm format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event location' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated customer ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated repair ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "repairId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reminder ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "reminderId", void 0);
class UpdateEventDto {
    title;
    description;
    eventDate;
    eventType;
    isAllDay;
    startTime;
    endTime;
    location;
    customerId;
    repairId;
    reminderId;
}
exports.UpdateEventDto = UpdateEventDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event date (ISO 8601 format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "eventDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: EventType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(EventType),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is this an all-day event' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateEventDto.prototype, "isAllDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start time (HH:mm format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End time (HH:mm format)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event location' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated customer ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated repair ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "repairId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reminder ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEventDto.prototype, "reminderId", void 0);
class EventResponseDto {
    id;
    tenantId;
    createdBy;
    title;
    description;
    eventDate;
    eventType;
    isAllDay;
    startTime;
    endTime;
    location;
    customerId;
    repairId;
    reminderId;
    createdAt;
    updatedAt;
}
exports.EventResponseDto = EventResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event ID' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant ID' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User who created the event' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event title' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event description' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event date' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "eventDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: EventType, description: 'Event type' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is this an all-day event' }),
    __metadata("design:type", Boolean)
], EventResponseDto.prototype, "isAllDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start time (HH:mm format)' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End time (HH:mm format)' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Event location' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated customer ID' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated repair ID' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "repairId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reminder ID' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "reminderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Creation timestamp' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last update timestamp' }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "updatedAt", void 0);
class EventListResponseDto {
    data;
    total;
    page;
    limit;
    totalPages;
}
exports.EventListResponseDto = EventListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [EventResponseDto], description: 'List of events' }),
    __metadata("design:type", Array)
], EventListResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of events' }),
    __metadata("design:type", Number)
], EventListResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current page number' }),
    __metadata("design:type", Number)
], EventListResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of items per page' }),
    __metadata("design:type", Number)
], EventListResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of pages' }),
    __metadata("design:type", Number)
], EventListResponseDto.prototype, "totalPages", void 0);
//# sourceMappingURL=event.dto.js.map
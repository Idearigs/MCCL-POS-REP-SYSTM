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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const calendar_events_service_1 = require("./calendar-events.service");
const event_dto_1 = require("./dto/event.dto");
let CalendarEventsController = class CalendarEventsController {
    calendarEventsService;
    constructor(calendarEventsService) {
        this.calendarEventsService = calendarEventsService;
    }
    async createEvent(req, userId, createEventDto) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.createEvent(tenantId, userId, createEventDto);
    }
    async getEvents(req, page, limit, startDate, endDate, eventType) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.getEvents(tenantId, page ? +page : 1, limit ? +limit : 50, startDate, endDate, eventType);
    }
    async getEventsByMonth(req, year, month) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.getEventsByMonth(tenantId, +year, +month);
    }
    async getEventById(req, id) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.getEventById(tenantId, id);
    }
    async updateEvent(req, id, updateEventDto) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.updateEvent(tenantId, id, updateEventDto);
    }
    async deleteEvent(req, id) {
        const tenantId = req.tenant?.id || req.tenant?.tenantId;
        return this.calendarEventsService.deleteEvent(tenantId, id);
    }
};
exports.CalendarEventsController = CalendarEventsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new calendar event' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Event created successfully',
        type: event_dto_1.EventResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, event_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all calendar events with optional filters' }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page (default: 50)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Filter events from this date (ISO 8601)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        type: String,
        description: 'Filter events until this date (ISO 8601)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'eventType',
        required: false,
        type: String,
        description: 'Filter by event type',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of events retrieved',
        type: event_dto_1.EventListResponseDto,
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('eventType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('month/:year/:month'),
    (0, swagger_1.ApiOperation)({ summary: 'Get events for a specific month' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Events for the month retrieved',
        type: [event_dto_1.EventResponseDto],
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('year')),
    __param(2, (0, common_1.Param)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "getEventsByMonth", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a calendar event by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Event retrieved successfully',
        type: event_dto_1.EventResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Event not found' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "getEventById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a calendar event' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Event updated successfully',
        type: event_dto_1.EventResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Event not found' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, event_dto_1.UpdateEventDto]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "updateEvent", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a calendar event' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Event deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Event not found' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarEventsController.prototype, "deleteEvent", null);
exports.CalendarEventsController = CalendarEventsController = __decorate([
    (0, swagger_1.ApiTags)('Calendar Events'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('calendar-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [calendar_events_service_1.CalendarEventsService])
], CalendarEventsController);
//# sourceMappingURL=calendar-events.controller.js.map
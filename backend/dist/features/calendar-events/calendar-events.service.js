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
exports.CalendarEventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const id_generator_1 = require("../../shared/utils/id-generator");
let CalendarEventsService = class CalendarEventsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createEvent(tenantId, userId, createEventDto) {
        const event = await this.prisma.calendar_events.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                tenantId,
                createdBy: userId,
                ...createEventDto,
                eventDate: new Date(createEventDto.eventDate),
                updatedAt: new Date(),
            },
        });
        return this.mapToResponseDto(event);
    }
    async getEvents(tenantId, page = 1, limit = 50, startDate, endDate, eventType) {
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
        };
        if (startDate || endDate) {
            where.eventDate = {};
            if (startDate) {
                where.eventDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.eventDate.lte = new Date(endDate);
            }
        }
        if (eventType) {
            where.eventType = eventType;
        }
        const [events, total] = await Promise.all([
            this.prisma.calendar_events.findMany({
                where,
                skip,
                take: limit,
                orderBy: { eventDate: 'asc' },
            }),
            this.prisma.calendar_events.count({ where }),
        ]);
        return {
            data: events.map((event) => this.mapToResponseDto(event)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getEventById(tenantId, eventId) {
        const event = await this.prisma.calendar_events.findFirst({
            where: { id: eventId, tenantId },
        });
        if (!event) {
            throw new common_1.NotFoundException(`Event with ID ${eventId} not found`);
        }
        return this.mapToResponseDto(event);
    }
    async updateEvent(tenantId, eventId, updateEventDto) {
        const existingEvent = await this.prisma.calendar_events.findFirst({
            where: { id: eventId, tenantId },
        });
        if (!existingEvent) {
            throw new common_1.NotFoundException(`Event with ID ${eventId} not found`);
        }
        const updateData = {
            ...updateEventDto,
            updatedAt: new Date(),
        };
        if (updateEventDto.eventDate) {
            updateData.eventDate = new Date(updateEventDto.eventDate);
        }
        const updatedEvent = await this.prisma.calendar_events.update({
            where: { id: eventId },
            data: updateData,
        });
        return this.mapToResponseDto(updatedEvent);
    }
    async deleteEvent(tenantId, eventId) {
        const existingEvent = await this.prisma.calendar_events.findFirst({
            where: { id: eventId, tenantId },
        });
        if (!existingEvent) {
            throw new common_1.NotFoundException(`Event with ID ${eventId} not found`);
        }
        await this.prisma.calendar_events.delete({
            where: { id: eventId },
        });
        return { message: 'Event deleted successfully' };
    }
    async getEventsByMonth(tenantId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const events = await this.prisma.calendar_events.findMany({
            where: {
                tenantId,
                eventDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { eventDate: 'asc' },
        });
        return events.map((event) => this.mapToResponseDto(event));
    }
    mapToResponseDto(event) {
        return {
            id: event.id,
            tenantId: event.tenantId,
            createdBy: event.createdBy,
            title: event.title,
            description: event.description,
            eventDate: event.eventDate.toISOString(),
            eventType: event.eventType,
            isAllDay: event.isAllDay,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            customerId: event.customerId,
            repairId: event.repairId,
            reminderId: event.reminderId,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        };
    }
};
exports.CalendarEventsService = CalendarEventsService;
exports.CalendarEventsService = CalendarEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarEventsService);
//# sourceMappingURL=calendar-events.service.js.map
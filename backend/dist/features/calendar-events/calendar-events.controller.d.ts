import type { Request } from 'express';
interface TenantRequest extends Request {
    tenant: {
        id: string;
        tenantId?: string;
    };
}
import { CalendarEventsService } from './calendar-events.service';
import { CreateEventDto, UpdateEventDto, EventResponseDto, EventListResponseDto } from './dto/event.dto';
export declare class CalendarEventsController {
    private readonly calendarEventsService;
    constructor(calendarEventsService: CalendarEventsService);
    createEvent(req: TenantRequest, userId: string, createEventDto: CreateEventDto): Promise<EventResponseDto>;
    getEvents(req: TenantRequest, page?: number, limit?: number, startDate?: string, endDate?: string, eventType?: string): Promise<EventListResponseDto>;
    getEventsByMonth(req: TenantRequest, year: number, month: number): Promise<EventResponseDto[]>;
    getEventById(req: TenantRequest, id: string): Promise<EventResponseDto>;
    updateEvent(req: TenantRequest, id: string, updateEventDto: UpdateEventDto): Promise<EventResponseDto>;
    deleteEvent(req: TenantRequest, id: string): Promise<{
        message: string;
    }>;
}
export {};

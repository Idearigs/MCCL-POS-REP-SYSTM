import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, EventResponseDto, EventListResponseDto } from './dto/event.dto';
export declare class CalendarEventsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createEvent(tenantId: string, userId: string, createEventDto: CreateEventDto): Promise<EventResponseDto>;
    getEvents(tenantId: string, page?: number, limit?: number, startDate?: string, endDate?: string, eventType?: string): Promise<EventListResponseDto>;
    getEventById(tenantId: string, eventId: string): Promise<EventResponseDto>;
    updateEvent(tenantId: string, eventId: string, updateEventDto: UpdateEventDto): Promise<EventResponseDto>;
    deleteEvent(tenantId: string, eventId: string): Promise<{
        message: string;
    }>;
    getEventsByMonth(tenantId: string, year: number, month: number): Promise<EventResponseDto[]>;
    private mapToResponseDto;
}

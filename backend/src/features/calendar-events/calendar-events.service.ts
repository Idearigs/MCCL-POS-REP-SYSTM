import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  EventListResponseDto,
} from './dto/event.dto';
import { generateId } from '../../shared/utils/id-generator';

@Injectable()
export class CalendarEventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new calendar event
   */
  async createEvent(
    tenantId: string,
    userId: string,
    createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.prisma.calendar_events.create({
      data: {
        id: generateId(),
        tenantId,
        createdBy: userId,
        ...createEventDto,
        eventDate: new Date(createEventDto.eventDate),
        updatedAt: new Date(),
      },
    });

    return this.mapToResponseDto(event);
  }

  /**
   * Get all calendar events for a tenant with pagination
   */
  async getEvents(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    startDate?: string,
    endDate?: string,
    eventType?: string,
  ): Promise<EventListResponseDto> {
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      tenantId,
    };

    // Date range filter
    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate) {
        where.eventDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.eventDate.lte = new Date(endDate);
      }
    }

    // Event type filter
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

  /**
   * Get a single event by ID
   */
  async getEventById(
    tenantId: string,
    eventId: string,
  ): Promise<EventResponseDto> {
    const event = await this.prisma.calendar_events.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return this.mapToResponseDto(event);
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    tenantId: string,
    eventId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    // Check if event exists
    const existingEvent = await this.prisma.calendar_events.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Prepare update data
    const updateData: any = {
      ...updateEventDto,
      updatedAt: new Date(),
    };

    // Convert date string to Date object if provided
    if (updateEventDto.eventDate) {
      updateData.eventDate = new Date(updateEventDto.eventDate);
    }

    const updatedEvent = await this.prisma.calendar_events.update({
      where: { id: eventId },
      data: updateData,
    });

    return this.mapToResponseDto(updatedEvent);
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    tenantId: string,
    eventId: string,
  ): Promise<{ message: string }> {
    // Check if event exists
    const existingEvent = await this.prisma.calendar_events.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    await this.prisma.calendar_events.delete({
      where: { id: eventId },
    });

    return { message: 'Event deleted successfully' };
  }

  /**
   * Get events for a specific month
   */
  async getEventsByMonth(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<EventResponseDto[]> {
    // Create start and end dates for the month
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

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(event: any): EventResponseDto {
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
}

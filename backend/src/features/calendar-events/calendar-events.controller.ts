import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

interface TenantRequest extends Request {
  tenant: { id: string; tenantId?: string };
}
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { CalendarEventsService } from './calendar-events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  EventListResponseDto,
} from './dto/event.dto';

@ApiTags('Calendar Events')
@ApiBearerAuth()
@Controller('calendar-events')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new calendar event' })
  @ApiResponse({ status: 201, description: 'Event created successfully', type: EventResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createEvent(
    @Req() req: TenantRequest,
    @CurrentUser('id') userId: string,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.createEvent(tenantId, userId, createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all calendar events with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter events from this date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter events until this date (ISO 8601)' })
  @ApiQuery({ name: 'eventType', required: false, type: String, description: 'Filter by event type' })
  @ApiResponse({ status: 200, description: 'List of events retrieved', type: EventListResponseDto })
  async getEvents(
    @Req() req: TenantRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: string,
  ): Promise<EventListResponseDto> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.getEvents(
      tenantId,
      page ? +page : 1,
      limit ? +limit : 50,
      startDate,
      endDate,
      eventType,
    );
  }

  @Get('month/:year/:month')
  @ApiOperation({ summary: 'Get events for a specific month' })
  @ApiResponse({ status: 200, description: 'Events for the month retrieved', type: [EventResponseDto] })
  async getEventsByMonth(
    @Req() req: TenantRequest,
    @Param('year') year: number,
    @Param('month') month: number,
  ): Promise<EventResponseDto[]> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.getEventsByMonth(tenantId, +year, +month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a calendar event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventById(@Req() req: TenantRequest, @Param('id') id: string): Promise<EventResponseDto> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.getEventById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a calendar event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateEvent(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.updateEvent(tenantId, id, updateEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a calendar event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async deleteEvent(@Req() req: TenantRequest, @Param('id') id: string): Promise<{ message: string }> {
    const tenantId = req.tenant?.id || req.tenant?.tenantId;
    return this.calendarEventsService.deleteEvent(tenantId, id);
  }
}

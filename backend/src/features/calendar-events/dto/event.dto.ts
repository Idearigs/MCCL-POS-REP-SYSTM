import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export enum EventType {
  REPAIR = 'REPAIR',
  DELIVERY = 'DELIVERY',
  APPOINTMENT = 'APPOINTMENT',
  OTHER = 'OTHER',
}

/**
 * DTO for creating a calendar event
 */
export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Event date (ISO 8601 format)' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({ enum: EventType, default: EventType.APPOINTMENT })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiPropertyOptional({
    description: 'Is this an all-day event',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Start time (HH:mm format)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm format)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Associated customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Associated repair ID' })
  @IsOptional()
  @IsUUID()
  repairId?: string;

  @ApiPropertyOptional({ description: 'Reminder ID' })
  @IsOptional()
  @IsString()
  reminderId?: string;
}

/**
 * DTO for updating a calendar event
 */
export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Event title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event date (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ description: 'Is this an all-day event' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Start time (HH:mm format)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm format)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Associated customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Associated repair ID' })
  @IsOptional()
  @IsUUID()
  repairId?: string;

  @ApiPropertyOptional({ description: 'Reminder ID' })
  @IsOptional()
  @IsString()
  reminderId?: string;
}

/**
 * Response DTO for calendar events
 */
export class EventResponseDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'User who created the event' })
  createdBy: string;

  @ApiProperty({ description: 'Event title' })
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  description?: string;

  @ApiProperty({ description: 'Event date' })
  eventDate: string;

  @ApiProperty({ enum: EventType, description: 'Event type' })
  eventType: EventType;

  @ApiProperty({ description: 'Is this an all-day event' })
  isAllDay: boolean;

  @ApiPropertyOptional({ description: 'Start time (HH:mm format)' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm format)' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Event location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Associated customer ID' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Associated repair ID' })
  repairId?: string;

  @ApiPropertyOptional({ description: 'Reminder ID' })
  reminderId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

/**
 * Response DTO for paginated event list
 */
export class EventListResponseDto {
  @ApiProperty({ type: [EventResponseDto], description: 'List of events' })
  data: EventResponseDto[];

  @ApiProperty({ description: 'Total number of events' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

import { apiClient } from './apiClient';

export type EventType = 'REPAIR' | 'DELIVERY' | 'APPOINTMENT' | 'OTHER';

export interface CalendarEvent {
  id: string;
  tenantId: string;
  createdBy: string;
  title: string;
  description?: string;
  eventDate: string;
  eventType: EventType;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  customerId?: string;
  repairId?: string;
  reminderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventDate: string;
  eventType: EventType;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  customerId?: string;
  repairId?: string;
  reminderId?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventDate?: string;
  eventType?: EventType;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  customerId?: string;
  repairId?: string;
  reminderId?: string;
}

export interface EventListResponse {
  data: CalendarEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class CalendarService {
  private baseUrl = '/calendar-events';

  /**
   * Create a new calendar event
   */
  async createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
    try {
      const data = await apiClient.post<CalendarEvent>(this.baseUrl, eventData);
      return data;
    } catch (error: any) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Get all calendar events with pagination and filters
   */
  async getEvents(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    eventType?: EventType;
  }): Promise<EventListResponse> {
    try {
      const data = await apiClient.get<EventListResponse>(this.baseUrl, { params });
      return data;
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific month
   */
  async getEventsByMonth(year: number, month: number): Promise<CalendarEvent[]> {
    try {
      const data = await apiClient.get<CalendarEvent[]>(`${this.baseUrl}/month/${year}/${month}`);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch events for month:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<CalendarEvent> {
    try {
      const data = await apiClient.get<CalendarEvent>(`${this.baseUrl}/${eventId}`);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, eventData: UpdateEventData): Promise<CalendarEvent> {
    try {
      const data = await apiClient.put<CalendarEvent>(`${this.baseUrl}/${eventId}`, eventData);
      return data;
    } catch (error: any) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<{ message: string }> {
    try {
      const data = await apiClient.delete<{ message: string }>(`${this.baseUrl}/${eventId}`);
      return data;
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();
export default calendarService;

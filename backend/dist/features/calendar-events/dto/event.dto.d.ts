export declare enum EventType {
    REPAIR = "REPAIR",
    DELIVERY = "DELIVERY",
    APPOINTMENT = "APPOINTMENT",
    OTHER = "OTHER"
}
export declare class CreateEventDto {
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
export declare class UpdateEventDto {
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
export declare class EventResponseDto {
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
export declare class EventListResponseDto {
    data: EventResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

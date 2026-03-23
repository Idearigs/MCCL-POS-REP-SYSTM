export declare enum QuickActionType {
    TODAY_SALES = "TODAY_SALES",
    STOCK_LEVELS = "STOCK_LEVELS",
    SHIFT_SUMMARY = "SHIFT_SUMMARY",
    LOW_STOCK = "LOW_STOCK",
    TOP_PRODUCTS = "TOP_PRODUCTS",
    RECENT_CUSTOMERS = "RECENT_CUSTOMERS"
}
export declare class SendMessageDto {
    message: string;
    conversationId?: string;
}
export declare class QuickActionDto {
    action: QuickActionType;
    parameters?: Record<string, any>;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    conversationId: string;
}
export interface ChatResponse {
    message: ChatMessage;
    conversationId: string;
    suggestions?: string[];
    hasReport?: boolean;
    reportData?: any;
    reportType?: string;
    reportPeriod?: string;
}
export declare class ExportReportDto {
    reportData: any;
    reportType: string;
    period?: string;
}

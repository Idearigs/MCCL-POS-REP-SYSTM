export declare enum FloatStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    BALANCED = "BALANCED",
    DISCREPANCY = "DISCREPANCY"
}
export declare enum FloatTransactionType {
    CASH_IN = "CASH_IN",
    CASH_OUT = "CASH_OUT",
    SALE = "SALE",
    REFUND = "REFUND",
    EXPENSE = "EXPENSE"
}
export declare class OpenFloatSessionDto {
    registerName?: string;
    openingBalance: number;
    notes?: string;
}
export declare class CloseFloatSessionDto {
    actualClosing: number;
    closingNotes?: string;
    denominationBreakdown?: Record<string, number>;
}
export declare class CreateFloatTransactionDto {
    sessionId: string;
    type: FloatTransactionType;
    amount: number;
    reason: string;
    reference?: string;
    notes?: string;
}
export declare class GetFloatSessionsDto {
    page?: number;
    limit?: number;
    status?: FloatStatus;
    userId?: string;
    startDate?: string;
    endDate?: string;
}
export declare class FloatSessionResponseDto {
    id: string;
    tenantId: string;
    userId: string;
    floatNumber: string;
    registerName?: string;
    openingBalance: number;
    expectedClosing?: number;
    actualClosing?: number;
    difference?: number;
    totalSales: number;
    totalCashIn: number;
    totalCashOut: number;
    totalRefunds: number;
    status: FloatStatus;
    notes?: string;
    closingNotes?: string;
    openedAt: Date;
    closedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    user?: any;
    transactions?: FloatTransactionResponseDto[];
}
export declare class FloatTransactionResponseDto {
    id: string;
    sessionId: string;
    tenantId: string;
    userId: string;
    type: FloatTransactionType;
    amount: number;
    reason: string;
    reference?: string;
    notes?: string;
    createdAt: Date;
    user?: any;
}

export declare enum PettyCashStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export declare enum PettyCashCategory {
    OFFICE_SUPPLIES = "OFFICE_SUPPLIES",
    TRANSPORT = "TRANSPORT",
    MEALS = "MEALS",
    UTILITIES = "UTILITIES",
    MAINTENANCE = "MAINTENANCE",
    CLEANING = "CLEANING",
    REFRESHMENTS = "REFRESHMENTS",
    POSTAGE = "POSTAGE",
    BANKING_FEES = "BANKING_FEES",
    MISCELLANEOUS = "MISCELLANEOUS",
    OTHER = "OTHER"
}
export declare class CreatePettyCashAccountDto {
    accountName: string;
    registerName?: string;
    location?: string;
    openingBalance: number;
    monthlyBudget?: number;
    notes?: string;
}
export declare class UpdatePettyCashAccountDto {
    accountName?: string;
    registerName?: string;
    location?: string;
    monthlyBudget?: number;
    isActive?: boolean;
    notes?: string;
}
export declare class ReplenishPettyCashDto {
    amount: number;
    reason: string;
    reference?: string;
}
export declare class CreatePettyCashTransactionDto {
    accountId: string;
    category: PettyCashCategory;
    amount: number;
    description: string;
    vendor?: string;
    receiptNumber?: string;
    receiptImage?: string;
    notes?: string;
    transactionDate?: string;
}
export declare class ApprovePettyCashTransactionDto {
    notes?: string;
}
export declare class RejectPettyCashTransactionDto {
    rejectionReason: string;
}
export declare class GetPettyCashTransactionsDto {
    page?: number;
    limit?: number;
    accountId?: string;
    status?: PettyCashStatus;
    category?: PettyCashCategory;
    startDate?: string;
    endDate?: string;
}
export declare class PettyCashAccountResponseDto {
    id: string;
    tenantId: string;
    accountName: string;
    accountNumber: string;
    registerName?: string;
    location?: string;
    openingBalance: number;
    currentBalance: number;
    monthlyBudget?: number;
    isActive: boolean;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    creator?: any;
    transactions?: PettyCashTransactionResponseDto[];
}
export declare class PettyCashTransactionResponseDto {
    id: string;
    tenantId: string;
    accountId: string;
    transactionNumber: string;
    category: PettyCashCategory;
    amount: number;
    description: string;
    vendor?: string;
    receiptNumber?: string;
    receiptImage?: string;
    status: PettyCashStatus;
    requestedBy: string;
    approvedBy?: string;
    rejectedBy?: string;
    approvalDate?: Date;
    rejectionReason?: string;
    notes?: string;
    transactionDate: Date;
    createdAt: Date;
    updatedAt: Date;
    requester?: any;
    approver?: any;
    account?: any;
}

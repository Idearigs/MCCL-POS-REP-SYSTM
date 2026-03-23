export declare enum SaleStatus {
    DRAFT = "DRAFT",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    CHEQUE = "CHEQUE",
    DIGITAL_WALLET = "DIGITAL_WALLET",
    INSTALLMENT = "INSTALLMENT"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
}
export declare class CreateSaleItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    notes?: string;
}
export declare class CreatePaymentDto {
    method: PaymentMethod;
    amount: number;
    reference?: string;
    cardLast4?: string;
    processorResponse?: string;
    notes?: string;
}
export declare class CreateSaleDto {
    customerId?: string;
    items: CreateSaleItemDto[];
    payments: CreatePaymentDto[];
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    notes?: string;
    expectedDeliveryDate?: string;
    walkInCustomerName?: string;
    walkInCustomerPhone?: string;
    status?: SaleStatus;
}
export declare class UpdateSaleDto {
    status?: SaleStatus;
    notes?: string;
    expectedDeliveryDate?: string;
    actualDeliveryDate?: string;
    walkInCustomerName?: string;
    walkInCustomerPhone?: string;
}
export declare class RefundItemDto {
    saleItemId: string;
    quantity: number;
    reason?: string;
}
export declare class CreateRefundDto {
    items: RefundItemDto[];
    reason?: string;
    notes?: string;
}
export declare class SaleQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: SaleStatus;
    paymentMethod?: PaymentMethod;
    customerId?: string;
    cashierId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class SaleItemResponseDto {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
}
export declare class PaymentResponseDto {
    id: string;
    method: PaymentMethod;
    amount: number;
    status: PaymentStatus;
    reference: string;
    cardLast4: string;
    processorResponse: string;
    processedAt: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
}
export declare class SaleResponseDto {
    id: string;
    saleNumber: string;
    customerId: string;
    customerName: string;
    walkInCustomerName: string;
    walkInCustomerPhone: string;
    status: SaleStatus;
    paymentMethod: string;
    paymentStatus: string;
    subtotal: number;
    discountPercentage: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    refundedAmount: number;
    balanceDue: number;
    notes: string;
    expectedDeliveryDate: string;
    actualDeliveryDate: string;
    items: SaleItemResponseDto[];
    payments: PaymentResponseDto[];
    createdBy: string;
    createdByName: string;
    cashierId: string;
    cashierName: string;
    createdAt: string;
    updatedAt: string;
}
export declare class SalesStatsDto {
    totalSales: number;
    completedSales: number;
    pendingSales: number;
    cancelledSales: number;
    totalSalesAmount: number;
    totalRevenue: number;
    averageSaleAmount: number;
    totalRefundedAmount: number;
    salesToday: number;
    salesThisMonth: number;
    salesThisYear: number;
    revenueToday: number;
    revenueThisMonth: number;
    revenueThisYear: number;
    paymentMethodBreakdown: Record<PaymentMethod, number>;
    topSellingProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }>;
    salesByHour: Record<string, number>;
}

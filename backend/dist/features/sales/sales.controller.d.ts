import { SalesService } from './sales.service';
import { CreateSaleDto, UpdateSaleDto, CreateRefundDto, SaleQueryDto, SaleResponseDto, SalesStatsDto } from './dto/sale.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    create(createSaleDto: CreateSaleDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    findAll(query: SaleQueryDto, tenantId: string): Promise<PaginatedResponseDto<SaleResponseDto>>;
    getStats(tenantId: string): Promise<SalesStatsDto>;
    getCashierStats(tenantId: string): Promise<any[]>;
    getTodaysSales(query: SaleQueryDto, tenantId: string): Promise<PaginatedResponseDto<SaleResponseDto>>;
    findOne(id: string, tenantId: string): Promise<SaleResponseDto>;
    update(id: string, updateSaleDto: UpdateSaleDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    updateSaleItem(itemId: string, body: {
        notes: string;
    }, tenantId: string): Promise<{
        id: string;
        notes: string | null;
        quantity: number;
        productId: string;
        saleId: string;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
    }>;
    createRefund(id: string, createRefundDto: CreateRefundDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    getReceiptData(id: string, tenantId: string): Promise<{
        saleNumber: string;
        date: string;
        customer: string;
        items: {
            name: string;
            sku: string;
            quantity: number;
            unitPrice: number;
            discount: number;
            total: number;
        }[];
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        payments: {
            method: import("./dto/sale.dto").PaymentMethod;
            amount: number;
            reference: string;
        }[];
        change: number;
        notes: string;
        cashier: string;
    }>;
    getDailyReport(date: string, tenantId: string): Promise<{
        date: string;
        totalSales: number;
        totalRevenue: number;
        averageSaleAmount: number;
        paymentBreakdown: Record<string, number>;
        topSellingProducts: {
            productId: string;
            productName: string;
            quantity: number;
            revenue: number;
        }[];
        salesByHour: Record<string, number>;
        sales: SaleResponseDto[];
    }>;
    getMonthlyReport(year: number, month: number, tenantId: string): Promise<{
        year: number;
        month: number;
        totalSales: number;
        totalRevenue: number;
        averageDailySales: number;
        averageDailyRevenue: number;
        dailyBreakdown: Record<string, {
            count: number;
            revenue: number;
        }>;
        paymentMethodTrends: Record<string, number>;
    }>;
    remove(id: string, tenantId: string, userId: string): Promise<{
        message: string;
        success: boolean;
    }>;
}

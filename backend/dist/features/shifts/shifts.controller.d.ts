import { ShiftsService } from './shifts.service';
import { StartShiftDto, CloseShiftDto } from './dto/shift.dto';
import { ShiftStatus } from '@prisma/client';
export declare class ShiftsController {
    private readonly shiftsService;
    constructor(shiftsService: ShiftsService);
    startShift(req: any, body: StartShiftDto): Promise<{
        user: {
            email: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
        _count: {
            sales: number;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ShiftStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string;
        location: string | null;
        openingFloat: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingFloat: import("@prisma/client/runtime/library").Decimal | null;
        closingNotes: string | null;
        shiftNumber: string;
        startTime: Date;
        endTime: Date | null;
        duration: number | null;
        expectedFloat: import("@prisma/client/runtime/library").Decimal | null;
        variance: import("@prisma/client/runtime/library").Decimal | null;
        deviceInfo: string | null;
        ipAddress: string | null;
    }>;
    getActiveShift(req: any): Promise<{
        user: {
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
        _count: {
            sales: number;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ShiftStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string;
        location: string | null;
        openingFloat: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingFloat: import("@prisma/client/runtime/library").Decimal | null;
        closingNotes: string | null;
        shiftNumber: string;
        startTime: Date;
        endTime: Date | null;
        duration: number | null;
        expectedFloat: import("@prisma/client/runtime/library").Decimal | null;
        variance: import("@prisma/client/runtime/library").Decimal | null;
        deviceInfo: string | null;
        ipAddress: string | null;
    }>;
    closeShift(req: any, shiftId: string, body: CloseShiftDto): Promise<{
        user: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ShiftStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string;
        location: string | null;
        openingFloat: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingFloat: import("@prisma/client/runtime/library").Decimal | null;
        closingNotes: string | null;
        shiftNumber: string;
        startTime: Date;
        endTime: Date | null;
        duration: number | null;
        expectedFloat: import("@prisma/client/runtime/library").Decimal | null;
        variance: import("@prisma/client/runtime/library").Decimal | null;
        deviceInfo: string | null;
        ipAddress: string | null;
    }>;
    getShifts(req: any, startDate: string, endDate: string, userId?: string, status?: ShiftStatus): Promise<({
        user: {
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
        _count: {
            sales: number;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ShiftStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        userId: string;
        location: string | null;
        openingFloat: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingFloat: import("@prisma/client/runtime/library").Decimal | null;
        closingNotes: string | null;
        shiftNumber: string;
        startTime: Date;
        endTime: Date | null;
        duration: number | null;
        expectedFloat: import("@prisma/client/runtime/library").Decimal | null;
        variance: import("@prisma/client/runtime/library").Decimal | null;
        deviceInfo: string | null;
        ipAddress: string | null;
    })[]>;
    getShiftReport(shiftId: string): Promise<{
        shift: {
            openingFloat: number;
            closingFloat: number;
            expectedFloat: number;
            variance: number;
            sales: ({
                customers: {
                    firstName: string;
                    lastName: string;
                    phone: string;
                };
                sale_items: ({
                    products: {
                        name: string;
                        sku: string;
                    };
                } & {
                    id: string;
                    quantity: number;
                    productId: string;
                    saleId: string;
                    unitPrice: import("@prisma/client/runtime/library").Decimal;
                    discount: import("@prisma/client/runtime/library").Decimal;
                    totalPrice: import("@prisma/client/runtime/library").Decimal;
                })[];
            } & {
                id: string;
                status: import("@prisma/client").$Enums.SaleStatus;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                notes: string | null;
                customerId: string | null;
                createdBy: string;
                saleNumber: string;
                subtotal: import("@prisma/client/runtime/library").Decimal;
                taxAmount: import("@prisma/client/runtime/library").Decimal;
                discountAmount: import("@prisma/client/runtime/library").Decimal;
                totalAmount: import("@prisma/client/runtime/library").Decimal;
                paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
                paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
                paidAmount: import("@prisma/client/runtime/library").Decimal;
                changeAmount: import("@prisma/client/runtime/library").Decimal;
                receiptNumber: string | null;
                balanceDue: import("@prisma/client/runtime/library").Decimal;
                refundedAmount: import("@prisma/client/runtime/library").Decimal;
                shiftId: string | null;
            })[];
            user: {
                email: string;
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
            };
            id: string;
            status: import("@prisma/client").$Enums.ShiftStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            userId: string;
            location: string | null;
            openingNotes: string | null;
            closingNotes: string | null;
            shiftNumber: string;
            startTime: Date;
            endTime: Date | null;
            duration: number | null;
            deviceInfo: string | null;
            ipAddress: string | null;
        };
        metrics: {
            totalSales: number;
            totalRevenue: number;
            averageSaleValue: number;
            itemsSold: number;
            cancelledSales: number;
            totalDiscount: number;
            totalTax: number;
            paymentBreakdown: Record<string, number>;
            cashSales: number;
            cardSales: number;
            floatVariance: number;
        };
        sales: {
            totalAmount: number;
            subtotal: number;
            taxAmount: number;
            discountAmount: number;
            customers: {
                firstName: string;
                lastName: string;
                phone: string;
            };
            sale_items: ({
                products: {
                    name: string;
                    sku: string;
                };
            } & {
                id: string;
                quantity: number;
                productId: string;
                saleId: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                discount: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
            })[];
            id: string;
            status: import("@prisma/client").$Enums.SaleStatus;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            notes: string | null;
            customerId: string | null;
            createdBy: string;
            saleNumber: string;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            changeAmount: import("@prisma/client/runtime/library").Decimal;
            receiptNumber: string | null;
            balanceDue: import("@prisma/client/runtime/library").Decimal;
            refundedAmount: import("@prisma/client/runtime/library").Decimal;
            shiftId: string | null;
        }[];
    }>;
    getShiftStatistics(req: any, startDate: string, endDate: string): Promise<{
        totalShifts: number;
        activeShifts: number;
        closedShifts: number;
        averageVariance: number;
        positiveVariances: number;
        negativeVariances: number;
    }>;
    getUsersByDateRange(req: any, startDate: string, endDate: string): Promise<any[]>;
    getTillsByDateRange(req: any, startDate: string, endDate: string): Promise<string[]>;
}

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSessionDto, ScanItemDto, UpdateSessionDto, ApproveSessionDto } from './dto';
import { StockTakeStatus as PrismaStockTakeStatus } from '@prisma/client';
export declare class StockTakingService {
    private prisma;
    constructor(prisma: PrismaService);
    createSession(tenantId: string, userId: string, dto: CreateSessionDto): Promise<{
        stock_take_items: {
            id: string;
            status: import("@prisma/client").$Enums.StockTakeItemStatus;
            createdAt: Date;
            notes: string | null;
            productId: string | null;
            productName: string | null;
            productSku: string | null;
            variance: number | null;
            scannedCode: string;
            scannedQuantity: number;
            scannedAt: Date;
            sessionId: string;
            expectedQuantity: number | null;
            systemQuantity: number | null;
            scannedBy: string;
        }[];
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    }>;
    getSessions(tenantId: string, status?: PrismaStockTakeStatus): Promise<({
        _count: {
            stock_take_items: number;
        };
        approver: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    })[]>;
    getSession(tenantId: string, sessionId: string): Promise<{
        summary: {
            totalScanned: number;
            verified: number;
            missing: number;
            unexpected: number;
            damaged: number;
            totalVariance: any;
            accuracy: string;
        };
        stock_take_items: ({
            scanner: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.StockTakeItemStatus;
            createdAt: Date;
            notes: string | null;
            productId: string | null;
            productName: string | null;
            productSku: string | null;
            variance: number | null;
            scannedCode: string;
            scannedQuantity: number;
            scannedAt: Date;
            sessionId: string;
            expectedQuantity: number | null;
            systemQuantity: number | null;
            scannedBy: string;
        })[];
        approver: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    }>;
    scanItem(tenantId: string, sessionId: string, userId: string, dto: ScanItemDto): Promise<{
        item: any;
        product: any;
        isDuplicate: boolean;
        warning: string;
    }>;
    updateSession(tenantId: string, sessionId: string, dto: UpdateSessionDto): Promise<{
        stock_take_items: {
            id: string;
            status: import("@prisma/client").$Enums.StockTakeItemStatus;
            createdAt: Date;
            notes: string | null;
            productId: string | null;
            productName: string | null;
            productSku: string | null;
            variance: number | null;
            scannedCode: string;
            scannedQuantity: number;
            scannedAt: Date;
            sessionId: string;
            expectedQuantity: number | null;
            systemQuantity: number | null;
            scannedBy: string;
        }[];
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    }>;
    completeSession(tenantId: string, sessionId: string, userId: string): Promise<{
        stock_take_items: {
            id: string;
            status: import("@prisma/client").$Enums.StockTakeItemStatus;
            createdAt: Date;
            notes: string | null;
            productId: string | null;
            productName: string | null;
            productSku: string | null;
            variance: number | null;
            scannedCode: string;
            scannedQuantity: number;
            scannedAt: Date;
            sessionId: string;
            expectedQuantity: number | null;
            systemQuantity: number | null;
            scannedBy: string;
        }[];
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    }>;
    approveSession(tenantId: string, sessionId: string, userId: string, dto: ApproveSessionDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.StockTakeStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        createdBy: string;
        location: string | null;
        sessionName: string;
        remarks: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        completedAt: Date | null;
        approvedBy: string | null;
    }>;
    private validateVariances;
    private applyToInventory;
    deleteSession(tenantId: string, sessionId: string): Promise<{
        message: string;
    }>;
    deleteItem(tenantId: string, sessionId: string, itemId: string): Promise<{
        message: string;
    }>;
    private calculateSummary;
    getSessionReport(tenantId: string, sessionId: string): Promise<{
        session: {
            id: string;
            sessionName: string;
            location: string;
            status: import("@prisma/client").$Enums.StockTakeStatus;
            createdBy: {
                email: string;
                firstName: string;
                lastName: string;
                id: string;
            };
            approvedBy: {
                email: string;
                firstName: string;
                lastName: string;
                id: string;
            };
            createdAt: Date;
            completedAt: Date;
            approvedAt: Date;
        };
        summary: {
            totalScanned: number;
            verified: number;
            missing: number;
            unexpected: number;
            damaged: number;
            totalVariance: any;
            accuracy: string;
        };
        items: ({
            scanner: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.StockTakeItemStatus;
            createdAt: Date;
            notes: string | null;
            productId: string | null;
            productName: string | null;
            productSku: string | null;
            variance: number | null;
            scannedCode: string;
            scannedQuantity: number;
            scannedAt: Date;
            sessionId: string;
            expectedQuantity: number | null;
            systemQuantity: number | null;
            scannedBy: string;
        })[];
    }>;
    getVarianceReport(tenantId: string, sessionId: string): Promise<{
        sessionId: string;
        sessionName: string;
        totalItems: number;
        totalVarianceValue: string;
        variances: {
            critical: {
                count: number;
                items: any[];
                requiresAdminApproval: boolean;
            };
            moderate: {
                count: number;
                items: any[];
            };
            minor: {
                count: number;
                items: any[];
            };
        };
        recommendation: string;
    }>;
}

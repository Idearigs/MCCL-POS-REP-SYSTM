"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockTakingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const client_1 = require("@prisma/client");
let StockTakingService = class StockTakingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSession(tenantId, userId, dto) {
        const session = await this.prisma.stock_take_sessions.create({
            data: {
                id: `st_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                tenantId,
                createdBy: userId,
                sessionName: dto.sessionName,
                location: dto.location,
                remarks: dto.remarks,
                status: client_1.StockTakeStatus.DRAFT,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                stock_take_items: true,
            },
        });
        return session;
    }
    async getSessions(tenantId, status) {
        const where = { tenantId };
        if (status) {
            where.status = status;
        }
        const sessions = await this.prisma.stock_take_sessions.findMany({
            where,
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        stock_take_items: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return sessions;
    }
    async getSession(tenantId, sessionId) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                stock_take_items: {
                    include: {
                        scanner: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: {
                        scannedAt: 'desc',
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        const summary = this.calculateSummary(session.stock_take_items);
        return {
            ...session,
            summary,
        };
    }
    async scanItem(tenantId, sessionId, userId, dto) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status !== client_1.StockTakeStatus.DRAFT &&
            session.status !== client_1.StockTakeStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('Cannot scan items in a completed, approved, or cancelled session');
        }
        let product = null;
        let status;
        if (dto.scannedCode) {
            product = await this.prisma.products.findFirst({
                where: {
                    tenantId,
                    isActive: true,
                    OR: [
                        { qrCode: dto.scannedCode },
                        { barcode: dto.scannedCode },
                        { sku: dto.scannedCode },
                    ],
                },
            });
        }
        if (product) {
            status = client_1.StockTakeItemStatus.VERIFIED;
        }
        else if (dto.productId) {
            product = await this.prisma.products.findFirst({
                where: {
                    id: dto.productId,
                    tenantId,
                    isActive: true,
                },
            });
            status = product
                ? client_1.StockTakeItemStatus.VERIFIED
                : client_1.StockTakeItemStatus.MISSING;
        }
        else {
            status = client_1.StockTakeItemStatus.UNEXPECTED;
        }
        const existingItem = await this.prisma.stock_take_items.findFirst({
            where: {
                sessionId,
                OR: product
                    ? [{ productId: product.id }]
                    : [{ scannedCode: dto.scannedCode }],
            },
        });
        let stockTakeItem;
        if (existingItem) {
            stockTakeItem = await this.prisma.stock_take_items.update({
                where: { id: existingItem.id },
                data: {
                    scannedQuantity: existingItem.scannedQuantity + dto.scannedQuantity,
                    variance: product
                        ? existingItem.scannedQuantity +
                            dto.scannedQuantity -
                            (product.stockQuantity || 0)
                        : null,
                    notes: dto.notes || existingItem.notes,
                    scannedAt: new Date(),
                },
                include: {
                    scanner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
        }
        else {
            stockTakeItem = await this.prisma.stock_take_items.create({
                data: {
                    id: `sti_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    sessionId,
                    productId: product?.id || null,
                    scannedCode: dto.scannedCode,
                    productName: product?.name || dto.productName || 'Unknown Product',
                    productSku: product?.sku || dto.productSku || null,
                    expectedQuantity: product?.stockQuantity || null,
                    scannedQuantity: dto.scannedQuantity,
                    systemQuantity: product?.stockQuantity || null,
                    variance: product
                        ? dto.scannedQuantity - (product.stockQuantity || 0)
                        : null,
                    status,
                    notes: dto.notes,
                    scannedBy: userId,
                    scannedAt: new Date(),
                    createdAt: new Date(),
                },
                include: {
                    scanner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
        }
        if (session.status === client_1.StockTakeStatus.DRAFT) {
            await this.prisma.stock_take_sessions.update({
                where: { id: sessionId },
                data: {
                    status: client_1.StockTakeStatus.IN_PROGRESS,
                    updatedAt: new Date(),
                },
            });
        }
        return {
            item: stockTakeItem,
            product,
            isDuplicate: !!existingItem,
            warning: existingItem
                ? 'This item was already scanned. Quantity has been updated.'
                : null,
        };
    }
    async updateSession(tenantId, sessionId, dto) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status === client_1.StockTakeStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot update an approved session');
        }
        const updated = await this.prisma.stock_take_sessions.update({
            where: { id: sessionId },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                stock_take_items: true,
            },
        });
        return updated;
    }
    async completeSession(tenantId, sessionId, userId) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
            include: {
                stock_take_items: true,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status !== client_1.StockTakeStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('Can only complete sessions that are in progress');
        }
        if (session.stock_take_items.length === 0) {
            throw new common_1.BadRequestException('Cannot complete a session with no scanned items');
        }
        const updated = await this.prisma.stock_take_sessions.update({
            where: { id: sessionId },
            data: {
                status: client_1.StockTakeStatus.PENDING_APPROVAL,
                completedAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                stock_take_items: true,
            },
        });
        return updated;
    }
    async approveSession(tenantId, sessionId, userId, dto) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
            include: {
                stock_take_items: true,
                creator: true,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status !== client_1.StockTakeStatus.PENDING_APPROVAL &&
            session.status !== client_1.StockTakeStatus.COMPLETED) {
            throw new common_1.BadRequestException('Can only approve sessions that are pending approval or completed');
        }
        if (session.createdBy === userId) {
            throw new common_1.ForbiddenException('You cannot approve your own stock take session. Another manager or owner must approve this session for security and accountability.');
        }
        if (dto.approve && dto.applyToInventory) {
            await this.validateVariances(session.stock_take_items);
        }
        if (dto.approve) {
            const updateData = {
                status: client_1.StockTakeStatus.APPROVED,
                approvedBy: userId,
                approvedAt: new Date(),
                updatedAt: new Date(),
            };
            const updated = await this.prisma.stock_take_sessions.update({
                where: { id: sessionId },
                data: updateData,
            });
            if (dto.applyToInventory) {
                await this.applyToInventory(tenantId, session, userId);
            }
            return updated;
        }
        else {
            if (!dto.rejectionReason) {
                throw new common_1.BadRequestException('Rejection reason is required when rejecting a session');
            }
            const updated = await this.prisma.stock_take_sessions.update({
                where: { id: sessionId },
                data: {
                    status: client_1.StockTakeStatus.REJECTED,
                    rejectionReason: dto.rejectionReason,
                    updatedAt: new Date(),
                },
            });
            return updated;
        }
    }
    async validateVariances(items) {
        const largeVariances = items.filter((item) => {
            if (!item.variance || !item.systemQuantity)
                return false;
            const variancePercent = Math.abs((item.variance / item.systemQuantity) * 100);
            return variancePercent > 20 || Math.abs(item.variance) > 10;
        });
        if (largeVariances.length > 0) {
            const details = largeVariances
                .map((item) => {
                const variancePercent = Math.abs((item.variance / item.systemQuantity) * 100).toFixed(1);
                return `${item.productName} (SKU: ${item.productSku}): ${item.variance > 0 ? '+' : ''}${item.variance} units (${variancePercent}% variance)`;
            })
                .join('; ');
            throw new common_1.BadRequestException(`Large inventory variances detected in ${largeVariances.length} product(s). Please review carefully: ${details}. If this is correct, contact your system administrator.`);
        }
    }
    async applyToInventory(tenantId, session, userId) {
        const items = session.stock_take_items;
        const activeStockTakes = await this.prisma.stock_take_sessions.count({
            where: {
                tenantId,
                id: { not: session.id },
                status: {
                    in: [
                        client_1.StockTakeStatus.IN_PROGRESS,
                        client_1.StockTakeStatus.PENDING_APPROVAL,
                    ],
                },
            },
        });
        if (activeStockTakes > 0) {
            throw new common_1.BadRequestException('There are other active stock take sessions. Please complete or cancel them before applying this stock take to prevent inventory conflicts.');
        }
        try {
            await this.prisma.$transaction(async (tx) => {
                let updatedCount = 0;
                let adjustmentCount = 0;
                for (const item of items) {
                    if (item.productId && item.status === client_1.StockTakeItemStatus.VERIFIED) {
                        const currentProduct = await tx.products.findUnique({
                            where: { id: item.productId },
                        });
                        if (!currentProduct) {
                            throw new common_1.BadRequestException(`Product ${item.productName} (SKU: ${item.productSku}) no longer exists in the system. Cannot apply stock take.`);
                        }
                        await tx.products.update({
                            where: { id: item.productId },
                            data: {
                                stockQuantity: item.scannedQuantity,
                                updatedAt: new Date(),
                            },
                        });
                        updatedCount++;
                        await tx.inventory_logs.create({
                            data: {
                                id: `invlog_${Date.now()}_${Math.random().toString(36).substring(7)}_${updatedCount}`,
                                tenantId,
                                productId: item.productId,
                                type: 'ADJUSTMENT',
                                quantity: Math.abs(item.variance || 0),
                                previousQty: item.systemQuantity || 0,
                                newQty: item.scannedQuantity,
                                reason: `Stock take adjustment - Session: ${session.sessionName} | Variance: ${item.variance > 0 ? '+' : ''}${item.variance || 0} | Approved by: ${userId}`,
                                reference: session.id,
                                createdAt: new Date(),
                            },
                        });
                        if (item.variance !== 0 && item.variance !== null) {
                            adjustmentCount++;
                        }
                    }
                }
                console.log(`✅ Stock take applied: ${updatedCount} products updated, ${adjustmentCount} adjustments made`);
            });
        }
        catch (error) {
            console.error('❌ Stock take application failed:', error.message);
            throw new common_1.BadRequestException(`Failed to apply stock take to inventory: ${error.message}. All changes have been rolled back.`);
        }
    }
    async deleteSession(tenantId, sessionId) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status === client_1.StockTakeStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot delete an approved session');
        }
        await this.prisma.stock_take_sessions.delete({
            where: { id: sessionId },
        });
        return { message: 'Session deleted successfully' };
    }
    async deleteItem(tenantId, sessionId, itemId) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        if (session.status !== client_1.StockTakeStatus.DRAFT &&
            session.status !== client_1.StockTakeStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('Cannot delete items from a completed or approved session');
        }
        const item = await this.prisma.stock_take_items.findFirst({
            where: {
                id: itemId,
                sessionId,
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Stock take item not found');
        }
        await this.prisma.stock_take_items.delete({
            where: { id: itemId },
        });
        return { message: 'Item deleted successfully' };
    }
    calculateSummary(items) {
        const totalScanned = items.length;
        const verified = items.filter((i) => i.status === client_1.StockTakeItemStatus.VERIFIED).length;
        const missing = items.filter((i) => i.status === client_1.StockTakeItemStatus.MISSING).length;
        const unexpected = items.filter((i) => i.status === client_1.StockTakeItemStatus.UNEXPECTED).length;
        const damaged = items.filter((i) => i.status === client_1.StockTakeItemStatus.DAMAGED).length;
        const totalVariance = items.reduce((sum, i) => sum + (i.variance || 0), 0);
        return {
            totalScanned,
            verified,
            missing,
            unexpected,
            damaged,
            totalVariance,
            accuracy: totalScanned > 0
                ? ((verified / totalScanned) * 100).toFixed(2)
                : '0.00',
        };
    }
    async getSessionReport(tenantId, sessionId) {
        const session = await this.getSession(tenantId, sessionId);
        return {
            session: {
                id: session.id,
                sessionName: session.sessionName,
                location: session.location,
                status: session.status,
                createdBy: session.creator,
                approvedBy: session.approver,
                createdAt: session.createdAt,
                completedAt: session.completedAt,
                approvedAt: session.approvedAt,
            },
            summary: session.summary,
            items: session.stock_take_items,
        };
    }
    async getVarianceReport(tenantId, sessionId) {
        const session = await this.prisma.stock_take_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
            include: {
                stock_take_items: {
                    where: {
                        variance: {
                            not: 0,
                        },
                    },
                    orderBy: {
                        variance: 'desc',
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Stock take session not found');
        }
        const criticalVariances = [];
        const moderateVariances = [];
        const minorVariances = [];
        let totalVarianceValue = 0;
        for (const item of session.stock_take_items) {
            if (!item.variance || item.variance === 0)
                continue;
            const variancePercent = item.systemQuantity
                ? Math.abs((item.variance / item.systemQuantity) * 100)
                : 0;
            const absVariance = Math.abs(item.variance);
            const product = await this.prisma.products.findUnique({
                where: { id: item.productId },
                select: { sellingPrice: true },
            });
            const valueImpact = product
                ? parseFloat(product.sellingPrice.toString()) * absVariance
                : 0;
            totalVarianceValue += item.variance > 0 ? valueImpact : -valueImpact;
            const varianceData = {
                productName: item.productName,
                productSku: item.productSku,
                systemQuantity: item.systemQuantity,
                scannedQuantity: item.scannedQuantity,
                variance: item.variance,
                variancePercent: variancePercent.toFixed(1),
                valueImpact: valueImpact.toFixed(2),
                status: item.status,
            };
            if (variancePercent > 20 || absVariance > 10) {
                criticalVariances.push(varianceData);
            }
            else if (variancePercent > 10 || absVariance > 5) {
                moderateVariances.push(varianceData);
            }
            else {
                minorVariances.push(varianceData);
            }
        }
        return {
            sessionId: session.id,
            sessionName: session.sessionName,
            totalItems: session.stock_take_items.length,
            totalVarianceValue: totalVarianceValue.toFixed(2),
            variances: {
                critical: {
                    count: criticalVariances.length,
                    items: criticalVariances,
                    requiresAdminApproval: criticalVariances.length > 0,
                },
                moderate: {
                    count: moderateVariances.length,
                    items: moderateVariances,
                },
                minor: {
                    count: minorVariances.length,
                    items: minorVariances,
                },
            },
            recommendation: criticalVariances.length > 0
                ? 'REVIEW_REQUIRED: Critical variances detected. Please verify physical count before approving.'
                : moderateVariances.length > 0
                    ? 'CAUTION: Moderate variances detected. Review recommended.'
                    : 'OK: Only minor variances detected.',
        };
    }
};
exports.StockTakingService = StockTakingService;
exports.StockTakingService = StockTakingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockTakingService);
//# sourceMappingURL=stock-taking.service.js.map
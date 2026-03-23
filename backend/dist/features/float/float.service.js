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
var FloatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const id_generator_1 = require("../../shared/utils/id-generator");
const float_dto_1 = require("./dto/float.dto");
const client_1 = require("@prisma/client");
let FloatService = FloatService_1 = class FloatService {
    prisma;
    logger = new common_1.Logger(FloatService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateFloatNumber(tenantId) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        const count = await this.prisma.float_sessions.count({
            where: {
                tenantId,
                openedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
        return `FLT-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }
    async openFloatSession(tenantId, userId, dto) {
        this.logger.log(`Opening float session for user ${userId}`);
        const existingOpenFloat = await this.prisma.float_sessions.findFirst({
            where: {
                tenantId,
                userId,
                status: float_dto_1.FloatStatus.OPEN,
            },
        });
        if (existingOpenFloat) {
            throw new common_1.BadRequestException('You already have an open float session. Please close it before opening a new one.');
        }
        const floatNumber = await this.generateFloatNumber(tenantId);
        const floatSession = await this.prisma.float_sessions.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                tenantId,
                userId,
                floatNumber,
                registerName: dto.registerName,
                openingBalance: new client_1.Prisma.Decimal(dto.openingBalance),
                status: float_dto_1.FloatStatus.OPEN,
                notes: dto.notes,
                openedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        this.logger.log(`Float session ${floatNumber} opened successfully`);
        return this.transformFloatSession(floatSession);
    }
    async closeFloatSession(tenantId, userId, sessionId, dto) {
        this.logger.log(`Closing float session ${sessionId}`);
        const session = await this.prisma.float_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
                userId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Float session not found or access denied');
        }
        if (session.status !== float_dto_1.FloatStatus.OPEN) {
            throw new common_1.BadRequestException('Float session is already closed');
        }
        const expectedClosing = Number(session.openingBalance) +
            Number(session.totalSales) +
            Number(session.totalCashIn) -
            Number(session.totalCashOut) -
            Number(session.totalRefunds);
        const actualClosing = dto.actualClosing;
        const difference = actualClosing - expectedClosing;
        let status = float_dto_1.FloatStatus.BALANCED;
        if (Math.abs(difference) > 0.01) {
            status = float_dto_1.FloatStatus.DISCREPANCY;
        }
        const updatedSession = await this.prisma.float_sessions.update({
            where: { id: sessionId },
            data: {
                actualClosing: new client_1.Prisma.Decimal(actualClosing),
                expectedClosing: new client_1.Prisma.Decimal(expectedClosing),
                difference: new client_1.Prisma.Decimal(difference),
                closingNotes: dto.closingNotes,
                status,
                closedAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                float_transactions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        this.logger.log(`Float session ${session.floatNumber} closed. Status: ${status}, Difference: £${difference.toFixed(2)}`);
        return this.transformFloatSession(updatedSession);
    }
    async getCurrentFloatSession(tenantId, userId) {
        const session = await this.prisma.float_sessions.findFirst({
            where: {
                tenantId,
                userId,
                status: float_dto_1.FloatStatus.OPEN,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                float_transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        users: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        if (!session) {
            return null;
        }
        return this.transformFloatSession(session);
    }
    async getFloatSessions(tenantId, dto) {
        const page = dto.page || 1;
        const limit = dto.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
        };
        if (dto.status) {
            where.status = dto.status;
        }
        if (dto.userId) {
            where.userId = dto.userId;
        }
        if (dto.startDate || dto.endDate) {
            where.openedAt = {};
            if (dto.startDate) {
                where.openedAt.gte = new Date(dto.startDate);
            }
            if (dto.endDate) {
                where.openedAt.lte = new Date(dto.endDate);
            }
        }
        const [sessions, total] = await Promise.all([
            this.prisma.float_sessions.findMany({
                where,
                skip,
                take: limit,
                orderBy: { openedAt: 'desc' },
                include: {
                    users: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    float_transactions: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            }),
            this.prisma.float_sessions.count({ where }),
        ]);
        return {
            data: sessions.map((s) => this.transformFloatSession(s)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getFloatSessionById(tenantId, sessionId) {
        const session = await this.prisma.float_sessions.findFirst({
            where: {
                id: sessionId,
                tenantId,
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                float_transactions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Float session not found');
        }
        return this.transformFloatSession(session);
    }
    async createFloatTransaction(tenantId, userId, dto) {
        this.logger.log(`Creating ${dto.type} transaction for session ${dto.sessionId}`);
        const session = await this.prisma.float_sessions.findFirst({
            where: {
                id: dto.sessionId,
                tenantId,
                status: float_dto_1.FloatStatus.OPEN,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Float session not found or is already closed');
        }
        const transaction = await this.prisma.float_transactions.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                sessionId: dto.sessionId,
                tenantId,
                userId,
                type: dto.type,
                amount: new client_1.Prisma.Decimal(dto.amount),
                reason: dto.reason,
                reference: dto.reference,
                notes: dto.notes,
                createdAt: new Date(),
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        const updateData = { updatedAt: new Date() };
        switch (dto.type) {
            case float_dto_1.FloatTransactionType.CASH_IN:
                updateData.totalCashIn = {
                    increment: new client_1.Prisma.Decimal(dto.amount),
                };
                break;
            case float_dto_1.FloatTransactionType.CASH_OUT:
            case float_dto_1.FloatTransactionType.EXPENSE:
                updateData.totalCashOut = {
                    increment: new client_1.Prisma.Decimal(dto.amount),
                };
                break;
            case float_dto_1.FloatTransactionType.REFUND:
                updateData.totalRefunds = {
                    increment: new client_1.Prisma.Decimal(dto.amount),
                };
                break;
            case float_dto_1.FloatTransactionType.SALE:
                updateData.totalSales = {
                    increment: new client_1.Prisma.Decimal(dto.amount),
                };
                break;
        }
        await this.prisma.float_sessions.update({
            where: { id: dto.sessionId },
            data: updateData,
        });
        this.logger.log(`${dto.type} transaction created: £${dto.amount.toFixed(2)}`);
        return this.transformFloatTransaction(transaction);
    }
    async recordSale(tenantId, userId, amount, reference) {
        const session = await this.prisma.float_sessions.findFirst({
            where: {
                tenantId,
                userId,
                status: float_dto_1.FloatStatus.OPEN,
            },
        });
        if (!session) {
            this.logger.warn(`No open float session for user ${userId}. Sale not recorded in float.`);
            return null;
        }
        return this.createFloatTransaction(tenantId, userId, {
            sessionId: session.id,
            type: float_dto_1.FloatTransactionType.SALE,
            amount,
            reason: 'Cash sale',
            reference,
        });
    }
    transformFloatSession(session) {
        return {
            ...session,
            openingBalance: Number(session.openingBalance),
            expectedClosing: session.expectedClosing
                ? Number(session.expectedClosing)
                : null,
            actualClosing: session.actualClosing
                ? Number(session.actualClosing)
                : null,
            difference: session.difference ? Number(session.difference) : null,
            totalSales: Number(session.totalSales),
            totalCashIn: Number(session.totalCashIn),
            totalCashOut: Number(session.totalCashOut),
            totalRefunds: Number(session.totalRefunds),
            user: session.users,
            transactions: session.float_transactions?.map((t) => this.transformFloatTransaction(t)),
        };
    }
    transformFloatTransaction(transaction) {
        return {
            ...transaction,
            amount: Number(transaction.amount),
            user: transaction.users,
        };
    }
};
exports.FloatService = FloatService;
exports.FloatService = FloatService = FloatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FloatService);
//# sourceMappingURL=float.service.js.map
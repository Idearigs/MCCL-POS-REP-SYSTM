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
var PettyCashService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PettyCashService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const id_generator_1 = require("../../shared/utils/id-generator");
const petty_cash_dto_1 = require("./dto/petty-cash.dto");
const client_1 = require("@prisma/client");
let PettyCashService = PettyCashService_1 = class PettyCashService {
    prisma;
    logger = new common_1.Logger(PettyCashService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateAccountNumber(tenantId) {
        const count = await this.prisma.petty_cash_accounts.count({
            where: { tenantId },
        });
        return `PCA-${(count + 1).toString().padStart(6, '0')}`;
    }
    async generateTransactionNumber(tenantId) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.prisma.petty_cash_transactions.count({
            where: {
                tenantId,
                createdAt: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lte: new Date(date.setHours(23, 59, 59, 999)),
                },
            },
        });
        return `PCT-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }
    async createAccount(tenantId, userId, dto) {
        this.logger.log(`Creating petty cash account: ${dto.accountName}`);
        const accountNumber = await this.generateAccountNumber(tenantId);
        const account = await this.prisma.petty_cash_accounts.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                tenantId,
                accountName: dto.accountName,
                accountNumber,
                registerName: dto.registerName,
                location: dto.location,
                openingBalance: new client_1.Prisma.Decimal(dto.openingBalance),
                currentBalance: new client_1.Prisma.Decimal(dto.openingBalance),
                monthlyBudget: dto.monthlyBudget
                    ? new client_1.Prisma.Decimal(dto.monthlyBudget)
                    : null,
                notes: dto.notes,
                createdBy: userId,
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
            },
        });
        return this.transformAccount(account);
    }
    async getAccounts(tenantId) {
        const accounts = await this.prisma.petty_cash_accounts.findMany({
            where: { tenantId },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                petty_cash_transactions: {
                    where: {
                        status: petty_cash_dto_1.PettyCashStatus.PENDING,
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return accounts.map((account) => this.transformAccount(account));
    }
    async getAccountById(tenantId, accountId) {
        const account = await this.prisma.petty_cash_accounts.findFirst({
            where: {
                id: accountId,
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
                petty_cash_transactions: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        requester: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        approver: {
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
        if (!account) {
            throw new common_1.NotFoundException('Petty cash account not found');
        }
        return this.transformAccount(account);
    }
    async updateAccount(tenantId, accountId, dto) {
        const account = await this.prisma.petty_cash_accounts.findFirst({
            where: {
                id: accountId,
                tenantId,
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Petty cash account not found');
        }
        const updated = await this.prisma.petty_cash_accounts.update({
            where: { id: accountId },
            data: {
                accountName: dto.accountName,
                registerName: dto.registerName,
                location: dto.location,
                monthlyBudget: dto.monthlyBudget
                    ? new client_1.Prisma.Decimal(dto.monthlyBudget)
                    : undefined,
                isActive: dto.isActive,
                notes: dto.notes,
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
            },
        });
        return this.transformAccount(updated);
    }
    async replenishAccount(tenantId, userId, accountId, dto) {
        const account = await this.prisma.petty_cash_accounts.findFirst({
            where: {
                id: accountId,
                tenantId,
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Petty cash account not found');
        }
        if (!account.isActive) {
            throw new common_1.BadRequestException('Account is inactive');
        }
        const updated = await this.prisma.petty_cash_accounts.update({
            where: { id: accountId },
            data: {
                currentBalance: {
                    increment: new client_1.Prisma.Decimal(dto.amount),
                },
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Replenished account ${account.accountNumber} with £${dto.amount.toFixed(2)}`);
        return this.transformAccount(updated);
    }
    async createTransaction(tenantId, userId, dto) {
        this.logger.log(`Creating petty cash transaction for account ${dto.accountId}`);
        const account = await this.prisma.petty_cash_accounts.findFirst({
            where: {
                id: dto.accountId,
                tenantId,
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Petty cash account not found');
        }
        if (!account.isActive) {
            throw new common_1.BadRequestException('Account is inactive');
        }
        if (Number(account.currentBalance) < dto.amount) {
            throw new common_1.BadRequestException(`Insufficient balance. Available: £${Number(account.currentBalance).toFixed(2)}`);
        }
        const transactionNumber = await this.generateTransactionNumber(tenantId);
        const transaction = await this.prisma.petty_cash_transactions.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                tenantId,
                accountId: dto.accountId,
                transactionNumber,
                category: dto.category,
                amount: new client_1.Prisma.Decimal(dto.amount),
                description: dto.description,
                vendor: dto.vendor,
                receiptNumber: dto.receiptNumber,
                receiptImage: dto.receiptImage,
                status: petty_cash_dto_1.PettyCashStatus.PENDING,
                requestedBy: userId,
                transactionDate: dto.transactionDate
                    ? new Date(dto.transactionDate)
                    : new Date(),
                notes: dto.notes,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                account: {
                    select: {
                        id: true,
                        accountName: true,
                        accountNumber: true,
                        currentBalance: true,
                    },
                },
            },
        });
        this.logger.log(`Transaction ${transactionNumber} created - PENDING approval`);
        return this.transformTransaction(transaction);
    }
    async getTransactions(tenantId, dto) {
        const page = dto.page || 1;
        const limit = dto.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
        };
        if (dto.accountId) {
            where.accountId = dto.accountId;
        }
        if (dto.status) {
            where.status = dto.status;
        }
        if (dto.category) {
            where.category = dto.category;
        }
        if (dto.startDate || dto.endDate) {
            where.transactionDate = {};
            if (dto.startDate) {
                where.transactionDate.gte = new Date(dto.startDate);
            }
            if (dto.endDate) {
                where.transactionDate.lte = new Date(dto.endDate);
            }
        }
        const [transactions, total] = await Promise.all([
            this.prisma.petty_cash_transactions.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    requester: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    approver: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    account: {
                        select: {
                            id: true,
                            accountName: true,
                            accountNumber: true,
                        },
                    },
                },
            }),
            this.prisma.petty_cash_transactions.count({ where }),
        ]);
        return {
            data: transactions.map((t) => this.transformTransaction(t)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTransactionById(tenantId, transactionId) {
        const transaction = await this.prisma.petty_cash_transactions.findFirst({
            where: {
                id: transactionId,
                tenantId,
            },
            include: {
                requester: {
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
                rejecter: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                account: true,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return this.transformTransaction(transaction);
    }
    async approveTransaction(tenantId, userId, transactionId, dto) {
        const transaction = await this.prisma.petty_cash_transactions.findFirst({
            where: {
                id: transactionId,
                tenantId,
            },
            include: {
                account: true,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== petty_cash_dto_1.PettyCashStatus.PENDING) {
            throw new common_1.BadRequestException(`Transaction is already ${transaction.status.toLowerCase()}`);
        }
        if (transaction.requestedBy === userId) {
            throw new common_1.ForbiddenException('You cannot approve your own transaction');
        }
        const updated = await this.prisma.petty_cash_transactions.update({
            where: { id: transactionId },
            data: {
                status: petty_cash_dto_1.PettyCashStatus.APPROVED,
                approvedBy: userId,
                approvalDate: new Date(),
                notes: dto.notes || transaction.notes,
                updatedAt: new Date(),
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                account: true,
            },
        });
        await this.prisma.petty_cash_accounts.update({
            where: { id: transaction.accountId },
            data: {
                currentBalance: {
                    decrement: transaction.amount,
                },
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Transaction ${transaction.transactionNumber} APPROVED by user ${userId}`);
        return this.transformTransaction(updated);
    }
    async rejectTransaction(tenantId, userId, transactionId, dto) {
        const transaction = await this.prisma.petty_cash_transactions.findFirst({
            where: {
                id: transactionId,
                tenantId,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== petty_cash_dto_1.PettyCashStatus.PENDING) {
            throw new common_1.BadRequestException(`Transaction is already ${transaction.status.toLowerCase()}`);
        }
        if (transaction.requestedBy === userId) {
            throw new common_1.ForbiddenException('You cannot reject your own transaction');
        }
        const updated = await this.prisma.petty_cash_transactions.update({
            where: { id: transactionId },
            data: {
                status: petty_cash_dto_1.PettyCashStatus.REJECTED,
                rejectedBy: userId,
                rejectionReason: dto.rejectionReason,
                updatedAt: new Date(),
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                rejecter: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                account: true,
            },
        });
        this.logger.log(`Transaction ${transaction.transactionNumber} REJECTED by user ${userId}`);
        return this.transformTransaction(updated);
    }
    async cancelTransaction(tenantId, userId, transactionId) {
        const transaction = await this.prisma.petty_cash_transactions.findFirst({
            where: {
                id: transactionId,
                tenantId,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (transaction.status !== petty_cash_dto_1.PettyCashStatus.PENDING) {
            throw new common_1.BadRequestException('Can only cancel pending transactions');
        }
        if (transaction.requestedBy !== userId) {
            throw new common_1.ForbiddenException('You can only cancel your own transactions');
        }
        const updated = await this.prisma.petty_cash_transactions.update({
            where: { id: transactionId },
            data: {
                status: petty_cash_dto_1.PettyCashStatus.CANCELLED,
                updatedAt: new Date(),
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                account: true,
            },
        });
        return this.transformTransaction(updated);
    }
    async getSummaryReport(tenantId, accountId, startDate, endDate) {
        const where = { tenantId };
        if (accountId) {
            where.accountId = accountId;
        }
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) {
                where.transactionDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.transactionDate.lte = new Date(endDate);
            }
        }
        const transactions = await this.prisma.petty_cash_transactions.findMany({
            where,
            include: {
                account: true,
            },
        });
        const totalExpenses = transactions
            .filter((t) => t.status === petty_cash_dto_1.PettyCashStatus.APPROVED)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const pendingAmount = transactions
            .filter((t) => t.status === petty_cash_dto_1.PettyCashStatus.PENDING)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const byCategory = transactions
            .filter((t) => t.status === petty_cash_dto_1.PettyCashStatus.APPROVED)
            .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {});
        const byStatus = transactions.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});
        return {
            totalExpenses,
            pendingAmount,
            transactionCount: transactions.length,
            byCategory,
            byStatus,
        };
    }
    transformAccount(account) {
        return {
            ...account,
            openingBalance: Number(account.openingBalance),
            currentBalance: Number(account.currentBalance),
            monthlyBudget: account.monthlyBudget
                ? Number(account.monthlyBudget)
                : null,
            creator: account.creator,
            transactions: account.petty_cash_transactions?.map((t) => this.transformTransaction(t)),
        };
    }
    transformTransaction(transaction) {
        return {
            ...transaction,
            amount: Number(transaction.amount),
            requester: transaction.requester,
            approver: transaction.approver,
            rejecter: transaction.rejecter,
            account: transaction.account
                ? {
                    ...transaction.account,
                    openingBalance: transaction.account.openingBalance
                        ? Number(transaction.account.openingBalance)
                        : undefined,
                    currentBalance: transaction.account.currentBalance
                        ? Number(transaction.account.currentBalance)
                        : undefined,
                    monthlyBudget: transaction.account.monthlyBudget
                        ? Number(transaction.account.monthlyBudget)
                        : undefined,
                }
                : undefined,
        };
    }
};
exports.PettyCashService = PettyCashService;
exports.PettyCashService = PettyCashService = PettyCashService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PettyCashService);
//# sourceMappingURL=petty-cash.service.js.map
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
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const client_1 = require("@prisma/client");
const id_generator_1 = require("../../shared/utils/id-generator");
let ShiftsService = class ShiftsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateShiftNumber(userId) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayShifts = await this.prisma.shifts.count({
            where: {
                userId,
                startTime: {
                    gte: startOfDay,
                },
            },
        });
        const userPrefix = userId.substring(0, 6).toUpperCase();
        return `SHIFT-${dateStr}-${userPrefix}-${String(todayShifts + 1).padStart(3, '0')}`;
    }
    async startShift(data) {
        const existingShift = await this.prisma.shifts.findFirst({
            where: {
                userId: data.userId,
                status: client_1.ShiftStatus.ACTIVE,
            },
        });
        if (existingShift) {
            throw new common_1.BadRequestException('You already have an active shift. Please close it before starting a new one.');
        }
        const shiftNumber = await this.generateShiftNumber(data.userId);
        return this.prisma.shifts.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                shiftNumber,
                userId: data.userId,
                tenantId: data.tenantId,
                openingFloat: data.openingFloat,
                deviceInfo: data.deviceInfo,
                ipAddress: data.ipAddress,
                openingNotes: data.openingNotes,
                status: client_1.ShiftStatus.ACTIVE,
                updatedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        sales: true,
                    },
                },
            },
        });
    }
    async getActiveShift(userId, tenantId) {
        return this.prisma.shifts.findFirst({
            where: {
                userId,
                tenantId,
                status: client_1.ShiftStatus.ACTIVE,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        sales: true,
                    },
                },
            },
        });
    }
    async closeShift(shiftId, userId, data) {
        const shift = await this.prisma.shifts.findUnique({
            where: { id: shiftId },
            include: {
                sales: {
                    where: {
                        status: 'COMPLETED',
                        paymentStatus: 'COMPLETED',
                    },
                },
            },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (shift.userId !== userId) {
            throw new common_1.BadRequestException('You can only close your own shifts');
        }
        if (shift.status !== client_1.ShiftStatus.ACTIVE) {
            throw new common_1.BadRequestException('Only active shifts can be closed');
        }
        const cashSales = shift.sales.filter((s) => s.paymentMethod === 'CASH');
        const totalCashSales = cashSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const expectedFloat = Number(shift.openingFloat) + totalCashSales;
        const variance = data.closingFloat - expectedFloat;
        const duration = Math.floor((new Date().getTime() - shift.startTime.getTime()) / 1000 / 60);
        return this.prisma.shifts.update({
            where: { id: shiftId },
            data: {
                endTime: new Date(),
                duration,
                closingFloat: data.closingFloat,
                expectedFloat,
                variance,
                closingNotes: data.closingNotes,
                status: client_1.ShiftStatus.CLOSED,
                updatedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async getShiftsByDateRange(tenantId, startDate, endDate, userId, status) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return this.prisma.shifts.findMany({
            where: {
                tenantId,
                startTime: {
                    gte: startDate,
                    lte: endOfDay,
                },
                ...(userId && { userId }),
                ...(status && { status }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
                _count: {
                    select: {
                        sales: true,
                    },
                },
            },
            orderBy: {
                startTime: 'desc',
            },
        });
    }
    async getShiftReport(shiftId) {
        const shift = await this.prisma.shifts.findUnique({
            where: { id: shiftId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
                sales: {
                    include: {
                        sale_items: {
                            include: {
                                products: {
                                    select: {
                                        name: true,
                                        sku: true,
                                    },
                                },
                            },
                        },
                        customers: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        const completedSales = shift.sales.filter((s) => s.status === 'COMPLETED');
        const cancelledSales = shift.sales.filter((s) => s.status === 'CANCELLED');
        const totalSales = completedSales.length;
        const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const paymentBreakdown = {};
        completedSales.forEach((sale) => {
            const method = sale.paymentMethod;
            paymentBreakdown[method] =
                (paymentBreakdown[method] || 0) + Number(sale.totalAmount);
        });
        const itemsSold = completedSales.reduce((sum, s) => {
            return (sum + s.sale_items.reduce((itemSum, item) => itemSum + item.quantity, 0));
        }, 0);
        const totalDiscount = completedSales.reduce((sum, s) => sum + Number(s.discountAmount), 0);
        const totalTax = completedSales.reduce((sum, s) => sum + Number(s.taxAmount), 0);
        return {
            shift: {
                ...shift,
                openingFloat: Number(shift.openingFloat),
                closingFloat: shift.closingFloat ? Number(shift.closingFloat) : null,
                expectedFloat: shift.expectedFloat ? Number(shift.expectedFloat) : null,
                variance: shift.variance ? Number(shift.variance) : null,
            },
            metrics: {
                totalSales,
                totalRevenue,
                averageSaleValue,
                itemsSold,
                cancelledSales: cancelledSales.length,
                totalDiscount,
                totalTax,
                paymentBreakdown,
                cashSales: paymentBreakdown['CASH'] || 0,
                cardSales: paymentBreakdown['CARD'] || 0,
                floatVariance: shift.variance ? Number(shift.variance) : 0,
            },
            sales: completedSales.map((sale) => ({
                ...sale,
                totalAmount: Number(sale.totalAmount),
                subtotal: Number(sale.subtotal),
                taxAmount: Number(sale.taxAmount),
                discountAmount: Number(sale.discountAmount),
            })),
        };
    }
    async getShiftStatistics(tenantId, startDate, endDate) {
        const shifts = await this.getShiftsByDateRange(tenantId, startDate, endDate);
        const totalShifts = shifts.length;
        const activeShifts = shifts.filter((s) => s.status === client_1.ShiftStatus.ACTIVE).length;
        const closedShifts = shifts.filter((s) => s.status === client_1.ShiftStatus.CLOSED).length;
        const closedShiftsWithData = shifts.filter((s) => s.status === client_1.ShiftStatus.CLOSED && s.variance !== null);
        const averageVariance = closedShiftsWithData.length > 0
            ? closedShiftsWithData.reduce((sum, s) => sum + Number(s.variance), 0) /
                closedShiftsWithData.length
            : 0;
        const positiveVariances = closedShiftsWithData.filter((s) => Number(s.variance) > 0).length;
        const negativeVariances = closedShiftsWithData.filter((s) => Number(s.variance) < 0).length;
        return {
            totalShifts,
            activeShifts,
            closedShifts,
            averageVariance,
            positiveVariances,
            negativeVariances,
        };
    }
    async getUsersByDateRange(tenantId, startDate, endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const shifts = await this.prisma.shifts.findMany({
            where: {
                tenantId,
                startTime: {
                    gte: startDate,
                    lte: endOfDay,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                startTime: 'desc',
            },
        });
        const uniqueUsersMap = new Map();
        shifts.forEach((shift) => {
            if (shift.user && !uniqueUsersMap.has(shift.user.id)) {
                uniqueUsersMap.set(shift.user.id, shift.user);
            }
        });
        return Array.from(uniqueUsersMap.values());
    }
    async getTillsByDateRange(tenantId, startDate, endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const shifts = await this.prisma.shifts.findMany({
            where: {
                tenantId,
                startTime: {
                    gte: startDate,
                    lte: endOfDay,
                },
            },
            select: {
                location: true,
            },
        });
        const tillSet = new Set();
        shifts.forEach((shift) => {
            if (shift.location && shift.location.trim() !== '') {
                tillSet.add(shift.location.trim());
            }
        });
        const tillNumbers = Array.from(tillSet).sort();
        if (tillNumbers.length === 0) {
            return ['1', '2', '3'];
        }
        return tillNumbers;
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map
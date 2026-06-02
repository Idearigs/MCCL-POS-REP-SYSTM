import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ShiftStatus, ShiftCashMovementType, Prisma } from '@prisma/client';
import { CloseShiftDto, CashMovementDto } from './dto/shift.dto';
import { generateId } from '../../shared/utils/id-generator';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /**
   * Verify a cash-up PIN against any active MANAGER/OWNER in the tenant.
   * Returns the authorizing user's id, or null if no PIN matches.
   */
  async verifyCashUpPin(tenantId: string, pin: string): Promise<string | null> {
    if (!pin) return null;
    const managers = await this.prisma.users.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['OWNER', 'MANAGER'] },
        cashUpPin: { not: null },
      },
      select: { id: true, cashUpPin: true },
    });
    for (const m of managers) {
      if (m.cashUpPin && (await bcrypt.compare(pin, m.cashUpPin))) {
        return m.id;
      }
    }
    return null;
  }

  // Generate unique shift number
  async generateShiftNumber(userId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

    // Create a new date object for start of day to avoid mutation
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const todayShifts = await this.prisma.shifts.count({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
        },
      },
    });

    // Include userId prefix for uniqueness across different users
    const userPrefix = userId.substring(0, 6).toUpperCase();
    return `SHIFT-${dateStr}-${userPrefix}-${String(todayShifts + 1).padStart(3, '0')}`;
  }

  // Start a new shift
  async startShift(data: {
    userId: string;
    tenantId: string;
    openingFloat: number;
    deviceInfo?: string;
    ipAddress?: string;
    openingNotes?: string;
  }) {
    // Check if user already has an active shift
    const existingShift = await this.prisma.shifts.findFirst({
      where: {
        userId: data.userId,
        status: ShiftStatus.ACTIVE,
      },
    });

    if (existingShift) {
      throw new BadRequestException(
        'You already have an active shift. Please close it before starting a new one.',
      );
    }

    const shiftNumber = await this.generateShiftNumber(data.userId);

    return this.prisma.shifts.create({
      data: {
        id: generateId(),
        shiftNumber,
        userId: data.userId,
        tenantId: data.tenantId,
        openingFloat: data.openingFloat,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        openingNotes: data.openingNotes,
        status: ShiftStatus.ACTIVE,
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

  // Get active shift for user
  async getActiveShift(userId: string, tenantId: string) {
    return this.prisma.shifts.findFirst({
      where: {
        userId,
        tenantId,
        status: ShiftStatus.ACTIVE,
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

  // Close a shift with full cash-up reconciliation (dynamic expected-cash
  // formula, mandatory variance reason, and manager-PIN override gate).
  async closeShift(shiftId: string, userId: string, data: CloseShiftDto) {
    const shift = await this.prisma.shifts.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: {
            status: 'COMPLETED',
            paymentStatus: 'COMPLETED',
          },
        },
        cash_movements: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify shift ownership
    if (shift.userId !== userId) {
      throw new BadRequestException('You can only close your own shifts');
    }

    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new BadRequestException('Only active shifts can be closed');
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Tender totals from completed sales
    const totalCashSales = round2(
      shift.sales
        .filter((s) => s.paymentMethod === 'CASH')
        .reduce((sum, s) => sum + Number(s.totalAmount), 0),
    );
    const cardExpected = round2(
      shift.sales
        .filter((s) => s.paymentMethod === 'CARD')
        .reduce((sum, s) => sum + Number(s.totalAmount), 0),
    );

    // Cash movements recorded during the shift
    const payIns = round2(
      shift.cash_movements
        .filter((m) => m.type === ShiftCashMovementType.PAY_IN)
        .reduce((sum, m) => sum + Number(m.amount), 0),
    );
    const payOuts = round2(
      shift.cash_movements
        .filter((m) => m.type === ShiftCashMovementType.PAY_OUT)
        .reduce((sum, m) => sum + Number(m.amount), 0),
    );
    const cashRefunds = round2(data.cashRefunds ?? 0);

    // Dynamic expected-cash formula:
    // Opening Float + Cash Sales + Pay-Ins − Pay-Outs − Cash Refunds
    const expectedFloat = round2(
      Number(shift.openingFloat) +
        totalCashSales +
        payIns -
        payOuts -
        cashRefunds,
    );
    const declaredCash = round2(data.closingFloat);
    const variance = round2(declaredCash - expectedFloat);

    // Mandatory variance reason when the till does not balance exactly
    if (variance !== 0 && !data.varianceReason?.trim()) {
      throw new BadRequestException({
        code: 'VARIANCE_REASON_REQUIRED',
        message:
          'Your counted cash does not match the expected amount. Please enter a reason for the discrepancy.',
      });
    }

    // Manager-PIN gate when the absolute variance exceeds the threshold
    const { cashUp } = await this.settings.getSettings(shift.tenantId);
    const threshold = Number(cashUp.varianceThreshold ?? 5);
    let managerOverrideById: string | null = null;
    if (Math.abs(variance) > threshold) {
      if (!data.managerPin) {
        throw new ForbiddenException({
          code: 'MANAGER_PIN_REQUIRED',
          message: `Variance exceeds £${threshold.toFixed(2)}. A manager PIN is required to close this shift.`,
        });
      }
      managerOverrideById = await this.verifyCashUpPin(
        shift.tenantId,
        data.managerPin,
      );
      if (!managerOverrideById) {
        throw new ForbiddenException({
          code: 'MANAGER_PIN_INVALID',
          message: 'Invalid manager PIN.',
        });
      }
    }

    // Card / PDQ Z-Read reconciliation
    const cardActual = data.cardActual != null ? round2(data.cardActual) : null;
    const cardVariance =
      cardActual != null ? round2(cardActual - cardExpected) : null;

    // Calculate shift duration in minutes
    const duration = Math.floor(
      (new Date().getTime() - shift.startTime.getTime()) / 1000 / 60,
    );

    return this.prisma.shifts.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        duration,
        closingFloat: declaredCash,
        declaredCash,
        denominations: (data.denominations ??
          undefined) as Prisma.InputJsonValue,
        expectedFloat,
        variance,
        cardExpected,
        cardActual,
        cardVariance,
        cashPayIns: payIns,
        cashPayOuts: payOuts,
        cashRefunds,
        giftCardSales: round2(data.giftCardSales ?? 0),
        layawayDeposits: round2(data.layawayDeposits ?? 0),
        varianceReason: data.varianceReason?.trim() || null,
        managerOverrideById,
        managerOverrideAt: managerOverrideById ? new Date() : null,
        closingNotes: data.closingNotes,
        status: ShiftStatus.CLOSED,
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

  // Record a cash movement (pay-in / pay-out) against an active shift
  async createCashMovement(
    shiftId: string,
    userId: string,
    tenantId: string,
    data: CashMovementDto,
  ) {
    const shift = await this.prisma.shifts.findUnique({
      where: { id: shiftId },
      select: { id: true, userId: true, tenantId: true, status: true },
    });
    if (!shift || shift.tenantId !== tenantId) {
      throw new NotFoundException('Shift not found');
    }
    if (shift.userId !== userId) {
      throw new BadRequestException(
        'You can only record movements on your own shift',
      );
    }
    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new BadRequestException(
        'Cash movements can only be recorded on an active shift',
      );
    }
    return this.prisma.shift_cash_movements.create({
      data: {
        id: generateId(),
        shiftId,
        tenantId,
        userId,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
      },
    });
  }

  // List cash movements for a shift
  async getCashMovements(shiftId: string, tenantId: string) {
    return this.prisma.shift_cash_movements.findMany({
      where: { shiftId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get shifts by date range
  async getShiftsByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
    status?: ShiftStatus,
  ) {
    // Set end date to end of day
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

  // Get shift report/details
  async getShiftReport(shiftId: string) {
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
                    categories: { select: { name: true } },
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
      throw new NotFoundException('Shift not found');
    }

    // Filter completed sales
    const completedSales = shift.sales.filter((s) => s.status === 'COMPLETED');
    const cancelledSales = shift.sales.filter((s) => s.status === 'CANCELLED');

    const totalSales = completedSales.length;
    const totalRevenue = completedSales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0,
    );
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    completedSales.forEach((sale) => {
      const method = sale.paymentMethod;
      paymentBreakdown[method] =
        (paymentBreakdown[method] || 0) + Number(sale.totalAmount);
    });

    // Calculate items sold
    const itemsSold = completedSales.reduce((sum, s) => {
      return (
        sum + s.sale_items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    // Calculate discount given
    const totalDiscount = completedSales.reduce(
      (sum, s) => sum + Number(s.discountAmount),
      0,
    );

    // Calculate tax collected
    const totalTax = completedSales.reduce(
      (sum, s) => sum + Number(s.taxAmount),
      0,
    );

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

  // Get shift summary statistics
  async getShiftStatistics(tenantId: string, startDate: Date, endDate: Date) {
    const shifts = await this.getShiftsByDateRange(
      tenantId,
      startDate,
      endDate,
    );

    const totalShifts = shifts.length;
    const activeShifts = shifts.filter(
      (s) => s.status === ShiftStatus.ACTIVE,
    ).length;
    const closedShifts = shifts.filter(
      (s) => s.status === ShiftStatus.CLOSED,
    ).length;

    const closedShiftsWithData = shifts.filter(
      (s) => s.status === ShiftStatus.CLOSED && s.variance !== null,
    );

    const averageVariance =
      closedShiftsWithData.length > 0
        ? closedShiftsWithData.reduce((sum, s) => sum + Number(s.variance), 0) /
          closedShiftsWithData.length
        : 0;

    const positiveVariances = closedShiftsWithData.filter(
      (s) => Number(s.variance) > 0,
    ).length;
    const negativeVariances = closedShiftsWithData.filter(
      (s) => Number(s.variance) < 0,
    ).length;

    return {
      totalShifts,
      activeShifts,
      closedShifts,
      averageVariance,
      positiveVariances,
      negativeVariances,
    };
  }

  // Consolidated master report — aggregates across all shifts matching the
  // date filter (for the manager Day-End dashboard).
  async getShiftSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shifts.findMany({
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endOfDay },
        ...(userId && userId !== 'all' && { userId }),
      },
      select: {
        id: true,
        status: true,
        variance: true,
        cardExpected: true,
        cardActual: true,
        giftCardSales: true,
        layawayDeposits: true,
      },
    });

    const shiftIds = shifts.map((s) => s.id);
    const num = (v: unknown) => Number(v ?? 0);

    // Revenue / tax / discounts from the completed sales on those shifts
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalSales = 0;
    if (shiftIds.length > 0) {
      const agg = await this.prisma.sales.aggregate({
        where: {
          tenantId,
          shiftId: { in: shiftIds },
          status: 'COMPLETED',
          paymentStatus: 'COMPLETED',
        },
        _sum: { totalAmount: true, taxAmount: true, discountAmount: true },
        _count: { _all: true },
      });
      totalRevenue = num(agg._sum.totalAmount);
      totalTax = num(agg._sum.taxAmount);
      totalDiscounts = num(agg._sum.discountAmount);
      totalSales = agg._count._all;
    }

    const totalVariance = shifts.reduce((sum, s) => sum + num(s.variance), 0);
    const totalCardTender = shifts.reduce(
      (sum, s) => sum + num(s.cardActual ?? s.cardExpected),
      0,
    );
    const totalGiftCard = shifts.reduce(
      (sum, s) => sum + num(s.giftCardSales),
      0,
    );
    const totalLayaway = shifts.reduce(
      (sum, s) => sum + num(s.layawayDeposits),
      0,
    );

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      shiftCount: shifts.length,
      closedShifts: shifts.filter((s) => s.status === ShiftStatus.CLOSED)
        .length,
      totalSales,
      totalRevenue: round2(totalRevenue),
      totalTax: round2(totalTax),
      totalDiscounts: round2(totalDiscounts),
      totalVariance: round2(totalVariance),
      totalNonCashTenders: round2(
        totalCardTender + totalGiftCard + totalLayaway,
      ),
      totalCardTender: round2(totalCardTender),
      totalGiftCard: round2(totalGiftCard),
      totalLayaway: round2(totalLayaway),
    };
  }

  // Manager saves an audit resolution note against a shift's variance
  async saveAuditResolution(
    shiftId: string,
    tenantId: string,
    managerId: string,
    note: string,
  ) {
    const shift = await this.prisma.shifts.findFirst({
      where: { id: shiftId, tenantId },
      select: { id: true },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return this.prisma.shifts.update({
      where: { id: shiftId },
      data: {
        auditResolutionNote: note,
        auditResolvedById: managerId,
        auditResolvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        auditResolvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // Get unique users who worked in date range
  async getUsersByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all shifts in the date range
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

    // Extract unique users
    const uniqueUsersMap = new Map();
    shifts.forEach((shift) => {
      if (shift.user && !uniqueUsersMap.has(shift.user.id)) {
        uniqueUsersMap.set(shift.user.id, shift.user);
      }
    });

    return Array.from(uniqueUsersMap.values());
  }

  // Get unique tills used in date range
  async getTillsByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all shifts in the date range to extract location/till information
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

    // Extract unique locations/tills and filter out null/undefined
    const tillSet = new Set<string>();
    shifts.forEach((shift) => {
      if (shift.location && shift.location.trim() !== '') {
        tillSet.add(shift.location.trim());
      }
    });

    const tillNumbers = Array.from(tillSet).sort();

    // If no tills found, return default tills
    if (tillNumbers.length === 0) {
      return ['1', '2', '3'];
    }

    return tillNumbers;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ShiftStatus } from '@prisma/client';
import { StartShiftDto, CloseShiftDto } from './dto/shift.dto';
import { generateId } from '../../shared/utils/id-generator';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

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

  // Close a shift
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

    // Calculate expected float from cash sales
    const cashSales = shift.sales.filter((s) => s.paymentMethod === 'CASH');
    const totalCashSales = cashSales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0,
    );

    const expectedFloat = Number(shift.openingFloat) + totalCashSales;
    const variance = data.closingFloat - expectedFloat;

    // Calculate shift duration in minutes
    const duration = Math.floor(
      (new Date().getTime() - shift.startTime.getTime()) / 1000 / 60,
    );

    return this.prisma.shifts.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        duration,
        closingFloat: data.closingFloat,
        expectedFloat,
        variance,
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

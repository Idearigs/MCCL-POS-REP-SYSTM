import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  OpenFloatSessionDto,
  CloseFloatSessionDto,
  CreateFloatTransactionDto,
  GetFloatSessionsDto,
  FloatStatus,
  FloatTransactionType,
} from './dto/float.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FloatService {
  private readonly logger = new Logger(FloatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a unique float number
   */
  private async generateFloatNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Count floats for today
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

  /**
   * Open a new float session
   */
  async openFloatSession(
    tenantId: string,
    userId: string,
    dto: OpenFloatSessionDto,
  ) {
    this.logger.log(`Opening float session for user ${userId}`);

    // Check if user already has an open float session
    const existingOpenFloat = await this.prisma.float_sessions.findFirst({
      where: {
        tenantId,
        userId,
        status: FloatStatus.OPEN,
      },
    });

    if (existingOpenFloat) {
      throw new BadRequestException(
        'You already have an open float session. Please close it before opening a new one.',
      );
    }

    const floatNumber = await this.generateFloatNumber(tenantId);

    const floatSession = await this.prisma.float_sessions.create({
      data: {
        id: generateId(),
        tenantId,
        userId,
        floatNumber,
        registerName: dto.registerName,
        openingBalance: new Prisma.Decimal(dto.openingBalance),
        status: FloatStatus.OPEN,
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

  /**
   * Close a float session
   */
  async closeFloatSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    dto: CloseFloatSessionDto,
  ) {
    this.logger.log(`Closing float session ${sessionId}`);

    const session = await this.prisma.float_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
        userId, // Only allow closing own session
      },
    });

    if (!session) {
      throw new NotFoundException('Float session not found or access denied');
    }

    if (session.status !== FloatStatus.OPEN) {
      throw new BadRequestException('Float session is already closed');
    }

    // Calculate expected closing
    const expectedClosing =
      Number(session.openingBalance) +
      Number(session.totalSales) +
      Number(session.totalCashIn) -
      Number(session.totalCashOut) -
      Number(session.totalRefunds);

    const actualClosing = dto.actualClosing;
    const difference = actualClosing - expectedClosing;

    // Determine status based on difference
    let status = FloatStatus.BALANCED;
    if (Math.abs(difference) > 0.01) {
      // Allow 1 cent tolerance
      status = FloatStatus.DISCREPANCY;
    }

    const updatedSession = await this.prisma.float_sessions.update({
      where: { id: sessionId },
      data: {
        actualClosing: new Prisma.Decimal(actualClosing),
        expectedClosing: new Prisma.Decimal(expectedClosing),
        difference: new Prisma.Decimal(difference),
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

    this.logger.log(
      `Float session ${session.floatNumber} closed. Status: ${status}, Difference: £${difference.toFixed(2)}`,
    );

    return this.transformFloatSession(updatedSession);
  }

  /**
   * Get current open float session for user
   */
  async getCurrentFloatSession(tenantId: string, userId: string) {
    const session = await this.prisma.float_sessions.findFirst({
      where: {
        tenantId,
        userId,
        status: FloatStatus.OPEN,
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
          take: 10, // Latest 10 transactions
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

  /**
   * Get float sessions with filters
   */
  async getFloatSessions(tenantId: string, dto: GetFloatSessionsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.float_sessionsWhereInput = {
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

  /**
   * Get float session by ID
   */
  async getFloatSessionById(tenantId: string, sessionId: string) {
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
      throw new NotFoundException('Float session not found');
    }

    return this.transformFloatSession(session);
  }

  /**
   * Create a float transaction (cash in/out)
   */
  async createFloatTransaction(
    tenantId: string,
    userId: string,
    dto: CreateFloatTransactionDto,
  ) {
    this.logger.log(
      `Creating ${dto.type} transaction for session ${dto.sessionId}`,
    );

    // Verify session exists and is open
    const session = await this.prisma.float_sessions.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        status: FloatStatus.OPEN,
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Float session not found or is already closed',
      );
    }

    // Create transaction
    const transaction = await this.prisma.float_transactions.create({
      data: {
        id: generateId(),
        sessionId: dto.sessionId,
        tenantId,
        userId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
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

    // Update session totals
    const updateData: any = { updatedAt: new Date() };

    switch (dto.type) {
      case FloatTransactionType.CASH_IN:
        updateData.totalCashIn = {
          increment: new Prisma.Decimal(dto.amount),
        };
        break;
      case FloatTransactionType.CASH_OUT:
      case FloatTransactionType.EXPENSE:
        updateData.totalCashOut = {
          increment: new Prisma.Decimal(dto.amount),
        };
        break;
      case FloatTransactionType.REFUND:
        updateData.totalRefunds = {
          increment: new Prisma.Decimal(dto.amount),
        };
        break;
      case FloatTransactionType.SALE:
        updateData.totalSales = {
          increment: new Prisma.Decimal(dto.amount),
        };
        break;
    }

    await this.prisma.float_sessions.update({
      where: { id: dto.sessionId },
      data: updateData,
    });

    this.logger.log(
      `${dto.type} transaction created: £${dto.amount.toFixed(2)}`,
    );

    return this.transformFloatTransaction(transaction);
  }

  /**
   * Record a sale in the float (called from sales service)
   */
  async recordSale(
    tenantId: string,
    userId: string,
    amount: number,
    reference: string,
  ) {
    // Find user's open float session
    const session = await this.prisma.float_sessions.findFirst({
      where: {
        tenantId,
        userId,
        status: FloatStatus.OPEN,
      },
    });

    if (!session) {
      this.logger.warn(
        `No open float session for user ${userId}. Sale not recorded in float.`,
      );
      return null;
    }

    // Record sale transaction
    return this.createFloatTransaction(tenantId, userId, {
      sessionId: session.id,
      type: FloatTransactionType.SALE,
      amount,
      reason: 'Cash sale',
      reference,
    });
  }

  /**
   * Transform float session to response DTO
   */
  private transformFloatSession(session: any) {
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
      transactions: session.float_transactions?.map((t: any) =>
        this.transformFloatTransaction(t),
      ),
    };
  }

  /**
   * Transform float transaction to response DTO
   */
  private transformFloatTransaction(transaction: any) {
    return {
      ...transaction,
      amount: Number(transaction.amount),
      user: transaction.users,
    };
  }
}

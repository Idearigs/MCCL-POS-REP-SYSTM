import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  CreatePettyCashAccountDto,
  UpdatePettyCashAccountDto,
  ReplenishPettyCashDto,
  CreatePettyCashTransactionDto,
  ApprovePettyCashTransactionDto,
  RejectPettyCashTransactionDto,
  GetPettyCashTransactionsDto,
  PettyCashStatus,
  PettyCashCategory,
} from './dto/petty-cash.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PettyCashService {
  private readonly logger = new Logger(PettyCashService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique account number
   */
  private async generateAccountNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.petty_cash_accounts.count({
      where: { tenantId },
    });

    return `PCA-${(count + 1).toString().padStart(6, '0')}`;
  }

  /**
   * Generate unique transaction number
   */
  private async generateTransactionNumber(tenantId: string): Promise<string> {
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

  // ===== ACCOUNT MANAGEMENT =====

  /**
   * Create petty cash account
   */
  async createAccount(
    tenantId: string,
    userId: string,
    dto: CreatePettyCashAccountDto,
  ) {
    this.logger.log(`Creating petty cash account: ${dto.accountName}`);

    const accountNumber = await this.generateAccountNumber(tenantId);

    const account = await this.prisma.petty_cash_accounts.create({
      data: {
        id: generateId(),
        tenantId,
        accountName: dto.accountName,
        accountNumber,
        registerName: dto.registerName,
        location: dto.location,
        openingBalance: new Prisma.Decimal(dto.openingBalance),
        currentBalance: new Prisma.Decimal(dto.openingBalance),
        monthlyBudget: dto.monthlyBudget
          ? new Prisma.Decimal(dto.monthlyBudget)
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

  /**
   * Get all petty cash accounts
   */
  async getAccounts(tenantId: string) {
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
            status: PettyCashStatus.PENDING,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => this.transformAccount(account));
  }

  /**
   * Get account by ID
   */
  async getAccountById(tenantId: string, accountId: string) {
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
      throw new NotFoundException('Petty cash account not found');
    }

    return this.transformAccount(account);
  }

  /**
   * Update petty cash account
   */
  async updateAccount(
    tenantId: string,
    accountId: string,
    dto: UpdatePettyCashAccountDto,
  ) {
    const account = await this.prisma.petty_cash_accounts.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException('Petty cash account not found');
    }

    const updated = await this.prisma.petty_cash_accounts.update({
      where: { id: accountId },
      data: {
        accountName: dto.accountName,
        registerName: dto.registerName,
        location: dto.location,
        monthlyBudget: dto.monthlyBudget
          ? new Prisma.Decimal(dto.monthlyBudget)
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

  /**
   * Replenish petty cash account
   */
  async replenishAccount(
    tenantId: string,
    userId: string,
    accountId: string,
    dto: ReplenishPettyCashDto,
  ) {
    const account = await this.prisma.petty_cash_accounts.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException('Petty cash account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException('Account is inactive');
    }

    // Update balance
    const updated = await this.prisma.petty_cash_accounts.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: new Prisma.Decimal(dto.amount),
        },
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Replenished account ${account.accountNumber} with £${dto.amount.toFixed(2)}`,
    );

    return this.transformAccount(updated);
  }

  // ===== TRANSACTION MANAGEMENT =====

  /**
   * Create petty cash transaction (expense request)
   */
  async createTransaction(
    tenantId: string,
    userId: string,
    dto: CreatePettyCashTransactionDto,
  ) {
    this.logger.log(
      `Creating petty cash transaction for account ${dto.accountId}`,
    );

    // Verify account exists and is active
    const account = await this.prisma.petty_cash_accounts.findFirst({
      where: {
        id: dto.accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException('Petty cash account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException('Account is inactive');
    }

    // Check if sufficient balance
    if (Number(account.currentBalance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: £${Number(account.currentBalance).toFixed(2)}`,
      );
    }

    const transactionNumber = await this.generateTransactionNumber(tenantId);

    const transaction = await this.prisma.petty_cash_transactions.create({
      data: {
        id: generateId(),
        tenantId,
        accountId: dto.accountId,
        transactionNumber,
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description,
        vendor: dto.vendor,
        receiptNumber: dto.receiptNumber,
        receiptImage: dto.receiptImage,
        status: PettyCashStatus.PENDING,
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

    this.logger.log(
      `Transaction ${transactionNumber} created - PENDING approval`,
    );

    return this.transformTransaction(transaction);
  }

  /**
   * Get petty cash transactions with filters
   */
  async getTransactions(tenantId: string, dto: GetPettyCashTransactionsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.petty_cash_transactionsWhereInput = {
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

  /**
   * Get transaction by ID
   */
  async getTransactionById(tenantId: string, transactionId: string) {
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
      throw new NotFoundException('Transaction not found');
    }

    return this.transformTransaction(transaction);
  }

  /**
   * Approve petty cash transaction
   */
  async approveTransaction(
    tenantId: string,
    userId: string,
    transactionId: string,
    dto: ApprovePettyCashTransactionDto,
  ) {
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
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== PettyCashStatus.PENDING) {
      throw new BadRequestException(
        `Transaction is already ${transaction.status.toLowerCase()}`,
      );
    }

    // Cannot approve own transaction
    if (transaction.requestedBy === userId) {
      throw new ForbiddenException('You cannot approve your own transaction');
    }

    // Update transaction status
    const updated = await this.prisma.petty_cash_transactions.update({
      where: { id: transactionId },
      data: {
        status: PettyCashStatus.APPROVED,
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

    // Deduct from account balance
    await this.prisma.petty_cash_accounts.update({
      where: { id: transaction.accountId },
      data: {
        currentBalance: {
          decrement: transaction.amount,
        },
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Transaction ${transaction.transactionNumber} APPROVED by user ${userId}`,
    );

    return this.transformTransaction(updated);
  }

  /**
   * Reject petty cash transaction
   */
  async rejectTransaction(
    tenantId: string,
    userId: string,
    transactionId: string,
    dto: RejectPettyCashTransactionDto,
  ) {
    const transaction = await this.prisma.petty_cash_transactions.findFirst({
      where: {
        id: transactionId,
        tenantId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== PettyCashStatus.PENDING) {
      throw new BadRequestException(
        `Transaction is already ${transaction.status.toLowerCase()}`,
      );
    }

    // Cannot reject own transaction
    if (transaction.requestedBy === userId) {
      throw new ForbiddenException('You cannot reject your own transaction');
    }

    const updated = await this.prisma.petty_cash_transactions.update({
      where: { id: transactionId },
      data: {
        status: PettyCashStatus.REJECTED,
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

    this.logger.log(
      `Transaction ${transaction.transactionNumber} REJECTED by user ${userId}`,
    );

    return this.transformTransaction(updated);
  }

  /**
   * Cancel transaction (by requester)
   */
  async cancelTransaction(
    tenantId: string,
    userId: string,
    transactionId: string,
  ) {
    const transaction = await this.prisma.petty_cash_transactions.findFirst({
      where: {
        id: transactionId,
        tenantId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== PettyCashStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending transactions');
    }

    if (transaction.requestedBy !== userId) {
      throw new ForbiddenException('You can only cancel your own transactions');
    }

    const updated = await this.prisma.petty_cash_transactions.update({
      where: { id: transactionId },
      data: {
        status: PettyCashStatus.CANCELLED,
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

  // ===== REPORTS =====

  /**
   * Get petty cash summary report
   */
  async getSummaryReport(
    tenantId: string,
    accountId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { tenantId };

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

    // Get transactions
    const transactions = await this.prisma.petty_cash_transactions.findMany({
      where,
      include: {
        account: true,
      },
    });

    // Calculate summary
    const totalExpenses = transactions
      .filter((t) => t.status === PettyCashStatus.APPROVED)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingAmount = transactions
      .filter((t) => t.status === PettyCashStatus.PENDING)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = transactions
      .filter((t) => t.status === PettyCashStatus.APPROVED)
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

  // ===== HELPERS =====

  private transformAccount(account: any) {
    return {
      ...account,
      openingBalance: Number(account.openingBalance),
      currentBalance: Number(account.currentBalance),
      monthlyBudget: account.monthlyBudget
        ? Number(account.monthlyBudget)
        : null,
      creator: account.creator,
      transactions: account.petty_cash_transactions?.map((t: any) =>
        this.transformTransaction(t),
      ),
    };
  }

  private transformTransaction(transaction: any) {
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
}

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePettyCashAccountDto, UpdatePettyCashAccountDto, ReplenishPettyCashDto, CreatePettyCashTransactionDto, ApprovePettyCashTransactionDto, RejectPettyCashTransactionDto, GetPettyCashTransactionsDto } from './dto/petty-cash.dto';
export declare class PettyCashService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private generateAccountNumber;
    private generateTransactionNumber;
    createAccount(tenantId: string, userId: string, dto: CreatePettyCashAccountDto): Promise<any>;
    getAccounts(tenantId: string): Promise<any[]>;
    getAccountById(tenantId: string, accountId: string): Promise<any>;
    updateAccount(tenantId: string, accountId: string, dto: UpdatePettyCashAccountDto): Promise<any>;
    replenishAccount(tenantId: string, userId: string, accountId: string, dto: ReplenishPettyCashDto): Promise<any>;
    createTransaction(tenantId: string, userId: string, dto: CreatePettyCashTransactionDto): Promise<any>;
    getTransactions(tenantId: string, dto: GetPettyCashTransactionsDto): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getTransactionById(tenantId: string, transactionId: string): Promise<any>;
    approveTransaction(tenantId: string, userId: string, transactionId: string, dto: ApprovePettyCashTransactionDto): Promise<any>;
    rejectTransaction(tenantId: string, userId: string, transactionId: string, dto: RejectPettyCashTransactionDto): Promise<any>;
    cancelTransaction(tenantId: string, userId: string, transactionId: string): Promise<any>;
    getSummaryReport(tenantId: string, accountId?: string, startDate?: string, endDate?: string): Promise<{
        totalExpenses: number;
        pendingAmount: number;
        transactionCount: number;
        byCategory: {};
        byStatus: {};
    }>;
    private transformAccount;
    private transformTransaction;
}

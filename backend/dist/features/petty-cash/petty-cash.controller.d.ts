import { PettyCashService } from './petty-cash.service';
import { CreatePettyCashAccountDto, UpdatePettyCashAccountDto, ReplenishPettyCashDto, CreatePettyCashTransactionDto, ApprovePettyCashTransactionDto, RejectPettyCashTransactionDto, GetPettyCashTransactionsDto, PettyCashAccountResponseDto, PettyCashTransactionResponseDto } from './dto/petty-cash.dto';
export declare class PettyCashController {
    private readonly pettyCashService;
    constructor(pettyCashService: PettyCashService);
    createAccount(req: any, dto: CreatePettyCashAccountDto): Promise<PettyCashAccountResponseDto>;
    getAccounts(req: any): Promise<PettyCashAccountResponseDto[]>;
    getAccountById(req: any, accountId: string): Promise<PettyCashAccountResponseDto>;
    updateAccount(req: any, accountId: string, dto: UpdatePettyCashAccountDto): Promise<PettyCashAccountResponseDto>;
    replenishAccount(req: any, accountId: string, dto: ReplenishPettyCashDto): Promise<PettyCashAccountResponseDto>;
    createTransaction(req: any, dto: CreatePettyCashTransactionDto): Promise<PettyCashTransactionResponseDto>;
    getTransactions(req: any, dto: GetPettyCashTransactionsDto): Promise<any>;
    getTransactionById(req: any, transactionId: string): Promise<PettyCashTransactionResponseDto>;
    approveTransaction(req: any, transactionId: string, dto: ApprovePettyCashTransactionDto): Promise<PettyCashTransactionResponseDto>;
    rejectTransaction(req: any, transactionId: string, dto: RejectPettyCashTransactionDto): Promise<PettyCashTransactionResponseDto>;
    cancelTransaction(req: any, transactionId: string): Promise<PettyCashTransactionResponseDto>;
    getSummaryReport(req: any, accountId?: string, startDate?: string, endDate?: string): Promise<any>;
}

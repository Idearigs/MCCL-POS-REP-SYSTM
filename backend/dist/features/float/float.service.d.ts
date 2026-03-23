import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenFloatSessionDto, CloseFloatSessionDto, CreateFloatTransactionDto, GetFloatSessionsDto } from './dto/float.dto';
export declare class FloatService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private generateFloatNumber;
    openFloatSession(tenantId: string, userId: string, dto: OpenFloatSessionDto): Promise<any>;
    closeFloatSession(tenantId: string, userId: string, sessionId: string, dto: CloseFloatSessionDto): Promise<any>;
    getCurrentFloatSession(tenantId: string, userId: string): Promise<any>;
    getFloatSessions(tenantId: string, dto: GetFloatSessionsDto): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getFloatSessionById(tenantId: string, sessionId: string): Promise<any>;
    createFloatTransaction(tenantId: string, userId: string, dto: CreateFloatTransactionDto): Promise<any>;
    recordSale(tenantId: string, userId: string, amount: number, reference: string): Promise<any>;
    private transformFloatSession;
    private transformFloatTransaction;
}

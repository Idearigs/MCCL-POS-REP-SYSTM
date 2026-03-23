import { FloatService } from './float.service';
import { OpenFloatSessionDto, CloseFloatSessionDto, CreateFloatTransactionDto, GetFloatSessionsDto, FloatSessionResponseDto, FloatTransactionResponseDto } from './dto/float.dto';
export declare class FloatController {
    private readonly floatService;
    constructor(floatService: FloatService);
    openFloatSession(req: any, dto: OpenFloatSessionDto): Promise<FloatSessionResponseDto>;
    closeFloatSession(req: any, sessionId: string, dto: CloseFloatSessionDto): Promise<FloatSessionResponseDto>;
    getCurrentFloatSession(req: any): Promise<FloatSessionResponseDto | null>;
    getFloatSessions(req: any, dto: GetFloatSessionsDto): Promise<any>;
    getFloatSessionById(req: any, sessionId: string): Promise<FloatSessionResponseDto>;
    createFloatTransaction(req: any, dto: CreateFloatTransactionDto): Promise<FloatTransactionResponseDto>;
}

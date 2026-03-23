import type { Request, Response } from 'express';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        tenantId: string;
    };
}
import { ChatbotService } from './chatbot.service';
import { SendMessageDto, QuickActionDto, ExportReportDto } from './dto/chatbot.dto';
export declare class ChatbotController {
    private readonly chatbotService;
    constructor(chatbotService: ChatbotService);
    sendMessage(req: AuthenticatedRequest, body: SendMessageDto): Promise<import("./dto/chatbot.dto").ChatResponse>;
    quickAction(req: AuthenticatedRequest, body: QuickActionDto): Promise<any>;
    exportPDF(req: AuthenticatedRequest, body: ExportReportDto, res: Response): Promise<void>;
    exportCSV(req: AuthenticatedRequest, body: ExportReportDto, res: Response): Promise<void>;
}
export {};

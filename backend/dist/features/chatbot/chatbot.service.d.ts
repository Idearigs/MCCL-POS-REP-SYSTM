import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAIService } from '../../integrations/openai/openai.service';
import { QuickActionType, ChatResponse } from './dto/chatbot.dto';
export declare class ChatbotService {
    private prisma;
    private openAIService;
    private conversationHistory;
    constructor(prisma: PrismaService, openAIService: OpenAIService);
    sendMessage(userId: string, tenantId: string, message: string, conversationId?: string): Promise<ChatResponse>;
    handleQuickAction(tenantId: string, action: QuickActionType, parameters?: Record<string, any>): Promise<any>;
    private parseDateRange;
    private getSalesReport;
    private getTodaySales;
    private getStockLevels;
    private getShiftSummary;
    private getLowStock;
    private getTopProducts;
    private getRecentCustomers;
    private gatherContext;
    private generateAIResponse;
    private generateChatResponse;
    private formatMessagesForSimpleResponse;
    private generateSuggestions;
    private getTrueDeskSystemPrompt;
    generatePDFReport(tenantId: string, reportData: any, reportType: string, period?: string): Promise<Buffer>;
    generateCSVReport(tenantId: string, reportData: any, reportType: string, period?: string): Promise<string>;
}

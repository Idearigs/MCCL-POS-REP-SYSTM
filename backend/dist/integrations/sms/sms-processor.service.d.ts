import { ConfigService } from '@nestjs/config';
export interface SMSProcessorResult {
    success: boolean;
    messageId?: string;
    error?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
}
export interface SMSProcessorData {
    to: string;
    message: string;
    reference?: string;
    from?: string;
}
export declare class SmsProcessorService {
    private configService;
    private readonly logger;
    private readonly voodooApiUrl;
    constructor(configService: ConfigService);
    sendSMS(data: SMSProcessorData): Promise<SMSProcessorResult>;
    private formatPhoneForVoodoo;
    sendRepairStatusSMS(data: {
        customerName: string;
        customerPhone: string;
        repairNumber: string;
        oldStatus: string;
        newStatus: string;
        itemDescription: string;
        estimatedCompletionDate?: string;
        shopName?: string;
        shopPhone?: string;
    }): Promise<SMSProcessorResult>;
    private generateRepairStatusMessage;
    testSMS(phoneNumber: string): Promise<SMSProcessorResult>;
}

import { ConfigService } from '@nestjs/config';
import { SmsProcessorService } from './sms-processor.service';
export interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
}
export interface RepairStatusSMSData {
    customerName: string;
    customerPhone: string;
    repairNumber: string;
    oldStatus: string;
    newStatus: string;
    itemDescription: string;
    estimatedCompletionDate?: string;
    shopName: string;
    shopPhone: string;
}
export declare class SmsService {
    private configService;
    private smsProcessor;
    private readonly logger;
    private readonly baseUrl;
    constructor(configService: ConfigService, smsProcessor: SmsProcessorService);
    sendRepairStatusSMS(data: RepairStatusSMSData): Promise<SMSResult>;
    sendSMS(params: {
        to: string;
        message: string;
        reference?: string;
        from?: string;
    }): Promise<SMSResult>;
    private generateRepairStatusMessage;
    private cleanPhoneNumberForRestAPI;
    private cleanPhoneNumber;
    testSMS(phoneNumber: string): Promise<SMSResult>;
    getBalance(): Promise<{
        balance?: number;
        error?: string;
    }>;
}

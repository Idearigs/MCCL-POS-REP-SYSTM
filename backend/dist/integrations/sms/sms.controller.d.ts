import { SmsService } from './sms.service';
import { SmsProcessorService } from './sms-processor.service';
export declare class SmsController {
    private readonly smsService;
    private readonly smsProcessor;
    constructor(smsService: SmsService, smsProcessor: SmsProcessorService);
    testSMS(body: {
        phoneNumber: string;
    }): Promise<{
        success: boolean;
        message: string;
        messageId: string;
        creditsUsed: number;
        creditsRemaining: number;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        messageId?: undefined;
        creditsUsed?: undefined;
        creditsRemaining?: undefined;
    }>;
    getBalance(): Promise<{
        success: boolean;
        error: string;
        balance?: undefined;
    } | {
        success: boolean;
        balance: number;
        error?: undefined;
    }>;
    sendSMS(body: {
        to: string;
        message: string;
        reference?: string;
        from?: string;
    }): Promise<{
        success: boolean;
        message: string;
        messageId: string;
        error: string;
        creditsUsed: number;
        creditsRemaining: number;
    }>;
}

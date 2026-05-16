import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://api.voodoosms.com/sendsms';

  constructor(private configService: ConfigService) {}

  async sendSMS(params: {
    to: string;
    message: string;
    reference?: string;
    from?: string;
  }): Promise<SMSResult> {
    const apiKey = this.configService.get<string>('VOODOOSMS_API_KEY');
    const senderId =
      params.from ||
      this.configService.get<string>('VOODOOSMS_SENDER_ID', 'MPS Jewel');

    if (!apiKey) {
      this.logger.error('VoodooSMS API key not configured');
      return { success: false, error: 'VoodooSMS API key not configured' };
    }

    const cleanPhone = this.formatUKPhone(params.to);

    try {
      this.logger.log(`Sending SMS to ${cleanPhone} via VoodooSMS`);

      const response = await axios.post(
        this.baseUrl,
        {
          to: cleanPhone,
          from: senderId,
          msg: params.message,
          external_reference: params.reference || `mps_${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const data = response.data;
      this.logger.log(`VoodooSMS response: ${JSON.stringify(data)}`);

      const succeeded = data?.count > 0 || data?.messages || data?.id;

      if (succeeded) {
        return {
          success: true,
          messageId: String(
            data?.messages?.[0]?.id || data?.id || `sent_${Date.now()}`,
          ),
          creditsUsed: data?.credits || data?.count || 1,
          creditsRemaining: data?.balance,
        };
      }

      return {
        success: false,
        error: data?.error || data?.message || 'SMS sending failed',
      };
    } catch (error) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      const detail =
        typeof responseData?.error === 'string'
          ? responseData.error
          : typeof responseData?.message === 'string'
            ? responseData.message
            : responseData
              ? JSON.stringify(responseData)
              : error.message;
      this.logger.error(`VoodooSMS failed [HTTP ${status}]: ${detail}`);
      return { success: false, error: detail };
    }
  }

  async sendRepairStatusSMS(data: RepairStatusSMSData): Promise<SMSResult> {
    const message = this.buildRepairMessage(data);
    this.logger.log(
      `Repair SMS: ${data.repairNumber} ${data.oldStatus} → ${data.newStatus} → ${data.customerPhone}`,
    );
    return this.sendSMS({
      to: data.customerPhone,
      message,
      reference: `repair_${data.repairNumber}`,
    });
  }

  async testSMS(phoneNumber: string): Promise<SMSResult> {
    return this.sendSMS({
      to: phoneNumber,
      message: `Test message from MPS Jewelry System at ${new Date().toLocaleTimeString('en-GB')}. SMS integration is working correctly!`,
      reference: 'test_message',
    });
  }

  async getBalance(): Promise<{ balance?: number; error?: string }> {
    return {
      error:
        'VoodooSMS returns balance with each SMS send. Check send responses for current balance.',
    };
  }

  private buildRepairMessage(data: RepairStatusSMSData): string {
    const templates: Record<string, string> = {
      RECEIVED: `Your jewelry repair (${data.repairNumber}) for "${data.itemDescription}" has been received and is being assessed.`,
      QUOTED: `A quote is ready for repair ${data.repairNumber} - "${data.itemDescription}". Please contact us to approve.`,
      APPROVED: `Repair ${data.repairNumber} approved and work will begin shortly. "${data.itemDescription}".`,
      IN_PROGRESS: `Your repair ${data.repairNumber} is now in progress. "${data.itemDescription}" is being worked on.`,
      WAITING_PARTS: `Repair ${data.repairNumber} is waiting for parts. "${data.itemDescription}" - we will update you soon.`,
      DELAYED: `Update on repair ${data.repairNumber}: "${data.itemDescription}" is experiencing a delay.${data.estimatedCompletionDate ? ` New estimate: ${data.estimatedCompletionDate}.` : ''}`,
      COMPLETED: `Great news! Your repair ${data.repairNumber} is complete. "${data.itemDescription}" is ready for collection.`,
      READY_FOR_COLLECTION: `Your repair ${data.repairNumber} - "${data.itemDescription}" is ready for collection at our shop.`,
      COLLECTED: `Thank you! Repair ${data.repairNumber} has been collected. We hope you love your restored "${data.itemDescription}".`,
      CANCELLED: `Repair ${data.repairNumber} for "${data.itemDescription}" has been cancelled.`,
    };

    let msg =
      templates[data.newStatus] ??
      `Update for repair ${data.repairNumber} - "${data.itemDescription}": ${data.newStatus}`;

    if (
      data.estimatedCompletionDate &&
      ['IN_PROGRESS', 'APPROVED', 'WAITING_PARTS'].includes(data.newStatus)
    ) {
      msg += ` Est. completion: ${data.estimatedCompletionDate}.`;
    }

    msg += ` ${data.shopName} - ${data.shopPhone}`;

    if (msg.length > 459) {
      msg = msg.substring(0, 456) + '...';
    }

    return msg;
  }

  private formatUKPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('44')) return digits;
    if (digits.startsWith('0')) return '44' + digits.slice(1);
    if (digits.length === 10) return '44' + digits;
    return digits;
  }
}

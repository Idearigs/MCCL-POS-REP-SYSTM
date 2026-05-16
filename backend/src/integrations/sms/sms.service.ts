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
  private readonly baseUrl = 'https://rest.textmagic.com/api/v2';

  constructor(private configService: ConfigService) {}

  /**
   * Send SMS via TextMagic REST API v2 (Basic Auth: username + API key)
   */
  async sendSMS(params: {
    to: string;
    message: string;
    reference?: string;
    from?: string;
  }): Promise<SMSResult> {
    const username = this.configService.get<string>('TEXTMAGIC_USERNAME');
    const apiKey = this.configService.get<string>('TEXTMAGIC_API_KEY');

    if (!username || !apiKey) {
      this.logger.error('TextMagic credentials not configured');
      return { success: false, error: 'TextMagic credentials not configured' };
    }

    const cleanPhone = this.formatUKPhone(params.to);

    try {
      this.logger.log(`Sending SMS to ${cleanPhone} via TextMagic`);

      const senderPhone = this.configService.get<string>(
        'TEXTMAGIC_SENDER_PHONE',
      );

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          text: params.message,
          phones: cleanPhone,
          ...(senderPhone && { from: senderPhone }),
        },
        {
          auth: { username, password: apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        },
      );

      // TextMagic returns 201 on success
      const data = response.data;
      this.logger.log(`TextMagic response: ${JSON.stringify(data)}`);

      return {
        success: true,
        messageId: String(data.id || data.messageId || 'sent'),
        creditsUsed: data.partsCount || 1,
      };
    } catch (error) {
      const status = error.response?.status;
      const detail =
        error.response?.data?.message ||
        error.response?.data?.errors?.join(', ') ||
        error.message;

      this.logger.error(`TextMagic SMS failed [HTTP ${status}]: ${detail}`);
      return { success: false, error: detail };
    }
  }

  /**
   * Send repair status update SMS
   */
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

  /**
   * Send a test SMS
   */
  async testSMS(phoneNumber: string): Promise<SMSResult> {
    return this.sendSMS({
      to: phoneNumber,
      message: `Test message from MPS Jewelry System at ${new Date().toLocaleTimeString('en-GB')}. SMS integration is working correctly!`,
      reference: 'test_message',
    });
  }

  /**
   * Get TextMagic account balance
   */
  async getBalance(): Promise<{ balance?: number; error?: string }> {
    const username = this.configService.get<string>('TEXTMAGIC_USERNAME');
    const apiKey = this.configService.get<string>('TEXTMAGIC_API_KEY');

    if (!username || !apiKey) {
      return { error: 'TextMagic credentials not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        auth: { username, password: apiKey },
        timeout: 10000,
      });

      const balance = parseFloat(response.data.balance ?? '0');
      this.logger.log(`TextMagic balance: ${balance}`);
      return { balance };
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      this.logger.error(`Balance check failed: ${detail}`);
      return { error: detail };
    }
  }

  /**
   * Build repair status message text
   */
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

    // Keep within 3-part concatenated SMS limit (459 chars)
    if (msg.length > 459) {
      msg = msg.substring(0, 456) + '...';
    }

    return msg;
  }

  /**
   * Format a UK phone number to E.164 without the + prefix (e.g. 447859888649)
   */
  private formatUKPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('44')) return digits;
    if (digits.startsWith('0')) return '44' + digits.slice(1);
    if (digits.length === 10) return '44' + digits;

    return digits;
  }
}

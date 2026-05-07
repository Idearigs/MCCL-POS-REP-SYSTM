import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SmsProcessorService,
  SMSProcessorResult,
} from './sms-processor.service';
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
  private readonly baseUrl = 'https://api.voodoosms.com';

  constructor(
    private configService: ConfigService,
    private smsProcessor: SmsProcessorService,
  ) {}

  /**
   * Send repair status update SMS to customer using centralized processor
   */
  async sendRepairStatusSMS(data: RepairStatusSMSData): Promise<SMSResult> {
    try {
      this.logger.log(`🔧 === USING CENTRALIZED SMS PROCESSOR ===`);
      this.logger.log(`👤 Customer: ${data.customerName}`);
      this.logger.log(`📞 Phone: ${data.customerPhone}`);
      this.logger.log(`🔖 Repair: ${data.repairNumber}`);
      this.logger.log(
        `🔄 Status Change: ${data.oldStatus} → ${data.newStatus}`,
      );

      // Use the centralized SMS processor with working format
      const result = await this.smsProcessor.sendRepairStatusSMS({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        repairNumber: data.repairNumber,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        itemDescription: data.itemDescription,
        estimatedCompletionDate: data.estimatedCompletionDate,
        shopName: data.shopName,
        shopPhone: data.shopPhone,
      });

      this.logger.log(
        `🎯 Centralized SMS Result: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      );
      if (result.success) {
        this.logger.log(`   ✅ Message delivered to ${data.customerName}`);
        this.logger.log(`   📊 Credits used: ${result.creditsUsed}`);
        this.logger.log(`   💰 Credits remaining: ${result.creditsRemaining}`);
      } else {
        this.logger.warn(`   ❌ SMS failed: ${result.error}`);
      }
      this.logger.log(`=== END CENTRALIZED SMS PROCESSOR ===`);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        creditsUsed: result.creditsUsed,
        creditsRemaining: result.creditsRemaining,
      };
    } catch (error) {
      this.logger.error(`Centralized SMS processor failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS using VoodooSMS RESTful API
   */
  async sendSMS(params: {
    to: string;
    message: string;
    reference?: string;
    from?: string;
  }): Promise<SMSResult> {
    try {
      const apiKey = this.configService.get('VOODOOSMS_API_KEY');

      if (!apiKey) {
        throw new Error('VoodooSMS API key not configured');
      }

      // Clean phone number (remove spaces, format without country code for REST API)
      const cleanPhone = this.cleanPhoneNumberForRestAPI(params.to);

      const requestData = {
        to: cleanPhone,
        from:
          params.from ||
          this.configService.get('VOODOOSMS_SENDER_ID', 'MPS Jewel'),
        msg: params.message,
        external_reference: params.reference || `mps_${Date.now()}`,
        country_code: this.configService.get('VOODOOSMS_DEFAULT_COUNTRY', 'LK'),
      };

      this.logger.debug(`Sending SMS to ${cleanPhone} via VoodooSMS REST API`);

      const response = await axios.post(
        `${this.baseUrl}/sendsms`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      // Parse VoodooSMS REST API response
      const result = response.data;

      this.logger.debug(
        `📱 SMS response for ${cleanPhone}: status=${response.status} data=${JSON.stringify(result, null, 2)}`,
      );

      // VoodooSMS REST API returns different format
      if (response.status === 200 && result) {
        this.logger.log(`✅ SMS sent successfully to ${cleanPhone}`);

        return {
          success: true,
          messageId: result.message_id || result.id || 'sent',
          creditsUsed: result.credits_used || result.message_count || 1,
          creditsRemaining: result.credits_remaining,
        };
      } else {
        this.logger.warn(`❌ SMS failed: ${result.error || 'Unknown error'}`);

        return {
          success: false,
          error: result.error || result.message || 'Unknown error',
        };
      }
    } catch (error) {
      this.logger.error(
        `SMS sending failed: ${error.message}${error.response ? ` (HTTP ${error.response.status})` : ''}`,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate repair status update message
   */
  private generateRepairStatusMessage(data: RepairStatusSMSData): string {
    const statusMessages = {
      RECEIVED: `📥 Your jewelry repair (${data.repairNumber}) for "${data.itemDescription}" has been RECEIVED and is being assessed.`,
      QUOTED: `💷 Quote ready for ${data.repairNumber} - "${data.itemDescription}". Please contact us to approve.`,
      APPROVED: `✅ Repair ${data.repairNumber} APPROVED and will begin shortly. "${data.itemDescription}".`,
      IN_PROGRESS: `🔧 Your repair ${data.repairNumber} is IN PROGRESS. "${data.itemDescription}" is being worked on by our technicians.`,
      WAITING_PARTS: `⏳ Repair ${data.repairNumber} is waiting for parts. "${data.itemDescription}" - we'll update you soon.`,
      COMPLETED: `✨ Great news! Your repair ${data.repairNumber} is COMPLETED. "${data.itemDescription}" is ready for collection.`,
      READY_FOR_COLLECTION: `🏪 Your jewelry repair ${data.repairNumber} - "${data.itemDescription}" is ready for pickup at our shop.`,
      COLLECTED: `📦 Thank you! Repair ${data.repairNumber} has been collected. We hope you love your restored "${data.itemDescription}".`,
      DELAYED: `⏱️ Update: Repair ${data.repairNumber} - "${data.itemDescription}" is experiencing delays. ${data.estimatedCompletionDate ? `New estimated completion: ${data.estimatedCompletionDate}` : "We'll update you with new timeline soon."}.`,
      CANCELLED: `❌ Repair ${data.repairNumber} for "${data.itemDescription}" has been cancelled as requested.`,
    };

    let message =
      statusMessages[data.newStatus as keyof typeof statusMessages] ||
      `Status update for repair ${data.repairNumber} - "${data.itemDescription}": ${data.newStatus}`;

    // Add completion date if provided and relevant
    if (
      data.estimatedCompletionDate &&
      ['IN_PROGRESS', 'APPROVED', 'WAITING_PARTS'].includes(data.newStatus)
    ) {
      message += ` Expected completion: ${data.estimatedCompletionDate}.`;
    }

    // Add shop contact info
    message += ` Contact us: ${data.shopPhone} - ${data.shopName}`;

    // Ensure message is within SMS limits (160 chars for single SMS, 459 for concatenated)
    if (message.length > 459) {
      message = message.substring(0, 456) + '...';
    }

    return message;
  }

  /**
   * Clean phone number for REST API (try international format first)
   */
  private cleanPhoneNumberForRestAPI(phone: string): string {
    // Remove all non-digit characters
    const clean = phone.replace(/\D/g, '');

    const defaultCountry = this.configService.get(
      'VOODOOSMS_DEFAULT_COUNTRY',
      'LK',
    );

    this.logger.debug(
      `🔧 Phone formatting: original=${phone} cleaned=${clean} country=${defaultCountry}`,
    );

    if (defaultCountry === 'LK') {
      // Sri Lankan numbers - remove country code if present
      if (clean.startsWith('94')) {
        return clean.substring(2); // Remove '94' prefix
      } else if (clean.startsWith('0')) {
        return clean.substring(1); // Remove leading '0'
      }
      return clean; // Return as is if already in correct format
    } else if (defaultCountry === 'UK') {
      // UK numbers - try different formats for VoodooSMS
      if (clean.startsWith('44')) {
        return '+' + clean;
      } else if (clean.startsWith('0')) {
        return '+44' + clean.substring(1);
      } else {
        return '+44' + clean;
      }
    }
    return clean;
  }

  /**
   * Clean and format phone number for Sri Lanka/UK (legacy method)
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const clean = phone.replace(/\D/g, '');

    const defaultCountry = this.configService.get(
      'VOODOOSMS_DEFAULT_COUNTRY',
      'LK',
    );

    if (defaultCountry === 'LK') {
      // Sri Lankan numbers
      if (clean.startsWith('94')) {
        // Already has country code
        return clean;
      } else if (clean.startsWith('0')) {
        // Sri Lankan number starting with 0, replace with 94
        return '94' + clean.substring(1);
      } else if (clean.length === 9) {
        // 9 digit Sri Lankan number without leading 0
        return '94' + clean;
      }
    } else if (defaultCountry === 'UK') {
      // UK numbers
      if (clean.startsWith('44')) {
        // Already has country code
        return clean;
      } else if (clean.startsWith('0')) {
        // UK number starting with 0, replace with 44
        return '44' + clean.substring(1);
      } else if (clean.length === 10) {
        // 10 digit UK number without leading 0
        return '44' + clean;
      }
    }

    // Return as is if we can't determine format
    return clean;
  }

  /**
   * Test SMS sending capability
   */
  async testSMS(phoneNumber: string): Promise<SMSResult> {
    return await this.sendSMS({
      to: phoneNumber,
      message: `Test message from MPS Jewelry System at ${new Date().toLocaleTimeString()}. Your SMS integration is working correctly!`,
      reference: 'test_message',
    });
  }

  /**
   * Get account balance (if supported by VoodooSMS)
   */
  async getBalance(): Promise<{ balance?: number; error?: string }> {
    try {
      const apiKey = this.configService.get('VOODOOSMS_API_KEY');

      if (!apiKey) {
        return { error: 'VoodooSMS API key not configured' };
      }

      // VoodooSMS REST API doesn't have a direct balance endpoint
      // Balance is returned with each SMS send operation
      // For now, return a placeholder message
      this.logger.debug(
        'Balance check requested - VoodooSMS REST API returns balance with each SMS send',
      );

      return {
        balance: null,
        error:
          'Balance is returned with each SMS send operation. Check SMS send responses for current balance.',
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS balance: ${error.message}`);
      return { error: error.message };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SMSProcessorResult {
  success: boolean;
  messageId?: string;
  error?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
}

export interface SMSProcessorData {
  to: string; // Phone number
  message: string; // SMS content
  reference?: string; // Optional reference
  from?: string; // Optional sender ID
}

@Injectable()
export class SmsProcessorService {
  private readonly logger = new Logger(SmsProcessorService.name);
  private readonly voodooApiUrl = 'https://api.voodoosms.com/sendsms';

  constructor(private configService: ConfigService) {}

  /**
   * Central SMS processing using the working VoodooSMS format
   * This uses the proven format from the test script that works
   */
  async sendSMS(data: SMSProcessorData): Promise<SMSProcessorResult> {
    try {
      const apiKey = this.configService.get('VOODOOSMS_API_KEY');

      console.log(`🚨 === SMS PROCESSOR CALLED ===`);
      console.log(`🔑 API Key configured: ${apiKey ? 'YES' : 'NO'}`);

      if (!apiKey) {
        console.error('❌ VoodooSMS API key not configured in environment');
        throw new Error('VoodooSMS API key not configured');
      }

      // Use the EXACT working phone format from test script (without + prefix)
      const cleanPhone = this.formatPhoneForVoodoo(data.to);

      console.log(`📱 === CENTRALIZED SMS PROCESSOR ===`);
      console.log(`📞 Original phone: ${data.to}`);
      console.log(`📞 Formatted phone: ${cleanPhone}`);
      console.log(
        `💬 Message: "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"`,
      );
      console.log(`🔖 Reference: ${data.reference || 'none'}`);

      // Use EXACT format from working test script
      const requestData = {
        to: cleanPhone, // MUST be: '447859888649' format (no +)
        from: data.from || 'MPS Jewel', // EXACT sender from test
        msg: data.message, // Message content
        external_reference: data.reference || `mps_${Date.now()}`, // Reference for tracking
      };

      console.log(`📤 Request payload:`, JSON.stringify(requestData, null, 2));
      console.log(`📤 Sending to VoodooSMS API: ${this.voodooApiUrl}`);

      const response = await axios.post(this.voodooApiUrl, requestData, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // Increased timeout
      });

      console.log(`📊 VoodooSMS Response Status: ${response.status}`);
      console.log(
        `📊 VoodooSMS Response Data:`,
        JSON.stringify(response.data, null, 2),
      );

      // Process response based on VoodooSMS REST API format
      if (response.status === 200 && response.data) {
        // Check if it's a successful response - based on working test response
        const hasSuccess =
          response.data.count > 0 || response.data.messages || response.data.id;

        if (hasSuccess) {
          console.log(`✅ SMS SENT SUCCESSFULLY!`);
          console.log(
            `   - Message ID: ${response.data.messages?.[0]?.id || response.data.id || 'sent'}`,
          );
          console.log(
            `   - Credits Used: ${response.data.credits || response.data.count || 1}`,
          );
          console.log(
            `   - Credits Remaining: ${response.data.balance || 'Check dashboard'}`,
          );
          console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);

          return {
            success: true,
            messageId:
              response.data.messages?.[0]?.id ||
              response.data.id ||
              `sent_${Date.now()}`,
            creditsUsed: response.data.credits || response.data.count || 1,
            creditsRemaining: response.data.balance,
          };
        } else {
          console.log(
            `❌ SMS FAILED: ${response.data.error || response.data.message || 'Unknown error'}`,
          );
          console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);

          return {
            success: false,
            error:
              response.data.error ||
              response.data.message ||
              'SMS sending failed',
          };
        }
      } else {
        console.log(
          `❌ SMS FAILED: Invalid response status ${response.status}`,
        );
        console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);

        return {
          success: false,
          error: `Invalid response status: ${response.status}`,
        };
      }
    } catch (error) {
      console.error(`❌ SMS PROCESSOR EXCEPTION: ${error.message}`);

      if (error.response) {
        console.error(`   - HTTP Status: ${error.response.status}`);
        console.error(
          `   - Response Headers:`,
          JSON.stringify(error.response.headers, null, 2),
        );
        console.error(
          `   - Response Data:`,
          JSON.stringify(error.response.data, null, 2),
        );

        // Handle specific VoodooSMS errors
        if (error.response.status === 401) {
          console.error(`   - Authentication failed - check API key`);
        } else if (error.response.status === 400) {
          console.error(
            `   - Bad request - check phone number format and message`,
          );
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`   - Connection refused - check internet connection`);
      } else if (error.code === 'TIMEOUT') {
        console.error(`   - Request timeout - VoodooSMS API might be slow`);
      }

      console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);

      return {
        success: false,
        error:
          error.response?.data?.error || error.message || 'SMS sending failed',
      };
    }
  }

  /**
   * Format phone number using the working format from test script
   * Key insight: VoodooSMS expects '447859888649' (no + prefix)
   */
  private formatPhoneForVoodoo(phone: string): string {
    // Remove all non-digit characters
    const clean = phone.replace(/\D/g, '');

    // For UK numbers, ensure we have the country code but NO + prefix
    if (clean.startsWith('44')) {
      return clean; // Already has country code, no + needed
    } else if (clean.startsWith('0')) {
      return '44' + clean.substring(1); // Convert 07859888649 to 447859888649
    } else if (clean.length === 10) {
      return '44' + clean; // Add country code: 7859888649 to 447859888649
    }

    // Default: return as is
    return clean;
  }

  /**
   * Send repair status SMS using the centralized processor
   */
  async sendRepairStatusSMS(data: {
    customerName: string;
    customerPhone: string;
    repairNumber: string;
    oldStatus: string;
    newStatus: string;
    itemDescription: string;
    estimatedCompletionDate?: string;
    shopName?: string;
    shopPhone?: string;
  }): Promise<SMSProcessorResult> {
    const message = this.generateRepairStatusMessage(data);

    return this.sendSMS({
      to: data.customerPhone,
      message: message,
      reference: `repair_${data.repairNumber}_status`,
      from: 'MPS Jewel',
    });
  }

  /**
   * Generate repair status update message
   */
  private generateRepairStatusMessage(data: any): string {
    const statusMessages = {
      RECEIVED: `📥 Your jewelry repair (${data.repairNumber}) for "${data.itemDescription}" has been RECEIVED and is being assessed.`,
      QUOTED: `💷 Quote ready for ${data.repairNumber} - "${data.itemDescription}". Please contact us to approve.`,
      APPROVED: `✅ Repair ${data.repairNumber} APPROVED and will begin shortly. "${data.itemDescription}".`,
      IN_PROGRESS: `🔧 Your repair ${data.repairNumber} is IN PROGRESS. "${data.itemDescription}" is being worked on by our technicians.`,
      WAITING_PARTS: `⏳ Repair ${data.repairNumber} is waiting for parts. "${data.itemDescription}" - we'll update you soon.`,
      DELAYED: `⏱️ Update: Repair ${data.repairNumber} - "${data.itemDescription}" is experiencing delays. ${data.estimatedCompletionDate ? `New estimated completion: ${data.estimatedCompletionDate}` : "We'll update you with new timeline soon."}.`,
      COMPLETED: `✨ Great news! Your repair ${data.repairNumber} is COMPLETED. "${data.itemDescription}" is ready for collection.`,
      READY_FOR_COLLECTION: `🏪 Your jewelry repair ${data.repairNumber} - "${data.itemDescription}" is ready for pickup at our shop.`,
      COLLECTED: `📦 Thank you! Repair ${data.repairNumber} has been collected. We hope you love your restored "${data.itemDescription}".`,
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
    const shopPhone = data.shopPhone || '+44 1234 567890';
    const shopName = data.shopName || 'MPS Jewelry';
    message += ` Contact us: ${shopPhone} - ${shopName}`;

    // Ensure message is within SMS limits
    if (message.length > 459) {
      message = message.substring(0, 456) + '...';
    }

    return message;
  }

  /**
   * Test SMS functionality
   */
  async testSMS(phoneNumber: string): Promise<SMSProcessorResult> {
    return this.sendSMS({
      to: phoneNumber,
      message: `🔧 Test SMS from MPS Jewelry System at ${new Date().toLocaleTimeString()}. Your centralized SMS integration is working correctly!`,
      reference: 'test_centralized_sms',
    });
  }
}

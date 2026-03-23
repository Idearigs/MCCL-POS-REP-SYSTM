"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sms_processor_service_1 = require("./sms-processor.service");
const axios_1 = __importDefault(require("axios"));
let SmsService = SmsService_1 = class SmsService {
    configService;
    smsProcessor;
    logger = new common_1.Logger(SmsService_1.name);
    baseUrl = 'https://api.voodoosms.com';
    constructor(configService, smsProcessor) {
        this.configService = configService;
        this.smsProcessor = smsProcessor;
    }
    async sendRepairStatusSMS(data) {
        try {
            console.log(`🔧 === USING CENTRALIZED SMS PROCESSOR ===`);
            console.log(`👤 Customer: ${data.customerName}`);
            console.log(`📞 Phone: ${data.customerPhone}`);
            console.log(`🔖 Repair: ${data.repairNumber}`);
            console.log(`🔄 Status Change: ${data.oldStatus} → ${data.newStatus}`);
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
            console.log(`🎯 Centralized SMS Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (result.success) {
                console.log(`   ✅ Message delivered to ${data.customerName}`);
                console.log(`   📊 Credits used: ${result.creditsUsed}`);
                console.log(`   💰 Credits remaining: ${result.creditsRemaining}`);
            }
            else {
                console.log(`   ❌ SMS failed: ${result.error}`);
            }
            console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
            return {
                success: result.success,
                messageId: result.messageId,
                error: result.error,
                creditsUsed: result.creditsUsed,
                creditsRemaining: result.creditsRemaining,
            };
        }
        catch (error) {
            this.logger.error(`Centralized SMS processor failed: ${error.message}`);
            console.log(`❌ CENTRALIZED SMS EXCEPTION: ${error.message}`);
            console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async sendSMS(params) {
        try {
            const apiKey = this.configService.get('VOODOOSMS_API_KEY');
            if (!apiKey) {
                throw new Error('VoodooSMS API key not configured');
            }
            const cleanPhone = this.cleanPhoneNumberForRestAPI(params.to);
            const requestData = {
                to: cleanPhone,
                from: params.from ||
                    this.configService.get('VOODOOSMS_SENDER_ID', 'MPS Jewel'),
                msg: params.message,
                external_reference: params.reference || `mps_${Date.now()}`,
                country_code: this.configService.get('VOODOOSMS_DEFAULT_COUNTRY', 'LK'),
            };
            this.logger.debug(`Sending SMS to ${cleanPhone} via VoodooSMS REST API`);
            const response = await axios_1.default.post(`${this.baseUrl}/sendsms`, requestData, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const result = response.data;
            console.log(`📱 === SMS DELIVERY REPORT ===`);
            console.log(`📞 Phone: ${cleanPhone} (original: ${params.to})`);
            console.log(`📋 Reference: ${params.reference || 'N/A'}`);
            console.log(`📡 Response Status: ${response.status}`);
            console.log(`📊 API Response:`, JSON.stringify(result, null, 2));
            if (response.status === 200 && result) {
                this.logger.log(`✅ SMS sent successfully to ${cleanPhone}`);
                console.log(`✅ SMS DELIVERY SUCCESS:`);
                console.log(`   - Message ID: ${result.message_id || result.id || 'sent'}`);
                console.log(`   - Credits Used: ${result.credits_used || result.message_count || 1}`);
                console.log(`   - Credits Remaining: ${result.credits_remaining || 'Unknown'}`);
                console.log(`   - Message Length: ${params.message.length} characters`);
                console.log(`=== END SMS REPORT ===\n`);
                return {
                    success: true,
                    messageId: result.message_id || result.id || 'sent',
                    creditsUsed: result.credits_used || result.message_count || 1,
                    creditsRemaining: result.credits_remaining,
                };
            }
            else {
                this.logger.warn(`❌ SMS failed: ${result.error || 'Unknown error'}`);
                console.log(`❌ SMS DELIVERY FAILED:`);
                console.log(`   - Error: ${result.error || result.message || 'Unknown error'}`);
                console.log(`   - Response Code: ${result.code || 'N/A'}`);
                console.log(`=== END SMS REPORT ===\n`);
                return {
                    success: false,
                    error: result.error || result.message || 'Unknown error',
                };
            }
        }
        catch (error) {
            this.logger.error(`SMS sending failed: ${error.message}`);
            console.log(`❌ SMS DELIVERY EXCEPTION:`);
            console.log(`   - Error Message: ${error.message}`);
            console.log(`   - Error Code: ${error.code || 'N/A'}`);
            if (error.response) {
                console.log(`   - HTTP Status: ${error.response.status}`);
                console.log(`   - Response Data:`, JSON.stringify(error.response.data, null, 2));
            }
            console.log(`=== END SMS REPORT ===\n`);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    generateRepairStatusMessage(data) {
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
        let message = statusMessages[data.newStatus] ||
            `Status update for repair ${data.repairNumber} - "${data.itemDescription}": ${data.newStatus}`;
        if (data.estimatedCompletionDate &&
            ['IN_PROGRESS', 'APPROVED', 'WAITING_PARTS'].includes(data.newStatus)) {
            message += ` Expected completion: ${data.estimatedCompletionDate}.`;
        }
        message += ` Contact us: ${data.shopPhone} - ${data.shopName}`;
        if (message.length > 459) {
            message = message.substring(0, 456) + '...';
        }
        return message;
    }
    cleanPhoneNumberForRestAPI(phone) {
        const clean = phone.replace(/\D/g, '');
        const defaultCountry = this.configService.get('VOODOOSMS_DEFAULT_COUNTRY', 'LK');
        console.log(`🔧 Phone number formatting debug:`, {
            original: phone,
            cleaned: clean,
            defaultCountry: defaultCountry,
        });
        if (defaultCountry === 'LK') {
            if (clean.startsWith('94')) {
                const formatted = clean.substring(2);
                console.log(`🇱🇰 Sri Lanka format: ${formatted}`);
                return formatted;
            }
            else if (clean.startsWith('0')) {
                const formatted = clean.substring(1);
                console.log(`🇱🇰 Sri Lanka format (removed 0): ${formatted}`);
                return formatted;
            }
            console.log(`🇱🇰 Sri Lanka format (as-is): ${clean}`);
            return clean;
        }
        else if (defaultCountry === 'UK') {
            if (clean.startsWith('44')) {
                const formatted = '+' + clean;
                console.log(`🇬🇧 UK format (international with +): ${formatted}`);
                return formatted;
            }
            else if (clean.startsWith('0')) {
                const formatted = '+44' + clean.substring(1);
                console.log(`🇬🇧 UK format (converted to international with +): ${formatted}`);
                return formatted;
            }
            else {
                const formatted = '+44' + clean;
                console.log(`🇬🇧 UK format (added country code with +): ${formatted}`);
                return formatted;
            }
        }
        console.log(`🌍 Generic format: ${clean}`);
        return clean;
    }
    cleanPhoneNumber(phone) {
        const clean = phone.replace(/\D/g, '');
        const defaultCountry = this.configService.get('VOODOOSMS_DEFAULT_COUNTRY', 'LK');
        if (defaultCountry === 'LK') {
            if (clean.startsWith('94')) {
                return clean;
            }
            else if (clean.startsWith('0')) {
                return '94' + clean.substring(1);
            }
            else if (clean.length === 9) {
                return '94' + clean;
            }
        }
        else if (defaultCountry === 'UK') {
            if (clean.startsWith('44')) {
                return clean;
            }
            else if (clean.startsWith('0')) {
                return '44' + clean.substring(1);
            }
            else if (clean.length === 10) {
                return '44' + clean;
            }
        }
        return clean;
    }
    async testSMS(phoneNumber) {
        return await this.sendSMS({
            to: phoneNumber,
            message: `Test message from MPS Jewelry System at ${new Date().toLocaleTimeString()}. Your SMS integration is working correctly!`,
            reference: 'test_message',
        });
    }
    async getBalance() {
        try {
            const apiKey = this.configService.get('VOODOOSMS_API_KEY');
            if (!apiKey) {
                return { error: 'VoodooSMS API key not configured' };
            }
            this.logger.debug('Balance check requested - VoodooSMS REST API returns balance with each SMS send');
            return {
                balance: null,
                error: 'Balance is returned with each SMS send operation. Check SMS send responses for current balance.',
            };
        }
        catch (error) {
            this.logger.error(`Failed to get SMS balance: ${error.message}`);
            return { error: error.message };
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        sms_processor_service_1.SmsProcessorService])
], SmsService);
//# sourceMappingURL=sms.service.js.map
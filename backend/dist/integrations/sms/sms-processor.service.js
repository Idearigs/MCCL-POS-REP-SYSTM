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
var SmsProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProcessorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let SmsProcessorService = SmsProcessorService_1 = class SmsProcessorService {
    configService;
    logger = new common_1.Logger(SmsProcessorService_1.name);
    voodooApiUrl = 'https://api.voodoosms.com/sendsms';
    constructor(configService) {
        this.configService = configService;
    }
    async sendSMS(data) {
        try {
            const apiKey = this.configService.get('VOODOOSMS_API_KEY');
            console.log(`🚨 === SMS PROCESSOR CALLED ===`);
            console.log(`🔑 API Key configured: ${apiKey ? 'YES' : 'NO'}`);
            if (!apiKey) {
                console.error('❌ VoodooSMS API key not configured in environment');
                throw new Error('VoodooSMS API key not configured');
            }
            const cleanPhone = this.formatPhoneForVoodoo(data.to);
            console.log(`📱 === CENTRALIZED SMS PROCESSOR ===`);
            console.log(`📞 Original phone: ${data.to}`);
            console.log(`📞 Formatted phone: ${cleanPhone}`);
            console.log(`💬 Message: "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"`);
            console.log(`🔖 Reference: ${data.reference || 'none'}`);
            const requestData = {
                to: cleanPhone,
                from: data.from || 'MPS Jewel',
                msg: data.message,
                external_reference: data.reference || `mps_${Date.now()}`,
            };
            console.log(`📤 Request payload:`, JSON.stringify(requestData, null, 2));
            console.log(`📤 Sending to VoodooSMS API: ${this.voodooApiUrl}`);
            const response = await axios_1.default.post(this.voodooApiUrl, requestData, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            console.log(`📊 VoodooSMS Response Status: ${response.status}`);
            console.log(`📊 VoodooSMS Response Data:`, JSON.stringify(response.data, null, 2));
            if (response.status === 200 && response.data) {
                const hasSuccess = response.data.count > 0 || response.data.messages || response.data.id;
                if (hasSuccess) {
                    console.log(`✅ SMS SENT SUCCESSFULLY!`);
                    console.log(`   - Message ID: ${response.data.messages?.[0]?.id || response.data.id || 'sent'}`);
                    console.log(`   - Credits Used: ${response.data.credits || response.data.count || 1}`);
                    console.log(`   - Credits Remaining: ${response.data.balance || 'Check dashboard'}`);
                    console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
                    return {
                        success: true,
                        messageId: response.data.messages?.[0]?.id ||
                            response.data.id ||
                            `sent_${Date.now()}`,
                        creditsUsed: response.data.credits || response.data.count || 1,
                        creditsRemaining: response.data.balance,
                    };
                }
                else {
                    console.log(`❌ SMS FAILED: ${response.data.error || response.data.message || 'Unknown error'}`);
                    console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
                    return {
                        success: false,
                        error: response.data.error ||
                            response.data.message ||
                            'SMS sending failed',
                    };
                }
            }
            else {
                console.log(`❌ SMS FAILED: Invalid response status ${response.status}`);
                console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
                return {
                    success: false,
                    error: `Invalid response status: ${response.status}`,
                };
            }
        }
        catch (error) {
            console.error(`❌ SMS PROCESSOR EXCEPTION: ${error.message}`);
            if (error.response) {
                console.error(`   - HTTP Status: ${error.response.status}`);
                console.error(`   - Response Headers:`, JSON.stringify(error.response.headers, null, 2));
                console.error(`   - Response Data:`, JSON.stringify(error.response.data, null, 2));
                if (error.response.status === 401) {
                    console.error(`   - Authentication failed - check API key`);
                }
                else if (error.response.status === 400) {
                    console.error(`   - Bad request - check phone number format and message`);
                }
            }
            else if (error.code === 'ECONNREFUSED') {
                console.error(`   - Connection refused - check internet connection`);
            }
            else if (error.code === 'TIMEOUT') {
                console.error(`   - Request timeout - VoodooSMS API might be slow`);
            }
            console.log(`=== END CENTRALIZED SMS PROCESSOR ===\n`);
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'SMS sending failed',
            };
        }
    }
    formatPhoneForVoodoo(phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.startsWith('44')) {
            return clean;
        }
        else if (clean.startsWith('0')) {
            return '44' + clean.substring(1);
        }
        else if (clean.length === 10) {
            return '44' + clean;
        }
        return clean;
    }
    async sendRepairStatusSMS(data) {
        const message = this.generateRepairStatusMessage(data);
        return this.sendSMS({
            to: data.customerPhone,
            message: message,
            reference: `repair_${data.repairNumber}_status`,
            from: 'MPS Jewel',
        });
    }
    generateRepairStatusMessage(data) {
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
        let message = statusMessages[data.newStatus] ||
            `Status update for repair ${data.repairNumber} - "${data.itemDescription}": ${data.newStatus}`;
        if (data.estimatedCompletionDate &&
            ['IN_PROGRESS', 'APPROVED', 'WAITING_PARTS'].includes(data.newStatus)) {
            message += ` Expected completion: ${data.estimatedCompletionDate}.`;
        }
        const shopPhone = data.shopPhone || '+44 1234 567890';
        const shopName = data.shopName || 'MPS Jewelry';
        message += ` Contact us: ${shopPhone} - ${shopName}`;
        if (message.length > 459) {
            message = message.substring(0, 456) + '...';
        }
        return message;
    }
    async testSMS(phoneNumber) {
        return this.sendSMS({
            to: phoneNumber,
            message: `🔧 Test SMS from MPS Jewelry System at ${new Date().toLocaleTimeString()}. Your centralized SMS integration is working correctly!`,
            reference: 'test_centralized_sms',
        });
    }
};
exports.SmsProcessorService = SmsProcessorService;
exports.SmsProcessorService = SmsProcessorService = SmsProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsProcessorService);
//# sourceMappingURL=sms-processor.service.js.map
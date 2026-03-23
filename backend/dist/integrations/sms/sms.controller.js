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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const sms_service_1 = require("./sms.service");
const sms_processor_service_1 = require("./sms-processor.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
let SmsController = class SmsController {
    smsService;
    smsProcessor;
    constructor(smsService, smsProcessor) {
        this.smsService = smsService;
        this.smsProcessor = smsProcessor;
    }
    async testSMS(body) {
        const result = await this.smsService.testSMS(body.phoneNumber);
        if (result.success) {
            return {
                success: true,
                message: 'Test SMS sent successfully',
                messageId: result.messageId,
                creditsUsed: result.creditsUsed,
                creditsRemaining: result.creditsRemaining,
            };
        }
        else {
            return {
                success: false,
                message: 'Test SMS failed',
                error: result.error,
            };
        }
    }
    async getBalance() {
        const result = await this.smsService.getBalance();
        if (result.error) {
            return {
                success: false,
                error: result.error,
            };
        }
        else {
            return {
                success: true,
                balance: result.balance,
            };
        }
    }
    async sendSMS(body) {
        const result = await this.smsService.sendSMS(body);
        return {
            success: result.success,
            message: result.success ? 'SMS sent successfully' : 'SMS sending failed',
            messageId: result.messageId,
            error: result.error,
            creditsUsed: result.creditsUsed,
            creditsRemaining: result.creditsRemaining,
        };
    }
};
exports.SmsController = SmsController;
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Test SMS sending',
        description: 'Send a test SMS to verify VoodooSMS integration',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Test SMS sent successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'SMS sending failed',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "testSMS", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get SMS account balance',
        description: 'Retrieve remaining SMS credits from VoodooSMS account',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Balance retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Send SMS',
        description: 'Send a custom SMS message',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'SMS sent successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "sendSMS", null);
exports.SmsController = SmsController = __decorate([
    (0, swagger_1.ApiTags)('SMS'),
    (0, common_1.Controller)('sms'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [sms_service_1.SmsService,
        sms_processor_service_1.SmsProcessorService])
], SmsController);
//# sourceMappingURL=sms.controller.js.map
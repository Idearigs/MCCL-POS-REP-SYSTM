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
exports.ChatbotController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const chatbot_service_1 = require("./chatbot.service");
const chatbot_dto_1 = require("./dto/chatbot.dto");
let ChatbotController = class ChatbotController {
    chatbotService;
    constructor(chatbotService) {
        this.chatbotService = chatbotService;
    }
    async sendMessage(req, body) {
        return this.chatbotService.sendMessage(req.user.id, req.user.tenantId, body.message, body.conversationId);
    }
    async quickAction(req, body) {
        return this.chatbotService.handleQuickAction(req.user.tenantId, body.action, body.parameters);
    }
    async exportPDF(req, body, res) {
        const pdfBuffer = await this.chatbotService.generatePDFReport(req.user.tenantId, body.reportData, body.reportType, body.period);
        const filename = `${body.reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        res.set({
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    }
    async exportCSV(req, body, res) {
        const csvData = await this.chatbotService.generateCSVReport(req.user.tenantId, body.reportData, body.reportType, body.period);
        const filename = `${body.reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`;
        res.set({
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': csvData.length,
        });
        res.send(csvData);
    }
};
exports.ChatbotController = ChatbotController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chatbot_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('quick-action'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chatbot_dto_1.QuickActionDto]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "quickAction", null);
__decorate([
    (0, common_1.Post)('export/pdf'),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chatbot_dto_1.ExportReportDto, Object]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "exportPDF", null);
__decorate([
    (0, common_1.Post)('export/csv'),
    (0, common_1.Header)('Content-Type', 'text/csv'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chatbot_dto_1.ExportReportDto, Object]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "exportCSV", null);
exports.ChatbotController = ChatbotController = __decorate([
    (0, common_1.Controller)('chatbot'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [chatbot_service_1.ChatbotService])
], ChatbotController);
//# sourceMappingURL=chatbot.controller.js.map
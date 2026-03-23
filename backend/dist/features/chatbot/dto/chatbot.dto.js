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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportReportDto = exports.QuickActionDto = exports.SendMessageDto = exports.QuickActionType = void 0;
const class_validator_1 = require("class-validator");
var QuickActionType;
(function (QuickActionType) {
    QuickActionType["TODAY_SALES"] = "TODAY_SALES";
    QuickActionType["STOCK_LEVELS"] = "STOCK_LEVELS";
    QuickActionType["SHIFT_SUMMARY"] = "SHIFT_SUMMARY";
    QuickActionType["LOW_STOCK"] = "LOW_STOCK";
    QuickActionType["TOP_PRODUCTS"] = "TOP_PRODUCTS";
    QuickActionType["RECENT_CUSTOMERS"] = "RECENT_CUSTOMERS";
})(QuickActionType || (exports.QuickActionType = QuickActionType = {}));
class SendMessageDto {
    message;
    conversationId;
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "conversationId", void 0);
class QuickActionDto {
    action;
    parameters;
}
exports.QuickActionDto = QuickActionDto;
__decorate([
    (0, class_validator_1.IsEnum)(QuickActionType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], QuickActionDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], QuickActionDto.prototype, "parameters", void 0);
class ExportReportDto {
    reportData;
    reportType;
    period;
}
exports.ExportReportDto = ExportReportDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], ExportReportDto.prototype, "reportData", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ExportReportDto.prototype, "reportType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExportReportDto.prototype, "period", void 0);
//# sourceMappingURL=chatbot.dto.js.map
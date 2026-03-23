"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialIntelligenceModule = void 0;
const common_1 = require("@nestjs/common");
const financial_intelligence_controller_1 = require("./financial-intelligence.controller");
const financial_intelligence_service_1 = require("./financial-intelligence.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
const cache_module_1 = require("../../core/cache/cache.module");
const openai_module_1 = require("../../integrations/openai/openai.module");
let FinancialIntelligenceModule = class FinancialIntelligenceModule {
};
exports.FinancialIntelligenceModule = FinancialIntelligenceModule;
exports.FinancialIntelligenceModule = FinancialIntelligenceModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, cache_module_1.CacheServiceModule, openai_module_1.OpenAIModule],
        controllers: [financial_intelligence_controller_1.FinancialIntelligenceController],
        providers: [financial_intelligence_service_1.FinancialIntelligenceService],
        exports: [financial_intelligence_service_1.FinancialIntelligenceService],
    })
], FinancialIntelligenceModule);
//# sourceMappingURL=financial-intelligence.module.js.map
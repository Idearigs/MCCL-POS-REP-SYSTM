"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockTakingModule = void 0;
const common_1 = require("@nestjs/common");
const stock_taking_controller_1 = require("./stock-taking.controller");
const stock_taking_service_1 = require("./stock-taking.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
let StockTakingModule = class StockTakingModule {
};
exports.StockTakingModule = StockTakingModule;
exports.StockTakingModule = StockTakingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [stock_taking_controller_1.StockTakingController],
        providers: [stock_taking_service_1.StockTakingService],
        exports: [stock_taking_service_1.StockTakingService],
    })
], StockTakingModule);
//# sourceMappingURL=stock-taking.module.js.map
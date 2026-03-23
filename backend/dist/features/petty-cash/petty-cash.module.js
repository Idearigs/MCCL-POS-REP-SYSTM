"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PettyCashModule = void 0;
const common_1 = require("@nestjs/common");
const petty_cash_controller_1 = require("./petty-cash.controller");
const petty_cash_service_1 = require("./petty-cash.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
let PettyCashModule = class PettyCashModule {
};
exports.PettyCashModule = PettyCashModule;
exports.PettyCashModule = PettyCashModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [petty_cash_controller_1.PettyCashController],
        providers: [petty_cash_service_1.PettyCashService],
        exports: [petty_cash_service_1.PettyCashService],
    })
], PettyCashModule);
//# sourceMappingURL=petty-cash.module.js.map
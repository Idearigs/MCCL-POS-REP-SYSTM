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
exports.MainframeAdminsController = void 0;
const common_1 = require("@nestjs/common");
const mainframe_admins_service_1 = require("../services/mainframe-admins.service");
let MainframeAdminsController = class MainframeAdminsController {
    mainframeAdminsService;
    constructor(mainframeAdminsService) {
        this.mainframeAdminsService = mainframeAdminsService;
    }
    async create(data) {
        return this.mainframeAdminsService.create(data);
    }
    async login(data) {
        return this.mainframeAdminsService.login(data.email, data.password);
    }
    async findAll() {
        return this.mainframeAdminsService.findAll();
    }
    async findOne(id) {
        return this.mainframeAdminsService.findOne(id);
    }
    async update(id, data) {
        return this.mainframeAdminsService.update(id, data);
    }
    async changePassword(id, password) {
        return this.mainframeAdminsService.changePassword(id, password);
    }
};
exports.MainframeAdminsController = MainframeAdminsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "login", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/change-password'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MainframeAdminsController.prototype, "changePassword", null);
exports.MainframeAdminsController = MainframeAdminsController = __decorate([
    (0, common_1.Controller)('mainframe/admins'),
    __metadata("design:paramtypes", [mainframe_admins_service_1.MainframeAdminsService])
], MainframeAdminsController);
//# sourceMappingURL=mainframe-admins.controller.js.map
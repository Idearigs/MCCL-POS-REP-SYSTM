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
exports.CustomerUsersController = void 0;
const common_1 = require("@nestjs/common");
const customer_users_service_1 = require("../services/customer-users.service");
const customer_profile_dto_1 = require("../dto/customer-profile.dto");
let CustomerUsersController = class CustomerUsersController {
    customerUsersService;
    constructor(customerUsersService) {
        this.customerUsersService = customerUsersService;
    }
    async create(dto) {
        return this.customerUsersService.create(dto);
    }
    async findAllByProfile(profileId) {
        return this.customerUsersService.findAllByProfile(profileId);
    }
    async findOne(id) {
        return this.customerUsersService.findOne(id);
    }
    async update(id, dto) {
        return this.customerUsersService.update(id, dto);
    }
    async resetPassword(id) {
        return this.customerUsersService.resetPassword(id);
    }
    async deactivate(id) {
        return this.customerUsersService.deactivate(id);
    }
    async delete(id) {
        return this.customerUsersService.delete(id);
    }
};
exports.CustomerUsersController = CustomerUsersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_profile_dto_1.CreateCustomerUserDto]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('profile/:profileId'),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "findAllByProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_profile_dto_1.UpdateCustomerUserDto]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)(':id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerUsersController.prototype, "delete", null);
exports.CustomerUsersController = CustomerUsersController = __decorate([
    (0, common_1.Controller)('mainframe/customer-users'),
    __metadata("design:paramtypes", [customer_users_service_1.CustomerUsersService])
], CustomerUsersController);
//# sourceMappingURL=customer-users.controller.js.map
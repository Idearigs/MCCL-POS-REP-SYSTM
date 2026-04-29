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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const auth_core_service_1 = require("./services/auth-core.service");
const user_management_service_1 = require("./services/user-management.service");
const tenant_provisioning_service_1 = require("./services/tenant-provisioning.service");
let AuthService = class AuthService {
    authCore;
    userManagement;
    tenantProvisioning;
    constructor(authCore, userManagement, tenantProvisioning) {
        this.authCore = authCore;
        this.userManagement = userManagement;
        this.tenantProvisioning = tenantProvisioning;
    }
    async login(loginDto, tenantId) {
        const result = await this.authCore.login(loginDto, tenantId);
        this.tenantProvisioning
            .seedDefaultCategories(result.user.tenantId)
            .catch(() => void 0);
        return result;
    }
    register(registerDto, tenantId) {
        return this.authCore.register(registerDto, tenantId);
    }
    refreshToken(refreshTokenDto) {
        return this.authCore.refreshToken(refreshTokenDto);
    }
    logout(userId) {
        return this.authCore.logout(userId);
    }
    changePassword(userId, changePasswordDto) {
        return this.authCore.changePassword(userId, changePasswordDto);
    }
    getUsers(tenantId, role, isActive, page = 1, limit = 100) {
        return this.userManagement.getUsers(tenantId, role, isActive, page, limit);
    }
    getUserById(tenantId, userId) {
        return this.userManagement.getUserById(tenantId, userId);
    }
    updateUser(tenantId, userId, updateData) {
        return this.userManagement.updateUser(tenantId, userId, updateData);
    }
    resetUserPassword(tenantId, userId, newPassword) {
        return this.userManagement.resetUserPassword(tenantId, userId, newPassword);
    }
    deleteUser(tenantId, userId) {
        return this.userManagement.deleteUser(tenantId, userId);
    }
    provisionTenant(data) {
        return this.tenantProvisioning.provisionTenant(data);
    }
    seedDefaultCategories(tenantId) {
        return this.tenantProvisioning.seedDefaultCategories(tenantId);
    }
    updateTenantStatus(data) {
        return this.tenantProvisioning.updateTenantStatus(data);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_core_service_1.AuthCoreService,
        user_management_service_1.UserManagementService,
        tenant_provisioning_service_1.TenantProvisioningService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
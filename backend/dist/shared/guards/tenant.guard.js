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
var TenantGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let TenantGuard = TenantGuard_1 = class TenantGuard {
    prismaService;
    logger = new common_1.Logger(TenantGuard_1.name);
    constructor(prismaService) {
        this.prismaService = prismaService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        try {
            const tenantIdHeader = request.headers['x-tenant-id'];
            const host = request.headers.host || 'localhost';
            this.logger.log(`Tenant lookup - Header: ${tenantIdHeader}, Host: ${host}`);
            let tenant = null;
            if (tenantIdHeader) {
                try {
                    tenant = await this.prismaService.tenants.findUnique({
                        where: { id: tenantIdHeader },
                    });
                    this.logger.log(`Tenant lookup by header ID: ${tenant ? tenant.name : 'not found'}`);
                }
                catch (err) {
                    this.logger.error(`Error looking up tenant by header: ${err.message}`);
                }
            }
            if (!tenant) {
                const domain = host.split(':')[0];
                this.logger.log(`Attempting to find tenant by domain: ${domain}`);
                try {
                    tenant = await this.prismaService.tenants.findFirst({
                        where: {
                            OR: [{ domain: domain }, { subdomain: domain.split('.')[0] }],
                        },
                    });
                    if (tenant) {
                        this.logger.log(`Tenant found by domain: ${tenant.name}`);
                    }
                }
                catch (err) {
                    this.logger.error(`Error looking up tenant by domain: ${err.message}`);
                }
            }
            if (!tenant) {
                this.logger.log('No tenant found by domain, fetching first active tenant');
                try {
                    tenant = await this.prismaService.tenants.findFirst({
                        where: { status: 'ACTIVE' },
                        orderBy: { createdAt: 'asc' },
                    });
                    if (tenant) {
                        this.logger.log(`Using first active tenant: ${tenant.name} (${tenant.id})`);
                    }
                }
                catch (err) {
                    this.logger.error(`Error fetching active tenant: ${err.message}`);
                }
            }
            if (!tenant) {
                this.logger.error('No valid tenant found in database');
                throw new common_1.UnauthorizedException('No valid tenant found');
            }
            request.tenant = {
                id: tenant.id,
                tenantId: tenant.id,
                tenantName: tenant.name,
            };
            this.logger.log(`✅ Tenant resolved: ${tenant.name} (${tenant.id})`);
            return true;
        }
        catch (error) {
            this.logger.error(`❌ Tenant guard fatal error: ${error.message}`);
            if (error.stack) {
                this.logger.error(error.stack);
            }
            throw new common_1.UnauthorizedException(`No valid tenant found: ${error.message}`);
        }
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map
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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const FUNCTIONAL_STATUSES = ['ACTIVE', 'PAYMENT_DUE', 'PAYMENT_WARNING'];
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    prismaService;
    constructor(configService, prismaService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET') || 'default-secret',
        });
        this.configService = configService;
        this.prismaService = prismaService;
    }
    async validate(payload) {
        let user;
        try {
            user = await this.prismaService.users.findUnique({
                where: {
                    id: payload.sub,
                    isActive: true,
                },
                include: {
                    tenants: {
                        select: {
                            id: true,
                            name: true,
                            domain: true,
                            subdomain: true,
                            status: true,
                            subscriptionPlan: true,
                            suspendedAt: true,
                            suspendedReason: true,
                            billingDueDate: true,
                        },
                    },
                },
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        const tenantStatus = user.tenants.status;
        if (tenantStatus === 'SUSPENDED') {
            throw new common_1.ForbiddenException({
                code: 'TENANT_SUSPENDED',
                reason: user.tenants.suspendedReason || 'MANUAL',
                message: user.tenants.suspendedReason === 'PAYMENT_OVERDUE'
                    ? 'Account suspended due to overdue payment. Please contact MCCL to restore access.'
                    : 'Account has been deactivated. Please contact MCCL for more information.',
            });
        }
        if (tenantStatus === 'INACTIVE') {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        if (!FUNCTIONAL_STATUSES.includes(tenantStatus)) {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        await this.prismaService.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            permissions: user.permissions,
            tenant: user.tenants,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map
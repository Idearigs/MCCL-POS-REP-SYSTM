"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtRefreshStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let JwtRefreshStrategy = class JwtRefreshStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt-refresh') {
    configService;
    prismaService;
    constructor(configService, prismaService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_REFRESH_SECRET') ||
                'default-refresh-secret',
            passReqToCallback: true,
        });
        this.configService = configService;
        this.prismaService = prismaService;
    }
    async validate(req, payload) {
        try {
            const refreshToken = req.body.refreshToken;
            const user = await this.prismaService.users.findFirst({
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
                            suspendedReason: true,
                        },
                    },
                },
            });
            if (!user ||
                !user.refreshToken ||
                !(await bcrypt.compare(refreshToken, user.refreshToken))) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const tenantStatus = user.tenants.status;
            if (tenantStatus === 'SUSPENDED') {
                throw new common_1.ForbiddenException({
                    code: 'TENANT_SUSPENDED',
                    reason: user.tenants.suspendedReason || 'MANUAL',
                    message: 'Account suspended. Please contact MCCL.',
                });
            }
            if (!['ACTIVE', 'PAYMENT_DUE', 'PAYMENT_WARNING'].includes(tenantStatus)) {
                throw new common_1.UnauthorizedException('Tenant account is not active');
            }
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
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
};
exports.JwtRefreshStrategy = JwtRefreshStrategy;
exports.JwtRefreshStrategy = JwtRefreshStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtRefreshStrategy);
//# sourceMappingURL=jwt-refresh.strategy.js.map
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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../core/prisma/prisma.service");
const cache_service_1 = require("../../core/cache/cache.service");
const id_generator_1 = require("../../shared/utils/id-generator");
let AuthService = AuthService_1 = class AuthService {
    prismaService;
    jwtService;
    configService;
    cacheService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prismaService, jwtService, configService, cacheService) {
        this.prismaService = prismaService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.cacheService = cacheService;
    }
    async login(loginDto, tenantId) {
        const { email, password, companySlug } = loginDto;
        try {
            if (companySlug) {
                const tenant = await this.prismaService.tenants.findFirst({
                    where: {
                        OR: [
                            { id: companySlug.toLowerCase() },
                            { subdomain: companySlug.toLowerCase() },
                        ],
                        status: 'ACTIVE',
                    },
                });
                if (!tenant) {
                    throw new common_1.UnauthorizedException('Company not found or inactive');
                }
                tenantId = tenant.id;
            }
            const user = await this.prismaService.users.findFirst({
                where: {
                    email: email.toLowerCase(),
                    tenantId,
                    isActive: true,
                },
                include: {
                    tenants: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (user.tenants.status !== 'ACTIVE') {
                throw new common_1.UnauthorizedException('Account is not active');
            }
            const tokens = await this.generateTokens(user);
            await this.prismaService.users.update({
                where: { id: user.id },
                data: {
                    refreshToken: tokens.refreshToken,
                    lastLogin: new Date(),
                },
            });
            await this.cacheService.setUserData(user.id, 'session', {
                id: user.id,
                email: user.email,
                tenantId: user.tenantId,
                role: user.role,
            }, 3600);
            this.logger.log(`User logged in: ${email} (${user.id})`);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    tenantId: user.tenantId,
                },
                expiresIn: this.getExpirationTime(),
            };
        }
        catch (error) {
            this.logger.error(`Login failed for ${email}:`, error.message);
            throw error;
        }
    }
    async register(registerDto, tenantId) {
        const { email, password, firstName, lastName, role = 'STAFF', } = registerDto;
        try {
            const existingUser = await this.prismaService.users.findFirst({
                where: {
                    email: email.toLowerCase(),
                    tenantId,
                },
            });
            if (existingUser) {
                throw new common_1.ConflictException('User already exists with this email');
            }
            const tenant = await this.prismaService.tenants.findUnique({
                where: { id: tenantId, status: 'ACTIVE' },
            });
            if (!tenant) {
                throw new common_1.BadRequestException('Invalid or inactive tenant');
            }
            const saltRounds = parseInt(this.configService.get('HASH_SALT_ROUNDS', '12'), 10);
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const user = await this.prismaService.users.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    firstName,
                    lastName,
                    role: role,
                    tenantId,
                    updatedAt: new Date(),
                },
                include: {
                    tenants: true,
                },
            });
            const tokens = await this.generateTokens(user);
            await this.prismaService.users.update({
                where: { id: user.id },
                data: {
                    refreshToken: tokens.refreshToken,
                    lastLogin: new Date(),
                },
            });
            this.logger.log(`User registered: ${email} (${user.id})`);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    tenantId: user.tenantId,
                },
                expiresIn: this.getExpirationTime(),
            };
        }
        catch (error) {
            this.logger.error(`Registration failed for ${email}:`, error.message);
            throw error;
        }
    }
    async refreshToken(refreshTokenDto) {
        const { refreshToken } = refreshTokenDto;
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const user = await this.prismaService.users.findFirst({
                where: {
                    id: payload.sub,
                    refreshToken,
                    isActive: true,
                },
                include: {
                    tenants: true,
                },
            });
            if (!user || user.tenants.status !== 'ACTIVE') {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(user);
            await this.prismaService.users.update({
                where: { id: user.id },
                data: {
                    refreshToken: tokens.refreshToken,
                },
            });
            this.logger.log(`Token refreshed for user: ${user.email} (${user.id})`);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    tenantId: user.tenantId,
                },
                expiresIn: this.getExpirationTime(),
            };
        }
        catch (error) {
            this.logger.error('Token refresh failed:', error.message);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(userId) {
        try {
            await this.prismaService.users.update({
                where: { id: userId },
                data: { refreshToken: null },
            });
            await this.cacheService.delUserData(userId, 'session');
            this.logger.log(`User logged out: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Logout failed for user ${userId}:`, error.message);
            throw error;
        }
    }
    async changePassword(userId, changePasswordDto) {
        const { currentPassword, newPassword } = changePasswordDto;
        try {
            const user = await this.prismaService.users.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new common_1.UnauthorizedException('Current password is incorrect');
            }
            const saltRounds = parseInt(this.configService.get('HASH_SALT_ROUNDS', '12'), 10);
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
            await this.prismaService.users.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
            this.logger.log(`Password changed for user: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Password change failed for user ${userId}:`, error.message);
            throw error;
        }
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    async provisionTenant(data) {
        const saltRounds = parseInt(this.configService.get('HASH_SALT_ROUNDS', '12'), 10);
        const hashedPassword = await bcrypt.hash(data.ownerPassword, saltRounds);
        const ownerEmail = data.ownerEmail.toLowerCase();
        await this.prismaService.tenants.upsert({
            where: { id: data.tenantId },
            update: {
                name: data.businessName,
                subdomain: data.subdomain.toLowerCase(),
                domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
                status: 'ACTIVE',
                updatedAt: new Date(),
            },
            create: {
                id: data.tenantId,
                name: data.businessName,
                subdomain: data.subdomain.toLowerCase(),
                domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
                status: 'ACTIVE',
                subscriptionPlan: 'basic',
                updatedAt: new Date(),
            },
        });
        const existingUser = await this.prismaService.users.findFirst({
            where: { email: ownerEmail, tenantId: data.tenantId },
        });
        let userId;
        if (existingUser) {
            await this.prismaService.users.update({
                where: { id: existingUser.id },
                data: { password: hashedPassword, isActive: true, updatedAt: new Date() },
            });
            userId = existingUser.id;
        }
        else {
            userId = (0, id_generator_1.generateId)();
            await this.prismaService.users.create({
                data: {
                    id: userId,
                    email: ownerEmail,
                    password: hashedPassword,
                    firstName: data.ownerFirstName,
                    lastName: data.ownerLastName,
                    role: 'OWNER',
                    tenantId: data.tenantId,
                    updatedAt: new Date(),
                },
            });
        }
        await this.seedDefaultCategories(data.tenantId);
        this.logger.log(`Tenant provisioned: ${data.tenantId} (${data.businessName})`);
        return { tenantId: data.tenantId, userId };
    }
    async seedDefaultCategories(tenantId) {
        const DEFAULT_CATEGORIES = [
            'Rings', 'Necklaces', 'Bracelets', 'Earrings',
            'Pendants', 'Watches', 'Other',
        ];
        const existing = await this.prismaService.categories.findMany({
            where: { tenantId },
            select: { name: true },
        });
        const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
        const toCreate = DEFAULT_CATEGORIES.filter((name) => !existingNames.has(name.toLowerCase()));
        if (toCreate.length > 0) {
            for (const name of toCreate) {
                await this.prismaService.categories.create({
                    data: { id: (0, id_generator_1.generateId)(), name, tenantId, isActive: true, updatedAt: new Date() },
                });
            }
            this.logger.log(`Seeded ${toCreate.length} categories for tenant ${tenantId}`);
        }
    }
    getExpirationTime() {
        const expiration = this.configService.get('JWT_EXPIRATION', '15m');
        const timeValue = parseInt(expiration.slice(0, -1));
        const timeUnit = expiration.slice(-1);
        switch (timeUnit) {
            case 's':
                return timeValue;
            case 'm':
                return timeValue * 60;
            case 'h':
                return timeValue * 3600;
            case 'd':
                return timeValue * 86400;
            default:
                return 900;
        }
    }
    async getUsers(tenantId, role, isActive, page = 1, limit = 100) {
        try {
            const where = { tenantId };
            if (role) {
                where.role = role;
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            const [users, total] = await Promise.all([
                this.prismaService.users.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                        lastLogin: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.prismaService.users.count({ where }),
            ]);
            return {
                data: users,
                total,
                page,
                limit,
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch users:', error.message);
            throw error;
        }
    }
    async getUserById(tenantId, userId) {
        try {
            const user = await this.prismaService.users.findFirst({
                where: { id: userId, tenantId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to fetch user ${userId}:`, error.message);
            throw error;
        }
    }
    async updateUser(tenantId, userId, updateData) {
        try {
            const { email, ...allowedUpdates } = updateData;
            if (allowedUpdates.password) {
                const saltRounds = parseInt(this.configService.get('HASH_SALT_ROUNDS', '12'), 10);
                allowedUpdates.password = await bcrypt.hash(allowedUpdates.password, saltRounds);
            }
            const updatedUser = await this.prismaService.users.update({
                where: { id: userId, tenantId },
                data: allowedUpdates,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            this.logger.log(`User updated: ${userId}`);
            return updatedUser;
        }
        catch (error) {
            this.logger.error(`Failed to update user ${userId}:`, error.message);
            throw error;
        }
    }
    async resetUserPassword(tenantId, userId, newPassword) {
        try {
            const saltRounds = parseInt(this.configService.get('HASH_SALT_ROUNDS', '12'), 10);
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            await this.prismaService.users.update({
                where: { id: userId, tenantId },
                data: { password: hashedPassword },
            });
            this.logger.log(`Password reset for user: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to reset password for user ${userId}:`, error.message);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        cache_service_1.CacheService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
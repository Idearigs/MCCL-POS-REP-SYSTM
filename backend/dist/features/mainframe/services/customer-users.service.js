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
exports.CustomerUsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const credentials_export_service_1 = require("./credentials-export.service");
let CustomerUsersService = class CustomerUsersService {
    prisma;
    credentialsExportService;
    constructor(prisma, credentialsExportService) {
        this.prisma = prisma;
        this.credentialsExportService = credentialsExportService;
    }
    async create(dto) {
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { id: dto.customerProfileId },
            include: {
                subscription: true,
                _count: { select: { customerUsers: true } },
            },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        if (profile.subscription?.maxUsers) {
            if (profile._count.customerUsers >= profile.subscription.maxUsers) {
                throw new common_1.BadRequestException(`User limit reached (${profile.subscription.maxUsers} users)`);
            }
        }
        const existingUser = await this.prisma.mf_customer_users.findFirst({
            where: {
                customerProfileId: dto.customerProfileId,
                email: dto.email.toLowerCase(),
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const { user, tempPassword } = await this.credentialsExportService.createUserWithCredentials(dto.customerProfileId, dto.email, dto.firstName, dto.lastName, dto.role || 'STAFF');
        if (profile.subscription) {
            await this.prisma.mf_subscriptions.update({
                where: { id: profile.subscription.id },
                data: { currentUsers: profile._count.customerUsers + 1 },
            });
        }
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: dto.customerProfileId,
                action: 'user.created',
                description: `User ${dto.email} created`,
                actorType: 'admin',
            },
        });
        return {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt,
            },
            tempPassword,
        };
    }
    async findAllByProfile(profileId) {
        return this.prisma.mf_customer_users.findMany({
            where: { customerProfileId: profileId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const user = await this.prisma.mf_customer_users.findUnique({
            where: { id },
            select: {
                id: true,
                customerProfileId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                permissions: true,
                isActive: true,
                lastLoginAt: true,
                loginAttempts: true,
                lockedUntil: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
                customerProfile: {
                    select: {
                        businessName: true,
                        subdomain: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, dto) {
        const existing = await this.prisma.mf_customer_users.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (dto.email && dto.email.toLowerCase() !== existing.email) {
            const emailConflict = await this.prisma.mf_customer_users.findFirst({
                where: {
                    customerProfileId: existing.customerProfileId,
                    email: dto.email.toLowerCase(),
                    id: { not: id },
                },
            });
            if (emailConflict) {
                throw new common_1.ConflictException('Email already in use');
            }
        }
        const updated = await this.prisma.mf_customer_users.update({
            where: { id },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email?.toLowerCase(),
                phone: dto.phone,
                role: dto.role,
                isActive: dto.isActive,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: existing.customerProfileId,
                action: 'user.updated',
                description: `User ${updated.email} updated`,
                actorType: 'admin',
            },
        });
        return updated;
    }
    async resetPassword(id) {
        const user = await this.prisma.mf_customer_users.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const newPassword = this.credentialsExportService.generateSecurePassword();
        const passwordHash = await this.hashPassword(newPassword);
        await this.prisma.mf_customer_users.update({
            where: { id },
            data: {
                passwordHash,
                tempPassword: newPassword,
                mustChangePassword: true,
                loginAttempts: 0,
                lockedUntil: null,
            },
        });
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: user.customerProfileId,
                action: 'user.password_reset',
                description: `Password reset for ${user.email}`,
                actorType: 'admin',
            },
        });
        return { newPassword };
    }
    async deactivate(id) {
        const user = await this.prisma.mf_customer_users.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.mf_customer_users.update({
            where: { id },
            data: { isActive: false },
        });
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { id: user.customerProfileId },
            include: { subscription: true },
        });
        if (profile?.subscription) {
            const activeUsers = await this.prisma.mf_customer_users.count({
                where: {
                    customerProfileId: user.customerProfileId,
                    isActive: true,
                },
            });
            await this.prisma.mf_subscriptions.update({
                where: { id: profile.subscription.id },
                data: { currentUsers: activeUsers },
            });
        }
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: user.customerProfileId,
                action: 'user.deactivated',
                description: `User ${user.email} deactivated`,
                actorType: 'admin',
            },
        });
        return { success: true };
    }
    async delete(id) {
        const user = await this.prisma.mf_customer_users.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.mf_customer_users.delete({
            where: { id },
        });
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: user.customerProfileId,
                action: 'user.deleted',
                description: `User ${user.email} deleted`,
                actorType: 'admin',
            },
        });
        return { success: true };
    }
    async hashPassword(password) {
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-salt'));
        return hash.digest('hex');
    }
};
exports.CustomerUsersService = CustomerUsersService;
exports.CustomerUsersService = CustomerUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credentials_export_service_1.CredentialsExportService])
], CustomerUsersService);
//# sourceMappingURL=customer-users.service.js.map
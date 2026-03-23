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
var SubdomainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubdomainService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
let SubdomainService = SubdomainService_1 = class SubdomainService {
    prisma;
    logger = new common_1.Logger(SubdomainService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async provisionSubdomain(profileId, subdomain) {
        this.logger.log(`Provisioning subdomain: ${subdomain}.truedesk.co.uk`);
        try {
            await this.createCustomerDatabase(profileId, subdomain);
            await this.runMigrations(subdomain);
            await this.seedInitialData(profileId, subdomain);
            await this.prisma.mf_customer_profiles.update({
                where: { id: profileId },
                data: {
                    status: 'ACTIVE',
                    setupCompletedAt: new Date(),
                },
            });
            await this.prisma.mf_activity_logs.create({
                data: {
                    customerProfileId: profileId,
                    action: 'subdomain.provisioned',
                    description: `Subdomain ${subdomain}.truedesk.co.uk provisioned successfully`,
                    actorType: 'system',
                },
            });
            this.logger.log(`Subdomain ${subdomain} provisioned successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to provision subdomain ${subdomain}:`, error);
            await this.prisma.mf_customer_profiles.update({
                where: { id: profileId },
                data: {
                    internalNotes: `Provisioning failed: ${error.message}`,
                },
            });
            throw error;
        }
    }
    async createCustomerDatabase(profileId, subdomain) {
        const databaseName = `truedesk_${subdomain.replace(/-/g, '_')}`;
        this.logger.log(`Creating database: ${databaseName}`);
        const connectionString = this.generateConnectionString(databaseName);
        await this.prisma.mf_customer_profiles.update({
            where: { id: profileId },
            data: {
                databaseName,
                databaseConnectionString: connectionString,
            },
        });
    }
    async runMigrations(subdomain) {
        this.logger.log(`Running migrations for ${subdomain}`);
    }
    async seedInitialData(profileId, subdomain) {
        this.logger.log(`Seeding initial data for ${subdomain}`);
    }
    generateConnectionString(databaseName) {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '5432';
        const user = process.env.DB_USER || 'postgres';
        const password = process.env.DB_PASSWORD || 'password';
        return `postgresql://${user}:${password}@${host}:${port}/${databaseName}?schema=public`;
    }
    async isSubdomainAvailable(subdomain) {
        const normalized = subdomain.toLowerCase().trim();
        const reserved = [
            'www',
            'api',
            'admin',
            'app',
            'mail',
            'smtp',
            'ftp',
            'dashboard',
            'portal',
            'help',
            'support',
            'docs',
            'billing',
            'payment',
            'cdn',
            'assets',
            'static',
            'mainframe',
            'truedesk',
            'login',
            'auth',
            'oauth',
        ];
        if (reserved.includes(normalized)) {
            return false;
        }
        const existing = await this.prisma.mf_customer_profiles.findUnique({
            where: { subdomain: normalized },
        });
        return !existing;
    }
    validateSubdomainFormat(subdomain) {
        const normalized = subdomain.toLowerCase().trim();
        if (normalized.length < 3) {
            return { valid: false, error: 'Subdomain must be at least 3 characters' };
        }
        if (normalized.length > 30) {
            return { valid: false, error: 'Subdomain must be 30 characters or less' };
        }
        const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!regex.test(normalized)) {
            return {
                valid: false,
                error: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
            };
        }
        if (normalized.includes('--')) {
            return {
                valid: false,
                error: 'Subdomain cannot contain consecutive hyphens',
            };
        }
        return { valid: true };
    }
    async suggestSubdomains(businessName) {
        const base = businessName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 20);
        const suggestions = [
            base,
            `${base}-pos`,
            `${base}-shop`,
            `${base}1`,
            `${base}2`,
        ];
        const available = [];
        for (const suggestion of suggestions) {
            if (await this.isSubdomainAvailable(suggestion)) {
                available.push(suggestion);
            }
        }
        return available.slice(0, 3);
    }
    async deprovisionSubdomain(profileId) {
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { id: profileId },
        });
        if (!profile) {
            throw new Error('Profile not found');
        }
        this.logger.log(`Deprovisioning subdomain: ${profile.subdomain}`);
        await this.prisma.mf_customer_profiles.update({
            where: { id: profileId },
            data: {
                status: 'DEACTIVATED',
            },
        });
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: profileId,
                action: 'subdomain.deprovisioned',
                description: `Subdomain ${profile.subdomain}.truedesk.co.uk deprovisioned`,
                actorType: 'system',
            },
        });
    }
};
exports.SubdomainService = SubdomainService;
exports.SubdomainService = SubdomainService = SubdomainService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubdomainService);
//# sourceMappingURL=subdomain.service.js.map
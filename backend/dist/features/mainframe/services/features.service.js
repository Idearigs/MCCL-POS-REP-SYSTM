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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../../core/prisma/prisma.service");
let FeaturesService = class FeaturesService {
    prisma;
    config;
    mainframeUrl;
    internalKey;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.mainframeUrl =
            this.config.get('MAINFRAME_BACKEND_URL') || 'http://localhost:3001/api/v1';
        this.internalKey =
            this.config.get('INTERNAL_API_KEY') || 'local-dev-internal-key';
    }
    async getTenantFeatures(tenantIdOrSubdomain) {
        let subdomain = tenantIdOrSubdomain;
        try {
            const tenant = await this.prisma.tenants.findUnique({
                where: { id: tenantIdOrSubdomain },
                select: { subdomain: true },
            });
            if (tenant?.subdomain)
                subdomain = tenant.subdomain;
        }
        catch {
        }
        const url = `${this.mainframeUrl}/mainframe/tenant-features/${subdomain}`;
        try {
            const { data } = await axios_1.default.get(url, { headers: { 'x-internal-key': this.internalKey }, timeout: 5000 });
            return { ...data, _source: 'mainframe' };
        }
        catch (err) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message || err?.message || 'unknown';
            console.error(`[FeaturesService] getTenantFeatures FAILED for "${subdomain}" → ${url} → ${status ?? 'no-response'}: ${message}`);
            return { features: [], _source: 'error' };
        }
    }
    async create(data) {
        const existing = await this.prisma.mf_features.findUnique({
            where: { featureKey: data.featureKey },
        });
        if (existing) {
            throw new common_1.ConflictException('Feature key already exists');
        }
        return this.prisma.mf_features.create({
            data: {
                featureKey: data.featureKey,
                featureName: data.featureName,
                description: data.description,
                category: data.category,
                isIncludedInBase: data.isIncludedInBase ?? true,
                additionalCost: data.additionalCost || 0,
                dependsOn: data.dependsOn || [],
                status: 'STABLE',
                currentVersion: '1.0.0',
            },
        });
    }
    async findAll(options) {
        const where = {};
        if (options?.category) {
            where.category = options.category;
        }
        if (options?.status) {
            where.status = options.status;
        }
        return this.prisma.mf_features.findMany({
            where,
            orderBy: [{ category: 'asc' }, { featureName: 'asc' }],
            include: {
                _count: {
                    select: { customerFeatures: true, versions: true },
                },
            },
        });
    }
    async findOne(id) {
        const feature = await this.prisma.mf_features.findUnique({
            where: { id },
            include: {
                versions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                customerFeatures: {
                    include: {
                        customerProfile: {
                            select: { businessName: true, subdomain: true },
                        },
                    },
                    take: 20,
                },
            },
        });
        if (!feature) {
            throw new common_1.NotFoundException('Feature not found');
        }
        return feature;
    }
    async update(id, data) {
        return this.prisma.mf_features.update({
            where: { id },
            data: {
                ...data,
                status: data.status,
            },
        });
    }
    async createVersion(featureId, data) {
        const feature = await this.prisma.mf_features.findUnique({
            where: { id: featureId },
        });
        if (!feature) {
            throw new common_1.NotFoundException('Feature not found');
        }
        const newVersion = await this.prisma.mf_feature_versions.create({
            data: {
                featureId,
                version: data.version,
                versionType: data.versionType,
                releaseNotes: data.releaseNotes,
                changelog: data.changelog,
                previousVersionId: feature.currentVersion,
            },
        });
        if (data.versionType === 'STABLE') {
            await this.prisma.mf_features.update({
                where: { id: featureId },
                data: { currentVersion: data.version },
            });
        }
        else if (data.versionType === 'BETA') {
            await this.prisma.mf_features.update({
                where: { id: featureId },
                data: { betaVersion: data.version, isBeta: true },
            });
        }
        return newVersion;
    }
    async deployVersion(featureId, versionId) {
        const version = await this.prisma.mf_feature_versions.findUnique({
            where: { id: versionId },
        });
        if (!version || version.featureId !== featureId) {
            throw new common_1.NotFoundException('Version not found');
        }
        await this.prisma.mf_feature_versions.update({
            where: { id: versionId },
            data: {
                deployedAt: new Date(),
                deployedBy: 'system',
            },
        });
        await this.prisma.mf_features.update({
            where: { id: featureId },
            data: { currentVersion: version.version },
        });
        return { success: true, version: version.version };
    }
    async getStats() {
        const [total, stable, beta, deprecated] = await Promise.all([
            this.prisma.mf_features.count(),
            this.prisma.mf_features.count({ where: { status: 'STABLE' } }),
            this.prisma.mf_features.count({ where: { status: 'BETA' } }),
            this.prisma.mf_features.count({ where: { status: 'DEPRECATED' } }),
        ]);
        const categories = await this.prisma.mf_features.groupBy({
            by: ['category'],
            _count: true,
        });
        return {
            total,
            stable,
            beta,
            deprecated,
            byCategory: categories,
        };
    }
    async seedDefaultFeatures() {
        const defaultFeatures = [
            { featureKey: 'pos', featureName: 'Point of Sale', category: 'Core', description: 'Main POS terminal for sales and transactions', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'inventory', featureName: 'Inventory Management', category: 'Core', description: 'Product and stock management', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'customers', featureName: 'Customer Management', category: 'Core', description: 'Customer database and history', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'sales', featureName: 'Sales & Transactions', category: 'Core', description: 'Sales processing and reporting', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'repairs', featureName: 'Repair Management', category: 'Core', description: 'Repair job tracking and management', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'cashiers', featureName: 'Staff & Cashiers', category: 'Core', description: 'Staff and cashier management', isIncludedInBase: true, additionalCost: 0 },
            { featureKey: 'shifts', featureName: 'Shift Management', category: 'Standard', description: 'Staff shift tracking and handover', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'float_management', featureName: 'Float Management', category: 'Standard', description: 'Cash drawer float management', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'petty_cash', featureName: 'Petty Cash', category: 'Standard', description: 'Petty cash tracking and management', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'stock_taking', featureName: 'Stock Taking', category: 'Standard', description: 'Stock audit and reconciliation', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'calendar', featureName: 'Calendar', category: 'Standard', description: 'Appointments and scheduling', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'tasks', featureName: 'Tasks', category: 'Standard', description: 'Task and workflow management', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'history', featureName: 'Transaction History', category: 'Standard', description: 'Full transaction history and audit trail', isIncludedInBase: false, additionalCost: 0 },
            { featureKey: 'financial_intelligence', featureName: 'Financial Intelligence', category: 'Premium', description: 'Advanced financial analytics and reporting', isIncludedInBase: false, additionalCost: 20 },
            { featureKey: 'chatbot', featureName: 'AI Business Insights', category: 'Premium', description: 'AI-powered business insights and recommendations', isIncludedInBase: false, additionalCost: 20 },
            { featureKey: 'google_drive', featureName: 'Google Drive Integration', category: 'Premium', description: 'Cloud storage and document management', isIncludedInBase: false, additionalCost: 20 },
        ];
        for (const feature of defaultFeatures) {
            await this.prisma.mf_features.upsert({
                where: { featureKey: feature.featureKey },
                update: {
                    featureName: feature.featureName,
                    category: feature.category,
                    description: feature.description,
                    isIncludedInBase: feature.isIncludedInBase,
                    additionalCost: feature.additionalCost,
                },
                create: {
                    featureKey: feature.featureKey,
                    featureName: feature.featureName,
                    category: feature.category,
                    description: feature.description,
                    isIncludedInBase: feature.isIncludedInBase,
                    additionalCost: feature.additionalCost,
                    isEnabled: true,
                    status: 'STABLE',
                    currentVersion: '1.0.0',
                    dependsOn: [],
                },
            });
        }
        return { success: true, count: defaultFeatures.length };
    }
};
exports.FeaturesService = FeaturesService;
exports.FeaturesService = FeaturesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], FeaturesService);
//# sourceMappingURL=features.service.js.map
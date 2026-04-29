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
var FeatureRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureRequestsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const hmac_build_1 = require("../../../shared/utils/hmac-build");
let FeatureRequestsService = FeatureRequestsService_1 = class FeatureRequestsService {
    prisma;
    config;
    logger = new common_1.Logger(FeatureRequestsService_1.name);
    mainframeUrl;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.mainframeUrl =
            this.config.get('MAINFRAME_BACKEND_URL') ||
                'http://localhost:3001/api/v1';
    }
    async create(data) {
        let customerProfileId = data.customerProfileId;
        if (!customerProfileId && data.tenantId) {
            try {
                const tenant = await this.prisma.tenants.findUnique({
                    where: { id: data.tenantId },
                    select: { subdomain: true },
                });
                if (tenant?.subdomain) {
                    const profile = await this.prisma.mf_customer_profiles.findUnique({
                        where: { subdomain: tenant.subdomain },
                        select: { id: true },
                    });
                    customerProfileId = profile?.id;
                }
            }
            catch {
            }
        }
        try {
            const payload = {
                ...data,
                customerProfileId,
                priority: data.priority || 'MEDIUM',
            };
            const bodyStr = JSON.stringify(payload);
            const { data: created } = await axios_1.default.post(`${this.mainframeUrl}/mainframe/feature-requests`, bodyStr, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(0, hmac_build_1.buildHmacHeaders)(bodyStr),
                },
                timeout: 8000,
            });
            return created;
        }
        catch (err) {
            this.logger.error('[FeatureRequests] Failed to forward to mainframe, storing locally:', err?.message);
            return this.prisma.mf_feature_requests.create({
                data: {
                    customerProfileId,
                    title: data.title,
                    description: data.description,
                    priority: (data.priority || 'MEDIUM'),
                    status: 'SUBMITTED',
                    targetFeatureKey: data.targetFeatureKey,
                },
            });
        }
    }
    async findAll(options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options?.status)
            where.status = options.status;
        const [requests, total] = await Promise.all([
            this.prisma.mf_feature_requests.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ votes: 'desc' }, { createdAt: 'desc' }],
                include: {
                    customerProfile: { select: { businessName: true } },
                },
            }),
            this.prisma.mf_feature_requests.count({ where }),
        ]);
        return { data: requests, meta: { total, page, limit } };
    }
    async findOne(id) {
        const request = await this.prisma.mf_feature_requests.findUnique({
            where: { id },
            include: {
                customerProfile: { select: { businessName: true, subdomain: true } },
            },
        });
        if (!request)
            throw new common_1.NotFoundException('Feature request not found');
        return request;
    }
    async update(id, data) {
        return this.prisma.mf_feature_requests.update({
            where: { id },
            data: {
                status: data.status,
                priority: data.priority,
                assignedTo: data.assignedTo,
                estimatedEffort: data.estimatedEffort,
                targetVersion: data.targetVersion,
                rejectionReason: data.rejectionReason,
                implementedAt: data.status === 'RELEASED' ? new Date() : undefined,
            },
        });
    }
    async vote(id, profileId) {
        const request = await this.prisma.mf_feature_requests.findUnique({
            where: { id },
        });
        if (!request)
            throw new common_1.NotFoundException('Feature request not found');
        const votedBy = request.votedBy || [];
        if (votedBy.includes(profileId))
            return request;
        return this.prisma.mf_feature_requests.update({
            where: { id },
            data: { votes: { increment: 1 }, votedBy: [...votedBy, profileId] },
        });
    }
};
exports.FeatureRequestsService = FeatureRequestsService;
exports.FeatureRequestsService = FeatureRequestsService = FeatureRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], FeatureRequestsService);
//# sourceMappingURL=feature-requests.service.js.map
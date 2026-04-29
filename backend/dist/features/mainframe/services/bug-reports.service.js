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
var BugReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BugReportsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const hmac_build_1 = require("../../../shared/utils/hmac-build");
let BugReportsService = BugReportsService_1 = class BugReportsService {
    prisma;
    config;
    logger = new common_1.Logger(BugReportsService_1.name);
    mainframeUrl;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.mainframeUrl =
            this.config.get('MAINFRAME_BACKEND_URL') ||
                'http://localhost:3001/api/v1';
    }
    async create(data) {
        try {
            const payload = {
                ...data,
                priority: data.priority || 'MEDIUM',
                screenshots: data.screenshots || [],
            };
            const bodyStr = JSON.stringify(payload);
            const { data: created } = await axios_1.default.post(`${this.mainframeUrl}/mainframe/bug-reports`, bodyStr, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(0, hmac_build_1.buildHmacHeaders)(bodyStr),
                },
                timeout: 8000,
            });
            return created;
        }
        catch (err) {
            this.logger.error('[BugReports] Failed to forward to mainframe, storing locally:', err?.message);
            return this.prisma.mf_bug_reports.create({
                data: {
                    customerProfileId: data.customerProfileId,
                    title: data.title,
                    description: data.description,
                    priority: (data.priority || 'MEDIUM'),
                    status: 'OPEN',
                    featureKey: data.featureKey,
                    affectedVersion: data.affectedVersion,
                    browser: data.browser,
                    os: data.os,
                    deviceType: data.deviceType,
                    stepsToReproduce: data.stepsToReproduce,
                    expectedBehavior: data.expectedBehavior,
                    actualBehavior: data.actualBehavior,
                    screenshots: data.screenshots || [],
                    errorLogs: data.errorLogs,
                    errorStackTrace: data.errorStackTrace,
                    userAgent: data.userAgent,
                    pageUrl: data.pageUrl,
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
        if (options?.priority)
            where.priority = options.priority;
        if (options?.featureKey)
            where.featureKey = options.featureKey;
        if (options?.customerProfileId)
            where.customerProfileId = options.customerProfileId;
        const [bugs, total] = await Promise.all([
            this.prisma.mf_bug_reports.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ priority: 'asc' }, { reportedAt: 'desc' }],
                include: {
                    customerProfile: {
                        select: { businessName: true, subdomain: true },
                    },
                },
            }),
            this.prisma.mf_bug_reports.count({ where }),
        ]);
        return {
            data: bugs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findOne(id) {
        const bug = await this.prisma.mf_bug_reports.findUnique({
            where: { id },
            include: {
                customerProfile: {
                    select: { businessName: true, subdomain: true, contactEmail: true },
                },
            },
        });
        if (!bug) {
            throw new common_1.NotFoundException('Bug report not found');
        }
        return bug;
    }
    async update(id, data) {
        const existing = await this.prisma.mf_bug_reports.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Bug report not found');
        }
        return this.prisma.mf_bug_reports.update({
            where: { id },
            data: {
                status: data.status,
                priority: data.priority,
                assignedTo: data.assignedTo,
                resolution: data.resolution,
                fixedInVersion: data.fixedInVersion,
                resolvedAt: data.status === 'RESOLVED' || data.status === 'CLOSED'
                    ? new Date()
                    : undefined,
            },
        });
    }
    async getStats() {
        const [total, open, inProgress, resolved, critical, high] = await Promise.all([
            this.prisma.mf_bug_reports.count(),
            this.prisma.mf_bug_reports.count({ where: { status: 'OPEN' } }),
            this.prisma.mf_bug_reports.count({ where: { status: 'IN_PROGRESS' } }),
            this.prisma.mf_bug_reports.count({
                where: { status: { in: ['RESOLVED', 'CLOSED'] } },
            }),
            this.prisma.mf_bug_reports.count({ where: { priority: 'CRITICAL' } }),
            this.prisma.mf_bug_reports.count({ where: { priority: 'HIGH' } }),
        ]);
        const byFeature = await this.prisma.mf_bug_reports.groupBy({
            by: ['featureKey'],
            _count: true,
            where: { featureKey: { not: null } },
        });
        return {
            total,
            open,
            inProgress,
            resolved,
            critical,
            high,
            byFeature,
        };
    }
};
exports.BugReportsService = BugReportsService;
exports.BugReportsService = BugReportsService = BugReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BugReportsService);
//# sourceMappingURL=bug-reports.service.js.map
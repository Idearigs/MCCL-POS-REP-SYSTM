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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const repairs_service_1 = require("./repairs.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const repair_dto_1 = require("./dto/repair.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let RepairsController = class RepairsController {
    repairsService;
    constructor(repairsService) {
        this.repairsService = repairsService;
    }
    async create(createRepairDto, tenantId, userId) {
        return this.repairsService.create(createRepairDto, tenantId, userId);
    }
    async findAll(query, tenantId) {
        return this.repairsService.findAll(query, tenantId);
    }
    async getStats(tenantId) {
        return this.repairsService.getStats(tenantId);
    }
    async getOverdueRepairs(tenantId) {
        return this.repairsService.getOverdueRepairs(tenantId);
    }
    async getActiveRepairs(query, tenantId) {
        const activeQuery = {
            ...query,
            status: undefined,
        };
        const activeRepairs = await this.repairsService.findAll(activeQuery, tenantId);
        const activeStatuses = [
            'PENDING',
            'DIAGNOSED',
            'QUOTE_SENT',
            'APPROVED',
            'IN_PROGRESS',
            'WAITING_PARTS',
            'READY_FOR_PICKUP',
        ];
        activeRepairs.data = activeRepairs.data.filter((repair) => activeStatuses.includes(repair.status));
        return activeRepairs;
    }
    async getRepairsByTechnician(technicianId, query, tenantId) {
        const technicianQuery = {
            ...query,
            assignedTechnicianId: technicianId,
        };
        return this.repairsService.findAll(technicianQuery, tenantId);
    }
    async findOne(id, tenantId) {
        return this.repairsService.findOne(id, tenantId);
    }
    async update(id, updateRepairDto, tenantId, userId) {
        return this.repairsService.update(id, updateRepairDto, tenantId, userId);
    }
    async delete(id, tenantId, userId) {
        return this.repairsService.delete(id, tenantId, userId);
    }
    async addNote(id, createNoteDto, tenantId, userId) {
        return this.repairsService.addNote(id, createNoteDto, tenantId, userId);
    }
    async cancel(id, reason, tenantId, userId) {
        return this.repairsService.cancel(id, reason, tenantId, userId);
    }
    async changeStatus(id, body, tenantId, userId) {
        return this.repairsService.changeStatus(id, body.status, body.notes || '', tenantId, userId, body.sendSMS !== false);
    }
    async getTimeline(id, tenantId) {
        const repair = await this.repairsService.findOne(id, tenantId);
        const timeline = [];
        timeline.push({
            type: 'created',
            title: 'Repair Created',
            description: `Repair ${repair.repairNumber} created with ${repair.items.length} item(s)`,
            date: repair.createdAt,
            user: repair.createdByName,
            isCustomerVisible: true,
        });
        repair.notes.forEach((note) => {
            timeline.push({
                type: 'note',
                title: 'Progress Note',
                description: note.note,
                date: note.createdAt,
                user: note.createdByName,
                isCustomerVisible: note.isCustomerVisible,
            });
        });
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            repairId: repair.id,
            repairNumber: repair.repairNumber,
            currentStatus: repair.status,
            timeline,
        };
    }
    async getWorkloadReport(tenantId) {
        const stats = await this.repairsService.getStats(tenantId);
        const activeRepairs = await this.repairsService.findAll({ limit: 1000 }, tenantId);
        const workloadByTechnician = activeRepairs.data.reduce((acc, repair) => {
            if (repair.assignedTechnicianId &&
                repair.status !== 'COMPLETED' &&
                repair.status !== 'COLLECTED' &&
                repair.status !== 'CANCELLED') {
                const techId = repair.assignedTechnicianId;
                const techName = repair.assignedTechnicianName || 'Unknown';
                if (!acc[techId]) {
                    acc[techId] = {
                        technicianId: techId,
                        technicianName: techName,
                        activeRepairs: 0,
                        urgentRepairs: 0,
                        overdueRepairs: 0,
                        estimatedWorkload: 0,
                    };
                }
                acc[techId].activeRepairs++;
                if (repair.priority === 'URGENT')
                    acc[techId].urgentRepairs++;
                if (repair.isOverdue)
                    acc[techId].overdueRepairs++;
                acc[techId].estimatedWorkload += repair.estimatedCost;
            }
            return acc;
        }, {});
        return {
            totalActiveRepairs: stats.activeRepairs,
            totalOverdueRepairs: stats.overdueRepairs,
            unassignedRepairs: activeRepairs.data.filter((r) => !r.assignedTechnicianId).length,
            technicianWorkloads: Object.values(workloadByTechnician),
            averageRepairTime: stats.averageRepairTime,
        };
    }
    async getCustomerRepairHistory(customerId, tenantId) {
        const customerRepairs = await this.repairsService.findAll({ customerId, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }, tenantId);
        const totalSpent = customerRepairs.data.reduce((sum, repair) => sum + repair.totalCost, 0);
        const avgRepairCost = customerRepairs.data.length > 0
            ? totalSpent / customerRepairs.data.length
            : 0;
        const completedRepairs = customerRepairs.data.filter((r) => r.status === 'COMPLETED' || r.status === 'COLLECTED');
        const activeRepairs = customerRepairs.data.filter((r) => !['COMPLETED', 'COLLECTED', 'CANCELLED'].includes(r.status));
        return {
            customerId,
            totalRepairs: customerRepairs.data.length,
            completedRepairs: completedRepairs.length,
            activeRepairs: activeRepairs.length,
            totalSpent,
            averageRepairCost: avgRepairCost,
            repairHistory: customerRepairs.data,
            favoriteRepairTypes: this.getRepairTypeFrequency(customerRepairs.data),
        };
    }
    async uploadImages(id, files, metadata, tenantId, userId) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided for upload');
        }
        return this.repairsService.uploadImages(id, files, metadata || {}, tenantId, userId);
    }
    async getRepairImages(id, tenantId) {
        return this.repairsService.getRepairImages(id, tenantId);
    }
    async deleteRepairImage(id, imageId, tenantId, userId) {
        const success = await this.repairsService.deleteRepairImage(id, imageId, tenantId, userId);
        return {
            success,
            message: success
                ? 'Image deleted successfully'
                : 'Failed to delete image',
        };
    }
    getRepairTypeFrequency(repairs) {
        const typeCount = repairs.reduce((acc, repair) => {
            repair.items.forEach((item) => {
                acc[item.repairType] = (acc[item.repairType] || 0) + 1;
            });
            return acc;
        }, {});
        return Object.entries(typeCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ repairType: type, count }));
    }
};
exports.RepairsController = RepairsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new repair request',
        description: 'Create a new repair request with items and workflow tracking',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Repair created successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer or product not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [repair_dto_1.CreateRepairDto, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all repairs',
        description: 'Retrieve repairs with advanced filtering, search, and pagination',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repairs retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'RPR-2024-001',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: [
            'RECEIVED',
            'QUOTED',
            'APPROVED',
            'IN_PROGRESS',
            'COMPLETED',
            'READY_FOR_COLLECTION',
            'COLLECTED',
            'CANCELLED',
        ],
    }),
    (0, swagger_1.ApiQuery)({
        name: 'priority',
        required: false,
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    }),
    (0, swagger_1.ApiQuery)({
        name: 'repairType',
        required: false,
        enum: [
            'CLEANING',
            'POLISHING',
            'SIZING',
            'STONE_SETTING',
            'PRONG_REPAIR',
            'CHAIN_REPAIR',
            'CLASP_REPAIR',
            'ENGRAVING',
            'RESTORATION',
            'CUSTOM_WORK',
            'OTHER',
        ],
    }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'assignedTechnicianId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        type: String,
        example: '2024-01-01',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        type: String,
        example: '2024-12-31',
    }),
    (0, swagger_1.ApiQuery)({ name: 'overdue', required: false, type: Boolean, example: false }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        type: String,
        example: 'createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        enum: ['asc', 'desc'],
        example: 'desc',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [repair_dto_1.RepairQueryDto, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repair statistics',
        description: 'Retrieve comprehensive repair statistics and analytics',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair statistics retrieved successfully',
        type: repair_dto_1.RepairStatsDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('overdue'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get overdue repairs',
        description: 'Retrieve all repairs that are past their expected completion date',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Overdue repairs retrieved successfully',
        type: [repair_dto_1.RepairResponseDto],
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getOverdueRepairs", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get active repairs',
        description: 'Retrieve all repairs that are currently in progress',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Active repairs retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [repair_dto_1.RepairQueryDto, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getActiveRepairs", null);
__decorate([
    (0, common_1.Get)('technician/:technicianId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repairs by technician',
        description: 'Retrieve all repairs assigned to a specific technician',
    }),
    (0, swagger_1.ApiParam)({
        name: 'technicianId',
        description: 'Technician user ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Technician repairs retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    __param(0, (0, common_1.Param)('technicianId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, repair_dto_1.RepairQueryDto, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getRepairsByTechnician", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repair by ID',
        description: 'Retrieve a specific repair with full details including items and notes',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair retrieved successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update repair',
        description: 'Update repair information including status, priority, and costs',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair updated successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, repair_dto_1.UpdateRepairDto, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete repair',
        description: 'Permanently delete a repair and all associated data (photos, history). This action cannot be undone.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair deleted successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Repair REP-202401-0001 deleted successfully',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/notes'),
    (0, swagger_1.ApiOperation)({
        summary: 'Add note to repair',
        description: 'Add a progress note to the repair with customer visibility control',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Note added successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, repair_dto_1.CreateRepairNoteDto, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "addNote", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({
        summary: 'Cancel repair',
        description: 'Cancel a repair with reason tracking',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    example: 'Customer requested cancellation',
                },
            },
            required: ['reason'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair cancelled successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Cannot cancel completed repair',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Change repair status',
        description: 'Update repair status and optionally send SMS notification to customer',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: [
                        'RECEIVED',
                        'QUOTED',
                        'APPROVED',
                        'IN_PROGRESS',
                        'WAITING_PARTS',
                        'COMPLETED',
                        'READY_FOR_COLLECTION',
                        'COLLECTED',
                        'CANCELLED',
                        'DELAYED',
                    ],
                    example: 'IN_PROGRESS',
                },
                notes: {
                    type: 'string',
                    example: 'Started working on the chain repair',
                },
                sendSMS: {
                    type: 'boolean',
                    example: true,
                    description: 'Whether to send SMS notification to customer',
                },
            },
            required: ['status'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair status updated successfully',
        type: repair_dto_1.RepairResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Get)(':id/timeline'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repair timeline',
        description: 'Retrieve chronological timeline of repair status changes and notes',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair timeline retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('reports/workload'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get technician workload report',
        description: 'Retrieve workload distribution across technicians',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Workload report generated successfully',
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getWorkloadReport", null);
__decorate([
    (0, common_1.Get)('reports/customer/:customerId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer repair history',
        description: 'Retrieve complete repair history for a specific customer',
    }),
    (0, swagger_1.ApiParam)({
        name: 'customerId',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer repair history retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getCustomerRepairHistory", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload repair images',
        description: 'Upload images for a repair job (before, during, or after photos)',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Images uploaded successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_decorator_1.TenantId)()),
    __param(4, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "uploadImages", null);
__decorate([
    (0, common_1.Get)(':id/images'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repair images',
        description: 'Retrieve all images for a specific repair',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repair images retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "getRepairImages", null);
__decorate([
    (0, common_1.Delete)(':id/images/:imageId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete repair image',
        description: 'Delete a specific image from a repair',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Repair ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'imageId',
        description: 'Image ID',
        example: 'img123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Image deleted successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Repair or image not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RepairsController.prototype, "deleteRepairImage", null);
exports.RepairsController = RepairsController = __decorate([
    (0, swagger_1.ApiTags)('Repairs'),
    (0, common_1.Controller)('repairs'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [repairs_service_1.RepairsService])
], RepairsController);
//# sourceMappingURL=repairs.controller.js.map
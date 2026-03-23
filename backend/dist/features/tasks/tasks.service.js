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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const task_dto_1 = require("./dto/task.dto");
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, userId, dto) {
        const task = await this.prisma.tasks.create({
            data: {
                tenantId,
                title: dto.title,
                description: dto.description,
                priority: dto.priority || 'MEDIUM',
                assignedTo: dto.assignedTo,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                tags: dto.tags || [],
                createdBy: userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        await this.prisma.task_activities.create({
            data: {
                taskId: task.id,
                userId,
                action: 'created',
                description: `Created task "${task.title}"`,
            },
        });
        for (const assignedUserId of dto.assignedTo) {
            await this.prisma.task_activities.create({
                data: {
                    taskId: task.id,
                    userId,
                    action: 'assigned',
                    description: `Assigned task to user`,
                    metadata: { assignedUserId },
                },
            });
        }
        return task;
    }
    async findAll(tenantId, userId, filters) {
        const where = { tenantId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.priority) {
            where.priority = filters.priority;
        }
        if (filters?.assignedToMe) {
            where.assignedTo = { has: userId };
        }
        if (filters?.createdByMe) {
            where.createdBy = userId;
        }
        const tasks = await this.prisma.tasks.findMany({
            where,
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                },
                _count: {
                    select: {
                        comments: true,
                        activities: true,
                    },
                },
            },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        });
        return tasks;
    }
    async findOne(tenantId, taskId) {
        const task = await this.prisma.tasks.findFirst({
            where: { id: taskId, tenantId },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                activities: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    async update(tenantId, taskId, userId, dto) {
        const task = await this.prisma.tasks.findFirst({
            where: { id: taskId, tenantId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const updatedTask = await this.prisma.tasks.update({
            where: { id: taskId },
            data: {
                title: dto.title,
                description: dto.description,
                priority: dto.priority,
                status: dto.status,
                assignedTo: dto.assignedTo,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                tags: dto.tags,
                completedAt: dto.status === task_dto_1.TaskStatus.COMPLETED ? new Date() : undefined,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (dto.status && dto.status !== task.status) {
            await this.prisma.task_activities.create({
                data: {
                    taskId: task.id,
                    userId,
                    action: 'status_changed',
                    description: `Changed status from ${task.status} to ${dto.status}`,
                    metadata: { from: task.status, to: dto.status },
                },
            });
        }
        if (dto.assignedTo &&
            JSON.stringify(dto.assignedTo) !== JSON.stringify(task.assignedTo)) {
            await this.prisma.task_activities.create({
                data: {
                    taskId: task.id,
                    userId,
                    action: 'assigned',
                    description: 'Updated task assignments',
                    metadata: { assignedTo: dto.assignedTo },
                },
            });
        }
        return updatedTask;
    }
    async delete(tenantId, taskId) {
        const task = await this.prisma.tasks.findFirst({
            where: { id: taskId, tenantId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        await this.prisma.tasks.delete({
            where: { id: taskId },
        });
        return { message: 'Task deleted successfully' };
    }
    async addComment(tenantId, taskId, userId, dto) {
        const task = await this.prisma.tasks.findFirst({
            where: { id: taskId, tenantId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const comment = await this.prisma.task_comments.create({
            data: {
                taskId,
                userId,
                comment: dto.comment,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        await this.prisma.task_activities.create({
            data: {
                taskId,
                userId,
                action: 'comment_added',
                description: 'Added a comment',
            },
        });
        return comment;
    }
    async getMyTasks(tenantId, userId) {
        return this.findAll(tenantId, userId, { assignedToMe: true });
    }
    async getStats(tenantId, userId) {
        const where = { tenantId };
        if (userId) {
            where.OR = [{ createdBy: userId }, { assignedTo: { has: userId } }];
        }
        const [total, todo, inProgress, completed, overdue] = await Promise.all([
            this.prisma.tasks.count({ where }),
            this.prisma.tasks.count({ where: { ...where, status: 'TODO' } }),
            this.prisma.tasks.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            this.prisma.tasks.count({ where: { ...where, status: 'COMPLETED' } }),
            this.prisma.tasks.count({
                where: {
                    ...where,
                    dueDate: { lt: new Date() },
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
            }),
        ]);
        return {
            total,
            todo,
            inProgress,
            completed,
            overdue,
        };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map
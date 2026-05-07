import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AddCommentDto,
  TaskStatus,
} from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateTaskDto) {
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

    // Create activity log
    await this.prisma.task_activities.create({
      data: {
        taskId: task.id,
        userId,
        action: 'created',
        description: `Created task "${task.title}"`,
      },
    });

    // Create activity logs for assigned users
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

  async findAll(
    tenantId: string,
    userId: string,
    filters?: {
      status?: TaskStatus;
      priority?: string;
      assignedToMe?: boolean;
      createdByMe?: boolean;
    },
  ) {
    const where: any = { tenantId };

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

  async findOne(tenantId: string, taskId: string) {
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
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    tenantId: string,
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ) {
    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
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
        completedAt:
          dto.status === TaskStatus.COMPLETED ? new Date() : undefined,
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

    // Log status change
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

    // Log assignment changes
    if (
      dto.assignedTo &&
      JSON.stringify(dto.assignedTo) !== JSON.stringify(task.assignedTo)
    ) {
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

  async delete(tenantId: string, taskId: string) {
    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.tasks.delete({
      where: { id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  async addComment(
    tenantId: string,
    taskId: string,
    userId: string,
    dto: AddCommentDto,
  ) {
    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
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

    // Log comment activity
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

  async getMyTasks(tenantId: string, userId: string) {
    return this.findAll(tenantId, userId, { assignedToMe: true });
  }

  async getStats(tenantId: string, userId?: string) {
    const where: any = { tenantId };

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
}

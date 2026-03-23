import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, AddCommentDto, TaskStatus } from './dto/task.dto';
export declare class TasksService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, userId: string, dto: CreateTaskDto): Promise<{
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        description: string | null;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        tags: string[];
        createdBy: string;
        priority: import("@prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        completedAt: Date | null;
        dueDate: Date | null;
        assignedTo: string[];
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAll(tenantId: string, userId: string, filters?: {
        status?: TaskStatus;
        priority?: string;
        assignedToMe?: boolean;
        createdByMe?: boolean;
    }): Promise<({
        _count: {
            activities: number;
            comments: number;
        };
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        comments: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            comment: string;
            taskId: string;
        })[];
    } & {
        description: string | null;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        tags: string[];
        createdBy: string;
        priority: import("@prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        completedAt: Date | null;
        dueDate: Date | null;
        assignedTo: string[];
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    findOne(tenantId: string, taskId: string): Promise<{
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        activities: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            description: string;
            id: string;
            createdAt: Date;
            userId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            action: string;
            taskId: string;
        })[];
        comments: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            comment: string;
            taskId: string;
        })[];
    } & {
        description: string | null;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        tags: string[];
        createdBy: string;
        priority: import("@prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        completedAt: Date | null;
        dueDate: Date | null;
        assignedTo: string[];
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(tenantId: string, taskId: string, userId: string, dto: UpdateTaskDto): Promise<{
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        description: string | null;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        tags: string[];
        createdBy: string;
        priority: import("@prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        completedAt: Date | null;
        dueDate: Date | null;
        assignedTo: string[];
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    delete(tenantId: string, taskId: string): Promise<{
        message: string;
    }>;
    addComment(tenantId: string, taskId: string, userId: string, dto: AddCommentDto): Promise<{
        user: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        comment: string;
        taskId: string;
    }>;
    getMyTasks(tenantId: string, userId: string): Promise<({
        _count: {
            activities: number;
            comments: number;
        };
        creator: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
        comments: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            comment: string;
            taskId: string;
        })[];
    } & {
        description: string | null;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        tags: string[];
        createdBy: string;
        priority: import("@prisma/client").$Enums.TaskPriority;
        startDate: Date | null;
        completedAt: Date | null;
        dueDate: Date | null;
        assignedTo: string[];
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    getStats(tenantId: string, userId?: string): Promise<{
        total: number;
        todo: number;
        inProgress: number;
        completed: number;
        overdue: number;
    }>;
}

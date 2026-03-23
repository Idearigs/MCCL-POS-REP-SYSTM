import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, AddCommentDto, TaskStatus } from './dto/task.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(dto: CreateTaskDto, tenantId: string, userId: string): Promise<{
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
    findAll(tenantId: string, userId: string, status?: TaskStatus, priority?: string, assignedToMe?: string, createdByMe?: string): Promise<({
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
    getStats(tenantId: string, userId: string): Promise<{
        total: number;
        todo: number;
        inProgress: number;
        completed: number;
        overdue: number;
    }>;
    findOne(tenantId: string, id: string): Promise<{
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
    update(tenantId: string, userId: string, id: string, dto: UpdateTaskDto): Promise<{
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
    delete(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    addComment(tenantId: string, userId: string, id: string, dto: AddCommentDto): Promise<{
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
}

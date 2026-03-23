export declare enum TaskPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum TaskStatus {
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    IN_REVIEW = "IN_REVIEW",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class CreateTaskDto {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignedTo: string[];
    dueDate?: string;
    startDate?: string;
    tags?: string[];
}
export declare class UpdateTaskDto {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    assignedTo?: string[];
    dueDate?: string;
    startDate?: string;
    tags?: string[];
}
export declare class AddCommentDto {
    comment: string;
}

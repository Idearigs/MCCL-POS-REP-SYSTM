export declare enum StockTakeStatus {
    DRAFT = "DRAFT",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export declare class UpdateSessionDto {
    sessionName?: string;
    location?: string;
    remarks?: string;
    status?: StockTakeStatus;
}

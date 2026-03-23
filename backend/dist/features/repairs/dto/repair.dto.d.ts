export declare enum RepairStatus {
    RECEIVED = "RECEIVED",
    QUOTED = "QUOTED",
    APPROVED = "APPROVED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    READY_FOR_COLLECTION = "READY_FOR_COLLECTION",
    COLLECTED = "COLLECTED",
    CANCELLED = "CANCELLED"
}
export declare enum RepairPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum RepairType {
    CLEANING = "CLEANING",
    POLISHING = "POLISHING",
    SIZING = "SIZING",
    STONE_SETTING = "STONE_SETTING",
    PRONG_REPAIR = "PRONG_REPAIR",
    CHAIN_REPAIR = "CHAIN_REPAIR",
    CLASP_REPAIR = "CLASP_REPAIR",
    ENGRAVING = "ENGRAVING",
    RESTORATION = "RESTORATION",
    CUSTOM_WORK = "CUSTOM_WORK",
    OTHER = "OTHER"
}
export declare class CreateRepairItemDto {
    productId?: string;
    itemDescription: string;
    repairType: RepairType;
    repairDescription: string;
    estimatedCost: number;
    actualCost?: number;
    material?: string;
    weight?: number;
    notes?: string;
}
export declare class CreateRepairDto {
    customerId: string;
    items: CreateRepairItemDto[];
    problemDescription: string;
    priority: RepairPriority;
    expectedCompletionDate?: string;
    customerInstructions?: string;
    internalNotes?: string;
    depositAmount?: number;
    itemDescription?: string;
    estimatedCost?: number;
    insuranceNumber?: string;
    insuranceValue?: number;
    tagId?: string;
    rmaId?: string;
}
export declare class UpdateRepairDto {
    status?: RepairStatus;
    priority?: RepairPriority;
    expectedCompletionDate?: string;
    actualCompletionDate?: string;
    itemDescription?: string;
    problemDescription?: string;
    estimatedCost?: number;
    statusNotes?: string;
    customerInstructions?: string;
    internalNotes?: string;
    totalCost?: number;
    depositAmount?: number;
    insuranceValue?: number;
    assignedTechnicianId?: string;
    tagId?: string;
    rmaId?: string;
    notes?: string;
}
export declare class CreateRepairNoteDto {
    note: string;
    isCustomerVisible?: boolean;
}
export declare class RepairQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: RepairStatus;
    priority?: RepairPriority;
    repairType?: RepairType;
    customerId?: string;
    assignedTechnicianId?: string;
    startDate?: string;
    endDate?: string;
    overdue?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class RepairItemResponseDto {
    id: string;
    productId: string;
    itemDescription: string;
    repairType: RepairType;
    repairDescription: string;
    estimatedCost: number;
    actualCost: number;
    material: string;
    weight: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
}
export declare class RepairNoteResponseDto {
    id: string;
    note: string;
    isCustomerVisible: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}
export declare class RepairResponseDto {
    id: string;
    repairNumber: string;
    customerId: string;
    customerName: string;
    status: RepairStatus;
    priority: RepairPriority;
    itemDescription: string;
    problemDescription: string;
    estimatedCost: number;
    totalCost: number;
    depositAmount: number;
    balanceDue: number;
    insuranceValue: number;
    expectedCompletionDate: string;
    actualCompletionDate: string;
    customerInstructions: string;
    internalNotes: string;
    assignedTechnicianId: string;
    assignedTechnicianName: string;
    isOverdue: boolean;
    items: RepairItemResponseDto[];
    notes: RepairNoteResponseDto[];
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
    images: string[];
    beforeImages: string[];
    afterImages: string[];
    progressImages: string[];
    tagId?: string;
    rmaId?: string;
}
export declare class RepairStatsDto {
    totalRepairs: number;
    activeRepairs: number;
    completedRepairs: number;
    overdueRepairs: number;
    waitingForParts: number;
    averageRepairTime: number;
    totalRevenue: number;
    averageRepairCost: number;
    repairsThisMonth: number;
    revenueThisMonth: number;
    statusBreakdown: Record<RepairStatus, number>;
    priorityBreakdown: Record<RepairPriority, number>;
    repairTypeBreakdown: Record<RepairType, number>;
    topTechnicians: Array<{
        technicianId: string;
        technicianName: string;
        completedRepairs: number;
    }>;
}

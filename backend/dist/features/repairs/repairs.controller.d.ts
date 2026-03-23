import { RepairsService } from './repairs.service';
import { CreateRepairDto, UpdateRepairDto, CreateRepairNoteDto, RepairQueryDto, RepairResponseDto, RepairStatsDto } from './dto/repair.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class RepairsController {
    private readonly repairsService;
    constructor(repairsService: RepairsService);
    create(createRepairDto: CreateRepairDto, tenantId: string, userId: string): Promise<RepairResponseDto>;
    findAll(query: RepairQueryDto, tenantId: string): Promise<PaginatedResponseDto<RepairResponseDto>>;
    getStats(tenantId: string): Promise<RepairStatsDto>;
    getOverdueRepairs(tenantId: string): Promise<RepairResponseDto[]>;
    getActiveRepairs(query: RepairQueryDto, tenantId: string): Promise<PaginatedResponseDto<RepairResponseDto>>;
    getRepairsByTechnician(technicianId: string, query: RepairQueryDto, tenantId: string): Promise<PaginatedResponseDto<RepairResponseDto>>;
    findOne(id: string, tenantId: string): Promise<RepairResponseDto>;
    update(id: string, updateRepairDto: UpdateRepairDto, tenantId: string, userId: string): Promise<RepairResponseDto>;
    delete(id: string, tenantId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addNote(id: string, createNoteDto: CreateRepairNoteDto, tenantId: string, userId: string): Promise<RepairResponseDto>;
    cancel(id: string, reason: string, tenantId: string, userId: string): Promise<RepairResponseDto>;
    changeStatus(id: string, body: {
        status: string;
        notes?: string;
        sendSMS?: boolean;
    }, tenantId: string, userId: string): Promise<RepairResponseDto>;
    getTimeline(id: string, tenantId: string): Promise<{
        repairId: string;
        repairNumber: string;
        currentStatus: import("./dto/repair.dto").RepairStatus;
        timeline: any[];
    }>;
    getWorkloadReport(tenantId: string): Promise<{
        totalActiveRepairs: number;
        totalOverdueRepairs: number;
        unassignedRepairs: number;
        technicianWorkloads: any[];
        averageRepairTime: number;
    }>;
    getCustomerRepairHistory(customerId: string, tenantId: string): Promise<{
        customerId: string;
        totalRepairs: number;
        completedRepairs: number;
        activeRepairs: number;
        totalSpent: number;
        averageRepairCost: number;
        repairHistory: RepairResponseDto[];
        favoriteRepairTypes: {
            repairType: string;
            count: number;
        }[];
    }>;
    uploadImages(id: string, files: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }[], metadata: any, tenantId: string, userId: string): Promise<{
        results: import("../../integrations/file-storage/file-storage.service").FileUploadResult[];
        summary: any;
    }>;
    getRepairImages(id: string, tenantId: string): Promise<any[]>;
    deleteRepairImage(id: string, imageId: string, tenantId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private getRepairTypeFrequency;
}

import { RepairStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RepairsRepository } from './repairs.repository';
import { CacheService } from '../../core/cache/cache.service';
import { FileStorageService, FileUploadResult } from '../../integrations/file-storage/file-storage.service';
import { SmsService } from '../../integrations/sms/sms.service';
import { CreateRepairDto, UpdateRepairDto, RepairQueryDto, RepairResponseDto, RepairStatsDto } from './dto/repair.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class RepairsService {
    private repairsRepo;
    private prismaService;
    private cacheService;
    private fileStorageService;
    private smsService;
    private readonly logger;
    constructor(repairsRepo: RepairsRepository, prismaService: PrismaService, cacheService: CacheService, fileStorageService: FileStorageService, smsService: SmsService);
    create(createRepairDto: CreateRepairDto, tenantId: string, userId: string): Promise<RepairResponseDto>;
    findAll(queryDto: RepairQueryDto, tenantId: string): Promise<PaginatedResponseDto<RepairResponseDto>>;
    findOne(id: string, tenantId: string): Promise<RepairResponseDto>;
    update(id: string, updateRepairDto: UpdateRepairDto, tenantId: string, userId: string): Promise<RepairResponseDto>;
    getStats(tenantId: string): Promise<RepairStatsDto>;
    private generateRepairNumber;
    getOverdueRepairs(tenantId: string): Promise<RepairResponseDto[]>;
    addNote(id: string, createNoteDto: any, tenantId: string, userId: string): Promise<any>;
    cancel(id: string, reason: string, tenantId: string, userId: string): Promise<RepairResponseDto>;
    changeStatus(id: string, newStatus: RepairStatus, notes: string, tenantId: string, userId: string, sendSMS?: boolean): Promise<RepairResponseDto>;
    uploadImages(repairId: string, files: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }[], metadata: any, tenantId: string, userId: string): Promise<{
        results: FileUploadResult[];
        summary: any;
    }>;
    getRepairImages(repairId: string, tenantId: string): Promise<any[]>;
    delete(id: string, tenantId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteRepairImage(repairId: string, imageId: string, tenantId: string, userId: string): Promise<boolean>;
    private mapToResponseDto;
    private parseItemsFromNotes;
}

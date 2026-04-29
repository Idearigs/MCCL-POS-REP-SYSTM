import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SalesRepository } from './sales.repository';
import { CacheService } from '../../core/cache/cache.service';
import { ShiftsService } from '../shifts/shifts.service';
import { CreateSaleDto, UpdateSaleDto, CreateRefundDto, SaleQueryDto, SaleResponseDto, SalesStatsDto } from './dto/sale.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class SalesService {
    private salesRepo;
    private prismaService;
    private cacheService;
    private shiftsService;
    private readonly logger;
    constructor(salesRepo: SalesRepository, prismaService: PrismaService, cacheService: CacheService, shiftsService: ShiftsService);
    create(createSaleDto: CreateSaleDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    private generateSaleNumber;
    findAll(query: SaleQueryDto, tenantId: string): Promise<PaginatedResponseDto<SaleResponseDto>>;
    findOne(id: string, tenantId: string): Promise<SaleResponseDto>;
    updateSaleItemNotes(itemId: string, notes: string, tenantId: string): Promise<{
        id: string;
        notes: string | null;
        quantity: number;
        productId: string;
        saleId: string;
        unitPrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
    }>;
    update(id: string, updateSaleDto: UpdateSaleDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    createRefund(id: string, createRefundDto: CreateRefundDto, tenantId: string, userId: string): Promise<SaleResponseDto>;
    getStats(tenantId: string): Promise<SalesStatsDto>;
    private mapToResponseDto;
    getCashierStats(tenantId: string): Promise<any[]>;
    remove(id: string, tenantId: string, userId: string): Promise<void>;
}

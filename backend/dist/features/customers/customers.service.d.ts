import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto, CustomerResponseDto, CustomerStatsDto } from './dto/customer.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class CustomersService {
    private prismaService;
    private cacheService;
    private readonly logger;
    constructor(prismaService: PrismaService, cacheService: CacheService);
    create(createCustomerDto: CreateCustomerDto, tenantId: string): Promise<CustomerResponseDto>;
    findAll(query: CustomerQueryDto, tenantId: string): Promise<PaginatedResponseDto<CustomerResponseDto>>;
    findOne(id: string, tenantId: string): Promise<CustomerResponseDto>;
    update(id: string, updateCustomerDto: UpdateCustomerDto, tenantId: string): Promise<CustomerResponseDto>;
    remove(id: string, tenantId: string): Promise<void>;
    getStats(tenantId: string): Promise<CustomerStatsDto>;
    exportCustomerData(customerId: string, tenantId: string): Promise<any>;
    deleteCustomerDataPermanently(customerId: string, tenantId: string): Promise<void>;
    private mapToResponseDto;
}

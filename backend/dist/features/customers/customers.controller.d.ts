import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto, CustomerResponseDto, CustomerStatsDto, GDPRExportDto, GDPRDeleteDto } from './dto/customer.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto, tenantId: string): Promise<CustomerResponseDto>;
    findAll(query: CustomerQueryDto, tenantId: string): Promise<PaginatedResponseDto<CustomerResponseDto>>;
    getStats(tenantId: string): Promise<CustomerStatsDto>;
    findOne(id: string, tenantId: string): Promise<CustomerResponseDto>;
    update(id: string, updateCustomerDto: UpdateCustomerDto, tenantId: string): Promise<CustomerResponseDto>;
    remove(id: string, tenantId: string): Promise<void>;
    exportCustomerData(gdprExportDto: GDPRExportDto, tenantId: string, userId: string): Promise<any>;
    deleteCustomerDataPermanently(gdprDeleteDto: GDPRDeleteDto, tenantId: string, userId: string): Promise<void>;
    getCustomerSalesHistory(id: string, tenantId: string): Promise<{
        customerId: string;
        salesHistory: any[];
        totalSales: number;
        message: string;
    }>;
    getCustomerRepairHistory(id: string, tenantId: string): Promise<{
        customerId: string;
        repairHistory: any[];
        totalRepairs: number;
        message: string;
    }>;
}

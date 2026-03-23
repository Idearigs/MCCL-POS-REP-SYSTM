import { PaginationDto } from '../../../shared/dto/pagination.dto';
export declare enum ContactType {
    EMAIL = "EMAIL",
    PHONE = "PHONE",
    SMS = "SMS"
}
export declare class CreateCustomerDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    birthDate?: string;
    anniversaryDate?: string;
    notes?: string;
    preferredContact?: ContactType;
    marketingEmail: boolean;
    marketingSms: boolean;
    marketingPhone: boolean;
    dataProcessingConsent: boolean;
}
declare const UpdateCustomerDto_base: import("@nestjs/common").Type<Partial<CreateCustomerDto>>;
export declare class UpdateCustomerDto extends UpdateCustomerDto_base {
    redFlag?: boolean;
    redFlagReason?: string;
    isActive?: boolean;
}
export declare class CustomerQueryDto extends PaginationDto {
    search?: string;
    isActive?: boolean;
    redFlag?: boolean;
    preferredContact?: ContactType;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class CustomerResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    birthDate?: string;
    anniversaryDate?: string;
    notes?: string;
    totalSpent: number;
    visitCount: number;
    loyaltyPoints: number;
    preferredContact: ContactType;
    marketingEmail: boolean;
    marketingSms: boolean;
    marketingPhone: boolean;
    dataProcessingConsent: boolean;
    consentDate?: string;
    isActive: boolean;
    redFlag: boolean;
    redFlagReason?: string;
    createdAt: string;
    updatedAt: string;
}
export declare class CustomerStatsDto {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    redFlaggedCustomers: number;
    newCustomersThisMonth: number;
    totalSpentAllTime: number;
    averageSpentPerCustomer: number;
    customersWithEmailConsent: number;
    customersWithSmsConsent: number;
}
export declare class GDPRExportDto {
    customerId: string;
}
export declare class GDPRDeleteDto {
    customerId: string;
    confirmDelete: boolean;
}
export {};

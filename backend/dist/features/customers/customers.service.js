"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CustomersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const cache_service_1 = require("../../core/cache/cache.service");
const id_generator_1 = require("../../shared/utils/id-generator");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let CustomersService = CustomersService_1 = class CustomersService {
    prismaService;
    cacheService;
    logger = new common_1.Logger(CustomersService_1.name);
    constructor(prismaService, cacheService) {
        this.prismaService = prismaService;
        this.cacheService = cacheService;
    }
    async create(createCustomerDto, tenantId) {
        try {
            if (createCustomerDto.email) {
                const existingCustomer = await this.prismaService.customers.findFirst({
                    where: {
                        email: createCustomerDto.email,
                        tenantId,
                    },
                });
                if (existingCustomer) {
                    throw new common_1.ConflictException('Customer already exists with this email');
                }
            }
            const existingPhoneCustomer = await this.prismaService.customers.findFirst({
                where: {
                    phone: createCustomerDto.phone,
                    tenantId,
                },
            });
            if (existingPhoneCustomer) {
                throw new common_1.ConflictException('Customer already exists with this phone number');
            }
            if (!createCustomerDto.dataProcessingConsent) {
                throw new common_1.BadRequestException('Data processing consent is required for GDPR compliance');
            }
            const customer = await this.prismaService.customers.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    ...createCustomerDto,
                    tenantId,
                    updatedAt: new Date(),
                    consentDate: createCustomerDto.dataProcessingConsent
                        ? new Date()
                        : null,
                    birthDate: createCustomerDto.birthDate
                        ? new Date(createCustomerDto.birthDate)
                        : null,
                    anniversaryDate: createCustomerDto.anniversaryDate
                        ? new Date(createCustomerDto.anniversaryDate)
                        : null,
                },
            });
            await this.cacheService.delTenantData(tenantId, 'customers:list');
            await this.cacheService.delTenantData(tenantId, 'customers:stats');
            this.logger.log(`Customer created: ${customer.id} in tenant ${tenantId}`);
            return this.mapToResponseDto(customer);
        }
        catch (error) {
            this.logger.error('Failed to create customer:', error.message);
            this.logger.error('Error stack:', error.stack);
            this.logger.error('Customer data that failed:', JSON.stringify(createCustomerDto, null, 2));
            throw error;
        }
    }
    async findAll(query, tenantId) {
        try {
            const { page = 1, limit = 10, search, isActive, redFlag, preferredContact, sortBy = 'createdAt', sortOrder = 'desc', } = query;
            const skip = (page - 1) * limit;
            const where = {
                tenantId,
                ...(isActive !== undefined && { isActive }),
                ...(redFlag !== undefined && { redFlag }),
                ...(preferredContact && { preferredContact }),
                ...(search && {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search } },
                    ],
                }),
            };
            const cacheKey = `customers:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
            const cachedResult = null;
            if (cachedResult) {
                this.logger.debug(`📦 Returning cached customers for tenant ${tenantId}`);
                return cachedResult;
            }
            this.logger.debug(`🔍 Fetching fresh customers from database for tenant ${tenantId}`);
            const [customers, total] = await Promise.all([
                this.prismaService.customers.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                }),
                this.prismaService.customers.count({ where }),
            ]);
            const result = new pagination_dto_1.PaginatedResponseDto(customers.map((customer) => this.mapToResponseDto(customer)), page, limit, total);
            this.logger.debug(`✅ Returning ${customers.length} customers from database (total: ${total})`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to fetch customers:', error.message);
            throw error;
        }
    }
    async findOne(id, tenantId) {
        try {
            const cacheKey = `customer:${id}`;
            const cachedCustomer = await this.cacheService.getTenantData(tenantId, cacheKey);
            if (cachedCustomer) {
                return cachedCustomer;
            }
            const customer = await this.prismaService.customers.findFirst({
                where: { id, tenantId },
                include: {
                    sales: {
                        select: { totalAmount: true },
                    },
                },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            const customerDto = this.mapToResponseDto(customer);
            await this.cacheService.setTenantData(tenantId, cacheKey, customerDto, 600);
            return customerDto;
        }
        catch (error) {
            this.logger.error(`Failed to fetch customer ${id}:`, error.message);
            throw error;
        }
    }
    async update(id, updateCustomerDto, tenantId) {
        try {
            const existingCustomer = await this.prismaService.customers.findFirst({
                where: { id, tenantId },
            });
            if (!existingCustomer) {
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            if (updateCustomerDto.email &&
                updateCustomerDto.email !== existingCustomer.email) {
                const emailConflict = await this.prismaService.customers.findFirst({
                    where: {
                        email: updateCustomerDto.email,
                        tenantId,
                        id: { not: id },
                    },
                });
                if (emailConflict) {
                    throw new common_1.ConflictException('Another customer already exists with this email');
                }
            }
            if (updateCustomerDto.phone &&
                updateCustomerDto.phone !== existingCustomer.phone) {
                const phoneConflict = await this.prismaService.customers.findFirst({
                    where: {
                        phone: updateCustomerDto.phone,
                        tenantId,
                        id: { not: id },
                    },
                });
                if (phoneConflict) {
                    throw new common_1.ConflictException('Another customer already exists with this phone number');
                }
            }
            const customer = await this.prismaService.customers.update({
                where: { id },
                data: {
                    ...updateCustomerDto,
                    birthDate: updateCustomerDto.birthDate
                        ? new Date(updateCustomerDto.birthDate)
                        : undefined,
                    anniversaryDate: updateCustomerDto.anniversaryDate
                        ? new Date(updateCustomerDto.anniversaryDate)
                        : undefined,
                },
            });
            await this.cacheService.delTenantData(tenantId, `customer:${id}`);
            await this.cacheService.delTenantData(tenantId, 'customers:list');
            await this.cacheService.delTenantData(tenantId, 'customers:stats');
            this.logger.log(`Customer updated: ${id} in tenant ${tenantId}`);
            return this.mapToResponseDto(customer);
        }
        catch (error) {
            this.logger.error(`Failed to update customer ${id}:`, error.message);
            throw error;
        }
    }
    async remove(id, tenantId) {
        try {
            this.logger.log(`🗑️ PERMANENT DELETE requested for customer: ${id} in tenant ${tenantId}`);
            const customer = await this.prismaService.customers.findFirst({
                where: { id, tenantId },
            });
            if (!customer) {
                this.logger.error(`❌ Customer not found: ${id}`);
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            this.logger.log(`✅ Customer found: ${customer.firstName} ${customer.lastName} (${customer.email})`);
            await this.prismaService.$transaction(async (prisma) => {
                await prisma.documents.deleteMany({ where: { customerId: id } });
                await prisma.sales.updateMany({
                    where: { customerId: id },
                    data: { customerId: null },
                });
                await prisma.repairs.updateMany({
                    where: { customerId: id },
                    data: { customerId: null },
                });
                await prisma.customers.delete({ where: { id } });
            });
            this.logger.log(`🗑️ Transaction completed - Customer ${id} permanently deleted from database`);
            const deletedCheck = await this.prismaService.customers.findUnique({
                where: { id },
            });
            if (deletedCheck) {
                this.logger.error(`❌ ERROR: Customer ${id} still exists in database after delete!`);
                throw new Error('Customer deletion failed - record still exists');
            }
            this.logger.log(`✅ Verified: Customer ${id} no longer exists in database`);
            await this.cacheService.delTenantData(tenantId, `customer:${id}`);
            const cacheKeys = [
                'customers:list',
                'customers:stats',
                'customers:search',
                'customers:count',
            ];
            for (const key of cacheKeys) {
                try {
                    await this.cacheService.delTenantData(tenantId, key);
                    await this.cacheService.delTenantData(tenantId, `${key}:*`);
                }
                catch (error) {
                    this.logger.debug(`Cache key ${key} deletion skipped:`, error.message);
                }
            }
            this.logger.log(`Customer permanently deleted: ${id} in tenant ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete customer ${id}:`, error.message);
            this.logger.error(`Error stack:`, error.stack);
            this.logger.error(`Full error:`, JSON.stringify(error, null, 2));
            throw error;
        }
    }
    async getStats(tenantId) {
        try {
            const cacheKey = 'customers:stats';
            const cachedStats = await this.cacheService.getTenantData(tenantId, cacheKey);
            if (cachedStats) {
                return cachedStats;
            }
            const [totalCustomers, activeCustomers, redFlaggedCustomers, newCustomersThisMonth, totalSpent, emailConsentCount, smsConsentCount,] = await Promise.all([
                this.prismaService.customers.count({ where: { tenantId } }),
                this.prismaService.customers.count({
                    where: { tenantId, isActive: true },
                }),
                this.prismaService.customers.count({
                    where: { tenantId, redFlag: true },
                }),
                this.prismaService.customers.count({
                    where: {
                        tenantId,
                        createdAt: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                }),
                this.prismaService.customers.aggregate({
                    where: { tenantId },
                    _sum: { totalSpent: true },
                }),
                this.prismaService.customers.count({
                    where: { tenantId, marketingEmail: true },
                }),
                this.prismaService.customers.count({
                    where: { tenantId, marketingSms: true },
                }),
            ]);
            const stats = {
                totalCustomers,
                activeCustomers,
                inactiveCustomers: totalCustomers - activeCustomers,
                redFlaggedCustomers,
                newCustomersThisMonth,
                totalSpentAllTime: Number(totalSpent._sum.totalSpent || 0),
                averageSpentPerCustomer: totalCustomers > 0
                    ? Number(totalSpent._sum.totalSpent || 0) / totalCustomers
                    : 0,
                customersWithEmailConsent: emailConsentCount,
                customersWithSmsConsent: smsConsentCount,
            };
            await this.cacheService.setTenantData(tenantId, cacheKey, stats, 900);
            return stats;
        }
        catch (error) {
            this.logger.error('Failed to get customer stats:', error.message);
            throw error;
        }
    }
    async exportCustomerData(customerId, tenantId) {
        try {
            const customer = await this.prismaService.customers.findFirst({
                where: { id: customerId, tenantId },
                include: {
                    sales: {
                        include: {
                            sale_items: {
                                include: {
                                    products: true,
                                },
                            },
                        },
                    },
                    repairs: true,
                    documents: true,
                },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
            }
            this.logger.log(`GDPR data export requested for customer: ${customerId}`);
            return {
                personalData: {
                    id: customer.id,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    postalCode: customer.postalCode,
                    country: customer.country,
                    birthDate: customer.birthDate,
                    anniversaryDate: customer.anniversaryDate,
                    notes: customer.notes,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                },
                preferences: {
                    preferredContact: customer.preferredContact,
                    marketingEmail: customer.marketingEmail,
                    marketingSms: customer.marketingSms,
                    marketingPhone: customer.marketingPhone,
                    dataProcessingConsent: customer.dataProcessingConsent,
                    consentDate: customer.consentDate,
                },
                businessData: {
                    totalSpent: customer.totalSpent,
                    visitCount: customer.visitCount,
                    loyaltyPoints: customer.loyaltyPoints,
                    isActive: customer.isActive,
                    redFlag: customer.redFlag,
                    redFlagReason: customer.redFlagReason,
                },
                transactionHistory: customer.sales,
                repairHistory: customer.repairs,
                documents: customer.documents.map((doc) => ({
                    id: doc.id,
                    fileName: doc.fileName,
                    documentType: doc.documentType,
                    createdAt: doc.createdAt,
                })),
                exportedAt: new Date(),
                exportedBy: 'GDPR_REQUEST',
            };
        }
        catch (error) {
            this.logger.error(`Failed to export customer data ${customerId}:`, error.message);
            throw error;
        }
    }
    async deleteCustomerDataPermanently(customerId, tenantId) {
        try {
            const customer = await this.prismaService.customers.findFirst({
                where: { id: customerId, tenantId },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
            }
            await this.prismaService.$transaction(async (prisma) => {
                await prisma.documents.deleteMany({ where: { customerId } });
                await prisma.repairs.deleteMany({ where: { customerId } });
                await prisma.sales.updateMany({
                    where: { customerId },
                    data: { customerId: null },
                });
                await prisma.customers.delete({ where: { id: customerId } });
            });
            await this.cacheService.delTenantData(tenantId, `customer:${customerId}`);
            await this.cacheService.delTenantData(tenantId, 'customers:list');
            await this.cacheService.delTenantData(tenantId, 'customers:stats');
            this.logger.warn(`GDPR: Customer data permanently deleted: ${customerId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete customer data ${customerId}:`, error.message);
            throw error;
        }
    }
    mapToResponseDto(customer) {
        return {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            postalCode: customer.postalCode,
            country: customer.country,
            birthDate: customer.birthDate?.toISOString().split('T')[0],
            anniversaryDate: customer.anniversaryDate?.toISOString().split('T')[0],
            notes: customer.notes,
            totalSpent: Number(customer.totalSpent),
            visitCount: customer.visitCount,
            loyaltyPoints: customer.loyaltyPoints,
            preferredContact: customer.preferredContact,
            marketingEmail: customer.marketingEmail,
            marketingSms: customer.marketingSms,
            marketingPhone: customer.marketingPhone,
            dataProcessingConsent: customer.dataProcessingConsent,
            consentDate: customer.consentDate?.toISOString(),
            isActive: customer.isActive,
            redFlag: customer.redFlag,
            redFlagReason: customer.redFlagReason,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
        };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = CustomersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map
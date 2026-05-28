import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersRepository } from './customers.repository';
import { CacheService } from '../../core/cache/cache.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  CustomerResponseDto,
  CustomerStatsDto,
} from './dto/customer.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private customerRepo: CustomersRepository,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new customer
   */
  async create(
    createCustomerDto: CreateCustomerDto,
    tenantId: string,
  ): Promise<CustomerResponseDto> {
    try {
      // If a customer with the same phone already exists in this tenant, return
      // that customer rather than blocking — phone can be shared (e.g. family).
      if (createCustomerDto.phone) {
        const existingPhoneCustomer = await this.customerRepo.findFirst({
          where: { phone: createCustomerDto.phone, tenantId },
        });
        if (existingPhoneCustomer) {
          this.logger.log(
            `Customer with phone ${createCustomerDto.phone} already exists — returning existing record`,
          );
          return this.mapToResponseDto(existingPhoneCustomer);
        }
      }

      // GDPR compliance check
      if (!createCustomerDto.dataProcessingConsent) {
        throw new BadRequestException(
          'Data processing consent is required for GDPR compliance',
        );
      }

      const customer = await this.customerRepo.create({
        data: {
          id: generateId(),
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
        } as any,
      });

      // Clear cache for customer list
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.log(`Customer created: ${customer.id} in tenant ${tenantId}`);

      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error('Failed to create customer:', error.message);
      this.logger.error('Error stack:', error.stack);
      this.logger.error(
        'Customer data that failed:',
        JSON.stringify(createCustomerDto, null, 2),
      );
      throw error;
    }
  }

  /**
   * Get all customers with pagination and filtering
   */
  async findAll(
    query: CustomerQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        redFlag,
        isMonthlyPayer,
        preferredContact,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.customersWhereInput = {
        tenantId,
        ...(isActive !== undefined && { isActive }),
        ...(redFlag !== undefined && { redFlag }),
        ...(isMonthlyPayer !== undefined && { isMonthlyPayer }),
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

      // Check cache first (temporarily disabled for debugging - TODO: re-enable after fixing cache invalidation)
      const cacheKey = `customers:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
      const cachedResult = null; // Disabled: await this.cacheService.getTenantData<PaginatedResponseDto<CustomerResponseDto>>(tenantId, cacheKey);

      if (cachedResult) {
        this.logger.debug(
          `📦 Returning cached customers for tenant ${tenantId}`,
        );
        return cachedResult;
      }

      this.logger.debug(
        `🔍 Fetching fresh customers from database for tenant ${tenantId}`,
      );

      // Get customers and total count
      const [customers, total] = await Promise.all([
        this.customerRepo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.customerRepo.count({ where }),
      ]);

      const result = new PaginatedResponseDto(
        customers.map((customer) => this.mapToResponseDto(customer)),
        page,
        limit,
        total,
      );

      // Cache result for 5 minutes (temporarily disabled for debugging - TODO: re-enable)
      // await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

      this.logger.debug(
        `✅ Returning ${customers.length} customers from database (total: ${total})`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch customers:', error.message);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async findOne(id: string, tenantId: string): Promise<CustomerResponseDto> {
    try {
      // Check cache first
      const cacheKey = `customer:${id}`;
      const cachedCustomer =
        await this.cacheService.getTenantData<CustomerResponseDto>(
          tenantId,
          cacheKey,
        );

      if (cachedCustomer) {
        return cachedCustomer;
      }

      const customer = await this.customerRepo.findFirst({
        where: { id, tenantId },
        include: {
          sales: {
            select: { totalAmount: true },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      const customerDto = this.mapToResponseDto(customer);

      // Cache customer for 10 minutes
      await this.cacheService.setTenantData(
        tenantId,
        cacheKey,
        customerDto,
        600,
      );

      return customerDto;
    } catch (error) {
      this.logger.error(`Failed to fetch customer ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update customer
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    tenantId: string,
  ): Promise<CustomerResponseDto> {
    try {
      // Check if customer exists
      const existingCustomer = await this.customerRepo.findFirst({
        where: { id, tenantId },
      });

      if (!existingCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // If email is being updated, check for conflicts
      if (
        updateCustomerDto.email &&
        updateCustomerDto.email !== existingCustomer.email
      ) {
        const emailConflict = await this.customerRepo.findFirst({
          where: {
            email: updateCustomerDto.email,
            tenantId,
            id: { not: id },
          },
        });

        if (emailConflict) {
          throw new ConflictException(
            'Another customer already exists with this email',
          );
        }
      }

      // If phone is being updated, check for conflicts
      if (
        updateCustomerDto.phone &&
        updateCustomerDto.phone !== existingCustomer.phone
      ) {
        const phoneConflict = await this.customerRepo.findFirst({
          where: {
            phone: updateCustomerDto.phone,
            tenantId,
            id: { not: id },
          },
        });

        if (phoneConflict) {
          throw new ConflictException(
            'Another customer already exists with this phone number',
          );
        }
      }

      const customer = await this.customerRepo.update({
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

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `customer:${id}`);
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.log(`Customer updated: ${id} in tenant ${tenantId}`);

      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete customer (permanent delete)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    try {
      this.logger.log(
        `🗑️ PERMANENT DELETE requested for customer: ${id} in tenant ${tenantId}`,
      );

      const customer = await this.customerRepo.findFirst({
        where: { id, tenantId },
      });

      if (!customer) {
        this.logger.error(`❌ Customer not found: ${id}`);
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      this.logger.log(
        `✅ Customer found: ${customer.firstName} ${customer.lastName} (${customer.email})`,
      );

      // Permanent delete - remove related records first to avoid constraint errors
      await this.customerRepo.$transaction(async (prisma) => {
        // Delete related documents
        await prisma.documents.deleteMany({ where: { customerId: id } });

        // Update sales to remove customer reference (nullify instead of delete)
        await prisma.sales.updateMany({
          where: { customerId: id },
          data: { customerId: null },
        });

        // Update repairs to remove customer reference (nullify instead of delete)
        await prisma.repairs.updateMany({
          where: { customerId: id },
          data: { customerId: null },
        });

        // Finally delete customer permanently
        await prisma.customers.delete({ where: { id } });
      });

      this.logger.log(
        `🗑️ Transaction completed - Customer ${id} permanently deleted from database`,
      );

      // Verify deletion
      const deletedCheck = await this.customerRepo.findUnique({
        where: { id },
      });
      if (deletedCheck) {
        this.logger.error(
          `❌ ERROR: Customer ${id} still exists in database after delete!`,
        );
        throw new Error('Customer deletion failed - record still exists');
      }
      this.logger.log(
        `✅ Verified: Customer ${id} no longer exists in database`,
      );

      // Clear ALL customer-related cache entries
      // Since cache keys include query parameters, we need to clear all variations
      await this.cacheService.delTenantData(tenantId, `customer:${id}`);

      // Clear all possible customer list cache keys by using a wildcard pattern
      // This ensures all paginated/filtered queries are invalidated
      const cacheKeys = [
        'customers:list',
        'customers:stats',
        'customers:search',
        'customers:count',
      ];

      for (const key of cacheKeys) {
        try {
          await this.cacheService.delTenantData(tenantId, key);
          // Also try to delete with pattern matching if supported
          await this.cacheService.delTenantData(tenantId, `${key}:*`);
        } catch (error) {
          // Ignore errors for pattern deletion if not supported
          this.logger.debug(
            `Cache key ${key} deletion skipped:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Customer permanently deleted: ${id} in tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete customer ${id}:`, error.message);
      this.logger.error(`Error stack:`, error.stack);
      this.logger.error(`Full error:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getStats(tenantId: string): Promise<CustomerStatsDto> {
    try {
      // Check cache first
      const cacheKey = 'customers:stats';
      const cachedStats =
        await this.cacheService.getTenantData<CustomerStatsDto>(
          tenantId,
          cacheKey,
        );

      if (cachedStats) {
        return cachedStats;
      }

      const [
        totalCustomers,
        activeCustomers,
        redFlaggedCustomers,
        newCustomersThisMonth,
        totalSpent,
        emailConsentCount,
        smsConsentCount,
      ] = await Promise.all([
        this.customerRepo.count({ where: { tenantId } }),
        this.customerRepo.count({
          where: { tenantId, isActive: true },
        }),
        this.customerRepo.count({
          where: { tenantId, redFlag: true },
        }),
        this.customerRepo.count({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        this.customerRepo.aggregate({
          where: { tenantId },
          _sum: { totalSpent: true },
        }),
        this.customerRepo.count({
          where: { tenantId, marketingEmail: true },
        }),
        this.customerRepo.count({
          where: { tenantId, marketingSms: true },
        }),
      ]);

      const stats: CustomerStatsDto = {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        redFlaggedCustomers,
        newCustomersThisMonth,
        totalSpentAllTime: Number(totalSpent._sum.totalSpent || 0),
        averageSpentPerCustomer:
          totalCustomers > 0
            ? Number(totalSpent._sum.totalSpent || 0) / totalCustomers
            : 0,
        customersWithEmailConsent: emailConsentCount,
        customersWithSmsConsent: smsConsentCount,
      };

      // Cache stats for 15 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, stats, 900);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get customer stats:', error.message);
      throw error;
    }
  }

  /**
   * GDPR: Export customer data
   */
  async exportCustomerData(customerId: string, tenantId: string): Promise<any> {
    try {
      const customer = (await this.customerRepo.findFirst({
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
      })) as any;

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
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
          // Note: Actual file content would need separate handling
        })),
        exportedAt: new Date(),
        exportedBy: 'GDPR_REQUEST',
      };
    } catch (error) {
      this.logger.error(
        `Failed to export customer data ${customerId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * GDPR: Delete customer data permanently
   */
  async deleteCustomerDataPermanently(
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const customer = await this.customerRepo.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // This is a permanent deletion - use with extreme caution
      // In practice, you might want to anonymize instead of delete
      await this.customerRepo.$transaction(async (prisma) => {
        // Delete related records first
        await prisma.documents.deleteMany({ where: { customerId } });
        await prisma.repairs.deleteMany({ where: { customerId } });

        // Update sales to remove customer reference
        await prisma.sales.updateMany({
          where: { customerId },
          data: { customerId: null },
        });

        // Finally delete customer
        await prisma.customers.delete({ where: { id: customerId } });
      });

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `customer:${customerId}`);
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.warn(
        `GDPR: Customer data permanently deleted: ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete customer data ${customerId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Map customer to response DTO
   */
  private mapToResponseDto(customer: any): CustomerResponseDto {
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
      isMonthlyPayer: customer.isMonthlyPayer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}

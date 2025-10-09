import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
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
    private prismaService: PrismaService,
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
      // Check if customer already exists with same email in tenant
      if (createCustomerDto.email) {
        const existingCustomer = await this.prismaService.customer.findFirst({
          where: {
            email: createCustomerDto.email,
            tenantId,
          },
        });

        if (existingCustomer) {
          throw new ConflictException('Customer already exists with this email');
        }
      }

      // Check if customer already exists with same phone in tenant
      const existingPhoneCustomer = await this.prismaService.customer.findFirst({
        where: {
          phone: createCustomerDto.phone,
          tenantId,
        },
      });

      if (existingPhoneCustomer) {
        throw new ConflictException('Customer already exists with this phone number');
      }

      // GDPR compliance check
      if (!createCustomerDto.dataProcessingConsent) {
        throw new BadRequestException(
          'Data processing consent is required for GDPR compliance'
        );
      }

      const customer = await this.prismaService.customer.create({
        data: {
          ...createCustomerDto,
          tenantId,
          consentDate: createCustomerDto.dataProcessingConsent ? new Date() : null,
          birthDate: createCustomerDto.birthDate ? new Date(createCustomerDto.birthDate) : null,
          anniversaryDate: createCustomerDto.anniversaryDate 
            ? new Date(createCustomerDto.anniversaryDate) 
            : null,
        },
      });

      // Clear cache for customer list
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.log(`Customer created: ${customer.id} in tenant ${tenantId}`);

      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error('Failed to create customer:', error.message);
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
        preferredContact,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.CustomerWhereInput = {
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

      // Check cache first
      const cacheKey = `customers:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
      const cachedResult = await this.cacheService.getTenantData<PaginatedResponseDto<CustomerResponseDto>>(
        tenantId,
        cacheKey,
      );

      if (cachedResult) {
        return cachedResult;
      }

      // Get customers and total count
      const [customers, total] = await Promise.all([
        this.prismaService.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prismaService.customer.count({ where }),
      ]);

      const result = new PaginatedResponseDto(
        customers.map(customer => this.mapToResponseDto(customer)),
        page,
        limit,
        total,
      );

      // Cache result for 5 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

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
      const cachedCustomer = await this.cacheService.getTenantData<CustomerResponseDto>(
        tenantId,
        cacheKey,
      );

      if (cachedCustomer) {
        return cachedCustomer;
      }

      const customer = await this.prismaService.customer.findFirst({
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
      await this.cacheService.setTenantData(tenantId, cacheKey, customerDto, 600);

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
      const existingCustomer = await this.prismaService.customer.findFirst({
        where: { id, tenantId },
      });

      if (!existingCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // If email is being updated, check for conflicts
      if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.email) {
        const emailConflict = await this.prismaService.customer.findFirst({
          where: {
            email: updateCustomerDto.email,
            tenantId,
            id: { not: id },
          },
        });

        if (emailConflict) {
          throw new ConflictException('Another customer already exists with this email');
        }
      }

      // If phone is being updated, check for conflicts
      if (updateCustomerDto.phone && updateCustomerDto.phone !== existingCustomer.phone) {
        const phoneConflict = await this.prismaService.customer.findFirst({
          where: {
            phone: updateCustomerDto.phone,
            tenantId,
            id: { not: id },
          },
        });

        if (phoneConflict) {
          throw new ConflictException('Another customer already exists with this phone number');
        }
      }

      const customer = await this.prismaService.customer.update({
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
   * Delete customer (soft delete)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    try {
      const customer = await this.prismaService.customer.findFirst({
        where: { id, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Soft delete by setting isActive to false
      await this.prismaService.customer.update({
        where: { id },
        data: { isActive: false },
      });

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `customer:${id}`);
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.log(`Customer soft deleted: ${id} in tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer ${id}:`, error.message);
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
      const cachedStats = await this.cacheService.getTenantData<CustomerStatsDto>(
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
        this.prismaService.customer.count({ where: { tenantId } }),
        this.prismaService.customer.count({ where: { tenantId, isActive: true } }),
        this.prismaService.customer.count({ where: { tenantId, redFlag: true } }),
        this.prismaService.customer.count({
          where: {
            tenantId,
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
        this.prismaService.customer.aggregate({
          where: { tenantId },
          _sum: { totalSpent: true },
        }),
        this.prismaService.customer.count({ where: { tenantId, marketingEmail: true } }),
        this.prismaService.customer.count({ where: { tenantId, marketingSms: true } }),
      ]);

      const stats: CustomerStatsDto = {
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
      const customer = await this.prismaService.customer.findFirst({
        where: { id: customerId, tenantId },
        include: {
          sales: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          repairs: true,
          documents: true,
        },
      });

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
        documents: customer.documents.map(doc => ({
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
      this.logger.error(`Failed to export customer data ${customerId}:`, error.message);
      throw error;
    }
  }

  /**
   * GDPR: Delete customer data permanently
   */
  async deleteCustomerDataPermanently(customerId: string, tenantId: string): Promise<void> {
    try {
      const customer = await this.prismaService.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // This is a permanent deletion - use with extreme caution
      // In practice, you might want to anonymize instead of delete
      await this.prismaService.$transaction(async (prisma) => {
        // Delete related records first
        await prisma.document.deleteMany({ where: { customerId } });
        await prisma.repair.deleteMany({ where: { customerId } });
        
        // Update sales to remove customer reference
        await prisma.sale.updateMany({
          where: { customerId },
          data: { customerId: null },
        });
        
        // Finally delete customer
        await prisma.customer.delete({ where: { id: customerId } });
      });

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `customer:${customerId}`);
      await this.cacheService.delTenantData(tenantId, 'customers:list');
      await this.cacheService.delTenantData(tenantId, 'customers:stats');

      this.logger.warn(`GDPR: Customer data permanently deleted: ${customerId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer data ${customerId}:`, error.message);
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
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  CustomerResponseDto,
  CustomerStatsDto,
  GDPRExportDto,
  GDPRDeleteDto,
} from './dto/customer.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new customer',
    description: 'Create a new customer with GDPR compliance',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Customer already exists',
  })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @TenantId() tenantId: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(createCustomerDto, tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all customers',
    description: 'Retrieve customers with pagination, search, and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    type: PaginatedResponseDto<CustomerResponseDto>,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Sarah Johnson',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'redFlag', required: false, type: Boolean, example: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  async findAll(
    @Query() query: CustomerQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    return this.customersService.findAll(query, tenantId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get customer statistics',
    description: 'Retrieve customer statistics and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer statistics retrieved successfully',
    type: CustomerStatsDto,
  })
  async getStats(@TenantId() tenantId: string): Promise<CustomerStatsDto> {
    return this.customersService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer by ID',
    description: 'Retrieve a specific customer by their ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update customer',
    description: 'Update customer information',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict with existing customer data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @TenantId() tenantId: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, updateCustomerDto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete customer (permanent delete)',
    description: 'Permanently delete a customer and remove related records',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 204,
    description: 'Customer permanently deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return this.customersService.remove(id, tenantId);
  }

  @Post('gdpr/export')
  @ApiOperation({
    summary: 'GDPR: Export customer data',
    description: 'Export all customer data for GDPR compliance',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer data exported successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async exportCustomerData(
    @Body() gdprExportDto: GDPRExportDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Log GDPR export request for audit
    console.log(
      `GDPR Export requested by user ${userId} for customer ${gdprExportDto.customerId} in tenant ${tenantId}`,
    );

    return this.customersService.exportCustomerData(
      gdprExportDto.customerId,
      tenantId,
    );
  }

  @Post('gdpr/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'GDPR: Permanently delete customer data',
    description:
      'Permanently delete all customer data (DANGEROUS - use with extreme caution)',
  })
  @ApiResponse({
    status: 204,
    description: 'Customer data permanently deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or missing confirmation',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async deleteCustomerDataPermanently(
    @Body() gdprDeleteDto: GDPRDeleteDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    if (!gdprDeleteDto.confirmDelete) {
      throw new Error('Delete confirmation required');
    }

    // Log GDPR deletion request for audit
    console.warn(
      `GDPR PERMANENT DELETION requested by user ${userId} for customer ${gdprDeleteDto.customerId} in tenant ${tenantId}`,
    );

    return this.customersService.deleteCustomerDataPermanently(
      gdprDeleteDto.customerId,
      tenantId,
    );
  }

  @Get(':id/sales-history')
  @ApiOperation({
    summary: 'Get customer sales history',
    description: 'Retrieve sales history for a specific customer',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer sales history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async getCustomerSalesHistory(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    // This would be implemented to return customer's sales history
    // For now, return placeholder
    return {
      customerId: id,
      salesHistory: [],
      totalSales: 0,
      message: 'Sales history feature - to be implemented with Sales module',
    };
  }

  @Get(':id/repair-history')
  @ApiOperation({
    summary: 'Get customer repair history',
    description: 'Retrieve repair history for a specific customer',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer repair history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async getCustomerRepairHistory(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    // This would be implemented to return customer's repair history
    // For now, return placeholder
    return {
      customerId: id,
      repairHistory: [],
      totalRepairs: 0,
      message: 'Repair history feature - to be implemented with Repairs module',
    };
  }
}

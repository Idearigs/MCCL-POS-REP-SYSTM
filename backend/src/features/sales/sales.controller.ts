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
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  CreateSaleDto,
  UpdateSaleDto,
  CreateRefundDto,
  SaleQueryDto,
  SaleResponseDto,
  SalesStatsDto,
} from './dto/sale.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new sale',
    description: 'Create a new sale with items and payment processing',
  })
  @ApiResponse({
    status: 201,
    description: 'Sale created successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or insufficient stock',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or customer not found',
  })
  async create(
    @Body() createSaleDto: CreateSaleDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.create(createSaleDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all sales',
    description:
      'Retrieve sales with advanced filtering, search, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales retrieved successfully',
    type: PaginatedResponseDto<SaleResponseDto>,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'SALE-2024-001',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: [
      'CASH',
      'CARD',
      'BANK_TRANSFER',
      'CHEQUE',
      'DIGITAL_WALLET',
      'INSTALLMENT',
    ],
  })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2024-12-31',
  })
  @ApiQuery({ name: 'minAmount', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number, example: 5000 })
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
    @Query() query: SaleQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<SaleResponseDto>> {
    return this.salesService.findAll(query, tenantId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get sales statistics',
    description: 'Retrieve comprehensive sales statistics and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales statistics retrieved successfully',
    type: SalesStatsDto,
  })
  async getStats(@TenantId() tenantId: string): Promise<SalesStatsDto> {
    return this.salesService.getStats(tenantId);
  }

  @Get('stats/cashiers')
  @ApiOperation({
    summary: 'Get per-cashier sales statistics',
    description:
      'Retrieve sales statistics broken down by cashier/staff member',
  })
  @ApiResponse({
    status: 200,
    description: 'Cashier stats retrieved successfully',
  })
  async getCashierStats(@TenantId() tenantId: string): Promise<any[]> {
    return this.salesService.getCashierStats(tenantId);
  }

  @Get('today')
  @ApiOperation({
    summary: "Get today's sales",
    description: 'Retrieve all sales created today',
  })
  @ApiResponse({
    status: 200,
    description: "Today's sales retrieved successfully",
    type: PaginatedResponseDto<SaleResponseDto>,
  })
  async getTodaysSales(
    @Query() query: SaleQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<SaleResponseDto>> {
    const today = new Date().toISOString().split('T')[0];
    const todayQuery = {
      ...query,
      startDate: today,
      endDate: today,
    };
    return this.salesService.findAll(todayQuery, tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get sale by ID',
    description:
      'Retrieve a specific sale with full details including items and payments',
  })
  @ApiParam({
    name: 'id',
    description: 'Sale ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale retrieved successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Sale not found',
  })
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update sale',
    description:
      'Update sale information (limited updates allowed for completed sales)',
  })
  @ApiParam({
    name: 'id',
    description: 'Sale ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale updated successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Sale not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update for completed sale',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.update(id, updateSaleDto, tenantId, userId);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update sale item notes (e.g. condition)' })
  async updateSaleItem(
    @Param('itemId') itemId: string,
    @Body() body: { notes: string },
    @TenantId() tenantId: string,
  ) {
    return this.salesService.updateSaleItemNotes(itemId, body.notes, tenantId);
  }

  @Post(':id/refund')
  @ApiOperation({
    summary: 'Process sale refund',
    description:
      'Create a refund for specific sale items with stock adjustment',
  })
  @ApiParam({
    name: 'id',
    description: 'Sale ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Sale not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refund request',
  })
  async createRefund(
    @Param('id') id: string,
    @Body() createRefundDto: CreateRefundDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<SaleResponseDto> {
    return this.salesService.createRefund(
      id,
      createRefundDto,
      tenantId,
      userId,
    );
  }

  @Get(':id/receipt')
  @ApiOperation({
    summary: 'Get sale receipt data',
    description: 'Retrieve formatted sale data for receipt printing',
  })
  @ApiParam({
    name: 'id',
    description: 'Sale ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Sale not found',
  })
  async getReceiptData(@Param('id') id: string, @TenantId() tenantId: string) {
    const sale = await this.salesService.findOne(id, tenantId);

    // Format data for receipt printing
    return {
      saleNumber: sale.saleNumber,
      date: sale.createdAt,
      customer:
        sale.customerName || sale.walkInCustomerName || 'Walk-in Customer',
      items: sale.items.map((item) => ({
        name: item.productName,
        sku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountAmount,
        total: item.lineTotal,
      })),
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      tax: sale.taxAmount,
      total: sale.totalAmount,
      payments: sale.payments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
      })),
      change: sale.paidAmount - sale.totalAmount,
      notes: sale.notes,
      cashier: sale.createdByName,
    };
  }

  @Get('reports/daily')
  @ApiOperation({
    summary: 'Get daily sales report',
    description: 'Retrieve daily sales summary and statistics',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily report retrieved successfully',
  })
  async getDailyReport(
    @Query('date') date: string,
    @TenantId() tenantId: string,
  ) {
    const reportDate = date || new Date().toISOString().split('T')[0];
    const query: SaleQueryDto = {
      startDate: reportDate,
      endDate: reportDate,
      limit: 1000, // Get all sales for the day
    };

    const salesData = await this.salesService.findAll(query, tenantId);
    const stats = await this.salesService.getStats(tenantId);

    return {
      date: reportDate,
      totalSales: salesData.data.length,
      totalRevenue: salesData.data.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0,
      ),
      averageSaleAmount:
        salesData.data.length > 0
          ? salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0) /
            salesData.data.length
          : 0,
      paymentBreakdown: salesData.data.reduce(
        (acc, sale) => {
          sale.payments.forEach((payment) => {
            acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
          });
          return acc;
        },
        {} as Record<string, number>,
      ),
      topSellingProducts: stats.topSellingProducts.slice(0, 5),
      salesByHour: stats.salesByHour,
      sales: salesData.data,
    };
  }

  @Get('reports/monthly')
  @ApiOperation({
    summary: 'Get monthly sales report',
    description: 'Retrieve monthly sales summary and trends',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2024 })
  @ApiQuery({ name: 'month', required: false, type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Monthly report retrieved successfully',
  })
  async getMonthlyReport(
    @Query('year') year: number,
    @Query('month') month: number,
    @TenantId() tenantId: string,
  ) {
    const currentDate = new Date();
    const reportYear = year || currentDate.getFullYear();
    const reportMonth = month || currentDate.getMonth() + 1;

    const startDate = new Date(reportYear, reportMonth - 1, 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(reportYear, reportMonth, 0)
      .toISOString()
      .split('T')[0];

    const query: SaleQueryDto = {
      startDate,
      endDate,
      limit: 10000, // Get all sales for the month
    };

    const salesData = await this.salesService.findAll(query, tenantId);

    // Group sales by day
    const dailySales = salesData.data.reduce(
      (acc, sale) => {
        const day = sale.createdAt.split('T')[0];
        if (!acc[day]) {
          acc[day] = { count: 0, revenue: 0 };
        }
        acc[day].count++;
        acc[day].revenue += sale.totalAmount;
        return acc;
      },
      {} as Record<string, { count: number; revenue: number }>,
    );

    return {
      year: reportYear,
      month: reportMonth,
      totalSales: salesData.data.length,
      totalRevenue: salesData.data.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0,
      ),
      averageDailySales:
        Object.keys(dailySales).length > 0
          ? salesData.data.length / Object.keys(dailySales).length
          : 0,
      averageDailyRevenue:
        Object.keys(dailySales).length > 0
          ? salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0) /
            Object.keys(dailySales).length
          : 0,
      dailyBreakdown: dailySales,
      paymentMethodTrends: salesData.data.reduce(
        (acc, sale) => {
          sale.payments.forEach((payment) => {
            acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
          });
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a sale',
    description:
      'Permanently delete a sale record. This will also adjust stock quantities for returned items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sale ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Sale deleted successfully' },
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Sale not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this sale',
  })
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string; success: boolean }> {
    await this.salesService.remove(id, tenantId, userId);
    return {
      message: 'Sale deleted successfully',
      success: true,
    };
  }
}

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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductResponseDto,
  StockAdjustmentDto,
  ProductStatsDto,
  BulkUpdateStockDto,
  LowStockReportDto,
} from './dto/product.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@ApiTags('Products')
@Controller('products')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new jewelry product with inventory tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Product with same SKU or barcode already exists',
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve products with advanced filtering, search, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: PaginatedResponseDto<ProductResponseDto>,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Gold Ring',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    example: 'RING',
  })
  @ApiQuery({
    name: 'material',
    required: false,
    type: String,
    example: 'GOLD',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiQuery({
    name: 'lowStock',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
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
    @Query() query: ProductQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return this.productsService.findAll(query, tenantId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get product statistics',
    description: 'Retrieve comprehensive product and inventory statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Product statistics retrieved successfully',
    type: ProductStatsDto,
  })
  async getStats(@TenantId() tenantId: string): Promise<ProductStatsDto> {
    return this.productsService.getStats(tenantId);
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock report',
    description: 'Retrieve products that are low in stock or out of stock',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock report generated successfully',
    type: LowStockReportDto,
  })
  async getLowStockReport(@TenantId() tenantId: string): Promise<any> {
    return this.productsService.getLowStockReport(tenantId);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get product categories',
    description: 'Retrieve all product categories with counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Product categories retrieved successfully',
  })
  async getCategories(@TenantId() tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Get('materials')
  @ApiOperation({
    summary: 'Get product materials',
    description: 'Retrieve all product materials with counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Product materials retrieved successfully',
  })
  async getMaterials(@TenantId() tenantId: string) {
    return this.productsService.getMaterials(tenantId);
  }

  @Get('generate-sku')
  @ApiOperation({
    summary: 'Generate unique SKU',
    description: 'Generate a unique SKU for a new product',
  })
  @ApiQuery({
    name: 'prefix',
    required: false,
    type: String,
    example: 'JWL',
    description: 'Optional prefix for the SKU (default: JWL)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unique SKU generated successfully',
    schema: {
      type: 'object',
      properties: {
        sku: { type: 'string', example: 'JWL-20251013-001' },
      },
    },
  })
  async generateSku(
    @Query('prefix') prefix: string = 'JWL',
    @TenantId() tenantId: string,
  ) {
    return this.productsService.generateUniqueSku(tenantId, prefix);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product with full details',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findOne(id, tenantId);
  }

  @Get(':id/stock-history')
  @ApiOperation({
    summary: 'Get product stock adjustment history',
    description: 'Retrieve complete stock adjustment history for a product',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getStockHistory(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.getStockHistory(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product',
    description: 'Update product information',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict with existing product data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto, tenantId, userId);
  }

  @Post(':id/adjust-stock')
  @ApiOperation({
    summary: 'Adjust product stock',
    description: 'Increase or decrease product stock with reason tracking',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stock adjustment data',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async adjustStock(
    @Param('id') id: string,
    @Body() stockAdjustmentDto: StockAdjustmentDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.adjustStock(
      id,
      stockAdjustmentDto,
      tenantId,
      userId,
    );
  }

  @Post('bulk-update-stock')
  @ApiOperation({
    summary: 'Bulk update product stock',
    description: 'Update stock levels for multiple products at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk stock update completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk update data',
  })
  async bulkUpdateStock(
    @Body() bulkUpdateDto: BulkUpdateStockDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.bulkUpdateStock(
      bulkUpdateDto,
      tenantId,
      userId,
    );
  }

  @Post('bulk-assign-rfid')
  @ApiOperation({
    summary: 'Bulk assign RFID tags to products',
    description:
      'Assign RFID tags to multiple products at once using SKU mapping. Perfect for when you purchase RFID tags and need to assign them to existing inventory.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk RFID assignment completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 150 },
        failed: { type: 'number', example: 2 },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string', example: 'JWL-001' },
              error: {
                type: 'string',
                example: 'Product not found with this SKU',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk assignment data',
  })
  async bulkAssignRFID(
    @Body() body: { assignments: Array<{ sku: string; rfidTag: string }> },
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.bulkAssignRFID(
      body.assignments,
      tenantId,
      userId,
    );
  }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload product image',
    description: 'Upload and store product image to Google Drive',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file too large',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any, // Express.Multer.File type issue
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.uploadImage(id, file, tenantId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete product (soft delete)',
    description: 'Soft delete a product by setting isActive to false',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 204,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete product with existing sales',
  })
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.productsService.remove(id, tenantId, userId);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore deleted product',
    description: 'Restore a soft-deleted product by setting isActive to true',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Product restored successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async restore(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.restore(id, tenantId, userId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({
    summary: 'Get product by barcode',
    description: 'Retrieve a product using its barcode for POS operations',
  })
  @ApiParam({
    name: 'barcode',
    description: 'Product barcode',
    example: '1234567890123',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found by barcode',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findByBarcode(
    @Param('barcode') barcode: string,
    @TenantId() tenantId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findByBarcode(barcode, tenantId);
  }

  @Get('sku/:sku')
  @ApiOperation({
    summary: 'Get product by SKU',
    description: 'Retrieve a product using its SKU',
  })
  @ApiParam({
    name: 'sku',
    description: 'Product SKU',
    example: 'JWL-RING-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found by SKU',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findBySku(
    @Param('sku') sku: string,
    @TenantId() tenantId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findBySku(sku, tenantId);
  }
}

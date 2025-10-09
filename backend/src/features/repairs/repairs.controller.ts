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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RepairsService } from './repairs.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  CreateRepairDto,
  UpdateRepairDto,
  CreateRepairNoteDto,
  RepairQueryDto,
  RepairResponseDto,
  RepairStatsDto,
} from './dto/repair.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@ApiTags('Repairs')
@Controller('repairs')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new repair request',
    description: 'Create a new repair request with items and workflow tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Repair created successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer or product not found',
  })
  async create(
    @Body() createRepairDto: CreateRepairDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.create(createRepairDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all repairs',
    description: 'Retrieve repairs with advanced filtering, search, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Repairs retrieved successfully',
    type: PaginatedResponseDto<RepairResponseDto>,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'RPR-2024-001' })
  @ApiQuery({ name: 'status', required: false, enum: ['RECEIVED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'repairType', required: false, enum: ['CLEANING', 'POLISHING', 'SIZING', 'STONE_SETTING', 'PRONG_REPAIR', 'CHAIN_REPAIR', 'CLASP_REPAIR', 'ENGRAVING', 'RESTORATION', 'CUSTOM_WORK', 'OTHER'] })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'assignedTechnicianId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  async findAll(
    @Query() query: RepairQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<RepairResponseDto>> {
    return this.repairsService.findAll(query, tenantId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get repair statistics',
    description: 'Retrieve comprehensive repair statistics and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair statistics retrieved successfully',
    type: RepairStatsDto,
  })
  async getStats(@TenantId() tenantId: string): Promise<RepairStatsDto> {
    return this.repairsService.getStats(tenantId);
  }

  @Get('overdue')
  @ApiOperation({
    summary: 'Get overdue repairs',
    description: 'Retrieve all repairs that are past their expected completion date',
  })
  @ApiResponse({
    status: 200,
    description: 'Overdue repairs retrieved successfully',
    type: [RepairResponseDto],
  })
  async getOverdueRepairs(@TenantId() tenantId: string): Promise<RepairResponseDto[]> {
    return this.repairsService.getOverdueRepairs(tenantId);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active repairs',
    description: 'Retrieve all repairs that are currently in progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Active repairs retrieved successfully',
    type: PaginatedResponseDto<RepairResponseDto>,
  })
  async getActiveRepairs(
    @Query() query: RepairQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<RepairResponseDto>> {
    const activeQuery = {
      ...query,
      status: undefined, // Remove status filter
    };
    
    // Custom filter for active statuses
    const activeRepairs = await this.repairsService.findAll(activeQuery, tenantId);
    
    // Filter active repairs client-side for now (could be optimized in service)
    const activeStatuses = ['PENDING', 'DIAGNOSED', 'QUOTE_SENT', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'READY_FOR_PICKUP'];
    activeRepairs.data = activeRepairs.data.filter(repair => activeStatuses.includes(repair.status));
    
    return activeRepairs;
  }

  @Get('technician/:technicianId')
  @ApiOperation({
    summary: 'Get repairs by technician',
    description: 'Retrieve all repairs assigned to a specific technician',
  })
  @ApiParam({
    name: 'technicianId',
    description: 'Technician user ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Technician repairs retrieved successfully',
    type: PaginatedResponseDto<RepairResponseDto>,
  })
  async getRepairsByTechnician(
    @Param('technicianId') technicianId: string,
    @Query() query: RepairQueryDto,
    @TenantId() tenantId: string,
  ): Promise<PaginatedResponseDto<RepairResponseDto>> {
    const technicianQuery = {
      ...query,
      assignedTechnicianId: technicianId,
    };
    return this.repairsService.findAll(technicianQuery, tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get repair by ID',
    description: 'Retrieve a specific repair with full details including items and notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair retrieved successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update repair',
    description: 'Update repair information including status, priority, and costs',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair updated successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRepairDto: UpdateRepairDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.update(id, updateRepairDto, tenantId, userId);
  }

  @Post(':id/notes')
  @ApiOperation({
    summary: 'Add note to repair',
    description: 'Add a progress note to the repair with customer visibility control',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Note added successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async addNote(
    @Param('id') id: string,
    @Body() createNoteDto: CreateRepairNoteDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.addNote(id, createNoteDto, tenantId, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel repair',
    description: 'Cancel a repair with reason tracking',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Customer requested cancellation',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Repair cancelled successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel completed repair',
  })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.cancel(id, reason, tenantId, userId);
  }

  @Post(':id/status')
  @ApiOperation({
    summary: 'Change repair status',
    description: 'Update repair status and optionally send SMS notification to customer',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['RECEIVED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED', 'DELAYED'],
          example: 'IN_PROGRESS',
        },
        notes: {
          type: 'string',
          example: 'Started working on the chain repair',
        },
        sendSMS: {
          type: 'boolean',
          example: true,
          description: 'Whether to send SMS notification to customer',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Repair status updated successfully',
    type: RepairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: { 
      status: string; 
      notes?: string; 
      sendSMS?: boolean;
    },
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RepairResponseDto> {
    return this.repairsService.changeStatus(
      id,
      body.status as any,
      body.notes || '',
      tenantId,
      userId,
      body.sendSMS !== false
    );
  }

  @Get(':id/timeline')
  @ApiOperation({
    summary: 'Get repair timeline',
    description: 'Retrieve chronological timeline of repair status changes and notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair timeline retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async getTimeline(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    const repair = await this.repairsService.findOne(id, tenantId);
    
    // Combine notes and status changes into timeline
    const timeline = [];
    
    // Add creation event
    timeline.push({
      type: 'created',
      title: 'Repair Created',
      description: `Repair ${repair.repairNumber} created with ${repair.items.length} item(s)`,
      date: repair.createdAt,
      user: repair.createdByName,
      isCustomerVisible: true,
    });

    // Add notes
    repair.notes.forEach(note => {
      timeline.push({
        type: 'note',
        title: 'Progress Note',
        description: note.note,
        date: note.createdAt,
        user: note.createdByName,
        isCustomerVisible: note.isCustomerVisible,
      });
    });

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      repairId: repair.id,
      repairNumber: repair.repairNumber,
      currentStatus: repair.status,
      timeline,
    };
  }

  @Get('reports/workload')
  @ApiOperation({
    summary: 'Get technician workload report',
    description: 'Retrieve workload distribution across technicians',
  })
  @ApiResponse({
    status: 200,
    description: 'Workload report generated successfully',
  })
  async getWorkloadReport(@TenantId() tenantId: string) {
    const stats = await this.repairsService.getStats(tenantId);
    
    // Get active repairs by technician
    const activeRepairs = await this.repairsService.findAll(
      { limit: 1000 }, // Get all active repairs
      tenantId
    );

    const workloadByTechnician = activeRepairs.data.reduce((acc, repair) => {
      if (repair.assignedTechnicianId && repair.status !== 'COMPLETED' && repair.status !== 'COLLECTED' && repair.status !== 'CANCELLED') {
        const techId = repair.assignedTechnicianId;
        const techName = repair.assignedTechnicianName || 'Unknown';
        
        if (!acc[techId]) {
          acc[techId] = {
            technicianId: techId,
            technicianName: techName,
            activeRepairs: 0,
            urgentRepairs: 0,
            overdueRepairs: 0,
            estimatedWorkload: 0,
          };
        }
        
        acc[techId].activeRepairs++;
        if (repair.priority === 'URGENT') acc[techId].urgentRepairs++;
        if (repair.isOverdue) acc[techId].overdueRepairs++;
        acc[techId].estimatedWorkload += repair.estimatedCost;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      totalActiveRepairs: stats.activeRepairs,
      totalOverdueRepairs: stats.overdueRepairs,
      unassignedRepairs: activeRepairs.data.filter(r => !r.assignedTechnicianId).length,
      technicianWorkloads: Object.values(workloadByTechnician),
      averageRepairTime: stats.averageRepairTime,
    };
  }

  @Get('reports/customer/:customerId')
  @ApiOperation({
    summary: 'Get customer repair history',
    description: 'Retrieve complete repair history for a specific customer',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer repair history retrieved successfully',
  })
  async getCustomerRepairHistory(
    @Param('customerId') customerId: string,
    @TenantId() tenantId: string,
  ) {
    const customerRepairs = await this.repairsService.findAll(
      { customerId, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      tenantId
    );

    const totalSpent = customerRepairs.data.reduce((sum, repair) => sum + repair.totalCost, 0);
    const avgRepairCost = customerRepairs.data.length > 0 ? totalSpent / customerRepairs.data.length : 0;
    const completedRepairs = customerRepairs.data.filter(r => r.status === 'COMPLETED' || r.status === 'COLLECTED');
    const activeRepairs = customerRepairs.data.filter(r => !['COMPLETED', 'COLLECTED', 'CANCELLED'].includes(r.status));

    return {
      customerId,
      totalRepairs: customerRepairs.data.length,
      completedRepairs: completedRepairs.length,
      activeRepairs: activeRepairs.length,
      totalSpent,
      averageRepairCost: avgRepairCost,
      repairHistory: customerRepairs.data,
      favoriteRepairTypes: this.getRepairTypeFrequency(customerRepairs.data),
    };
  }

  @Post(':id/images')
  @ApiOperation({
    summary: 'Upload repair images',
    description: 'Upload images for a repair job (before, during, or after photos)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Images uploaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    @Body() metadata: any,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.repairsService.uploadImages(id, files, metadata, tenantId, userId);
  }

  @Get(':id/images')
  @ApiOperation({
    summary: 'Get repair images',
    description: 'Retrieve all images for a specific repair',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair images retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Repair not found',
  })
  async getRepairImages(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.repairsService.getRepairImages(id, tenantId);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({
    summary: 'Delete repair image',
    description: 'Delete a specific image from a repair',
  })
  @ApiParam({
    name: 'id',
    description: 'Repair ID',
    example: 'clv123abc456',
  })
  @ApiParam({
    name: 'imageId',
    description: 'Image ID',
    example: 'img123abc456',
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Repair or image not found',
  })
  async deleteRepairImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const success = await this.repairsService.deleteRepairImage(id, imageId, tenantId, userId);
    return { success, message: success ? 'Image deleted successfully' : 'Failed to delete image' };
  }

  private getRepairTypeFrequency(repairs: RepairResponseDto[]) {
    const typeCount = repairs.reduce((acc, repair) => {
      repair.items.forEach(item => {
        acc[item.repairType] = (acc[item.repairType] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ repairType: type, count }));
  }
}
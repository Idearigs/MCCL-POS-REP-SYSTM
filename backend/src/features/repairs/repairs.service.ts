import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RepairStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { FileStorageService, FileUploadResult } from '../../integrations/file-storage/file-storage.service';
import { SmsService, RepairStatusSMSData } from '../../integrations/sms/sms.service';
import {
  CreateRepairDto,
  UpdateRepairDto,
  RepairQueryDto,
  RepairResponseDto,
  RepairStatsDto,
} from './dto/repair.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class RepairsService {
  private readonly logger = new Logger(RepairsService.name);

  constructor(
    private prismaService: PrismaService,
    private cacheService: CacheService,
    private fileStorageService: FileStorageService,
    private smsService: SmsService,
  ) {}

  async create(
    createRepairDto: CreateRepairDto,
    tenantId: string,
    userId: string,
  ): Promise<RepairResponseDto> {
    try {
      // Generate repair number
      const repairNumber = await this.generateRepairNumber(tenantId);

      // Validate customer exists
      const customer = await this.prismaService.customer.findFirst({
        where: { id: createRepairDto.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Process the items array to get combined description and estimated cost
      let itemDescription = 'Jewelry repair';
      let totalEstimatedCost = 0;
      let combinedNotes = createRepairDto.internalNotes || '';

      if (createRepairDto.items && createRepairDto.items.length > 0) {
        const descriptions = createRepairDto.items.map(item => item.itemDescription);
        itemDescription = descriptions.join(', ');
        
        totalEstimatedCost = createRepairDto.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
        
        const repairTypes = createRepairDto.items.map(item => `${item.itemDescription}: ${item.repairType} - ${item.repairDescription}`);
        combinedNotes = combinedNotes ? `${combinedNotes}\n\nItems:\n${repairTypes.join('\n')}` : `Items:\n${repairTypes.join('\n')}`;
      }

      const repair = await this.prismaService.repair.create({
        data: {
          repairNumber,
          tenantId,
          customerId: createRepairDto.customerId,
          createdBy: userId,
          status: RepairStatus.RECEIVED,
          priority: createRepairDto.priority || 'NORMAL',
          itemDescription: itemDescription,
          issueDescription: createRepairDto.problemDescription,
          estimatedCost: totalEstimatedCost || createRepairDto.estimatedCost || 0,
          estimatedDueDate: createRepairDto.expectedCompletionDate 
            ? new Date(createRepairDto.expectedCompletionDate) 
            : null,
          customerNotes: createRepairDto.customerInstructions,
          internalNotes: combinedNotes,
          isInsuranceClaim: Boolean(createRepairDto.insuranceValue),
          insuranceNumber: createRepairDto.insuranceNumber,
        },
        include: {
          customer: true,
          createdByUser: true,
        },
      });

      this.logger.log(`Repair created: ${repairNumber} in tenant ${tenantId}`);
      return this.mapToResponseDto(repair, createRepairDto.items);
    } catch (error) {
      this.logger.error('Failed to create repair:', error.message);
      throw error;
    }
  }

  async findAll(
    queryDto: RepairQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<RepairResponseDto>> {
    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.customerId) {
      where.customerId = queryDto.customerId;
    }

    if (queryDto.search) {
      where.OR = [
        { repairNumber: { contains: queryDto.search, mode: 'insensitive' } },
        { itemDescription: { contains: queryDto.search, mode: 'insensitive' } },
        { issueDescription: { contains: queryDto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prismaService.repair.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          createdByUser: true,
        },
      }),
      this.prismaService.repair.count({ where }),
    ]);

    return {
      data: data.map(repair => this.mapToResponseDto(repair)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<RepairResponseDto> {
    const repair = await this.prismaService.repair.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        createdByUser: true,
        statusHistory: true,
        photos: true,
      },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    return this.mapToResponseDto(repair);
  }

  async update(
    id: string,
    updateRepairDto: UpdateRepairDto,
    tenantId: string,
    userId: string,
  ): Promise<RepairResponseDto> {
    const existingRepair = await this.prismaService.repair.findFirst({
      where: { id, tenantId },
    });

    if (!existingRepair) {
      throw new NotFoundException('Repair not found');
    }

    const repair = await this.prismaService.repair.update({
      where: { id },
      data: {
        status: updateRepairDto.status || existingRepair.status,
        priority: updateRepairDto.priority || existingRepair.priority,
        itemDescription: updateRepairDto.itemDescription || existingRepair.itemDescription,
        issueDescription: updateRepairDto.problemDescription || existingRepair.issueDescription,
        estimatedCost: updateRepairDto.estimatedCost ?? existingRepair.estimatedCost,
        finalCost: updateRepairDto.totalCost ?? existingRepair.finalCost,
        estimatedDueDate: updateRepairDto.expectedCompletionDate
          ? new Date(updateRepairDto.expectedCompletionDate)
          : existingRepair.estimatedDueDate,
        completedDate: updateRepairDto.status === 'COMPLETED' ? new Date() : existingRepair.completedDate,
        collectedDate: updateRepairDto.status === 'COLLECTED' ? new Date() : existingRepair.collectedDate,
        customerNotes: updateRepairDto.customerInstructions || existingRepair.customerNotes,
        internalNotes: updateRepairDto.internalNotes || existingRepair.internalNotes,
      },
      include: {
        customer: true,
        createdByUser: true,
      },
    });

    // Add status history entry
    if (updateRepairDto.status && updateRepairDto.status !== existingRepair.status) {
      await this.prismaService.repairStatusHistory.create({
        data: {
          repairId: id,
          oldStatus: existingRepair.status,
          newStatus: updateRepairDto.status as any,
          changedBy: userId,
          notes: updateRepairDto.statusNotes || `Status changed to ${updateRepairDto.status}`,
        },
      });
    }

    return this.mapToResponseDto(repair);
  }

  async getStats(tenantId: string): Promise<RepairStatsDto> {
    const [
      totalRepairs,
      activeRepairs,
      completedRepairs,
      overdueRepairs,
    ] = await Promise.all([
      this.prismaService.repair.count({ where: { tenantId } }),
      this.prismaService.repair.count({
        where: {
          tenantId,
          status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
        },
      }),
      this.prismaService.repair.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'COLLECTED'] },
        },
      }),
      this.prismaService.repair.count({
        where: {
          tenantId,
          status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
          estimatedDueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      totalRepairs,
      activeRepairs,
      completedRepairs,
      overdueRepairs,
      waitingForParts: 0,
      averageRepairTime: 0,
      repairsThisMonth: 0,
      statusBreakdown: {},
      totalRevenue: 0,
      averageRepairCost: 0,
      revenueThisMonth: 0,
    } as any;
  }

  private async generateRepairNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const repairsThisMonth = await this.prismaService.repair.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(repairsThisMonth + 1).padStart(4, '0');
    return `REP-${year}${month}-${sequence}`;
  }

  async getOverdueRepairs(tenantId: string): Promise<RepairResponseDto[]> {
    const repairs = await this.prismaService.repair.findMany({
      where: {
        tenantId,
        status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
        estimatedDueDate: { lt: new Date() },
      },
      include: {
        customer: true,
        createdByUser: true,
      },
    });

    return repairs.map(repair => this.mapToResponseDto(repair));
  }

  async addNote(
    id: string,
    createNoteDto: any,
    tenantId: string,
    userId: string,
  ): Promise<any> {
    // Add to status history instead of notes
    return await this.prismaService.repairStatusHistory.create({
      data: {
        repairId: id,
        oldStatus: null,
        newStatus: 'RECEIVED', // Default status
        changedBy: userId,
        notes: createNoteDto.note,
      },
    });
  }

  async cancel(
    id: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<RepairResponseDto> {
    const repair = await this.prismaService.repair.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        customer: true,
        createdByUser: true,
      },
    });

    // Add status history entry
    await this.prismaService.repairStatusHistory.create({
      data: {
        repairId: id,
        oldStatus: repair.status,
        newStatus: 'CANCELLED',
        changedBy: userId,
        notes: reason,
      },
    });

    return this.mapToResponseDto(repair);
  }

  async changeStatus(
    id: string,
    newStatus: RepairStatus,
    notes: string,
    tenantId: string,
    userId: string,
    sendSMS: boolean = true,
  ): Promise<RepairResponseDto> {
    const existingRepair = await this.prismaService.repair.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        createdByUser: true,
      }
    });

    if (!existingRepair) {
      throw new NotFoundException('Repair not found');
    }

    const oldStatus = existingRepair.status;

    // Update repair status
    const updatedRepair = await this.prismaService.repair.update({
      where: { id },
      data: {
        status: newStatus,
        completedDate: newStatus === 'COMPLETED' ? new Date() : existingRepair.completedDate,
        collectedDate: newStatus === 'COLLECTED' ? new Date() : existingRepair.collectedDate,
      },
      include: {
        customer: true,
        createdByUser: true,
      },
    });

    // Add status history entry
    await this.prismaService.repairStatusHistory.create({
      data: {
        repairId: id,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedBy: userId,
        notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
      },
    });

    // Send SMS notification to customer if enabled and customer has phone
    if (sendSMS && existingRepair.customer?.phone) {
      try {
        const smsData: RepairStatusSMSData = {
          customerName: `${existingRepair.customer.firstName} ${existingRepair.customer.lastName}`,
          customerPhone: existingRepair.customer.phone,
          repairNumber: existingRepair.repairNumber,
          oldStatus: oldStatus,
          newStatus: newStatus,
          itemDescription: existingRepair.itemDescription || 'Jewelry repair',
          estimatedCompletionDate: existingRepair.estimatedDueDate ? 
            existingRepair.estimatedDueDate.toLocaleDateString('en-GB') : undefined,
          shopName: 'MPS Jewelry', // Could be made configurable
          shopPhone: '+44 1234 567890', // Could be made configurable
        };

        const smsResult = await this.smsService.sendRepairStatusSMS(smsData);
        
        if (smsResult.success) {
          this.logger.log(`✅ SMS notification sent to customer for repair ${existingRepair.repairNumber}`);
          
          // Log SMS in status history
          await this.prismaService.repairStatusHistory.create({
            data: {
              repairId: id,
              oldStatus: null,
              newStatus: newStatus,
              changedBy: userId,
              notes: `SMS notification sent to ${existingRepair.customer.phone} - Message ID: ${smsResult.messageId}`,
            },
          });
        } else {
          this.logger.warn(`⚠️ Failed to send SMS for repair ${existingRepair.repairNumber}: ${smsResult.error}`);
        }
      } catch (smsError) {
        this.logger.error(`SMS sending error for repair ${existingRepair.repairNumber}:`, smsError.message);
      }
    }

    this.logger.log(`Repair ${existingRepair.repairNumber} status changed: ${oldStatus} → ${newStatus}`);
    return this.mapToResponseDto(updatedRepair);
  }

  async uploadImages(
    repairId: string,
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    metadata: any,
    tenantId: string,
    userId: string,
  ): Promise<{ results: FileUploadResult[]; summary: any }> {
    // Verify repair exists and user has access
    const repair = await this.prismaService.repair.findFirst({
      where: { id: repairId, tenantId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    const results: FileUploadResult[] = [];
    
    for (const file of files) {
      try {
        const uploadResult = await this.fileStorageService.uploadFile({
          fileName: file.originalname,
          buffer: file.buffer,
          mimeType: file.mimetype,
          category: 'repair-images',
          metadata: {
            repairId: repair.repairNumber,
            repairInternalId: repairId,
            description: metadata.description || `${repair.itemDescription} - repair image`,
            uploadedBy: userId,
            originalSize: file.size,
            uploadType: metadata.uploadType || 'progress',
          }
        });

        if (uploadResult.success) {
          // Store image reference in database
          // TODO: Uncomment when repairImage model is added to Prisma schema
          /*
          await this.prismaService.repairImage.create({
            data: {
              repairId: repairId,
              imageUrl: uploadResult.fileUrl,
              fileName: uploadResult.fileName,
              fileSize: uploadResult.size,
              uploadMethod: uploadResult.uploadMethod,
              description: metadata.description || `${repair.itemDescription} - repair image`,
              uploadedBy: userId,
              imageType: metadata.uploadType || 'progress',
            },
          });
          */
        }

        results.push(uploadResult);
      } catch (error) {
        this.logger.error(`Failed to upload image for repair ${repairId}:`, error.message);
        results.push({
          success: false,
          fileUrl: '',
          fileName: file.originalname,
          size: file.size,
          uploadMethod: 'error',
          error: error.message
        });
      }
    }

    const summary = {
      totalFiles: files.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      uploadMethods: results.reduce((acc, r) => {
        acc[r.uploadMethod] = (acc[r.uploadMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    this.logger.log(`Uploaded ${summary.successful}/${summary.totalFiles} images for repair ${repair.repairNumber}`);

    return { results, summary };
  }

  async getRepairImages(repairId: string, tenantId: string): Promise<any[]> {
    // Verify repair exists and user has access
    const repair = await this.prismaService.repair.findFirst({
      where: { id: repairId, tenantId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    // TODO: Uncomment when repairImage model is added to Prisma schema
    /*
    const images = await this.prismaService.repairImage.findMany({
      where: { repairId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedByUser: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    */
    const images = []; // Temporary empty array

    return []; // Return empty array until repairImage model is implemented
    
    // TODO: Restore this when repairImage model is available
    /*
    return images.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      fileName: image.fileName,
      fileSize: image.fileSize,
      description: image.description,
      imageType: image.imageType,
      uploadMethod: image.uploadMethod,
      uploadedBy: image.uploadedBy,
      uploadedByName: image.uploadedByUser 
        ? `${image.uploadedByUser.firstName} ${image.uploadedByUser.lastName}`
        : 'Unknown',
      createdAt: image.createdAt.toISOString(),
    }));
    */
  }

  async deleteRepairImage(
    repairId: string,
    imageId: string,
    tenantId: string,
    userId: string,
  ): Promise<boolean> {
    // Verify repair exists and user has access
    const repair = await this.prismaService.repair.findFirst({
      where: { id: repairId, tenantId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    // TODO: Uncomment when repairImage model is added to Prisma schema
    /*
    const image = await this.prismaService.repairImage.findFirst({
      where: { id: imageId, repairId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }
    */
    // Temporary: Always throw not found until model is implemented
    throw new NotFoundException('Image model not implemented yet');

    // TODO: Uncomment when repairImage model is available
    /*
    try {
      // Delete from storage system
      await this.fileStorageService.deleteFile(
        image.uploadMethod === 'google-drive' ? image.fileName : image.imageUrl,
        image.uploadMethod as any
      );

      // Delete from database
      await this.prismaService.repairImage.delete({
        where: { id: imageId }
      });

      this.logger.log(`Deleted image ${imageId} from repair ${repair.repairNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete image ${imageId}:`, error.message);
      return false;
    }
    */
  }

  private mapToResponseDto(repair: any, items?: any[]): any {
    const response = {
      id: repair.id,
      repairNumber: repair.repairNumber,
      customerId: repair.customerId,
      customerName: repair.customer ? `${repair.customer.firstName} ${repair.customer.lastName}` : 'Unknown',
      status: repair.status,
      priority: repair.priority,
      itemDescription: repair.itemDescription,
      problemDescription: repair.issueDescription,
      estimatedCost: Number(repair.estimatedCost || 0),
      totalCost: Number(repair.finalCost || 0),
      balanceDue: Math.max(0, Number(repair.finalCost || 0) - Number(repair.depositAmount || 0)),
      depositAmount: Number(repair.depositAmount || 0),
      insuranceValue: Number(repair.insuranceValue || 0),
      expectedCompletionDate: repair.estimatedDueDate ? repair.estimatedDueDate.toISOString() : null,
      actualCompletionDate: repair.completedDate ? repair.completedDate.toISOString() : null,
      customerInstructions: repair.customerNotes || '',
      internalNotes: repair.internalNotes || '',
      assignedTechnicianId: repair.assignedTechnicianId || null,
      assignedTechnicianName: repair.assignedTechnician ? `${repair.assignedTechnician.firstName} ${repair.assignedTechnician.lastName}` : null,
      isOverdue: repair.estimatedDueDate && repair.status !== 'COMPLETED' && repair.status !== 'COLLECTED' ? new Date() > repair.estimatedDueDate : false,
      createdBy: repair.createdBy,
      createdByName: repair.createdByUser ? `${repair.createdByUser.firstName} ${repair.createdByUser.lastName}` : 'Unknown',
      createdAt: repair.createdAt.toISOString(),
      updatedAt: repair.updatedAt.toISOString(),
      items: items || this.parseItemsFromNotes(repair.internalNotes),
      notes: repair.statusHistory ? repair.statusHistory.map((history: any) => ({
        id: history.id,
        note: history.notes,
        isCustomerVisible: true,
        createdBy: history.changedBy,
        createdByName: 'System',
        createdAt: history.changedAt.toISOString(),
        updatedAt: history.changedAt.toISOString(),
      })) : [],
    };
    
    return response;
  }

  private parseItemsFromNotes(internalNotes: string): any[] {
    if (!internalNotes) return [];
    
    // Try to extract items from internal notes if they were stored there
    const itemsSection = internalNotes.split('Items:\n')[1];
    if (!itemsSection) return [];
    
    const itemLines = itemsSection.split('\n').filter(line => line.trim());
    return itemLines.map((line, index) => {
      const parts = line.split(': ');
      return {
        id: `item_${index}`,
        productId: null,
        itemDescription: parts[0] || 'Item',
        repairType: 'OTHER',
        repairDescription: parts[1] || line,
        estimatedCost: 0,
        actualCost: null,
        material: null,
        weight: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }
}
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RepairStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RepairsRepository } from './repairs.repository';
import { CacheService } from '../../core/cache/cache.service';
import {
  FileStorageService,
  FileUploadResult,
} from '../../integrations/file-storage/file-storage.service';
import {
  SmsService,
  RepairStatusSMSData,
} from '../../integrations/sms/sms.service';
import { generateId } from '../../shared/utils/id-generator';
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
    private repairsRepo: RepairsRepository,
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

      // Validate customer exists (cross-domain lookup via PrismaService)
      const customer = await this.prismaService.customers.findFirst({
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
        const descriptions = createRepairDto.items.map(
          (item) => item.itemDescription,
        );
        itemDescription = descriptions.join(', ');

        totalEstimatedCost = createRepairDto.items.reduce(
          (sum, item) => sum + (item.estimatedCost || 0),
          0,
        );

        const repairTypes = createRepairDto.items.map(
          (item) =>
            `${item.itemDescription}: ${item.repairType} - ${item.repairDescription}`,
        );
        combinedNotes = combinedNotes
          ? `${combinedNotes}\n\nItems:\n${repairTypes.join('\n')}`
          : `Items:\n${repairTypes.join('\n')}`;
      }

      const repair = await this.repairsRepo.create({
        data: {
          id: generateId(),
          repairNumber,
          tenantId,
          customerId: createRepairDto.customerId,
          createdBy: userId,
          status: RepairStatus.RECEIVED,
          priority: createRepairDto.priority || 'NORMAL',
          itemDescription: itemDescription,
          issueDescription: createRepairDto.problemDescription,
          estimatedCost:
            totalEstimatedCost || createRepairDto.estimatedCost || 0,
          estimatedDueDate: createRepairDto.expectedCompletionDate
            ? new Date(createRepairDto.expectedCompletionDate)
            : null,
          customerNotes: createRepairDto.customerInstructions,
          internalNotes: combinedNotes,
          isInsuranceClaim: Boolean(createRepairDto.insuranceValue),
          insuranceNumber: createRepairDto.insuranceNumber,
          tagId: createRepairDto.tagId || null,
          rmaId: createRepairDto.rmaId || null,
          updatedAt: new Date(),
        } as any,
        include: {
          customers: true,
          users: true,
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
    const limit = Math.min(queryDto.limit || 20, 1000);
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
        {
          itemDescription: {
            contains: queryDto.search,
            mode: 'insensitive',
          },
        },
        {
          issueDescription: {
            contains: queryDto.search,
            mode: 'insensitive',
          },
        },
        {
          customers: {
            OR: [
              { firstName: { contains: queryDto.search, mode: 'insensitive' } },
              { lastName: { contains: queryDto.search, mode: 'insensitive' } },
              { phone: { contains: queryDto.search, mode: 'insensitive' } },
              { email: { contains: queryDto.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.repairsRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customers: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          users: { select: { firstName: true, lastName: true } },
        },
      }),
      this.repairsRepo.count({ where }),
    ]);

    return {
      data: data.map((repair) => this.mapToResponseDto(repair)),
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
    const repair = await this.repairsRepo.findFirst({
      where: { id, tenantId },
      include: {
        customers: true,
        users: true,
        repair_status_history: true,
        repair_photos: true,
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
    const existingRepair = await this.repairsRepo.findFirst({
      where: { id, tenantId },
    });

    if (!existingRepair) {
      throw new NotFoundException('Repair not found');
    }

    const repair = await this.repairsRepo.update({
      where: { id },
      data: {
        status: updateRepairDto.status || existingRepair.status,
        priority: updateRepairDto.priority || existingRepair.priority,
        itemDescription:
          updateRepairDto.itemDescription || existingRepair.itemDescription,
        issueDescription:
          updateRepairDto.problemDescription || existingRepair.issueDescription,
        estimatedCost:
          updateRepairDto.estimatedCost ?? existingRepair.estimatedCost,
        finalCost: updateRepairDto.totalCost ?? existingRepair.finalCost,
        estimatedDueDate: updateRepairDto.expectedCompletionDate
          ? new Date(updateRepairDto.expectedCompletionDate)
          : existingRepair.estimatedDueDate,
        completedDate:
          updateRepairDto.status === 'COMPLETED'
            ? new Date()
            : existingRepair.completedDate,
        collectedDate:
          updateRepairDto.status === 'COLLECTED'
            ? new Date()
            : existingRepair.collectedDate,
        customerNotes:
          updateRepairDto.customerInstructions || existingRepair.customerNotes,
        internalNotes:
          updateRepairDto.internalNotes || existingRepair.internalNotes,
        tagId:
          updateRepairDto.tagId !== undefined
            ? updateRepairDto.tagId
            : existingRepair.tagId,
        rmaId:
          updateRepairDto.rmaId !== undefined
            ? updateRepairDto.rmaId
            : existingRepair.rmaId,
        updatedAt: new Date(),
      },
      include: {
        customers: true,
        users: true,
      },
    });

    // Add status history entry
    if (
      updateRepairDto.status &&
      updateRepairDto.status !== existingRepair.status
    ) {
      await this.repairsRepo.createStatusHistory({
        data: {
          id: generateId(),
          repairId: id,
          oldStatus: existingRepair.status,
          newStatus: updateRepairDto.status as any,
          changedBy: userId,
          notes:
            updateRepairDto.statusNotes ||
            `Status changed to ${updateRepairDto.status}`,
        } as any,
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
      allRepairs,
    ] = await Promise.all([
      this.repairsRepo.count({ where: { tenantId } }),
      this.repairsRepo.count({
        where: {
          tenantId,
          status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
        },
      }),
      this.repairsRepo.count({
        where: {
          tenantId,
          status: { in: ['COMPLETED', 'COLLECTED'] },
        },
      }),
      this.repairsRepo.count({
        where: {
          tenantId,
          status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
          estimatedDueDate: { lt: new Date() },
        },
      }),
      // Get all repairs to calculate status breakdown
      this.repairsRepo.findMany({
        where: { tenantId },
        select: { status: true, finalCost: true, createdAt: true },
      }),
    ]);

    // Calculate status breakdown
    const statusBreakdown: Record<string, number> = {
      RECEIVED: 0,
      QUOTED: 0,
      APPROVED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      READY_FOR_COLLECTION: 0,
      COLLECTED: 0,
      CANCELLED: 0,
    };

    let totalRevenue = 0;
    let repairsThisMonth = 0;
    let revenueThisMonth = 0;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    allRepairs.forEach((repair) => {
      // Count by status
      if (statusBreakdown[repair.status] !== undefined) {
        statusBreakdown[repair.status]++;
      }

      // Calculate revenue
      if (repair.finalCost) {
        totalRevenue += Number(repair.finalCost);

        // Check if repair is from this month
        if (new Date(repair.createdAt) >= startOfMonth) {
          repairsThisMonth++;
          revenueThisMonth += Number(repair.finalCost);
        }
      }
    });

    const averageRepairCost =
      totalRepairs > 0 ? totalRevenue / totalRepairs : 0;

    // Initialize priority breakdown with all enum values
    const priorityBreakdown = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      URGENT: 0,
    };

    // Initialize repair type breakdown with all enum values
    const repairTypeBreakdown = {
      CLEANING: 0,
      POLISHING: 0,
      SIZING: 0,
      STONE_SETTING: 0,
      PRONG_REPAIR: 0,
      CHAIN_REPAIR: 0,
      CLASP_REPAIR: 0,
      ENGRAVING: 0,
      RESTORATION: 0,
      CUSTOM_WORK: 0,
      OTHER: 0,
    };

    return {
      totalRepairs,
      activeRepairs,
      completedRepairs,
      overdueRepairs,
      waitingForParts: 0,
      averageRepairTime: 0,
      repairsThisMonth,
      statusBreakdown: statusBreakdown as any,
      priorityBreakdown: priorityBreakdown as any,
      repairTypeBreakdown,
      totalRevenue,
      averageRepairCost,
      revenueThisMonth,
      topTechnicians: [],
    };
  }

  private async generateRepairNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the highest repair number for this month to avoid duplicates
    const lastRepair = await this.repairsRepo.findFirst({
      where: {
        tenantId,
        repairNumber: {
          startsWith: `REP-${year}${month}-`,
        },
      },
      orderBy: {
        repairNumber: 'desc',
      },
      select: {
        repairNumber: true,
      },
    });

    let sequence = 1;
    if (lastRepair) {
      // Extract sequence number from last repair (format: REP-202510-0001)
      const lastSequence = parseInt(lastRepair.repairNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `REP-${year}${month}-${sequenceStr}`;
  }

  async getOverdueRepairs(tenantId: string): Promise<RepairResponseDto[]> {
    const repairs = await this.repairsRepo.findMany({
      where: {
        tenantId,
        status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
        estimatedDueDate: { lt: new Date() },
      },
      include: {
        customers: true,
        users: true,
      },
    });

    return repairs.map((repair) => this.mapToResponseDto(repair));
  }

  async addNote(
    id: string,
    createNoteDto: any,
    tenantId: string,
    userId: string,
  ): Promise<any> {
    // Add to status history instead of notes
    return await this.repairsRepo.createStatusHistory({
      data: {
        id: generateId(),
        repairId: id,
        oldStatus: null,
        newStatus: 'RECEIVED', // Default status
        changedBy: userId,
        notes: createNoteDto.note,
      } as any,
    });
  }

  async cancel(
    id: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<RepairResponseDto> {
    const repair = await this.repairsRepo.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        customers: true,
        users: true,
      },
    });

    // Add status history entry
    await this.repairsRepo.createStatusHistory({
      data: {
        id: generateId(),
        repairId: id,
        oldStatus: repair.status,
        newStatus: 'CANCELLED',
        changedBy: userId,
        notes: reason,
      } as any,
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
    const existingRepair = (await this.repairsRepo.findFirst({
      where: { id, tenantId },
      include: {
        customers: true,
        users: true,
      },
    })) as any;

    if (!existingRepair) {
      throw new NotFoundException('Repair not found');
    }

    const oldStatus = existingRepair.status;

    // Update repair status
    const updatedRepair = await this.repairsRepo.update({
      where: { id },
      data: {
        status: newStatus,
        completedDate:
          newStatus === 'COMPLETED' ? new Date() : existingRepair.completedDate,
        collectedDate:
          newStatus === 'COLLECTED' ? new Date() : existingRepair.collectedDate,
      },
      include: {
        customers: true,
        users: true,
      },
    });

    // Add status history entry
    await this.repairsRepo.createStatusHistory({
      data: {
        id: generateId(),
        repairId: id,
        oldStatus: oldStatus,
        newStatus: newStatus,
        changedBy: userId,
        notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
      } as any,
    });

    // Send SMS notification to customer if enabled and customer has phone
    if (sendSMS && existingRepair.customers?.phone) {
      try {
        const smsData: RepairStatusSMSData = {
          customerName: `${existingRepair.customers.firstName} ${existingRepair.customers.lastName}`,
          customerPhone: existingRepair.customers.phone,
          repairNumber: existingRepair.repairNumber,
          oldStatus: oldStatus,
          newStatus: newStatus,
          itemDescription: existingRepair.itemDescription || 'Jewelry repair',
          estimatedCompletionDate: existingRepair.estimatedDueDate
            ? existingRepair.estimatedDueDate.toLocaleDateString('en-GB')
            : undefined,
          shopName: 'MPS Jewelry', // Could be made configurable
          shopPhone: '+44 1234 567890', // Could be made configurable
        };

        const smsResult = await this.smsService.sendRepairStatusSMS(smsData);

        if (smsResult.success) {
          this.logger.log(
            `✅ SMS notification sent to customer for repair ${existingRepair.repairNumber}`,
          );

          // Log SMS in status history
          await this.repairsRepo.createStatusHistory({
            data: {
              id: generateId(),
              repairId: id,
              oldStatus: null,
              newStatus: newStatus,
              changedBy: userId,
              notes: `SMS notification sent to ${existingRepair.customers.phone} - Message ID: ${smsResult.messageId}`,
            } as any,
          });
        } else {
          this.logger.warn(
            `⚠️ Failed to send SMS for repair ${existingRepair.repairNumber}: ${smsResult.error}`,
          );
        }
      } catch (smsError) {
        this.logger.error(
          `SMS sending error for repair ${existingRepair.repairNumber}:`,
          smsError.message,
        );
      }
    }

    this.logger.log(
      `Repair ${existingRepair.repairNumber} status changed: ${oldStatus} → ${newStatus}`,
    );
    return this.mapToResponseDto(updatedRepair);
  }

  async uploadImages(
    repairId: string,
    files: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }[],
    metadata: any,
    tenantId: string,
    userId: string,
  ): Promise<{ results: FileUploadResult[]; summary: any }> {
    try {
      this.logger.log(
        `Starting image upload for repair ${repairId}, ${files?.length || 0} files`,
      );

      // Verify repair exists and user has access
      const repair = await this.repairsRepo.findFirst({
        where: { id: repairId, tenantId },
      });

      if (!repair) {
        this.logger.error(`Repair not found: ${repairId}`);
        throw new NotFoundException('Repair not found');
      }

      if (!files || files.length === 0) {
        this.logger.warn('No files provided for upload');
        return {
          results: [],
          summary: {
            totalFiles: 0,
            successful: 0,
            failed: 0,
            uploadMethods: {},
          },
        };
      }

      const results: FileUploadResult[] = [];

      for (const file of files) {
        try {
          const uploadResult = await this.fileStorageService.uploadFile({
            fileName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            category: 'repair-images',
            tenantId,
            metadata: {
              repairId: repair.repairNumber,
              repairInternalId: repairId,
              description:
                metadata.description ||
                `${repair.itemDescription} - repair image`,
              uploadedBy: userId,
              originalSize: file.size,
              uploadType: metadata.uploadType || 'progress',
            },
          });

          if (uploadResult.success) {
            // Store image reference in database (repair_photos table)
            await this.repairsRepo.createPhoto({
              data: {
                id: generateId(),
                repairId: repairId,
                fileName: uploadResult.fileName,
                filePath: uploadResult.fileUrl,
                driveFileId:
                  uploadResult.uploadMethod === 'google-drive'
                    ? uploadResult.fileName
                    : null,
                driveViewLink:
                  uploadResult.uploadMethod === 'google-drive'
                    ? uploadResult.fileUrl
                    : null,
                fileSize: uploadResult.size,
                mimeType: file.mimetype,
                description:
                  metadata.description ||
                  `${repair.itemDescription} - repair image`,
                stage: metadata.uploadType || 'progress',
              } as any,
            });
          }

          results.push(uploadResult);
        } catch (error) {
          this.logger.error(
            `Failed to upload image for repair ${repairId}:`,
            error.message,
          );
          results.push({
            success: false,
            fileUrl: '',
            fileName: file.originalname,
            size: file.size,
            uploadMethod: 'error',
            error: error.message,
          });
        }
      }

      const summary = {
        totalFiles: files.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        uploadMethods: results.reduce(
          (acc, r) => {
            acc[r.uploadMethod] = (acc[r.uploadMethod] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };

      this.logger.log(
        `Uploaded ${summary.successful}/${summary.totalFiles} images for repair ${repair.repairNumber}`,
      );

      return { results, summary };
    } catch (error) {
      this.logger.error(
        `Error in uploadImages for repair ${repairId}:`,
        error.message,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
      );
    }
  }

  async getRepairImages(repairId: string, tenantId: string): Promise<any[]> {
    // Verify repair exists and user has access
    const repair = await this.repairsRepo.findFirst({
      where: { id: repairId, tenantId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    // Get images from repair_photos table
    const images = await this.repairsRepo.findManyPhotos({
      where: { repairId },
      orderBy: { createdAt: 'desc' },
    });

    return images.map((image) => ({
      id: image.id,
      imageUrl: image.filePath || image.driveViewLink,
      fileName: image.fileName,
      fileSize: image.fileSize,
      description: image.description,
      imageType: image.stage,
      uploadMethod: image.driveFileId ? 'google-drive' : 'local',
      createdAt: image.createdAt.toISOString(),
    }));
  }

  async delete(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify repair exists and user has access
    const repair = (await this.repairsRepo.findFirst({
      where: { id, tenantId },
      include: {
        repair_photos: true,
        repair_status_history: true,
      },
    })) as any;

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    try {
      // Delete related records first (foreign key constraints)
      // Delete repair photos
      if (repair.repair_photos && repair.repair_photos.length > 0) {
        for (const photo of repair.repair_photos) {
          try {
            // Delete from storage
            if (photo.driveFileId) {
              await this.fileStorageService.deleteFile(
                photo.driveFileId,
                'google-drive',
              );
            } else if (photo.filePath) {
              await this.fileStorageService.deleteFile(photo.filePath, 'local');
            }
          } catch (fileError) {
            this.logger.warn(
              `Failed to delete file for photo ${photo.id}: ${fileError.message}`,
            );
          }
        }

        // Delete photo records
        await this.repairsRepo.deleteManyPhotos({
          where: { repairId: id },
        });
      }

      // Delete status history
      await this.repairsRepo.deleteManyStatusHistory({
        where: { repairId: id },
      });

      // Finally, delete the repair itself
      await this.repairsRepo.delete({
        where: { id },
      });

      this.logger.log(
        `✅ Deleted repair ${repair.repairNumber} and all related records`,
      );

      return {
        success: true,
        message: `Repair ${repair.repairNumber} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete repair ${id}:`, error.message);
      throw new BadRequestException(
        `Failed to delete repair: ${error.message}`,
      );
    }
  }

  async deleteRepairImage(
    repairId: string,
    imageId: string,
    tenantId: string,
    userId: string,
  ): Promise<boolean> {
    // Verify repair exists and user has access
    const repair = await this.repairsRepo.findFirst({
      where: { id: repairId, tenantId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    // Get image from repair_photos table
    const image = await this.repairsRepo.findFirstPhoto({
      where: { id: imageId, repairId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    try {
      // Delete from storage system
      if (image.driveFileId) {
        // It's a Google Drive file
        await this.fileStorageService.deleteFile(
          image.driveFileId,
          'google-drive',
        );
      } else if (image.filePath) {
        // It's a local file
        await this.fileStorageService.deleteFile(image.filePath, 'local');
      }

      // Delete from database
      await this.repairsRepo.deletePhoto({
        where: { id: imageId },
      });

      this.logger.log(
        `Deleted image ${imageId} from repair ${repair.repairNumber}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete image ${imageId}:`, error.message);
      return false;
    }
  }

  private mapToResponseDto(repair: any, items?: any[]): any {
    const response = {
      id: repair.id,
      repairNumber: repair.repairNumber,
      customerId: repair.customerId,
      customerName: repair.customers
        ? `${repair.customers.firstName} ${repair.customers.lastName}`
        : 'Unknown',
      status: repair.status,
      priority: repair.priority,
      itemDescription: repair.itemDescription,
      problemDescription: repair.issueDescription,
      estimatedCost: Number(repair.estimatedCost || 0),
      totalCost: Number(repair.finalCost || 0),
      balanceDue: Math.max(
        0,
        Number(repair.finalCost || 0) - Number(repair.depositAmount || 0),
      ),
      depositAmount: Number(repair.depositAmount || 0),
      insuranceValue: Number(repair.insuranceValue || 0),
      expectedCompletionDate: repair.estimatedDueDate
        ? repair.estimatedDueDate instanceof Date
          ? repair.estimatedDueDate.toISOString()
          : new Date(repair.estimatedDueDate).toISOString()
        : null,
      actualCompletionDate: repair.completedDate
        ? repair.completedDate instanceof Date
          ? repair.completedDate.toISOString()
          : new Date(repair.completedDate).toISOString()
        : null,
      customerInstructions: repair.customerNotes || '',
      internalNotes: repair.internalNotes || '',
      assignedTechnicianId: repair.assignedTechnicianId || null,
      assignedTechnicianName: repair.assignedTechnician
        ? `${repair.assignedTechnician.firstName} ${repair.assignedTechnician.lastName}`
        : null,
      isOverdue:
        repair.estimatedDueDate &&
        repair.status !== 'COMPLETED' &&
        repair.status !== 'COLLECTED'
          ? new Date() > repair.estimatedDueDate
          : false,
      createdBy: repair.createdBy,
      createdByName: repair.users
        ? `${repair.users.firstName} ${repair.users.lastName}`
        : 'Unknown',
      createdAt:
        repair.createdAt instanceof Date
          ? repair.createdAt.toISOString()
          : repair.createdAt,
      updatedAt:
        repair.updatedAt instanceof Date
          ? repair.updatedAt.toISOString()
          : repair.updatedAt,
      items: items || this.parseItemsFromNotes(repair.internalNotes),
      notes: repair.repair_status_history
        ? repair.repair_status_history.map((history: any) => {
            const changedAt =
              history.changedAt instanceof Date
                ? history.changedAt
                : new Date(history.changedAt ?? Date.now());
            return {
              id: history.id,
              note: history.notes,
              isCustomerVisible: true,
              createdBy: history.changedBy,
              createdByName: 'System',
              createdAt: changedAt.toISOString(),
              updatedAt: changedAt.toISOString(),
            };
          })
        : [],
      images: repair.repair_photos
        ? repair.repair_photos.map(
            (photo: any) => photo.filePath || photo.driveViewLink,
          )
        : [],
      beforeImages: repair.repair_photos
        ? repair.repair_photos
            .filter((photo: any) => photo.stage === 'before')
            .map((photo: any) => photo.filePath || photo.driveViewLink)
        : [],
      afterImages: repair.repair_photos
        ? repair.repair_photos
            .filter((photo: any) => photo.stage === 'after')
            .map((photo: any) => photo.filePath || photo.driveViewLink)
        : [],
      progressImages: repair.repair_photos
        ? repair.repair_photos
            .filter((photo: any) => photo.stage === 'progress')
            .map((photo: any) => photo.filePath || photo.driveViewLink)
        : [],
    };

    return response;
  }

  private parseItemsFromNotes(internalNotes: string): any[] {
    if (!internalNotes) return [];

    // Try to extract items from internal notes if they were stored there
    const itemsSection = internalNotes.split('Items:\n')[1];
    if (!itemsSection) return [];

    const itemLines = itemsSection.split('\n').filter((line) => line.trim());
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

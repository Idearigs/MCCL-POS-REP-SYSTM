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
var RepairsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const cache_service_1 = require("../../core/cache/cache.service");
const file_storage_service_1 = require("../../integrations/file-storage/file-storage.service");
const sms_service_1 = require("../../integrations/sms/sms.service");
const id_generator_1 = require("../../shared/utils/id-generator");
let RepairsService = RepairsService_1 = class RepairsService {
    prismaService;
    cacheService;
    fileStorageService;
    smsService;
    logger = new common_1.Logger(RepairsService_1.name);
    constructor(prismaService, cacheService, fileStorageService, smsService) {
        this.prismaService = prismaService;
        this.cacheService = cacheService;
        this.fileStorageService = fileStorageService;
        this.smsService = smsService;
    }
    async create(createRepairDto, tenantId, userId) {
        try {
            const repairNumber = await this.generateRepairNumber(tenantId);
            const customer = await this.prismaService.customers.findFirst({
                where: { id: createRepairDto.customerId, tenantId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
            let itemDescription = 'Jewelry repair';
            let totalEstimatedCost = 0;
            let combinedNotes = createRepairDto.internalNotes || '';
            if (createRepairDto.items && createRepairDto.items.length > 0) {
                const descriptions = createRepairDto.items.map((item) => item.itemDescription);
                itemDescription = descriptions.join(', ');
                totalEstimatedCost = createRepairDto.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
                const repairTypes = createRepairDto.items.map((item) => `${item.itemDescription}: ${item.repairType} - ${item.repairDescription}`);
                combinedNotes = combinedNotes
                    ? `${combinedNotes}\n\nItems:\n${repairTypes.join('\n')}`
                    : `Items:\n${repairTypes.join('\n')}`;
            }
            const repair = await this.prismaService.repairs.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    repairNumber,
                    tenantId,
                    customerId: createRepairDto.customerId,
                    createdBy: userId,
                    status: client_1.RepairStatus.RECEIVED,
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
                    tagId: createRepairDto.tagId || null,
                    rmaId: createRepairDto.rmaId || null,
                    updatedAt: new Date(),
                },
                include: {
                    customers: true,
                    users: true,
                },
            });
            this.logger.log(`Repair created: ${repairNumber} in tenant ${tenantId}`);
            return this.mapToResponseDto(repair, createRepairDto.items);
        }
        catch (error) {
            this.logger.error('Failed to create repair:', error.message);
            throw error;
        }
    }
    async findAll(queryDto, tenantId) {
        const page = queryDto.page || 1;
        const limit = Math.min(queryDto.limit || 20, 1000);
        const skip = (page - 1) * limit;
        const where = { tenantId };
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
                {
                    issueDescription: { contains: queryDto.search, mode: 'insensitive' },
                },
            ];
        }
        const [data, total] = await Promise.all([
            this.prismaService.repairs.findMany({
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
            this.prismaService.repairs.count({ where }),
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
    async findOne(id, tenantId) {
        const repair = await this.prismaService.repairs.findFirst({
            where: { id, tenantId },
            include: {
                customers: true,
                users: true,
                repair_status_history: true,
                repair_photos: true,
            },
        });
        if (!repair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        return this.mapToResponseDto(repair);
    }
    async update(id, updateRepairDto, tenantId, userId) {
        const existingRepair = await this.prismaService.repairs.findFirst({
            where: { id, tenantId },
        });
        if (!existingRepair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        const repair = await this.prismaService.repairs.update({
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
                completedDate: updateRepairDto.status === 'COMPLETED'
                    ? new Date()
                    : existingRepair.completedDate,
                collectedDate: updateRepairDto.status === 'COLLECTED'
                    ? new Date()
                    : existingRepair.collectedDate,
                customerNotes: updateRepairDto.customerInstructions || existingRepair.customerNotes,
                internalNotes: updateRepairDto.internalNotes || existingRepair.internalNotes,
                tagId: updateRepairDto.tagId !== undefined
                    ? updateRepairDto.tagId
                    : existingRepair.tagId,
                rmaId: updateRepairDto.rmaId !== undefined
                    ? updateRepairDto.rmaId
                    : existingRepair.rmaId,
                updatedAt: new Date(),
            },
            include: {
                customers: true,
                users: true,
            },
        });
        if (updateRepairDto.status &&
            updateRepairDto.status !== existingRepair.status) {
            await this.prismaService.repair_status_history.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    repairId: id,
                    oldStatus: existingRepair.status,
                    newStatus: updateRepairDto.status,
                    changedBy: userId,
                    notes: updateRepairDto.statusNotes ||
                        `Status changed to ${updateRepairDto.status}`,
                },
            });
        }
        return this.mapToResponseDto(repair);
    }
    async getStats(tenantId) {
        const [totalRepairs, activeRepairs, completedRepairs, overdueRepairs, allRepairs,] = await Promise.all([
            this.prismaService.repairs.count({ where: { tenantId } }),
            this.prismaService.repairs.count({
                where: {
                    tenantId,
                    status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
                },
            }),
            this.prismaService.repairs.count({
                where: {
                    tenantId,
                    status: { in: ['COMPLETED', 'COLLECTED'] },
                },
            }),
            this.prismaService.repairs.count({
                where: {
                    tenantId,
                    status: { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] },
                    estimatedDueDate: { lt: new Date() },
                },
            }),
            this.prismaService.repairs.findMany({
                where: { tenantId },
                select: { status: true, finalCost: true, createdAt: true },
            }),
        ]);
        const statusBreakdown = {
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
            if (statusBreakdown[repair.status] !== undefined) {
                statusBreakdown[repair.status]++;
            }
            if (repair.finalCost) {
                totalRevenue += Number(repair.finalCost);
                if (new Date(repair.createdAt) >= startOfMonth) {
                    repairsThisMonth++;
                    revenueThisMonth += Number(repair.finalCost);
                }
            }
        });
        const averageRepairCost = totalRepairs > 0 ? totalRevenue / totalRepairs : 0;
        const priorityBreakdown = {
            LOW: 0,
            NORMAL: 0,
            HIGH: 0,
            URGENT: 0,
        };
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
            statusBreakdown: statusBreakdown,
            priorityBreakdown: priorityBreakdown,
            repairTypeBreakdown,
            totalRevenue,
            averageRepairCost,
            revenueThisMonth,
            topTechnicians: [],
        };
    }
    async generateRepairNumber(tenantId) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const lastRepair = await this.prismaService.repairs.findFirst({
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
            const lastSequence = parseInt(lastRepair.repairNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        const sequenceStr = String(sequence).padStart(4, '0');
        return `REP-${year}${month}-${sequenceStr}`;
    }
    async getOverdueRepairs(tenantId) {
        const repairs = await this.prismaService.repairs.findMany({
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
    async addNote(id, createNoteDto, tenantId, userId) {
        return await this.prismaService.repair_status_history.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                repairId: id,
                oldStatus: null,
                newStatus: 'RECEIVED',
                changedBy: userId,
                notes: createNoteDto.note,
            },
        });
    }
    async cancel(id, reason, tenantId, userId) {
        const repair = await this.prismaService.repairs.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
            include: {
                customers: true,
                users: true,
            },
        });
        await this.prismaService.repair_status_history.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                repairId: id,
                oldStatus: repair.status,
                newStatus: 'CANCELLED',
                changedBy: userId,
                notes: reason,
            },
        });
        return this.mapToResponseDto(repair);
    }
    async changeStatus(id, newStatus, notes, tenantId, userId, sendSMS = true) {
        const existingRepair = await this.prismaService.repairs.findFirst({
            where: { id, tenantId },
            include: {
                customers: true,
                users: true,
            },
        });
        if (!existingRepair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        const oldStatus = existingRepair.status;
        const updatedRepair = await this.prismaService.repairs.update({
            where: { id },
            data: {
                status: newStatus,
                completedDate: newStatus === 'COMPLETED' ? new Date() : existingRepair.completedDate,
                collectedDate: newStatus === 'COLLECTED' ? new Date() : existingRepair.collectedDate,
            },
            include: {
                customers: true,
                users: true,
            },
        });
        await this.prismaService.repair_status_history.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                repairId: id,
                oldStatus: oldStatus,
                newStatus: newStatus,
                changedBy: userId,
                notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
            },
        });
        if (sendSMS && existingRepair.customers?.phone) {
            try {
                const smsData = {
                    customerName: `${existingRepair.customers.firstName} ${existingRepair.customers.lastName}`,
                    customerPhone: existingRepair.customers.phone,
                    repairNumber: existingRepair.repairNumber,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    itemDescription: existingRepair.itemDescription || 'Jewelry repair',
                    estimatedCompletionDate: existingRepair.estimatedDueDate
                        ? existingRepair.estimatedDueDate.toLocaleDateString('en-GB')
                        : undefined,
                    shopName: 'MPS Jewelry',
                    shopPhone: '+44 1234 567890',
                };
                const smsResult = await this.smsService.sendRepairStatusSMS(smsData);
                if (smsResult.success) {
                    this.logger.log(`✅ SMS notification sent to customer for repair ${existingRepair.repairNumber}`);
                    await this.prismaService.repair_status_history.create({
                        data: {
                            id: (0, id_generator_1.generateId)(),
                            repairId: id,
                            oldStatus: null,
                            newStatus: newStatus,
                            changedBy: userId,
                            notes: `SMS notification sent to ${existingRepair.customers.phone} - Message ID: ${smsResult.messageId}`,
                        },
                    });
                }
                else {
                    this.logger.warn(`⚠️ Failed to send SMS for repair ${existingRepair.repairNumber}: ${smsResult.error}`);
                }
            }
            catch (smsError) {
                this.logger.error(`SMS sending error for repair ${existingRepair.repairNumber}:`, smsError.message);
            }
        }
        this.logger.log(`Repair ${existingRepair.repairNumber} status changed: ${oldStatus} → ${newStatus}`);
        return this.mapToResponseDto(updatedRepair);
    }
    async uploadImages(repairId, files, metadata, tenantId, userId) {
        try {
            this.logger.log(`Starting image upload for repair ${repairId}, ${files?.length || 0} files`);
            const repair = await this.prismaService.repairs.findFirst({
                where: { id: repairId, tenantId },
            });
            if (!repair) {
                this.logger.error(`Repair not found: ${repairId}`);
                throw new common_1.NotFoundException('Repair not found');
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
            const results = [];
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
                            description: metadata.description ||
                                `${repair.itemDescription} - repair image`,
                            uploadedBy: userId,
                            originalSize: file.size,
                            uploadType: metadata.uploadType || 'progress',
                        },
                    });
                    if (uploadResult.success) {
                        await this.prismaService.repair_photos.create({
                            data: {
                                id: (0, id_generator_1.generateId)(),
                                repairId: repairId,
                                fileName: uploadResult.fileName,
                                filePath: uploadResult.fileUrl,
                                driveFileId: uploadResult.uploadMethod === 'google-drive'
                                    ? uploadResult.fileName
                                    : null,
                                driveViewLink: uploadResult.uploadMethod === 'google-drive'
                                    ? uploadResult.fileUrl
                                    : null,
                                fileSize: uploadResult.size,
                                mimeType: file.mimetype,
                                description: metadata.description ||
                                    `${repair.itemDescription} - repair image`,
                                stage: metadata.uploadType || 'progress',
                            },
                        });
                    }
                    results.push(uploadResult);
                }
                catch (error) {
                    this.logger.error(`Failed to upload image for repair ${repairId}:`, error.message);
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
                uploadMethods: results.reduce((acc, r) => {
                    acc[r.uploadMethod] = (acc[r.uploadMethod] || 0) + 1;
                    return acc;
                }, {}),
            };
            this.logger.log(`Uploaded ${summary.successful}/${summary.totalFiles} images for repair ${repair.repairNumber}`);
            return { results, summary };
        }
        catch (error) {
            this.logger.error(`Error in uploadImages for repair ${repairId}:`, error.message, error.stack);
            throw new common_1.BadRequestException(`Failed to upload images: ${error.message}`);
        }
    }
    async getRepairImages(repairId, tenantId) {
        const repair = await this.prismaService.repairs.findFirst({
            where: { id: repairId, tenantId },
        });
        if (!repair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        const images = await this.prismaService.repair_photos.findMany({
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
    async delete(id, tenantId, userId) {
        const repair = await this.prismaService.repairs.findFirst({
            where: { id, tenantId },
            include: {
                repair_photos: true,
                repair_status_history: true,
            },
        });
        if (!repair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        try {
            if (repair.repair_photos && repair.repair_photos.length > 0) {
                for (const photo of repair.repair_photos) {
                    try {
                        if (photo.driveFileId) {
                            await this.fileStorageService.deleteFile(photo.driveFileId, 'google-drive');
                        }
                        else if (photo.filePath) {
                            await this.fileStorageService.deleteFile(photo.filePath, 'local');
                        }
                    }
                    catch (fileError) {
                        this.logger.warn(`Failed to delete file for photo ${photo.id}: ${fileError.message}`);
                    }
                }
                await this.prismaService.repair_photos.deleteMany({
                    where: { repairId: id },
                });
            }
            await this.prismaService.repair_status_history.deleteMany({
                where: { repairId: id },
            });
            await this.prismaService.repairs.delete({
                where: { id },
            });
            this.logger.log(`✅ Deleted repair ${repair.repairNumber} and all related records`);
            return {
                success: true,
                message: `Repair ${repair.repairNumber} deleted successfully`,
            };
        }
        catch (error) {
            this.logger.error(`Failed to delete repair ${id}:`, error.message);
            throw new common_1.BadRequestException(`Failed to delete repair: ${error.message}`);
        }
    }
    async deleteRepairImage(repairId, imageId, tenantId, userId) {
        const repair = await this.prismaService.repairs.findFirst({
            where: { id: repairId, tenantId },
        });
        if (!repair) {
            throw new common_1.NotFoundException('Repair not found');
        }
        const image = await this.prismaService.repair_photos.findFirst({
            where: { id: imageId, repairId },
        });
        if (!image) {
            throw new common_1.NotFoundException('Image not found');
        }
        try {
            if (image.driveFileId) {
                await this.fileStorageService.deleteFile(image.driveFileId, 'google-drive');
            }
            else if (image.filePath) {
                await this.fileStorageService.deleteFile(image.filePath, 'local');
            }
            await this.prismaService.repair_photos.delete({
                where: { id: imageId },
            });
            this.logger.log(`Deleted image ${imageId} from repair ${repair.repairNumber}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to delete image ${imageId}:`, error.message);
            return false;
        }
    }
    mapToResponseDto(repair, items) {
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
            balanceDue: Math.max(0, Number(repair.finalCost || 0) - Number(repair.depositAmount || 0)),
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
            isOverdue: repair.estimatedDueDate &&
                repair.status !== 'COMPLETED' &&
                repair.status !== 'COLLECTED'
                ? new Date() > repair.estimatedDueDate
                : false,
            createdBy: repair.createdBy,
            createdByName: repair.users
                ? `${repair.users.firstName} ${repair.users.lastName}`
                : 'Unknown',
            createdAt: repair.createdAt instanceof Date
                ? repair.createdAt.toISOString()
                : repair.createdAt,
            updatedAt: repair.updatedAt instanceof Date
                ? repair.updatedAt.toISOString()
                : repair.updatedAt,
            items: items || this.parseItemsFromNotes(repair.internalNotes),
            notes: repair.repair_status_history
                ? repair.repair_status_history.map((history) => {
                    const changedAt = history.changedAt instanceof Date
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
                ? repair.repair_photos.map((photo) => photo.filePath || photo.driveViewLink)
                : [],
            beforeImages: repair.repair_photos
                ? repair.repair_photos
                    .filter((photo) => photo.stage === 'before')
                    .map((photo) => photo.filePath || photo.driveViewLink)
                : [],
            afterImages: repair.repair_photos
                ? repair.repair_photos
                    .filter((photo) => photo.stage === 'after')
                    .map((photo) => photo.filePath || photo.driveViewLink)
                : [],
            progressImages: repair.repair_photos
                ? repair.repair_photos
                    .filter((photo) => photo.stage === 'progress')
                    .map((photo) => photo.filePath || photo.driveViewLink)
                : [],
        };
        return response;
    }
    parseItemsFromNotes(internalNotes) {
        if (!internalNotes)
            return [];
        const itemsSection = internalNotes.split('Items:\n')[1];
        if (!itemsSection)
            return [];
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
};
exports.RepairsService = RepairsService;
exports.RepairsService = RepairsService = RepairsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        file_storage_service_1.FileStorageService,
        sms_service_1.SmsService])
], RepairsService);
//# sourceMappingURL=repairs.service.js.map
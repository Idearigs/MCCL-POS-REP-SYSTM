import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateSessionDto,
  ScanItemDto,
  UpdateSessionDto,
  ApproveSessionDto,
} from './dto';
import {
  StockTakeStatus as PrismaStockTakeStatus,
  StockTakeItemStatus,
} from '@prisma/client';

@Injectable()
export class StockTakingService {
  private readonly logger = new Logger(StockTakingService.name);

  constructor(private prisma: PrismaService) {}

  // Create a new stock take session
  async createSession(tenantId: string, userId: string, dto: CreateSessionDto) {
    const session = await this.prisma.stock_take_sessions.create({
      data: {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tenantId,
        createdBy: userId,
        sessionName: dto.sessionName,
        location: dto.location,
        remarks: dto.remarks,
        status: PrismaStockTakeStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        stock_take_items: true,
      },
    });

    return session;
  }

  // Get all sessions for a tenant
  async getSessions(tenantId: string, status?: PrismaStockTakeStatus) {
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    const sessions = await this.prisma.stock_take_sessions.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            stock_take_items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions;
  }

  // Get a single session with all items
  async getSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        stock_take_items: {
          include: {
            scanner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            scannedAt: 'desc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(session.stock_take_items);

    return {
      ...session,
      summary,
    };
  }

  // Scan an item in a session
  async scanItem(
    tenantId: string,
    sessionId: string,
    userId: string,
    dto: ScanItemDto,
  ) {
    // Verify session exists and is in correct status
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    if (
      session.status !== PrismaStockTakeStatus.DRAFT &&
      session.status !== PrismaStockTakeStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Cannot scan items in a completed, approved, or cancelled session',
      );
    }

    // Try to find the product by QR code or barcode
    let product = null;
    let status: StockTakeItemStatus;

    if (dto.scannedCode) {
      product = await this.prisma.products.findFirst({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { qrCode: dto.scannedCode },
            { barcode: dto.scannedCode },
            { sku: dto.scannedCode },
          ],
        },
      });
    }

    // Determine item status
    if (product) {
      status = StockTakeItemStatus.VERIFIED;
    } else if (dto.productId) {
      // Manual entry with product ID
      product = await this.prisma.products.findFirst({
        where: {
          id: dto.productId,
          tenantId,
          isActive: true,
        },
      });
      status = product
        ? StockTakeItemStatus.VERIFIED
        : StockTakeItemStatus.MISSING;
    } else {
      // Unexpected item (not in system)
      status = StockTakeItemStatus.UNEXPECTED;
    }

    // Check if this item was already scanned in this session
    const existingItem = await this.prisma.stock_take_items.findFirst({
      where: {
        sessionId,
        OR: product
          ? [{ productId: product.id }]
          : [{ scannedCode: dto.scannedCode }],
      },
    });

    let stockTakeItem;

    if (existingItem) {
      // Update existing item - increment quantity
      stockTakeItem = await this.prisma.stock_take_items.update({
        where: { id: existingItem.id },
        data: {
          scannedQuantity: existingItem.scannedQuantity + dto.scannedQuantity,
          variance: product
            ? existingItem.scannedQuantity +
              dto.scannedQuantity -
              (product.stockQuantity || 0)
            : null,
          notes: dto.notes || existingItem.notes,
          scannedAt: new Date(),
        },
        include: {
          scanner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } else {
      // Create new item
      stockTakeItem = await this.prisma.stock_take_items.create({
        data: {
          id: `sti_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          sessionId,
          productId: product?.id || null,
          scannedCode: dto.scannedCode,
          productName: product?.name || dto.productName || 'Unknown Product',
          productSku: product?.sku || dto.productSku || null,
          expectedQuantity: product?.stockQuantity || null,
          scannedQuantity: dto.scannedQuantity,
          systemQuantity: product?.stockQuantity || null,
          variance: product
            ? dto.scannedQuantity - (product.stockQuantity || 0)
            : null,
          status,
          notes: dto.notes,
          scannedBy: userId,
          scannedAt: new Date(),
          createdAt: new Date(),
        },
        include: {
          scanner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    // Update session status to IN_PROGRESS if it's still DRAFT
    if (session.status === PrismaStockTakeStatus.DRAFT) {
      await this.prisma.stock_take_sessions.update({
        where: { id: sessionId },
        data: {
          status: PrismaStockTakeStatus.IN_PROGRESS,
          updatedAt: new Date(),
        },
      });
    }

    return {
      item: stockTakeItem,
      product,
      isDuplicate: !!existingItem,
      warning: existingItem
        ? 'This item was already scanned. Quantity has been updated.'
        : null,
    };
  }

  // Update session details
  async updateSession(
    tenantId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    // Prevent updates to approved sessions
    if (session.status === PrismaStockTakeStatus.APPROVED) {
      throw new BadRequestException('Cannot update an approved session');
    }

    const updated = await this.prisma.stock_take_sessions.update({
      where: { id: sessionId },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        stock_take_items: true,
      },
    });

    return updated;
  }

  // Mark session as complete and ready for approval
  async completeSession(tenantId: string, sessionId: string, userId: string) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
      include: {
        stock_take_items: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    if (session.status !== PrismaStockTakeStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only complete sessions that are in progress',
      );
    }

    if (session.stock_take_items.length === 0) {
      throw new BadRequestException(
        'Cannot complete a session with no scanned items',
      );
    }

    const updated = await this.prisma.stock_take_sessions.update({
      where: { id: sessionId },
      data: {
        status: PrismaStockTakeStatus.PENDING_APPROVAL,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        stock_take_items: true,
      },
    });

    return updated;
  }

  // Approve or reject a session (admin only)
  async approveSession(
    tenantId: string,
    sessionId: string,
    userId: string,
    dto: ApproveSessionDto,
  ) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
      include: {
        stock_take_items: true,
        creator: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    if (
      session.status !== PrismaStockTakeStatus.PENDING_APPROVAL &&
      session.status !== PrismaStockTakeStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Can only approve sessions that are pending approval or completed',
      );
    }

    // CRITICAL SECURITY: Prevent self-approval
    if (session.createdBy === userId) {
      throw new ForbiddenException(
        'You cannot approve your own stock take session. Another manager or owner must approve this session for security and accountability.',
      );
    }

    // RELIABILITY: Validate variance thresholds before approval
    if (dto.approve && dto.applyToInventory) {
      await this.validateVariances(session.stock_take_items);
    }

    if (dto.approve) {
      // Approve and optionally apply to inventory
      const updateData: any = {
        status: PrismaStockTakeStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = await this.prisma.stock_take_sessions.update({
        where: { id: sessionId },
        data: updateData,
      });

      // Apply to inventory if requested (using transaction for reliability)
      if (dto.applyToInventory) {
        await this.applyToInventory(tenantId, session, userId);
      }

      return updated;
    } else {
      // Reject
      if (!dto.rejectionReason) {
        throw new BadRequestException(
          'Rejection reason is required when rejecting a session',
        );
      }

      const updated = await this.prisma.stock_take_sessions.update({
        where: { id: sessionId },
        data: {
          status: PrismaStockTakeStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
          updatedAt: new Date(),
        },
      });

      return updated;
    }
  }

  // Validate variance thresholds (reliability check)
  private async validateVariances(items: any[]) {
    const largeVariances = items.filter((item) => {
      if (!item.variance || !item.systemQuantity) return false;

      // Calculate variance percentage
      const variancePercent = Math.abs(
        (item.variance / item.systemQuantity) * 100,
      );

      // Flag if variance is more than 20% OR absolute variance > 10 items
      return variancePercent > 20 || Math.abs(item.variance) > 10;
    });

    if (largeVariances.length > 0) {
      const details = largeVariances
        .map((item) => {
          const variancePercent = Math.abs(
            (item.variance / item.systemQuantity) * 100,
          ).toFixed(1);
          return `${item.productName} (SKU: ${item.productSku}): ${item.variance > 0 ? '+' : ''}${item.variance} units (${variancePercent}% variance)`;
        })
        .join('; ');

      throw new BadRequestException(
        `Large inventory variances detected in ${largeVariances.length} product(s). Please review carefully: ${details}. If this is correct, contact your system administrator.`,
      );
    }
  }

  // Apply stock take results to inventory (TRANSACTION-BASED for reliability)
  private async applyToInventory(
    tenantId: string,
    session: any,
    userId: string,
  ) {
    const items = session.stock_take_items;

    // Check for concurrent active stock takes
    const activeStockTakes = await this.prisma.stock_take_sessions.count({
      where: {
        tenantId,
        id: { not: session.id },
        status: {
          in: [
            PrismaStockTakeStatus.IN_PROGRESS,
            PrismaStockTakeStatus.PENDING_APPROVAL,
          ],
        },
      },
    });

    if (activeStockTakes > 0) {
      throw new BadRequestException(
        'There are other active stock take sessions. Please complete or cancel them before applying this stock take to prevent inventory conflicts.',
      );
    }

    // Use transaction to ensure all-or-nothing update (CRITICAL for data integrity)
    try {
      await this.prisma.$transaction(async (tx) => {
        let updatedCount = 0;
        let adjustmentCount = 0;

        for (const item of items) {
          if (item.productId && item.status === StockTakeItemStatus.VERIFIED) {
            // Verify product still exists and hasn't been modified
            const currentProduct = await tx.products.findUnique({
              where: { id: item.productId },
            });

            if (!currentProduct) {
              throw new BadRequestException(
                `Product ${item.productName} (SKU: ${item.productSku}) no longer exists in the system. Cannot apply stock take.`,
              );
            }

            // Update product stock quantity
            await tx.products.update({
              where: { id: item.productId },
              data: {
                stockQuantity: item.scannedQuantity,
                updatedAt: new Date(),
              },
            });

            updatedCount++;

            // Create inventory log entry for ALL items (even zero variance for audit trail)
            await tx.inventory_logs.create({
              data: {
                id: `invlog_${Date.now()}_${Math.random().toString(36).substring(7)}_${updatedCount}`,
                tenantId,
                productId: item.productId,
                type: 'ADJUSTMENT',
                quantity: Math.abs(item.variance || 0),
                previousQty: item.systemQuantity || 0,
                newQty: item.scannedQuantity,
                reason: `Stock take adjustment - Session: ${session.sessionName} | Variance: ${item.variance > 0 ? '+' : ''}${item.variance || 0} | Approved by: ${userId}`,
                reference: session.id,
                createdAt: new Date(),
              },
            });

            if (item.variance !== 0 && item.variance !== null) {
              adjustmentCount++;
            }
          }
        }

        this.logger.log(
          `✅ Stock take applied: ${updatedCount} products updated, ${adjustmentCount} adjustments made`,
        );
      });
    } catch (error) {
      // Transaction failed - inventory remains unchanged
      this.logger.error('❌ Stock take application failed:', error.message);
      throw new BadRequestException(
        `Failed to apply stock take to inventory: ${error.message}. All changes have been rolled back.`,
      );
    }
  }

  // Delete a session (only if not approved)
  async deleteSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    if (session.status === PrismaStockTakeStatus.APPROVED) {
      throw new BadRequestException('Cannot delete an approved session');
    }

    await this.prisma.stock_take_sessions.delete({
      where: { id: sessionId },
    });

    return { message: 'Session deleted successfully' };
  }

  // Delete a scanned item from a session
  async deleteItem(tenantId: string, sessionId: string, itemId: string) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    if (
      session.status !== PrismaStockTakeStatus.DRAFT &&
      session.status !== PrismaStockTakeStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Cannot delete items from a completed or approved session',
      );
    }

    const item = await this.prisma.stock_take_items.findFirst({
      where: {
        id: itemId,
        sessionId,
      },
    });

    if (!item) {
      throw new NotFoundException('Stock take item not found');
    }

    await this.prisma.stock_take_items.delete({
      where: { id: itemId },
    });

    return { message: 'Item deleted successfully' };
  }

  // Calculate summary statistics
  private calculateSummary(items: any[]) {
    const totalScanned = items.length;
    const verified = items.filter(
      (i) => i.status === StockTakeItemStatus.VERIFIED,
    ).length;
    const missing = items.filter(
      (i) => i.status === StockTakeItemStatus.MISSING,
    ).length;
    const unexpected = items.filter(
      (i) => i.status === StockTakeItemStatus.UNEXPECTED,
    ).length;
    const damaged = items.filter(
      (i) => i.status === StockTakeItemStatus.DAMAGED,
    ).length;
    const totalVariance = items.reduce((sum, i) => sum + (i.variance || 0), 0);

    return {
      totalScanned,
      verified,
      missing,
      unexpected,
      damaged,
      totalVariance,
      accuracy:
        totalScanned > 0
          ? ((verified / totalScanned) * 100).toFixed(2)
          : '0.00',
    };
  }

  // Get session report data
  async getSessionReport(tenantId: string, sessionId: string) {
    const session = await this.getSession(tenantId, sessionId);

    return {
      session: {
        id: session.id,
        sessionName: session.sessionName,
        location: session.location,
        status: session.status,
        createdBy: session.creator,
        approvedBy: session.approver,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        approvedAt: session.approvedAt,
      },
      summary: session.summary,
      items: session.stock_take_items,
    };
  }

  // Get detailed variance report (for approval review)
  async getVarianceReport(tenantId: string, sessionId: string) {
    const session = await this.prisma.stock_take_sessions.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
      include: {
        stock_take_items: {
          where: {
            variance: {
              not: 0,
            },
          },
          orderBy: {
            variance: 'desc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Stock take session not found');
    }

    // Categorize variances
    const criticalVariances = []; // >20% or >10 items
    const moderateVariances = []; // 10-20% or 5-10 items
    const minorVariances = []; // <10% and <5 items

    let totalVarianceValue = 0;

    for (const item of session.stock_take_items) {
      if (!item.variance || item.variance === 0) continue;

      const variancePercent = item.systemQuantity
        ? Math.abs((item.variance / item.systemQuantity) * 100)
        : 0;

      const absVariance = Math.abs(item.variance);

      // Get product value for impact calculation
      const product = await this.prisma.products.findUnique({
        where: { id: item.productId },
        select: { sellingPrice: true },
      });

      const valueImpact = product
        ? parseFloat(product.sellingPrice.toString()) * absVariance
        : 0;

      totalVarianceValue += item.variance > 0 ? valueImpact : -valueImpact;

      const varianceData = {
        productName: item.productName,
        productSku: item.productSku,
        systemQuantity: item.systemQuantity,
        scannedQuantity: item.scannedQuantity,
        variance: item.variance,
        variancePercent: variancePercent.toFixed(1),
        valueImpact: valueImpact.toFixed(2),
        status: item.status,
      };

      if (variancePercent > 20 || absVariance > 10) {
        criticalVariances.push(varianceData);
      } else if (variancePercent > 10 || absVariance > 5) {
        moderateVariances.push(varianceData);
      } else {
        minorVariances.push(varianceData);
      }
    }

    return {
      sessionId: session.id,
      sessionName: session.sessionName,
      totalItems: session.stock_take_items.length,
      totalVarianceValue: totalVarianceValue.toFixed(2),
      variances: {
        critical: {
          count: criticalVariances.length,
          items: criticalVariances,
          requiresAdminApproval: criticalVariances.length > 0,
        },
        moderate: {
          count: moderateVariances.length,
          items: moderateVariances,
        },
        minor: {
          count: minorVariances.length,
          items: minorVariances,
        },
      },
      recommendation:
        criticalVariances.length > 0
          ? 'REVIEW_REQUIRED: Critical variances detected. Please verify physical count before approving.'
          : moderateVariances.length > 0
            ? 'CAUTION: Moderate variances detected. Review recommended.'
            : 'OK: Only minor variances detected.',
    };
  }
}

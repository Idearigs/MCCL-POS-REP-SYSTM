import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSessionDto, ScanItemDto, UpdateSessionDto, ApproveSessionDto } from './dto';
import { StockTakeStatus as PrismaStockTakeStatus, StockTakeItemStatus } from '@prisma/client';

@Injectable()
export class StockTakingService {
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
  async scanItem(tenantId: string, sessionId: string, userId: string, dto: ScanItemDto) {
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

    if (session.status !== PrismaStockTakeStatus.DRAFT && session.status !== PrismaStockTakeStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot scan items in a completed, approved, or cancelled session');
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
      status = product ? StockTakeItemStatus.VERIFIED : StockTakeItemStatus.MISSING;
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
            ? (existingItem.scannedQuantity + dto.scannedQuantity) - (product.stockQuantity || 0)
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
          variance: product ? dto.scannedQuantity - (product.stockQuantity || 0) : null,
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
      warning: existingItem ? 'This item was already scanned. Quantity has been updated.' : null,
    };
  }

  // Update session details
  async updateSession(tenantId: string, sessionId: string, dto: UpdateSessionDto) {
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
      throw new BadRequestException('Can only complete sessions that are in progress');
    }

    if (session.stock_take_items.length === 0) {
      throw new BadRequestException('Cannot complete a session with no scanned items');
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
  async approveSession(tenantId: string, sessionId: string, userId: string, dto: ApproveSessionDto) {
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

    if (session.status !== PrismaStockTakeStatus.PENDING_APPROVAL && session.status !== PrismaStockTakeStatus.COMPLETED) {
      throw new BadRequestException('Can only approve sessions that are pending approval or completed');
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

      // Apply to inventory if requested
      if (dto.applyToInventory) {
        await this.applyToInventory(tenantId, session);
      }

      return updated;
    } else {
      // Reject
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting a session');
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

  // Apply stock take results to inventory
  private async applyToInventory(tenantId: string, session: any) {
    const items = session.stock_take_items;

    for (const item of items) {
      if (item.productId && item.status === StockTakeItemStatus.VERIFIED) {
        // Update product stock quantity
        await this.prisma.products.update({
          where: { id: item.productId },
          data: {
            stockQuantity: item.scannedQuantity,
            updatedAt: new Date(),
          },
        });

        // Create inventory log entry
        if (item.variance !== 0 && item.variance !== null) {
          await this.prisma.inventory_logs.create({
            data: {
              id: `invlog_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              tenantId,
              productId: item.productId,
              type: 'ADJUSTMENT',
              quantity: Math.abs(item.variance),
              previousQty: item.systemQuantity || 0,
              newQty: item.scannedQuantity,
              reason: `Stock take adjustment - Session: ${session.sessionName}`,
              reference: session.id,
              createdAt: new Date(),
            },
          });
        }
      }
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

    if (session.status !== PrismaStockTakeStatus.DRAFT && session.status !== PrismaStockTakeStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete items from a completed or approved session');
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
    const verified = items.filter((i) => i.status === StockTakeItemStatus.VERIFIED).length;
    const missing = items.filter((i) => i.status === StockTakeItemStatus.MISSING).length;
    const unexpected = items.filter((i) => i.status === StockTakeItemStatus.UNEXPECTED).length;
    const damaged = items.filter((i) => i.status === StockTakeItemStatus.DAMAGED).length;
    const totalVariance = items.reduce((sum, i) => sum + (i.variance || 0), 0);

    return {
      totalScanned,
      verified,
      missing,
      unexpected,
      damaged,
      totalVariance,
      accuracy: totalScanned > 0 ? ((verified / totalScanned) * 100).toFixed(2) : '0.00',
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
}

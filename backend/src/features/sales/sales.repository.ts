import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * SalesRepository — data-access layer for the sales module.
 *
 * Wraps the sales and sale_items Prisma models so SalesService can be
 * unit-tested by mocking this repository instead of PrismaService.
 *
 * Note: transactional operations (create, createRefund) and cross-domain
 * queries (payments, products, users) remain on PrismaService in SalesService
 * because they require the Prisma transaction client or cross-model access.
 */
@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── sales ────────────────────────────────────────────────────────────────────

  findFirst(args: Prisma.salesFindFirstArgs) {
    return this.prisma.sales.findFirst(args);
  }

  findMany(args: Prisma.salesFindManyArgs) {
    return this.prisma.sales.findMany(args);
  }

  count(args: Prisma.salesCountArgs) {
    return this.prisma.sales.count(args);
  }

  update(args: Prisma.salesUpdateArgs) {
    return this.prisma.sales.update(args);
  }

  aggregate(args: Prisma.SalesAggregateArgs) {
    return this.prisma.sales.aggregate(args);
  }

  // ── sale_items ───────────────────────────────────────────────────────────────

  findFirstSaleItem(args: Prisma.sale_itemsFindFirstArgs) {
    return this.prisma.sale_items.findFirst(args);
  }

  updateSaleItem(args: Prisma.sale_itemsUpdateArgs) {
    return this.prisma.sale_items.update(args);
  }
}

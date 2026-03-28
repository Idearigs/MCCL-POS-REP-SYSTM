import {
  Controller,
  Get,
  Param,
  Res,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Internal backup endpoint — called by the Mainframe backend only.
 * Protected by x-internal-key header (same shared secret).
 * Returns all data for a given tenant as a JSON export.
 */
@Controller('internal/backup')
export class BackupController {
  constructor(private readonly prisma: PrismaService) {}

  private checkKey(key: string | undefined) {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected || key !== expected) throw new UnauthorizedException('Invalid internal key');
  }

  /** Export all data for one tenant as a .json file download */
  @Get('tenant/:tenantId')
  async exportTenant(
    @Param('tenantId') tenantId: string,
    @Headers('x-internal-key') key: string,
    @Res() res: Response,
  ) {
    this.checkKey(key);

    const [
      tenant,
      users,
      customers,
      products,
      sales,
      saleItems,
      repairs,
      repairPhotos,
    ] = await Promise.all([
      this.prisma.tenants.findUnique({ where: { id: tenantId } }),
      this.prisma.users.findMany({ where: { tenantId }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } }),
      this.prisma.customers.findMany({ where: { tenantId } }),
      this.prisma.products.findMany({ where: { tenantId } }),
      this.prisma.sales.findMany({ where: { tenantId } }),
      this.prisma.sale_items.findMany({ where: { sales: { tenantId } } }),
      this.prisma.repairs.findMany({ where: { tenantId } }),
      this.prisma.repair_photos.findMany({ where: { repairs: { tenantId } } }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      tenantId,
      tenant,
      users,
      customers,
      products,
      sales,
      saleItems,
      repairs,
      repairPhotos,
    };

    const subdomain = (tenant as any)?.subdomain || tenantId.slice(0, 8);
    const filename = `${subdomain}-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(payload);
  }

  /** List all tenant IDs + slugs (used by mainframe to enumerate targets) */
  @Get('tenants')
  async listTenants(@Headers('x-internal-key') key: string) {
    this.checkKey(key);
    return this.prisma.tenants.findMany({
      select: { id: true, subdomain: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}

import { Controller, Get, Param, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { verifyInternalHmac } from '../../../shared/utils/hmac-verify';

/**
 * Internal backup endpoint — called by the Mainframe backend only.
 * Protected by HMAC-SHA256 signature (x-internal-timestamp + x-internal-signature headers).
 */
@Controller('internal/backup')
export class BackupController {
  constructor(private readonly prisma: PrismaService) {}

  /** Export all data for one tenant as a .json file download */
  @Get('tenant/:tenantId')
  async exportTenant(
    @Param('tenantId') tenantId: string,
    @Headers('x-internal-timestamp') timestamp: string,
    @Headers('x-internal-signature') signature: string,
    @Res() res: Response,
  ) {
    verifyInternalHmac(signature, timestamp, '');

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
      this.prisma.users.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
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

    const subdomain =
      (tenant as { subdomain?: string } | null)?.subdomain ||
      tenantId.slice(0, 8);
    const filename = `${subdomain}-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(payload);
  }

  /** List all tenant IDs + slugs (used by mainframe to enumerate targets) */
  @Get('tenants')
  async listTenants(
    @Headers('x-internal-timestamp') timestamp: string,
    @Headers('x-internal-signature') signature: string,
  ) {
    verifyInternalHmac(signature, timestamp, '');
    return this.prisma.tenants.findMany({
      select: { id: true, subdomain: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}

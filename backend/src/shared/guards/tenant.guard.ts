import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Extract tenant information from:
      // 1. Header (X-Tenant-ID)
      // 2. Subdomain
      // 3. Host header
      // 4. Default tenant (first active tenant)

      const tenantIdHeader = request.headers['x-tenant-id'];
      const host = request.headers.host || 'localhost';

      this.logger.log(`Tenant lookup - Header: ${tenantIdHeader}, Host: ${host}`);

      let tenant = null;

      // Try header first
      if (tenantIdHeader) {
        try {
          tenant = await this.prismaService.tenant.findUnique({
            where: { id: tenantIdHeader },
          });
          this.logger.log(`Tenant lookup by header ID: ${tenant ? tenant.name : 'not found'}`);
        } catch (err) {
          this.logger.error(`Error looking up tenant by header: ${err.message}`);
        }
      }

      // Try domain lookup
      if (!tenant) {
        const domain = host.split(':')[0]; // Remove port if present
        this.logger.log(`Attempting to find tenant by domain: ${domain}`);

        try {
          tenant = await this.prismaService.tenant.findFirst({
            where: {
              OR: [
                { domain: domain },
                { subdomain: domain.split('.')[0] },
              ],
            },
          });

          if (tenant) {
            this.logger.log(`Tenant found by domain: ${tenant.name}`);
          }
        } catch (err) {
          this.logger.error(`Error looking up tenant by domain: ${err.message}`);
        }
      }

      // Fallback to first active tenant
      if (!tenant) {
        this.logger.log('No tenant found by domain, fetching first active tenant');

        try {
          tenant = await this.prismaService.tenant.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
          });

          if (tenant) {
            this.logger.log(`Using first active tenant: ${tenant.name} (${tenant.id})`);
          }
        } catch (err) {
          this.logger.error(`Error fetching active tenant: ${err.message}`);
        }
      }

      // Final check
      if (!tenant) {
        this.logger.error('No valid tenant found in database - all queries failed');

        // As a last resort, try to get ANY tenant
        try {
          const anyTenant = await this.prismaService.tenant.findFirst();
          if (anyTenant) {
            this.logger.warn(`Using ANY tenant as emergency fallback: ${anyTenant.name}`);
            tenant = anyTenant;
          }
        } catch (err) {
          this.logger.error(`Emergency fallback also failed: ${err.message}`);
        }
      }

      if (!tenant) {
        throw new UnauthorizedException('No valid tenant found');
      }

      // Attach tenant info to request
      request.tenant = {
        id: tenant.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
      };

      this.logger.log(`✅ Tenant resolved: ${tenant.name} (${tenant.id})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Tenant guard fatal error: ${error.message}`);
      if (error.stack) {
        this.logger.error(error.stack);
      }
      throw new UnauthorizedException(`No valid tenant found: ${error.message}`);
    }
  }
}
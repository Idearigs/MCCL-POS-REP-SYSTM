import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class SubdomainService {
  private readonly logger = new Logger(SubdomainService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Provision a new subdomain for a customer
   * This creates the necessary database and configuration
   */
  async provisionSubdomain(
    profileId: string,
    subdomain: string,
  ): Promise<void> {
    this.logger.log(`Provisioning subdomain: ${subdomain}.truedesk.co.uk`);

    try {
      // Step 1: Create database for customer
      await this.createCustomerDatabase(profileId, subdomain);

      // Step 2: Run migrations on new database
      await this.runMigrations(subdomain);

      // Step 3: Seed initial data
      await this.seedInitialData(profileId, subdomain);

      // Step 4: Update profile status
      await this.prisma.mf_customer_profiles.update({
        where: { id: profileId },
        data: {
          status: 'ACTIVE',
          setupCompletedAt: new Date(),
        },
      });

      // Step 5: Log activity
      await this.prisma.mf_activity_logs.create({
        data: {
          customerProfileId: profileId,
          action: 'subdomain.provisioned',
          description: `Subdomain ${subdomain}.truedesk.co.uk provisioned successfully`,
          actorType: 'system',
        },
      });

      this.logger.log(`Subdomain ${subdomain} provisioned successfully`);
    } catch (error) {
      this.logger.error(`Failed to provision subdomain ${subdomain}:`, error);

      // Update profile with error status
      await this.prisma.mf_customer_profiles.update({
        where: { id: profileId },
        data: {
          internalNotes: `Provisioning failed: ${error.message}`,
        },
      });

      throw error;
    }
  }

  /**
   * Create a new database for the customer
   * In production, this would use database-specific commands
   */
  private async createCustomerDatabase(
    profileId: string,
    subdomain: string,
  ): Promise<void> {
    const databaseName = `truedesk_${subdomain.replace(/-/g, '_')}`;

    this.logger.log(`Creating database: ${databaseName}`);

    // Note: In production, you would execute:
    // CREATE DATABASE truedesk_customername;
    // This requires superuser privileges or a database provisioning service

    // For now, we'll store the connection string for manual provisioning
    // or use a database provisioning API (e.g., AWS RDS, DigitalOcean, etc.)

    const connectionString = this.generateConnectionString(databaseName);

    await this.prisma.mf_customer_profiles.update({
      where: { id: profileId },
      data: {
        databaseName,
        databaseConnectionString: connectionString,
      },
    });
  }

  /**
   * Run Prisma migrations on the new database
   */
  private async runMigrations(subdomain: string): Promise<void> {
    this.logger.log(`Running migrations for ${subdomain}`);

    // In production, you would:
    // 1. Set DATABASE_URL to the new database
    // 2. Run: npx prisma migrate deploy
    // 3. Or use Prisma's programmatic migration API

    // This is typically done via a separate worker process or queue
  }

  /**
   * Seed initial data for the customer
   */
  private async seedInitialData(
    profileId: string,
    subdomain: string,
  ): Promise<void> {
    this.logger.log(`Seeding initial data for ${subdomain}`);

    // In production, you would:
    // 1. Create default categories
    // 2. Create default settings
    // 3. Set up default roles and permissions
    // 4. Create welcome notifications
  }

  /**
   * Generate database connection string
   */
  private generateConnectionString(databaseName: string): string {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'postgres';
    // Note: Password should be encrypted in production
    const password = process.env.DB_PASSWORD || 'password';

    return `postgresql://${user}:${password}@${host}:${port}/${databaseName}?schema=public`;
  }

  /**
   * Validate subdomain availability
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const normalized = subdomain.toLowerCase().trim();

    // Check reserved subdomains
    const reserved = [
      'www',
      'api',
      'admin',
      'app',
      'mail',
      'smtp',
      'ftp',
      'dashboard',
      'portal',
      'help',
      'support',
      'docs',
      'billing',
      'payment',
      'cdn',
      'assets',
      'static',
      'mainframe',
      'truedesk',
      'login',
      'auth',
      'oauth',
    ];

    if (reserved.includes(normalized)) {
      return false;
    }

    // Check if already taken
    const existing = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: normalized },
    });

    return !existing;
  }

  /**
   * Validate subdomain format
   */
  validateSubdomainFormat(subdomain: string): {
    valid: boolean;
    error?: string;
  } {
    const normalized = subdomain.toLowerCase().trim();

    if (normalized.length < 3) {
      return { valid: false, error: 'Subdomain must be at least 3 characters' };
    }

    if (normalized.length > 30) {
      return { valid: false, error: 'Subdomain must be 30 characters or less' };
    }

    const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!regex.test(normalized)) {
      return {
        valid: false,
        error:
          'Subdomain can only contain lowercase letters, numbers, and hyphens',
      };
    }

    if (normalized.includes('--')) {
      return {
        valid: false,
        error: 'Subdomain cannot contain consecutive hyphens',
      };
    }

    return { valid: true };
  }

  /**
   * Suggest available subdomains based on business name
   */
  async suggestSubdomains(businessName: string): Promise<string[]> {
    const base = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);

    const suggestions = [
      base,
      `${base}-pos`,
      `${base}-shop`,
      `${base}1`,
      `${base}2`,
    ];

    const available: string[] = [];

    for (const suggestion of suggestions) {
      if (await this.isSubdomainAvailable(suggestion)) {
        available.push(suggestion);
      }
    }

    return available.slice(0, 3);
  }

  /**
   * Deprovision a subdomain (for deactivation)
   */
  async deprovisionSubdomain(profileId: string): Promise<void> {
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    this.logger.log(`Deprovisioning subdomain: ${profile.subdomain}`);

    // In production, you would:
    // 1. Backup the database
    // 2. Remove DNS entries
    // 3. Archive or delete the database
    // 4. Clean up any associated resources

    await this.prisma.mf_customer_profiles.update({
      where: { id: profileId },
      data: {
        status: 'DEACTIVATED',
      },
    });

    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: profileId,
        action: 'subdomain.deprovisioned',
        description: `Subdomain ${profile.subdomain}.truedesk.co.uk deprovisioned`,
        actorType: 'system',
      },
    });
  }
}

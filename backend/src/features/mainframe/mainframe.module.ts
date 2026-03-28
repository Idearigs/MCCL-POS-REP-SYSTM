import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerProfilesController } from './controllers/customer-profiles.controller';
import { CustomerProfilesService } from './services/customer-profiles.service';
import { CustomerUsersController } from './controllers/customer-users.controller';
import { CustomerUsersService } from './services/customer-users.service';
import { FeaturesController } from './controllers/features.controller';
import { FeaturesService } from './services/features.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { BugReportsController } from './controllers/bug-reports.controller';
import { BugReportsService } from './services/bug-reports.service';
import { FeatureRequestsController } from './controllers/feature-requests.controller';
import { FeatureRequestsService } from './services/feature-requests.service';
import { MainframeAdminsController } from './controllers/mainframe-admins.controller';
import { MainframeAdminsService } from './services/mainframe-admins.service';
import { BackupController } from './controllers/backup.controller';
import { SubdomainService } from './services/subdomain.service';
import { CredentialsExportService } from './services/credentials-export.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    CustomerProfilesController,
    CustomerUsersController,
    FeaturesController,
    SubscriptionsController,
    BugReportsController,
    FeatureRequestsController,
    MainframeAdminsController,
    BackupController,
  ],
  providers: [
    CustomerProfilesService,
    CustomerUsersService,
    FeaturesService,
    SubscriptionsService,
    BugReportsService,
    FeatureRequestsService,
    MainframeAdminsService,
    SubdomainService,
    CredentialsExportService,
  ],
  exports: [
    CustomerProfilesService,
    CustomerUsersService,
    FeaturesService,
    SubscriptionsService,
    SubdomainService,
  ],
})
export class MainframeModule {}

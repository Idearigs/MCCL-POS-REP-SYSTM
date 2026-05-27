import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { LemonSqueezyService } from './services/lemon-squeezy.service';
import { LemonSqueezyWebhookController } from './controllers/lemon-squeezy-webhook.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('MAINFRAME_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    CustomerProfilesController,
    CustomerUsersController,
    FeaturesController,
    SubscriptionsController,
    BugReportsController,
    FeatureRequestsController,
    MainframeAdminsController,
    BackupController,
    LemonSqueezyWebhookController,
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
    LemonSqueezyService,
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

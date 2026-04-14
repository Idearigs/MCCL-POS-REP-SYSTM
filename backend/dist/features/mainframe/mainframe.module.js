"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainframeModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const customer_profiles_controller_1 = require("./controllers/customer-profiles.controller");
const customer_profiles_service_1 = require("./services/customer-profiles.service");
const customer_users_controller_1 = require("./controllers/customer-users.controller");
const customer_users_service_1 = require("./services/customer-users.service");
const features_controller_1 = require("./controllers/features.controller");
const features_service_1 = require("./services/features.service");
const subscriptions_controller_1 = require("./controllers/subscriptions.controller");
const subscriptions_service_1 = require("./services/subscriptions.service");
const bug_reports_controller_1 = require("./controllers/bug-reports.controller");
const bug_reports_service_1 = require("./services/bug-reports.service");
const feature_requests_controller_1 = require("./controllers/feature-requests.controller");
const feature_requests_service_1 = require("./services/feature-requests.service");
const mainframe_admins_controller_1 = require("./controllers/mainframe-admins.controller");
const mainframe_admins_service_1 = require("./services/mainframe-admins.service");
const backup_controller_1 = require("./controllers/backup.controller");
const subdomain_service_1 = require("./services/subdomain.service");
const credentials_export_service_1 = require("./services/credentials-export.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
let MainframeModule = class MainframeModule {
};
exports.MainframeModule = MainframeModule;
exports.MainframeModule = MainframeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('MAINFRAME_JWT_SECRET') || configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '7d' },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [
            customer_profiles_controller_1.CustomerProfilesController,
            customer_users_controller_1.CustomerUsersController,
            features_controller_1.FeaturesController,
            subscriptions_controller_1.SubscriptionsController,
            bug_reports_controller_1.BugReportsController,
            feature_requests_controller_1.FeatureRequestsController,
            mainframe_admins_controller_1.MainframeAdminsController,
            backup_controller_1.BackupController,
        ],
        providers: [
            customer_profiles_service_1.CustomerProfilesService,
            customer_users_service_1.CustomerUsersService,
            features_service_1.FeaturesService,
            subscriptions_service_1.SubscriptionsService,
            bug_reports_service_1.BugReportsService,
            feature_requests_service_1.FeatureRequestsService,
            mainframe_admins_service_1.MainframeAdminsService,
            subdomain_service_1.SubdomainService,
            credentials_export_service_1.CredentialsExportService,
        ],
        exports: [
            customer_profiles_service_1.CustomerProfilesService,
            customer_users_service_1.CustomerUsersService,
            features_service_1.FeaturesService,
            subscriptions_service_1.SubscriptionsService,
            subdomain_service_1.SubdomainService,
        ],
    })
], MainframeModule);
//# sourceMappingURL=mainframe.module.js.map
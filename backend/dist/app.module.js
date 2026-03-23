"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_manager_redis_store_1 = require("cache-manager-redis-store");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const core_1 = require("./core");
const features_1 = require("./features");
const calendar_events_module_1 = require("./features/calendar-events/calendar-events.module");
const stock_taking_module_1 = require("./features/stock-taking/stock-taking.module");
const float_module_1 = require("./features/float/float.module");
const petty_cash_module_1 = require("./features/petty-cash/petty-cash.module");
const shifts_module_1 = require("./features/shifts/shifts.module");
const financial_intelligence_module_1 = require("./features/financial-intelligence/financial-intelligence.module");
const chatbot_module_1 = require("./features/chatbot/chatbot.module");
const mainframe_module_1 = require("./features/mainframe/mainframe.module");
const tasks_module_1 = require("./features/tasks/tasks.module");
const integrations_1 = require("./integrations");
const openai_module_1 = require("./integrations/openai/openai.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 500,
                },
            ]),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: async () => {
                    try {
                        const store = await (0, cache_manager_redis_store_1.redisStore)({
                            socket: {
                                host: process.env.REDIS_HOST || 'localhost',
                                port: parseInt(process.env.REDIS_PORT || '6379'),
                            },
                            password: process.env.REDIS_PASSWORD,
                            database: parseInt(process.env.REDIS_DB || '0'),
                        });
                        console.log('✅ Connected to Redis cache');
                        return {
                            store: store,
                            ttl: 300000,
                        };
                    }
                    catch (error) {
                        console.warn('⚠️  Redis connection failed, using in-memory cache:', error.message);
                        return {
                            store: 'memory',
                            max: 1000,
                            ttl: 300000,
                        };
                    }
                },
            }),
            core_1.PrismaModule,
            integrations_1.GoogleDriveModule,
            integrations_1.FileStorageModule,
            integrations_1.SmsModule,
            openai_module_1.OpenAIModule,
            features_1.AuthModule,
            features_1.CustomersModule,
            features_1.ProductsModule,
            features_1.SalesModule,
            features_1.RepairsModule,
            calendar_events_module_1.CalendarEventsModule,
            stock_taking_module_1.StockTakingModule,
            float_module_1.FloatModule,
            petty_cash_module_1.PettyCashModule,
            shifts_module_1.ShiftsModule,
            financial_intelligence_module_1.FinancialIntelligenceModule,
            chatbot_module_1.ChatbotModule,
            mainframe_module_1.MainframeModule,
            tasks_module_1.TasksModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, core_1.CacheService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { buildThrottlerOptions } from './core/throttler/throttler.factory';
import { GlobalThrottlerGuard } from './core/throttler/global-throttler.guard';
import { QueueModule } from './core/queue/queue.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Core infrastructure
import { PrismaModule, CacheService, HealthService } from './core';

// Business features
import {
  AuthModule,
  CustomersModule,
  ProductsModule,
  SalesModule,
  RepairsModule,
} from './features';
import { CalendarEventsModule } from './features/calendar-events/calendar-events.module';
import { PosTilesModule } from './features/pos-tiles/pos-tiles.module';
import { StockTakingModule } from './features/stock-taking/stock-taking.module';
import { FloatModule } from './features/float/float.module';
import { PettyCashModule } from './features/petty-cash/petty-cash.module';
import { ShiftsModule } from './features/shifts/shifts.module';
import { FinancialIntelligenceModule } from './features/financial-intelligence/financial-intelligence.module';
import { ChatbotModule } from './features/chatbot/chatbot.module';
import { MainframeModule } from './features/mainframe/mainframe.module';
import { TasksModule } from './features/tasks/tasks.module';
import { HrmsModule } from './features/hrms/hrms.module';
import { OutletsModule } from './features/outlets/outlets.module';
import { SettingsModule } from './features/settings/settings.module';
import { GiftCardsModule } from './features/gift-cards/gift-cards.module';
import { MetalsModule } from './features/metals/metals.module';
import { GoldPricingModule } from './features/inventory/gold-pricing.module';

// External integrations
import {
  GoogleDriveModule,
  FileStorageModule,
  SmsModule,
} from './integrations';
import { OpenAIModule } from './integrations/openai/openai.module';

@Module({
  imports: [
    // Cron scheduling (daily gold repricing, etc.)
    ScheduleModule.forRoot(),
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Throttling/Rate limiting — Redis-backed with graceful in-memory fallback.
    // Global tier: 100 req/min/IP. Stricter 'auth' tier (5/15min) applied to
    // credential routes via @Throttle({ auth: {} }).
    ThrottlerModule.forRootAsync({
      useFactory: buildThrottlerOptions,
    }),

    // Redis Cache Module
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const logger = new Logger('AppModule');
        const isProduction = process.env.NODE_ENV === 'production';
        try {
          // Try to connect to Redis — prefer REDIS_URL, fall back to host/port/password
          const redisConfig = process.env.REDIS_URL
            ? { url: process.env.REDIS_URL }
            : {
                socket: {
                  host: process.env.REDIS_HOST || 'localhost',
                  port: parseInt(process.env.REDIS_PORT || '6379'),
                },
                password: process.env.REDIS_PASSWORD,
                database: parseInt(process.env.REDIS_DB || '0'),
              };
          const store = await redisStore(redisConfig);

          logger.log('✅ Connected to Redis cache');
          return {
            store: store as any,
            ttl: 300000, // 5 minutes in milliseconds
          };
        } catch (error) {
          if (isProduction) {
            logger.error(
              `❌ Redis required in production but unavailable: ${(error as Error).message}`,
            );
            throw error;
          }
          logger.warn(
            `⚠️  Redis unavailable, using in-memory cache (dev only): ${(error as Error).message}`,
          );
          return {
            store: 'memory',
            max: 1000,
            ttl: 300000, // 5 minutes in milliseconds
          };
        }
      },
    }),

    // Core modules
    QueueModule,
    PrismaModule,
    GoogleDriveModule,
    FileStorageModule,
    SmsModule,
    OpenAIModule,
    AuthModule,
    // UsersModule,
    CustomersModule,
    ProductsModule,
    SalesModule,
    RepairsModule,
    CalendarEventsModule,
    PosTilesModule,
    StockTakingModule,
    FloatModule,
    PettyCashModule,
    ShiftsModule,
    FinancialIntelligenceModule,
    ChatbotModule,
    MainframeModule,
    TasksModule,
    HrmsModule,
    OutletsModule,
    SettingsModule,
    GiftCardsModule,
    MetalsModule,
    GoldPricingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService,
    HealthService,
    // Global rate limiter — applies the 100/min tier to every route and returns
    // a clean JSON 429 on breach. Replaces the per-controller ThrottlerGuard.
    { provide: APP_GUARD, useClass: GlobalThrottlerGuard },
  ],
})
export class AppModule {}

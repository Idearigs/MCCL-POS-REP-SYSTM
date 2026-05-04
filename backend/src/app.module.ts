import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Core infrastructure
import { PrismaModule, CacheService } from './core';

// Business features
import {
  AuthModule,
  CustomersModule,
  ProductsModule,
  SalesModule,
  RepairsModule,
} from './features';
import { CalendarEventsModule } from './features/calendar-events/calendar-events.module';
import { StockTakingModule } from './features/stock-taking/stock-taking.module';
import { FloatModule } from './features/float/float.module';
import { PettyCashModule } from './features/petty-cash/petty-cash.module';
import { ShiftsModule } from './features/shifts/shifts.module';
import { FinancialIntelligenceModule } from './features/financial-intelligence/financial-intelligence.module';
import { ChatbotModule } from './features/chatbot/chatbot.module';
import { MainframeModule } from './features/mainframe/mainframe.module';
import { TasksModule } from './features/tasks/tasks.module';
import { HrmsModule } from './features/hrms/hrms.module';

// External integrations
import {
  GoogleDriveModule,
  FileStorageModule,
  SmsModule,
} from './integrations';
import { OpenAIModule } from './integrations/openai/openai.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Throttling/Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 500, // 500 requests per minute per IP
      },
    ]),

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
    StockTakingModule,
    FloatModule,
    PettyCashModule,
    ShiftsModule,
    FinancialIntelligenceModule,
    ChatbotModule,
    MainframeModule,
    TasksModule,
    HrmsModule,
  ],
  controllers: [AppController],
  providers: [AppService, CacheService],
})
export class AppModule {}

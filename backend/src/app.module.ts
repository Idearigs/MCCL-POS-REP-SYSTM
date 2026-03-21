import { Module } from '@nestjs/common';
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
  RepairsModule
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
// import { ExternalRepairersModule } from './features/external-repairers/external-repairers.module'; // TODO: Enable after running Prisma migrations

// External integrations
import {
  GoogleDriveModule,
  FileStorageModule,
  SmsModule
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
        limit: 100, // 100 requests per minute per IP
      },
    ]),

    // Redis Cache Module
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        try {
          // Try to connect to Redis
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DB || '0'),
          });
          
          console.log('✅ Connected to Redis cache');
          return { 
            store: store as any,
            ttl: 300000, // 5 minutes in milliseconds
          };
        } catch (error) {
          console.warn('⚠️  Redis connection failed, using in-memory cache:', (error as Error).message);
          // Fallback to in-memory cache
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
    // ExternalRepairersModule, // TODO: Enable after running Prisma migrations
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService,
  ],
})
export class AppModule {}

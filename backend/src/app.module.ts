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

// External integrations
import { 
  GoogleDriveModule, 
  FileStorageModule, 
  SmsModule 
} from './integrations';

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
          console.warn('⚠️  Redis connection failed, using in-memory cache:', error.message);
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
    AuthModule,
    // UsersModule,
    CustomersModule,
    ProductsModule,
    SalesModule,
    RepairsModule,
    CalendarEventsModule,
    StockTakingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService,
  ],
})
export class AppModule {}

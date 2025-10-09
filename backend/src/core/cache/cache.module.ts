import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isRedisEnabled = 
          configService.get('REDIS_HOST') && 
          configService.get('REDIS_PORT');

        if (isRedisEnabled) {
          return {
            store: redisStore,
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            ttl: 60 * 60, // 1 hour default TTL
            max: 1000, // maximum number of items in cache
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3,
          };
        } else {
          // Fallback to in-memory cache
          console.warn('⚠️  Redis not configured, using in-memory cache');
          return {
            ttl: 60 * 60,
            max: 1000,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, CacheModule],
})
export class CacheServiceModule {}
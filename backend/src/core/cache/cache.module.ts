import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const redisStore = require('cache-manager-redis-store') as object;
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],

      useFactory: (configService: ConfigService): Record<string, unknown> => {
        const isRedisEnabled =
          configService.get('REDIS_HOST') && configService.get('REDIS_PORT');

        if (isRedisEnabled) {
          return {
            store: redisStore,
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            ttl: 60 * 60,
            max: 1000,
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

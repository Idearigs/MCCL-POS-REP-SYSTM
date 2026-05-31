import { Logger } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

/**
 * Single global throttler tier — applied to every route by the global
 * ThrottlerGuard at 100 req/min/IP. Stricter routes (e.g. login) OVERRIDE
 * this named tier per-handler with @Throttle({ global: { limit, ttl } }).
 * (In throttler v6 every named tier applies to every route, so we keep one
 * tier and override it where needed rather than declaring extra global tiers.)
 */
export const AUTH_THROTTLE = { limit: 5, ttl: 15 * 60_000 };
export const THROTTLER_TIERS = [{ name: 'global', ttl: 60_000, limit: 100 }];

/**
 * Builds ThrottlerModule options. Uses a Redis-backed store when a Redis
 * instance is reachable (correct across multiple app instances); otherwise
 * falls back to the throttler's built-in in-memory store. Never throws on a
 * missing/unreachable Redis — degradation is graceful per the guardrails.
 */
export async function buildThrottlerOptions(): Promise<ThrottlerModuleOptions> {
  const logger = new Logger('ThrottlerFactory');
  const base: ThrottlerModuleOptions = { throttlers: THROTTLER_TIERS };

  const hasRedisEnv = !!process.env.REDIS_URL || !!process.env.REDIS_HOST;
  if (!hasRedisEnv) {
    logger.warn('⚠️  No Redis env — rate limiter using in-memory store');
    return base;
  }

  // Probe Redis with a short, non-blocking connection attempt.
  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

  try {
    await client.connect();
    await client.ping();
    logger.log('✅ Rate limiter using Redis-backed store');
    return {
      ...base,
      storage: new ThrottlerStorageRedisService(client),
    };
  } catch (err) {
    logger.warn(
      `⚠️  Redis unreachable for rate limiter (${(err as Error).message}) — falling back to in-memory store`,
    );
    // Tidy up the dangling client so it doesn't keep retrying in the background.
    client.disconnect();
    return base;
  }
}

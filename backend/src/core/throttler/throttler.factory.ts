import { Logger } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

/**
 * Single global throttler tier — applied to every route by the global
 * ThrottlerGuard. Stricter routes (e.g. login) OVERRIDE this named tier
 * per-handler with @Throttle({ global: { limit, ttl } }).
 * (In throttler v6 every named tier applies to every route, so we keep one
 * tier and override it where needed rather than declaring extra global tiers.)
 *
 * The limit is PER USER for authenticated traffic (GlobalThrottlerGuard keys on
 * the JWT subject), not per IP — so a busy shop where several tills share one
 * public IP is not collectively throttled. 300/min ≈ 5 req/s per cashier, ample
 * for browsing inventory + ringing sales. Anonymous traffic still keys per IP.
 */
export const THROTTLER_TIERS = [{ name: 'global', ttl: 60_000, limit: 300 }];

/**
 * Credential-endpoint throttle (login, PIN unlock). Deliberately NOT a long
 * lockout: a cashier who mistypes during a rush must never be stalled. 15
 * attempts / 3 min per IP still starves a brute-force bot (~300/hr against an
 * unknown password) while comfortably absorbing a multi-till morning + typos.
 * PIN brute-force is separately bounded by the per-device server-side lockout.
 */
export const AUTH_THROTTLE = { limit: 15, ttl: 3 * 60_000 };

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

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

export interface ComponentHealth {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

/**
 * Real readiness check: actually exercises the database and the cache/Redis layer
 * rather than just returning "ok". This is what makes Coolify container
 * healthchecks and external uptime monitors truthful — if the DB is down, /health
 * reports `degraded` (HTTP 503) instead of falsely claiming the app is healthy.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status =
      database.status === 'up' && redis.status === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Database health check failed: ${message}`);
      return { status: 'down', latencyMs: Date.now() - start, error: message };
    }
  }

  /**
   * Round-trips a value through the cache. In production this is Redis (required
   * at startup); in dev it may be the in-memory fallback — either way this
   * confirms the active cache layer is serving reads and writes.
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    const key = '__health__:ping';
    try {
      await this.cache.set(key, '1', 5000);
      const value = await this.cache.get<string>(key);
      if (value !== '1') {
        throw new Error('cache round-trip returned unexpected value');
      }
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Redis/cache health check failed: ${message}`);
      return { status: 'down', latencyMs: Date.now() - start, error: message };
    }
  }
}

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { HealthService, type HealthCheckResult } from './core';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Readiness probe. Actually checks the database + cache and returns HTTP 503
   * when degraded — use this for uptime monitors and alerting so a broken DB
   * does NOT report as healthy.
   */
  @Get('health')
  async health(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    res.status(
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );
    return result;
  }

  /**
   * Liveness probe — intentionally shallow (is the process up?). Use this for the
   * container healthcheck so a transient DB outage doesn't trigger restart loops
   * (restarting the app can't fix a downstream dependency).
   */
  @Get('health/live')
  live(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

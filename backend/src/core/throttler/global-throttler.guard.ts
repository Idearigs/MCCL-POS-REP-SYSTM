import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

/**
 * Global rate-limit guard. Extends the stock ThrottlerGuard to:
 *   1. Track authenticated requests PER USER (JWT subject) instead of per IP,
 *      so several tills sharing one shop IP each get their own budget.
 *   2. Return a clean JSON 429 body instead of the default plain-text error.
 * Registered once as an APP_GUARD so it applies to every route.
 */
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  /**
   * Rate-limit key: the JWT subject for authenticated requests, else the IP.
   *
   * The token is read straight from the Authorization header (not verified) —
   * this runs before the auth guard, so `req.user` isn't populated yet. That is
   * safe for metering: a forged/invalid token still fails the route's real auth
   * guard (401); the worst an attacker gains is being metered under a bucket
   * they invented, which grants no access. Anonymous traffic falls back to IP.
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    const auth: unknown = req?.headers?.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      try {
        const part = auth.slice(7).split('.')[1];
        const json = Buffer.from(part, 'base64').toString('utf8');
        const payload = JSON.parse(json) as { sub?: string };
        if (payload?.sub) return Promise.resolve(`user:${payload.sub}`);
      } catch {
        // Malformed token — fall through to IP-based tracking.
      }
    }
    const ip: unknown = req?.ip ?? req?.ips?.[0];
    return Promise.resolve(`ip:${typeof ip === 'string' ? ip : 'unknown'}`);
  }

  protected throwThrottlingException(
    _context: ExecutionContext,
    _detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message:
          'Rate limit exceeded. Please slow down and try again in a moment.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

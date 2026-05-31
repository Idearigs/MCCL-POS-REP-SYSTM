import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

/**
 * Global rate-limit guard. Extends the stock ThrottlerGuard to return a clean,
 * consistent JSON body (HTTP 429) instead of the default plain-text exception.
 * Registered once as an APP_GUARD so it applies to every route.
 */
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
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

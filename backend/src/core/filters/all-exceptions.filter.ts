import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Catches every unhandled exception so nothing leaks raw stack traces to clients
 * and every server-side failure is logged consistently and reported to Sentry.
 *
 * Design notes:
 * - 4xx (HttpException): the original response body is preserved (additive only —
 *   we just append `timestamp` + `path`), so existing API error contracts are not
 *   broken. Logged at WARN, not reported to Sentry (they're client errors).
 * - 5xx / unknown errors: a generic body is returned (no internal details leaked),
 *   the full stack is logged at ERROR, and the exception is sent to Sentry.
 *
 * Sentry.captureException is a safe no-op when Sentry was not initialised
 * (i.e. when SENTRY_DSN is unset), so this filter works in every environment.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const timestamp = new Date().toISOString();
    const path = request.url;

    let body: Record<string, unknown>;
    if (isHttp) {
      const res = exception.getResponse();
      body =
        typeof res === 'string'
          ? { statusCode: status, message: res }
          : { ...(res as Record<string, unknown>) };
    } else {
      // Never expose internal error details to the client.
      body = { statusCode: status, message: 'Internal server error' };
    }
    body.timestamp = timestamp;
    body.path = path;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${path} -> ${status}: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
      Sentry.captureException(exception, {
        tags: { path, method: request.method },
      });
    } else {
      this.logger.warn(`${request.method} ${path} -> ${status}`);
    }

    response.status(status).json(body);
  }
}

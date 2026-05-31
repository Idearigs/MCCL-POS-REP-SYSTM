/**
 * Sentry initialisation. Imported as the VERY FIRST line of main.ts so it runs
 * before the app handles any request.
 *
 * It is intentionally a no-op when SENTRY_DSN is not set, so this code ships
 * safely to every environment and "switches on" the moment a DSN is provided
 * (e.g. add SENTRY_DSN in Coolify). Nothing else in the app needs to change.
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Keep performance tracing modest by default to control cost/quota.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: process.env.SENTRY_RELEASE,
  });

  console.log('✅ Sentry error tracking initialised');
}

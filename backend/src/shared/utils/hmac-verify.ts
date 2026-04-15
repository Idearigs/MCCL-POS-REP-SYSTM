import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify an HMAC-SHA256 internal-request signature.
 *
 * Scheme:  HMAC-SHA256(INTERNAL_API_KEY, "{timestamp}:{body}")
 *
 * Throws UnauthorizedException on any failure so callers can just `verifyInternalHmac(...)`.
 *
 * @param signature  Value of x-internal-signature header (hex)
 * @param timestamp  Value of x-internal-timestamp header (unix ms string)
 * @param body       Raw request body string; pass "" for requests with no body
 */
export function verifyInternalHmac(
  signature: string | undefined,
  timestamp: string | undefined,
  body: string,
): void {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret) {
    throw new UnauthorizedException('Internal API key not configured');
  }

  if (!signature || !timestamp) {
    throw new UnauthorizedException('Missing internal auth headers');
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
    throw new UnauthorizedException('Request timestamp out of range');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${body}`)
    .digest();

  let received: Buffer;
  try {
    received = Buffer.from(signature, 'hex');
  } catch {
    throw new UnauthorizedException('Invalid signature format');
  }

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    throw new UnauthorizedException('Invalid internal signature');
  }
}

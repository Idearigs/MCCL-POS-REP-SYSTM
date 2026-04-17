import crypto from 'crypto';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Verify an HMAC-SHA256 internal-request signature (POS → Mainframe direction).
 *
 * Scheme:  HMAC-SHA256(INTERNAL_API_KEY, "{timestamp}:{body}")
 *
 * Throws on any verification failure — caller should respond 401.
 */
export function verifyInternalHmac(
  signature: string | undefined,
  timestamp: string | undefined,
  body: string,
): void {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret) throw new Error('INTERNAL_API_KEY env var is not set');
  if (!signature || !timestamp) throw new Error('Missing internal auth headers');

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
    throw new Error('Request timestamp out of range');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${body}`)
    .digest();

  const received = Buffer.from(signature, 'hex');

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error('Invalid internal signature');
  }
}

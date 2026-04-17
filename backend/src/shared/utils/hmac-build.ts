import * as crypto from 'crypto';

/**
 * Build HMAC-SHA256 request headers for internal POS → Mainframe calls.
 *
 * Scheme:  HMAC-SHA256(INTERNAL_API_KEY, "{timestamp}:{body}")
 *
 * @param body  Serialized request body string. Pass "" for GET requests.
 */
export function buildHmacHeaders(body: string): {
  'x-internal-timestamp': string;
  'x-internal-signature': string;
} {
  const secret = process.env.INTERNAL_API_KEY;
  if (!secret) throw new Error('INTERNAL_API_KEY env var is not set');
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${body}`)
    .digest('hex');
  return { 'x-internal-timestamp': timestamp, 'x-internal-signature': signature };
}

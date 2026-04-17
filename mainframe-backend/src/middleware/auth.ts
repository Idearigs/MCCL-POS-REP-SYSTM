import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyInternalHmac } from '../lib/hmac-verify';

const JWT_SECRET = process.env.JWT_SECRET || 'mainframe-jwt-secret-change-in-production';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/** Accepts either a mainframe JWT or an HMAC-signed internal request.
 *  Used for endpoints that the POS backend calls on behalf of tenants. */
export function requireAuthOrInternalKey(
  req: Request & { rawBody?: string },
  res: Response,
  next: NextFunction,
) {
  const signature = req.headers['x-internal-signature'] as string | undefined;
  const timestamp = req.headers['x-internal-timestamp'] as string | undefined;

  if (signature && timestamp) {
    try {
      verifyInternalHmac(signature, timestamp, req.rawBody ?? '');
      return next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  // Mainframe JWT path (admin UI)
  return requireAuth(req, res, next);
}

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

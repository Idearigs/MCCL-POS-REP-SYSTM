import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mainframe-jwt-secret-change-in-production';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'local-dev-internal-key';

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

/** Accepts either a mainframe JWT or the shared internal API key.
 *  Used for endpoints that the POS backend calls on behalf of tenants. */
export function requireAuthOrInternalKey(req: Request, res: Response, next: NextFunction) {
  // Internal key path (server-to-server)
  const internalKey = req.headers['x-internal-key'];
  if (internalKey === INTERNAL_API_KEY) return next();

  // Mainframe JWT path (admin UI)
  return requireAuth(req, res, next);
}

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

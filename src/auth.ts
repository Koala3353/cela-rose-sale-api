import { OAuth2Client } from 'google-auth-library';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Initialize OAuth2 client for token verification
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-change-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Verify a Google ID token and return the user payload
 */
export async function verifyGoogleToken(idToken: string): Promise<SessionUser> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured');
  }

  const ticket = await oAuth2Client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid token payload');
  }

  return {
    id: payload.sub || '',
    email: payload.email || '',
    name: payload.name || '',
    picture: payload.picture,
  };
}

/**
 * Create a JWT for a user
 */
export function createJwtToken(user: SessionUser): string {
  // jwt types in v9 are strict; cast to any for simplicity here
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name } as any, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN as any } as any);
  return token;
}

/**
 * Verify a JWT and return the payload as SessionUser
 */
export function verifyJwtToken(token?: string): SessionUser | null {
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    return { id: payload.id, email: payload.email, name: payload.name, picture: payload.picture };
  } catch (err) {
    return null;
  }
}

/**
 * Middleware to require auth via Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const user = verifyJwtToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  (req as any).user = user;
  next();
}

/**
 * Optional auth middleware - attaches user if present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const user = verifyJwtToken(token);
  if (user) (req as any).user = user;
  next();
}

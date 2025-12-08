import { OAuth2Client } from 'google-auth-library';
import { Request, Response, NextFunction } from 'express';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Initialize OAuth2 client for token verification
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    id: payload.sub,
    email: payload.email || '',
    name: payload.name || '',
    picture: payload.picture,
  };
}

/**
 * Middleware to require authentication
 * Attaches req.user if session is valid
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  console.log('[Auth] requireAuth check - session user:', req.session?.user?.email || 'none');
  
  if (!req.session?.user) {
    console.log('[Auth] No session - rejecting request');
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // Attach user to request for convenience
  (req as any).user = req.session.user;
  next();
}

/**
 * Optional auth middleware - attaches user if present but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.user) {
    (req as any).user = req.session.user;
  }
  next();
}

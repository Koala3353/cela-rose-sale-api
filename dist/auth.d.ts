import { Request, Response, NextFunction } from 'express';
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
/**
 * Verify a Google ID token and return the user payload
 */
export declare function verifyGoogleToken(idToken: string): Promise<SessionUser>;
/**
 * Middleware to require authentication
 * Attaches req.user if session is valid
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional auth middleware - attaches user if present but doesn't require it
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
import { Request, Response, NextFunction } from 'express';
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
 * Create a JWT for a user
 */
export declare function createJwtToken(user: SessionUser): string;
/**
 * Verify a JWT and return the payload as SessionUser
 */
export declare function verifyJwtToken(token?: string): SessionUser | null;
/**
 * Middleware to require auth via Authorization: Bearer <token>
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional auth middleware - attaches user if present
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
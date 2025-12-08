"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = verifyGoogleToken;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const google_auth_library_1 = require("google-auth-library");
// Initialize OAuth2 client for token verification
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const oAuth2Client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
/**
 * Verify a Google ID token and return the user payload
 */
async function verifyGoogleToken(idToken) {
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
function requireAuth(req, res, next) {
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
    req.user = req.session.user;
    next();
}
/**
 * Optional auth middleware - attaches user if present but doesn't require it
 */
function optionalAuth(req, res, next) {
    if (req.session?.user) {
        req.user = req.session.user;
    }
    next();
}
//# sourceMappingURL=auth.js.map
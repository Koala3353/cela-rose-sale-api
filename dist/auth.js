"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = verifyGoogleToken;
exports.createJwtToken = createJwtToken;
exports.verifyJwtToken = verifyJwtToken;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Initialize OAuth2 client for token verification
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const oAuth2Client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-change-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
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
        id: payload.sub || '',
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
    };
}
/**
 * Create a JWT for a user
 */
function createJwtToken(user) {
    // jwt types in v9 are strict; cast to any for simplicity here
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return token;
}
/**
 * Verify a JWT and return the payload as SessionUser
 */
function verifyJwtToken(token) {
    if (!token)
        return null;
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return { id: payload.id, email: payload.email, name: payload.name, picture: payload.picture };
    }
    catch (err) {
        return null;
    }
}
/**
 * Middleware to require auth via Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const user = verifyJwtToken(token);
    if (!user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
    }
    req.user = user;
    next();
}
/**
 * Optional auth middleware - attaches user if present
 */
function optionalAuth(req, res, next) {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const user = verifyJwtToken(token);
    if (user)
        req.user = user;
    next();
}
//# sourceMappingURL=auth.js.map
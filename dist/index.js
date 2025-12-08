"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const ioredis_1 = __importDefault(require("ioredis"));
const connect_redis_1 = require("connect-redis");
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
// Load environment variables as early as possible so modules that import
// environment-dependent values (like `cache` or `sheets`) receive them.
dotenv_1.default.config();
const cache_1 = require("./cache");
const sheets_1 = require("./sheets");
const auth_1 = require("./auth");
const analytics_1 = require("./analytics");
// Configure multer for file uploads (store in memory)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// When running behind a proxy (like Vercel), trust the first proxy so
// secure cookies and protocol detection work correctly.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
// Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const PRODUCTS_SHEET_NAME = process.env.PRODUCTS_SHEET_NAME || 'Products';
const ORDERS_SHEET_NAME = process.env.ORDERS_SHEET_NAME || 'Orders';
// Parse allowed origins - include GitHub Pages by default
const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://koala3353.github.io'
];
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || defaultOrigins;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Ensure preflight OPTIONS requests are handled for all routes. This helps
// avoid some "CORS request did not succeed" cases when a proxy or CDN
// otherwise interferes with preflight. We reuse the same origin checker.
app.options('*', (req, res) => {
    const origin = req.header('Origin') || '';
    if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendStatus(204);
    }
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.sendStatus(204);
    }
    console.log(`[CORS] Blocked preflight origin: ${origin}`);
    return res.sendStatus(403);
});
// Session middleware for cookie-based auth
const SESSION_SECRET = process.env.SESSION_SECRET || 'rose-sale-dev-secret-change-in-production';
const redisClient = new ioredis_1.default(process.env.REDIS_URL);
app.use((0, express_session_1.default)({
    store: new connect_redis_1.RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    name: 'rose_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// Cache keys
const CACHE_KEY_PRODUCTS = 'products';
const CACHE_KEY_FILTERS = 'filters';
/**
 * Fetch products from Google Sheets
 */
async function getProductsFromSheet() {
    const rawData = await (0, sheets_1.fetchSheetData)(GOOGLE_SHEET_ID, PRODUCTS_SHEET_NAME, GOOGLE_API_KEY);
    const products = (0, sheets_1.parseProductsData)(rawData);
    // Filter out unavailable products
    return products.filter(p => p.available !== false);
}
/**
 * Initialize cache with auto-refresh
 */
async function initializeCache() {
    console.log('[Server] Initializing cache...');
    try {
        // Fetch initial data
        const products = await getProductsFromSheet();
        cache_1.cache.set(CACHE_KEY_PRODUCTS, products);
        const filters = (0, sheets_1.extractFilterOptions)(products);
        cache_1.cache.set(CACHE_KEY_FILTERS, filters);
        // Setup auto-refresh for products
        cache_1.cache.setupAutoRefresh(CACHE_KEY_PRODUCTS, async () => {
            const newProducts = await getProductsFromSheet();
            // Also update filters when products refresh
            const newFilters = (0, sheets_1.extractFilterOptions)(newProducts);
            cache_1.cache.set(CACHE_KEY_FILTERS, newFilters);
            return newProducts;
        });
        console.log('[Server] Cache initialized successfully');
    }
    catch (error) {
        console.error('[Server] Failed to initialize cache:', error);
        console.log('[Server] API will attempt to fetch on first request');
    }
}
// ============== ROUTES ==============
/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const stats = cache_1.cache.getStats();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cache: stats
    });
});
// ============== AUTH ROUTES ==============
/**
 * POST /api/auth/google
 * Verify Google ID token and create session
 */
app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: 'Missing idToken in request body',
            });
        }
        // Verify the token with Google
        const user = await (0, auth_1.verifyGoogleToken)(idToken);
        // Store user in session
        req.session.user = user;
        // Track session in analytics
        (0, analytics_1.trackSession)(user.id);
        console.log('[Auth] User logged in:', user.email);
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    photoUrl: user.picture,
                },
            },
        });
    }
    catch (error) {
        console.error('[Auth] Google login failed:', error.message);
        res.status(401).json({
            success: false,
            error: 'Invalid Google token',
        });
    }
});
/**
 * POST /api/auth/logout
 * Destroy session and clear cookie
 */
app.post('/api/auth/logout', (req, res) => {
    const email = req.session?.user?.email;
    req.session.destroy((err) => {
        if (err) {
            console.error('[Auth] Logout error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to logout',
            });
        }
        res.clearCookie('rose_session');
        console.log('[Auth] User logged out:', email);
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    });
});
/**
 * GET /api/auth/me
 * Get current user from session
 */
app.get('/api/auth/me', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated',
        });
    }
    res.json({
        success: true,
        data: {
            user: {
                id: req.session.user.id,
                email: req.session.user.email,
                name: req.session.user.name,
                photoUrl: req.session.user.picture,
            },
        },
    });
});
/**
 * GET /api/products
 * Returns all available products with caching
 */
app.get('/api/products', async (req, res) => {
    try {
        const cached = cache_1.cache.get(CACHE_KEY_PRODUCTS);
        if (cached) {
            const response = {
                success: true,
                data: cached.data,
                cached: true,
                cacheAge: cache_1.cache.getAge(CACHE_KEY_PRODUCTS) || 0
            };
            return res.json(response);
        }
        // Cache miss - fetch from sheet
        const products = await getProductsFromSheet();
        cache_1.cache.set(CACHE_KEY_PRODUCTS, products);
        // Also cache filters
        const filters = (0, sheets_1.extractFilterOptions)(products);
        cache_1.cache.set(CACHE_KEY_FILTERS, filters);
        const response = {
            success: true,
            data: products,
            cached: false
        };
        res.json(response);
    }
    catch (error) {
        console.error('[API] Error fetching products:', error);
        // Try to return stale cache if available
        const stale = cache_1.cache.get(CACHE_KEY_PRODUCTS);
        if (stale) {
            const response = {
                success: true,
                data: stale.data,
                cached: true,
                cacheAge: cache_1.cache.getAge(CACHE_KEY_PRODUCTS) || 0,
                error: 'Serving stale data due to fetch error'
            };
            return res.json(response);
        }
        const response = {
            success: false,
            error: error.message || 'Failed to fetch products'
        };
        res.status(500).json(response);
    }
});
/**
 * GET /api/filters
 * Returns available filter options (categories, tags, price range)
 */
app.get('/api/filters', async (req, res) => {
    try {
        const cached = cache_1.cache.get(CACHE_KEY_FILTERS);
        if (cached) {
            const response = {
                success: true,
                data: cached.data,
                cached: true,
                cacheAge: cache_1.cache.getAge(CACHE_KEY_FILTERS) || 0
            };
            return res.json(response);
        }
        // Need to fetch products first to extract filters
        const productsCached = cache_1.cache.get(CACHE_KEY_PRODUCTS);
        let products;
        if (productsCached) {
            products = productsCached.data;
        }
        else {
            products = await getProductsFromSheet();
            cache_1.cache.set(CACHE_KEY_PRODUCTS, products);
        }
        const filters = (0, sheets_1.extractFilterOptions)(products);
        cache_1.cache.set(CACHE_KEY_FILTERS, filters);
        const response = {
            success: true,
            data: filters,
            cached: false
        };
        res.json(response);
    }
    catch (error) {
        console.error('[API] Error fetching filters:', error);
        const response = {
            success: false,
            error: error.message || 'Failed to fetch filters'
        };
        res.status(500).json(response);
    }
});
/**
 * POST /api/refresh
 * Force refresh the cache
 */
app.post('/api/refresh', async (req, res) => {
    try {
        const products = await cache_1.cache.forceRefresh(CACHE_KEY_PRODUCTS);
        if (products) {
            const filters = (0, sheets_1.extractFilterOptions)(products);
            cache_1.cache.set(CACHE_KEY_FILTERS, filters);
        }
        res.json({
            success: true,
            message: 'Cache refreshed successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[API] Error refreshing cache:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to refresh cache'
        });
    }
});
/**
 * POST /api/orders
 * Submit a new order (requires authentication)
 * Accepts multipart/form-data with orderData (JSON) and optional paymentProof (image)
 */
app.post('/api/orders', upload.single('paymentProof'), auth_1.requireAuth, async (req, res) => {
    try {
        // Parse order data from form field
        let order;
        try {
            order = JSON.parse(req.body.orderData || '{}');
        }
        catch {
            // Fallback to direct body parsing for JSON requests
            order = req.body;
        }
        const sessionUser = req.user;
        const uploadedFile = req.file;
        console.log('[API] Processing order for user:', sessionUser.email);
        if (uploadedFile) {
            console.log('[API] Payment proof received:', uploadedFile.originalname, uploadedFile.size, 'bytes');
        }
        // Use session user email if not provided
        const email = order.email || sessionUser.email;
        const purchaserName = order.purchaserName || sessionUser.name;
        // Validate required fields
        if (!email || !purchaserName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email and purchaserName'
            });
        }
        // Generate order ID
        const orderId = 'ORD-' + Math.random().toString(36).substring(2, 11).toUpperCase();
        const timestamp = new Date().toISOString();
        // Upload payment proof to Google Drive if provided
        let paymentProofLink = '';
        if (uploadedFile) {
            try {
                const fileName = `${orderId}_payment_${Date.now()}_${uploadedFile.originalname}`;
                paymentProofLink = await (0, sheets_1.uploadFileToDrive)(uploadedFile.buffer, fileName, uploadedFile.mimetype);
            }
            catch (uploadError) {
                console.error('[API] Failed to upload payment proof:', uploadError.message);
                // Continue without the link
            }
        }
        // Build the row to append to the orders sheet
        // Columns should match your "Orders" sheet headers
        const orderRow = [
            orderId,
            timestamp,
            email,
            purchaserName,
            order.studentId || '',
            order.contactNumber || '',
            order.facebookLink || '',
            order.recipientName || '',
            order.recipientContact || '',
            order.recipientFbLink || '',
            order.anonymous ? 'Yes' : 'No',
            // Delivery 1
            order.deliveryDate1 || '',
            order.time1 || '',
            order.venue1 || '',
            order.room1 || '',
            // Delivery 2
            order.deliveryDate2 || '',
            order.time2 || '',
            order.venue2 || '',
            order.room2 || '',
            // Items and details
            order.cartItems || '',
            order.bundleDetails || '',
            String(order.advocacyDonation || 0),
            order.msgBeneficiary || '',
            order.msgRecipient || '',
            order.notes || '',
            String(order.total || 0),
            'Pending', // Status
            paymentProofLink // Payment Proof Link
        ];
        // Append to Google Sheet
        try {
            await (0, sheets_1.appendToSheet)(GOOGLE_SHEET_ID, ORDERS_SHEET_NAME, [orderRow], true); // Use queue for orders
            console.log('[API] Order saved to sheet:', orderId);
            // After saving the order, update stock counts
            if (order.items && order.items.length > 0) {
                const products = await getProductsFromSheet();
                const stockUpdates = new Map();
                for (const item of order.items) {
                    const product = products.find(p => p.id === item.id);
                    if (product) {
                        const newStock = product.stock - item.quantity;
                        stockUpdates.set(item.id, newStock < 0 ? 0 : newStock);
                    }
                }
                if (stockUpdates.size > 0) {
                    await (0, sheets_1.updateStockCounts)(GOOGLE_SHEET_ID, PRODUCTS_SHEET_NAME, stockUpdates);
                }
            }
        }
        catch (sheetError) {
            console.error('[API] Failed to save order to sheet or update stock:', sheetError.message);
            // Continue anyway - order will still be saved locally on frontend
        }
        console.log('[API] New order received:', {
            orderId,
            userId: sessionUser.id,
            email,
            name: purchaserName,
            total: order.total,
            items: order.cartItems
        });
        // Track order in analytics
        (0, analytics_1.trackOrder)(order.total || 0, sessionUser.id);
        res.json({
            success: true,
            data: {
                orderId,
                message: 'Order submitted successfully',
                timestamp
            }
        });
    }
    catch (error) {
        console.error('[API] Error submitting order:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to submit order'
        });
    }
});
/**
 * GET /api/orders
 * Fetch orders for the authenticated user from the Orders sheet
 */
app.get('/api/orders', auth_1.requireAuth, async (req, res) => {
    try {
        const sessionUser = req.user;
        const userEmail = sessionUser.email;
        console.log('[API] Fetching orders for user:', userEmail);
        const orders = await (0, sheets_1.fetchUserOrdersFromSheet)(GOOGLE_SHEET_ID, ORDERS_SHEET_NAME, userEmail, GOOGLE_API_KEY);
        const response = {
            success: true,
            data: orders
        };
        res.json(response);
    }
    catch (error) {
        console.error('[API] Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch orders'
        });
    }
});
/**
 * GET /api/products/:id
 * Get a single product by ID
 */
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let products;
        const cached = cache_1.cache.get(CACHE_KEY_PRODUCTS);
        if (cached) {
            products = cached.data;
        }
        else {
            products = await getProductsFromSheet();
            cache_1.cache.set(CACHE_KEY_PRODUCTS, products);
        }
        const product = products.find(p => p.id === id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        // Track product view
        const sessionUser = req.user;
        (0, analytics_1.trackProductView)(id, sessionUser?.id);
        res.json({
            success: true,
            data: product,
            cached: !!cached
        });
    }
    catch (error) {
        console.error('[API] Error fetching product:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch product'
        });
    }
});
// ==========================================
// Analytics Endpoints
// ==========================================
/**
 * POST /api/analytics/pageview
 * Track a page view from the frontend
 */
app.post('/api/analytics/pageview', auth_1.optionalAuth, (req, res) => {
    try {
        const { page } = req.body;
        const sessionUser = req.user;
        console.log('[API] Analytics pageview:', { page, user: sessionUser?.id });
        if (page === 'home') {
            (0, analytics_1.trackHomePageView)(sessionUser?.id);
        }
        else if (page === 'shop') {
            (0, analytics_1.trackShopPageView)(sessionUser?.id);
        }
        else if (page === 'product') {
            (0, analytics_1.trackProductView)(req.body.productId, sessionUser?.id);
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error('[API] Analytics tracking failed:', err);
        // Return 200 to avoid breaking frontend analytics flow, but report failure
        res.status(500).json({ success: false, error: err?.message || 'Analytics failed' });
    }
});
/**
 * GET /api/analytics
 * Get analytics snapshot (could be admin-only in production)
 */
app.get('/api/analytics', (req, res) => {
    const stats = (0, analytics_1.getAnalyticsSnapshot)();
    res.json({
        success: true,
        data: stats
    });
});
/**
 * POST /api/analytics/reset
 * Reset analytics (admin-only in production)
 */
app.post('/api/analytics/reset', (req, res) => {
    (0, analytics_1.resetAnalytics)();
    res.json({
        success: true,
        message: 'Analytics reset successfully'
    });
});
// 404 handler - return list of available endpoints
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        requestedPath: req.path,
        availableEndpoints: {
            health: {
                'GET /health': 'Health check with cache statistics'
            },
            auth: {
                'POST /api/auth/google': 'Login with Google ID token',
                'POST /api/auth/logout': 'Logout and destroy session',
                'GET /api/auth/me': 'Get current authenticated user'
            },
            products: {
                'GET /api/products': 'Get all available products',
                'GET /api/products/:id': 'Get a single product by ID',
                'GET /api/filters': 'Get filter options (categories, tags, price range)',
                'POST /api/refresh': 'Force refresh cache from Google Sheets'
            },
            orders: {
                'POST /api/orders': 'Submit a new order (requires auth)',
                'GET /api/orders': 'Get orders for authenticated user'
            },
            analytics: {
                'GET /api/analytics': 'Get analytics snapshot',
                'POST /api/analytics/pageview': 'Track a page view',
                'POST /api/analytics/reset': 'Reset all analytics'
            }
        }
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Start server
app.listen(PORT, async () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           🌹 Rose Sale API Server                          ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  Cache TTL: ${process.env.CACHE_TTL || '30000'}ms                                    ║
╚════════════════════════════════════════════════════════════╝
  `);
    // Load analytics data
    (0, analytics_1.loadAnalytics)();
    console.log('[Server] 📊 Analytics loaded');
    // Validate configuration
    if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
        console.warn('[Server] ⚠️  Missing Google Sheets configuration!');
        console.warn('[Server] Set GOOGLE_SHEET_ID and GOOGLE_API_KEY in .env');
    }
    else {
        // Initialize cache on startup
        await initializeCache();
    }
});
exports.default = app;
//# sourceMappingURL=index.js.map
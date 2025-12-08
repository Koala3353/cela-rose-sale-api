"use strict";
/**
 * Analytics Module
 * Tracks usage statistics for the Rose Sale API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAnalytics = loadAnalytics;
exports.saveAnalytics = saveAnalytics;
exports.trackHomePageView = trackHomePageView;
exports.trackShopPageView = trackShopPageView;
exports.trackProductView = trackProductView;
exports.trackSession = trackSession;
exports.trackOrder = trackOrder;
exports.trackApiCall = trackApiCall;
exports.getAnalyticsSnapshot = getAnalyticsSnapshot;
exports.resetAnalytics = resetAnalytics;
const path_1 = __importDefault(require("path"));
const sheets_1 = require("./sheets");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// In-memory analytics store
const analytics = {
    homePageViews: 0,
    shopPageViews: 0,
    productViews: 0,
    uniqueUsers: new Set(),
    totalSessions: 0,
    totalOrders: 0,
    totalRevenue: 0,
    apiCalls: 0,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
};
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ANALYTICS_SHEET_NAME = 'Analytics';
// File path for persisting analytics
const ANALYTICS_FILE = path_1.default.join(__dirname, '../data/analytics.json');
/**
 * Load analytics from Google Sheets 'Analytics' tab on startup
 */
async function loadAnalytics() {
    try {
        if (!GOOGLE_SHEET_ID)
            return;
        const rows = await (0, sheets_1.fetchSheetData)(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME);
        if (rows && rows.length > 1) {
            // Use last row as latest snapshot
            const last = rows[rows.length - 1];
            analytics.homePageViews = Number(last[1]) || 0;
            analytics.shopPageViews = Number(last[2]) || 0;
            analytics.productViews = Number(last[3]) || 0;
            analytics.uniqueUsers = new Set((last[4] || '').split(','));
            analytics.totalSessions = Number(last[5]) || 0;
            analytics.totalOrders = Number(last[6]) || 0;
            analytics.totalRevenue = Number(last[7]) || 0;
            analytics.apiCalls = Number(last[8]) || 0;
            analytics.startedAt = last[9] || new Date().toISOString();
            analytics.lastUpdatedAt = last[10] || new Date().toISOString();
            console.log('[Analytics] Loaded analytics from Google Sheets');
        }
        else {
            console.log('[Analytics] No analytics data found in Google Sheets');
        }
    }
    catch (error) {
        console.error('[Analytics] Failed to load analytics from Google Sheets:', error);
    }
}
/**
 * Save analytics to Google Sheets 'Analytics' tab
 */
async function saveAnalytics() {
    try {
        if (!GOOGLE_SHEET_ID)
            return;
        const row = [
            new Date().toISOString(),
            String(analytics.homePageViews),
            String(analytics.shopPageViews),
            String(analytics.productViews),
            Array.from(analytics.uniqueUsers).join(','),
            String(analytics.totalSessions),
            String(analytics.totalOrders),
            String(analytics.totalRevenue),
            String(analytics.apiCalls),
            String(analytics.startedAt),
            new Date().toISOString()
        ];
        await (0, sheets_1.appendToSheet)(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME, [row]);
        console.log('[Analytics] Saved analytics snapshot to Google Sheets');
    }
    catch (error) {
        console.error('[Analytics] Failed to save analytics to Google Sheets:', error);
    }
}
/**
 * Track a home page view
 */
function trackHomePageView(userId) {
    analytics.homePageViews++;
    analytics.lastUpdatedAt = new Date().toISOString();
    if (userId) {
        analytics.uniqueUsers.add(userId);
    }
    saveAnalytics();
}
/**
 * Track a shop page view
 */
function trackShopPageView(userId) {
    analytics.shopPageViews++;
    analytics.lastUpdatedAt = new Date().toISOString();
    if (userId) {
        analytics.uniqueUsers.add(userId);
    }
    saveAnalytics();
}
/**
 * Track a product view
 */
function trackProductView(productId, userId) {
    analytics.productViews++;
    analytics.lastUpdatedAt = new Date().toISOString();
    if (userId) {
        analytics.uniqueUsers.add(userId);
    }
    saveAnalytics();
}
/**
 * Track a new session
 */
function trackSession(userId) {
    analytics.totalSessions++;
    analytics.lastUpdatedAt = new Date().toISOString();
    if (userId) {
        analytics.uniqueUsers.add(userId);
    }
    saveAnalytics();
}
/**
 * Track a new order
 */
function trackOrder(total, userId) {
    analytics.totalOrders++;
    analytics.totalRevenue += total;
    analytics.lastUpdatedAt = new Date().toISOString();
    if (userId) {
        analytics.uniqueUsers.add(userId);
    }
    saveAnalytics();
}
/**
 * Track an API call
 */
function trackApiCall() {
    analytics.apiCalls++;
    // Don't save on every API call to avoid too many writes
    // Save periodically instead
}
/**
 * Get a snapshot of current analytics
 */
function getAnalyticsSnapshot() {
    const now = new Date();
    const started = new Date(analytics.startedAt);
    const uptimeSeconds = Math.floor((now.getTime() - started.getTime()) / 1000);
    return {
        homePageViews: analytics.homePageViews,
        shopPageViews: analytics.shopPageViews,
        productViews: analytics.productViews,
        uniqueUsersCount: analytics.uniqueUsers.size,
        totalSessions: analytics.totalSessions,
        totalOrders: analytics.totalOrders,
        totalRevenue: analytics.totalRevenue,
        apiCalls: analytics.apiCalls,
        startedAt: analytics.startedAt,
        lastUpdatedAt: analytics.lastUpdatedAt,
        uptimeSeconds,
    };
}
/**
 * Reset analytics (for testing or new period)
 */
function resetAnalytics() {
    analytics.homePageViews = 0;
    analytics.shopPageViews = 0;
    analytics.productViews = 0;
    analytics.uniqueUsers.clear();
    analytics.totalSessions = 0;
    analytics.totalOrders = 0;
    analytics.totalRevenue = 0;
    analytics.apiCalls = 0;
    analytics.startedAt = new Date().toISOString();
    analytics.lastUpdatedAt = new Date().toISOString();
    saveAnalytics();
}
// Auto-save analytics every 5 minutes
setInterval(() => {
    saveAnalytics();
}, 5 * 60 * 1000);
//# sourceMappingURL=analytics.js.map
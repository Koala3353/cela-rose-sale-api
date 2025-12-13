"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAnalytics = initAnalytics;
exports.saveAnalytics = saveAnalytics;
exports.trackHomePageView = trackHomePageView;
exports.trackShopPageView = trackShopPageView;
exports.trackProductView = trackProductView;
exports.trackSession = trackSession;
exports.trackOrder = trackOrder;
exports.trackApiCall = trackApiCall;
exports.getAnalyticsSnapshot = getAnalyticsSnapshot;
exports.resetAnalytics = resetAnalytics;
const sheets_1 = require("./sheets");
const state = {
    total: {
        homePageViews: 0,
        shopPageViews: 0,
        productViews: 0,
        sessions: 0,
        orders: 0,
        revenue: 0,
        productsSold: 0,
        apiCalls: 0,
        uniqueUsers: new Set()
    },
    delta: {
        homePageViews: 0,
        shopPageViews: 0,
        productViews: 0,
        sessions: 0,
        orders: 0,
        revenue: 0,
        productsSold: 0,
        apiCalls: 0,
        newUniqueUsersCount: 0
    },
    startedAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString()
};
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ANALYTICS_SHEET_NAME = 'Analytics';
// Debounce saves
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 10000; // Save every 10 seconds max to avoid spamming sheets
/**
 * Initialize analytics
 */
async function initAnalytics() {
    // No longer need to fetch previous state from sheets
    // We just start logging from now.
    console.log('[Analytics] App initialized. Ready to log events.');
}
/**
 * Flush pending deltas to Google Sheets
 */
async function saveAnalytics(force = false) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    const doSave = async () => {
        try {
            // Check if there is anything to save
            const hasData = Object.values(state.delta).some(val => val > 0);
            if (!hasData)
                return;
            if (!GOOGLE_SHEET_ID) {
                console.warn('[Analytics] ⚠️ Save skipped: No GOOGLE_SHEET_ID');
                return;
            }
            // Prepare row data
            // Columns: Timestamp, HomeViews, ShopViews, ProductViews, NewUsers, Sessions, Orders, Revenue, ApiCalls, Source, Type
            // Note: We use the timestamp as the "ID" of this batch
            const now = new Date().toISOString();
            const row = [
                now, // Timestamp
                String(state.delta.homePageViews),
                String(state.delta.shopPageViews),
                String(state.delta.productViews),
                String(state.delta.newUniqueUsersCount),
                String(state.delta.sessions),
                String(state.delta.orders),
                String(state.delta.revenue),
                String(state.delta.apiCalls),
                state.startedAt, // Tracking which server instance sent this (using start time as ID)
                'BATCH_LOG', // Type of log
                String(state.delta.productsSold)
            ];
            // Append to sheet
            await (0, sheets_1.appendToSheet)(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME, [row]);
            console.log('[Analytics] 💾 Flushed batch to sheets:', {
                views: state.delta.homePageViews + state.delta.shopPageViews,
                revenue: state.delta.revenue
            });
            // Reset deltas
            state.delta = {
                homePageViews: 0,
                shopPageViews: 0,
                productViews: 0,
                sessions: 0,
                orders: 0,
                revenue: 0,
                productsSold: 0,
                apiCalls: 0,
                newUniqueUsersCount: 0
            };
            state.lastSavedAt = now;
        }
        catch (error) {
            console.error('[Analytics] Failed to save analytics:', error);
            // We do NOT reset deltas if save failed, so we retry next time
        }
    };
    if (force) {
        await doSave();
    }
    else {
        saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
    }
}
/**
 * Track user helper
 */
function trackUser(userId) {
    if (!userId)
        return;
    // If we haven't seen this user in this process lifetime
    if (!state.total.uniqueUsers.has(userId)) {
        state.total.uniqueUsers.add(userId);
        // Increment delta for "new users in this batch"
        state.delta.newUniqueUsersCount++;
    }
}
/**
 * Track a home page view
 */
async function trackHomePageView(userId) {
    state.total.homePageViews++;
    state.delta.homePageViews++;
    trackUser(userId);
    await saveAnalytics();
}
/**
 * Track a shop page view
 */
async function trackShopPageView(userId) {
    state.total.shopPageViews++;
    state.delta.shopPageViews++;
    trackUser(userId);
    await saveAnalytics();
}
/**
 * Track a product view
 */
async function trackProductView(productId, userId) {
    state.total.productViews++;
    state.delta.productViews++;
    trackUser(userId);
    await saveAnalytics();
}
/**
 * Track a new session
 */
async function trackSession(userId) {
    state.total.sessions++;
    state.delta.sessions++;
    trackUser(userId);
    await saveAnalytics();
}
/**
 * Track an order
 */
async function trackOrder(orderTotal, itemsCount, userId) {
    state.total.orders++;
    state.delta.orders++;
    state.total.revenue += orderTotal;
    state.delta.revenue += orderTotal;
    state.total.productsSold += itemsCount;
    state.delta.productsSold += itemsCount;
    trackUser(userId);
    await saveAnalytics(true); // Force save on important events like orders
}
/**
 * Track an API call
 */
function trackApiCall() {
    state.total.apiCalls++;
    state.delta.apiCalls++;
    // Don't trigger save on every API call to reduce noise
}
/**
 * Get current analytics snapshot (accumulated since server start)
 */
function getAnalyticsSnapshot() {
    const now = new Date();
    const started = new Date(state.startedAt);
    const uptimeSeconds = Math.floor((now.getTime() - started.getTime()) / 1000);
    return {
        homePageViews: state.total.homePageViews,
        shopPageViews: state.total.shopPageViews,
        productViews: state.total.productViews,
        uniqueUsersCount: state.total.uniqueUsers.size,
        totalSessions: state.total.sessions,
        totalOrders: state.total.orders,
        totalProductsSold: state.total.productsSold,
        totalRevenue: state.total.revenue,
        apiCalls: state.total.apiCalls,
        startedAt: state.startedAt,
        lastUpdatedAt: state.lastSavedAt,
        uptimeSeconds,
    };
}
/**
 * Reset analytics (for testing)
 */
function resetAnalytics() {
    state.total = {
        homePageViews: 0,
        shopPageViews: 0,
        productViews: 0,
        sessions: 0,
        orders: 0,
        revenue: 0,
        productsSold: 0,
        apiCalls: 0,
        uniqueUsers: new Set()
    };
    state.delta = {
        homePageViews: 0,
        shopPageViews: 0,
        productViews: 0,
        sessions: 0,
        orders: 0,
        revenue: 0,
        productsSold: 0,
        apiCalls: 0,
        newUniqueUsersCount: 0
    };
    state.startedAt = new Date().toISOString();
}
//# sourceMappingURL=analytics.js.map
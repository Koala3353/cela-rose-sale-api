/**
 * Analytics snapshot interface
 */
export interface AnalyticsSnapshot {
    homePageViews: number;
    shopPageViews: number;
    productViews: number;
    uniqueUsersCount: number;
    totalSessions: number;
    totalOrders: number;
    totalProductsSold: number;
    totalRevenue: number;
    apiCalls: number;
    startedAt: string;
    lastUpdatedAt: string;
    uptimeSeconds: number;
}
/**
 * Analytics data structure
 * We maintain two sets of data:
 * 1. Accumulators: Total since the process started (for /api/analytics endpoint)
 * 2. Deltas: Activity since the last save (for appending to Google Sheets)
 */
export interface AnalyticsState {
    total: {
        homePageViews: number;
        shopPageViews: number;
        productViews: number;
        sessions: number;
        orders: number;
        revenue: number;
        productsSold: number;
        apiCalls: number;
        uniqueUsers: Set<string>;
    };
    delta: {
        homePageViews: number;
        shopPageViews: number;
        productViews: number;
        sessions: number;
        orders: number;
        revenue: number;
        productsSold: number;
        apiCalls: number;
        newUniqueUsersCount: number;
    };
    startedAt: string;
    lastSavedAt: string;
}
/**
 * Initialize analytics
 */
export declare function initAnalytics(): Promise<void>;
/**
 * Flush pending deltas to Google Sheets
 */
export declare function saveAnalytics(force?: boolean): Promise<void>;
/**
 * Track a home page view
 */
export declare function trackHomePageView(userId?: string): Promise<void>;
/**
 * Track a shop page view
 */
export declare function trackShopPageView(userId?: string): Promise<void>;
/**
 * Track a product view
 */
export declare function trackProductView(productId: string, userId?: string): Promise<void>;
/**
 * Track a new session
 */
export declare function trackSession(userId?: string): Promise<void>;
/**
 * Track an order
 */
export declare function trackOrder(orderTotal: number, itemsCount: number, userId?: string): Promise<void>;
/**
 * Track an API call
 */
export declare function trackApiCall(): void;
/**
 * Get current analytics snapshot (accumulated since server start)
 */
export declare function getAnalyticsSnapshot(): AnalyticsSnapshot;
/**
 * Reset analytics (for testing)
 */
export declare function resetAnalytics(): void;
//# sourceMappingURL=analytics.d.ts.map
/**
 * In-memory analytics data store
 * Now each server session creates ONE row that gets updated (not appended)
 */
export interface AnalyticsData {
    homePageViews: number;
    shopPageViews: number;
    productViews: number;
    uniqueUsers: Set<string>;
    totalSessions: number;
    totalOrders: number;
    totalRevenue: number;
    totalProductsSold: number;
    apiCalls: number;
    startedAt: string;
    lastUpdatedAt: string;
}
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
 * Initialize analytics - finds existing row or creates a new one for this server session
 */
export declare function initAnalytics(): Promise<void>;
/**
 * Save analytics by updating the same row (not appending)
 */
export declare function saveAnalytics(): Promise<void>;
/**
 * Track a home page view
 */
export declare function trackHomePageView(userId?: string): void;
/**
 * Track a shop page view
 */
export declare function trackShopPageView(userId?: string): void;
/**
 * Track a product view
 */
export declare function trackProductView(productId: string, userId?: string): void;
/**
 * Track a new session
 */
export declare function trackSession(userId?: string): void;
/**
 * Track an order
 */
export declare function trackOrder(orderTotal: number, itemsCount: number, userId?: string): void;
/**
 * Track an API call
 */
export declare function trackApiCall(): void;
/**
 * Get current analytics snapshot
 */
export declare function getAnalyticsSnapshot(): AnalyticsSnapshot;
/**
 * Reset analytics (for testing)
 */
export declare function resetAnalytics(): void;
//# sourceMappingURL=analytics.d.ts.map
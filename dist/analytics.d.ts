/**
 * Analytics Module
 * Tracks usage statistics for the Rose Sale API
 */
export interface AnalyticsData {
    homePageViews: number;
    shopPageViews: number;
    productViews: number;
    uniqueUsers: Set<string>;
    totalSessions: number;
    totalOrders: number;
    totalRevenue: number;
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
    totalRevenue: number;
    apiCalls: number;
    startedAt: string;
    lastUpdatedAt: string;
    uptimeSeconds: number;
}
/**
 * Load analytics from Google Sheets 'Analytics' tab on startup
 */
export declare function loadAnalytics(): Promise<void>;
/**
 * Save analytics to Google Sheets 'Analytics' tab
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
export declare function trackProductView(productId?: string, userId?: string): void;
/**
 * Track a new session
 */
export declare function trackSession(userId?: string): void;
/**
 * Track a new order
 */
export declare function trackOrder(total: number, userId?: string): void;
/**
 * Track an API call
 */
export declare function trackApiCall(): void;
/**
 * Get a snapshot of current analytics
 */
export declare function getAnalyticsSnapshot(): AnalyticsSnapshot;
/**
 * Reset analytics (for testing or new period)
 */
export declare function resetAnalytics(): void;
//# sourceMappingURL=analytics.d.ts.map
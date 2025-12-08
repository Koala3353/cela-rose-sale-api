/**
 * Analytics Module
 * Tracks usage statistics for the Rose Sale API
 */

import fs from 'fs';
import path from 'path';

export interface AnalyticsData {
  // Page views
  homePageViews: number;
  shopPageViews: number;
  productViews: number;
  
  // Users
  uniqueUsers: Set<string>;
  totalSessions: number;
  
  // Orders
  totalOrders: number;
  totalRevenue: number;
  
  // API usage
  apiCalls: number;
  
  // Timestamps
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

// In-memory analytics store
const analytics: AnalyticsData = {
  homePageViews: 0,
  shopPageViews: 0,
  productViews: 0,
  uniqueUsers: new Set<string>(),
  totalSessions: 0,
  totalOrders: 0,
  totalRevenue: 0,
  apiCalls: 0,
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};

// File path for persisting analytics
const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

/**
 * Load analytics from file on startup
 */
export function loadAnalytics(): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(ANALYTICS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(ANALYTICS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
      analytics.homePageViews = data.homePageViews || 0;
      analytics.shopPageViews = data.shopPageViews || 0;
      analytics.productViews = data.productViews || 0;
      analytics.uniqueUsers = new Set(data.uniqueUsers || []);
      analytics.totalSessions = data.totalSessions || 0;
      analytics.totalOrders = data.totalOrders || 0;
      analytics.totalRevenue = data.totalRevenue || 0;
      analytics.apiCalls = data.apiCalls || 0;
      analytics.startedAt = data.startedAt || new Date().toISOString();
      console.log('[Analytics] Loaded existing analytics data');
    } else {
      console.log('[Analytics] Starting with fresh analytics');
    }
  } catch (error) {
    console.error('[Analytics] Failed to load analytics:', error);
  }
}

/**
 * Save analytics to file
 */
export function saveAnalytics(): void {
  try {
    const dataDir = path.dirname(ANALYTICS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dataToSave = {
      homePageViews: analytics.homePageViews,
      shopPageViews: analytics.shopPageViews,
      productViews: analytics.productViews,
      uniqueUsers: Array.from(analytics.uniqueUsers),
      totalSessions: analytics.totalSessions,
      totalOrders: analytics.totalOrders,
      totalRevenue: analytics.totalRevenue,
      apiCalls: analytics.apiCalls,
      startedAt: analytics.startedAt,
      lastUpdatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error('[Analytics] Failed to save analytics:', error);
  }
}

/**
 * Track a home page view
 */
export function trackHomePageView(userId?: string): void {
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
export function trackShopPageView(userId?: string): void {
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
export function trackProductView(productId?: string, userId?: string): void {
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
export function trackSession(userId?: string): void {
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
export function trackOrder(total: number, userId?: string): void {
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
export function trackApiCall(): void {
  analytics.apiCalls++;
  // Don't save on every API call to avoid too many writes
  // Save periodically instead
}

/**
 * Get a snapshot of current analytics
 */
export function getAnalyticsSnapshot(): AnalyticsSnapshot {
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
export function resetAnalytics(): void {
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

// Save analytics on process exit
process.on('SIGINT', () => {
  console.log('[Analytics] Saving analytics before exit...');
  saveAnalytics();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Analytics] Saving analytics before exit...');
  saveAnalytics();
  process.exit(0);
});

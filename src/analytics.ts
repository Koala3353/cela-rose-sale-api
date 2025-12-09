import path from 'path';
import { fetchSheetData, appendToSheet, updateSheetRow } from './sheets';

/**
 * In-memory analytics data store
 * Now each server session creates ONE row that gets updated (not appended)
 */
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

// In-memory analytics for this session
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
  lastUpdatedAt: new Date().toISOString()
};

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ANALYTICS_SHEET_NAME = 'Analytics';

// Track the row number for this session (set when we first save)
let sessionRowNumber: number | null = null;

// Debounce saves to avoid rate limiting
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 5000; // Save at most every 5 seconds

/**
 * Initialize analytics - finds existing row or creates a new one for this server session
 */
export async function initAnalytics(): Promise<void> {
  console.log('[Analytics] Initializing analytics...');
  if (!GOOGLE_SHEET_ID) {
    console.warn('[Analytics] ⚠️ GOOGLE_SHEET_ID is missing. Analytics will not be saved to Google Sheets.');
    return;
  }
  console.log(`[Analytics] Using Sheet ID: ${GOOGLE_SHEET_ID.substring(0, 5)}...`);

  try {
    // Get existing rows search for matching startedAt
    console.log('[Analytics] Fetching "Analytics" sheet data...');
    const rows = await fetchSheetData(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME);
    console.log(`[Analytics] Fetched ${rows.length} rows from Analytics sheet.`);

    // Search for an existing row with the same startedAt timestamp (column A or J)
    // Row index in sheet = array index + 2 (1 for header, 1 for 0-based index)
    let foundRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      // Check if the startedAt column (index 9, column J) matches OR first column matches
      if (rowData && (rowData[0] === analytics.startedAt || rowData[9] === analytics.startedAt)) {
        foundRowIndex = i;

        // Restore analytics state from the existing row
        analytics.homePageViews = parseInt(rowData[1] || '0', 10);
        analytics.shopPageViews = parseInt(rowData[2] || '0', 10);
        analytics.productViews = parseInt(rowData[3] || '0', 10);
        analytics.totalSessions = parseInt(rowData[5] || '0', 10);
        analytics.totalOrders = parseInt(rowData[6] || '0', 10);
        analytics.totalRevenue = parseFloat(rowData[7] || '0');
        analytics.apiCalls = parseInt(rowData[8] || '0', 10);
        if (rowData[9]) analytics.startedAt = rowData[9];

        console.log(`[Analytics] Found existing session row at index ${i}, restored state`);
        break;
      }
    }

    if (foundRowIndex >= 0) {
      // Use the existing row (add 2 for header row and 1-based indexing)
      sessionRowNumber = foundRowIndex + 2;
      console.log(`[Analytics] Resuming session row ${sessionRowNumber}`);
    } else {
      // Create a new row for this session
      sessionRowNumber = rows.length + 2; // +2 for header row and 1-based indexing
      console.log(`[Analytics] Creating new session at row ${sessionRowNumber}`);

      const row: string[] = [
        analytics.startedAt, // Timestamp (startedAt)
        '0', // homePageViews
        '0', // shopPageViews
        '0', // productViews
        '0', // uniqueUsers
        '0', // totalSessions
        '0', // totalOrders
        '0', // totalRevenue
        '0', // apiCalls
        analytics.startedAt, // startedAt
        analytics.startedAt  // lastUpdatedAt
      ];

      await appendToSheet(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME, [row]);
      console.log(`[Analytics] ✅ Created new session row ${sessionRowNumber} in Google Sheets`);
    }
  } catch (error: any) {
    console.error('[Analytics] ❌ Failed to initialize analytics (Check if "Analytics" tab exists):', error.message);
  }
}

/**
 * Save analytics by updating the same row (not appending)
 */
export async function saveAnalytics(): Promise<void> {
  // Debounce saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      if (!GOOGLE_SHEET_ID || !sessionRowNumber) return;

      const now = new Date().toISOString();
      const row: string[] = [
        analytics.startedAt, // Timestamp (keep original startedAt)
        String(analytics.homePageViews),
        String(analytics.shopPageViews),
        String(analytics.productViews),
        String(analytics.uniqueUsers.size),
        String(analytics.totalSessions),
        String(analytics.totalOrders),
        String(analytics.totalRevenue),
        String(analytics.apiCalls),
        analytics.startedAt,
        now
      ];

      await updateSheetRow(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME, sessionRowNumber, row);
      analytics.lastUpdatedAt = now;
      console.log(`[Analytics] Updated session row ${sessionRowNumber}`);
    } catch (error) {
      console.error('[Analytics] Failed to save analytics:', error);
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Track a home page view
 */
export function trackHomePageView(userId?: string): void {
  analytics.homePageViews++;
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
  if (userId) {
    analytics.uniqueUsers.add(userId);
  }
  saveAnalytics();
}

/**
 * Track a product view
 */
export function trackProductView(productId: string, userId?: string): void {
  analytics.productViews++;
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
  if (userId) {
    analytics.uniqueUsers.add(userId);
  }
  saveAnalytics();
}

/**
 * Track an order
 */
export function trackOrder(orderTotal: number, userId?: string): void {
  analytics.totalOrders++;
  analytics.totalRevenue += orderTotal;
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
  // Don't save on every API call - let other tracking functions trigger saves
}

/**
 * Get current analytics snapshot
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
 * Reset analytics (for testing)
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
}

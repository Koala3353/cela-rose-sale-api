/**
 * Analytics Module
 * Tracks usage statistics for the Rose Sale API
 */

import fs from 'fs';
import path from 'path';
import { appendToSheet, fetchSheetData } from './sheets';
import dotenv from 'dotenv';
dotenv.config();

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

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ANALYTICS_SHEET_NAME = 'Analytics';

// File path for persisting analytics
const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');


/**
 * Load analytics from Google Sheets 'Analytics' tab on startup
 */
export async function loadAnalytics(): Promise<void> {
  try {
    if (!GOOGLE_SHEET_ID) return;
    const rows = await fetchSheetData(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME);
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
    } else {
      console.log('[Analytics] No analytics data found in Google Sheets');
    }
  } catch (error) {
    console.error('[Analytics] Failed to load analytics from Google Sheets:', error);
  }
}


/**
 * Save analytics to Google Sheets 'Analytics' tab
 */
export async function saveAnalytics(): Promise<void> {
  try {
    if (!GOOGLE_SHEET_ID) return;
    const row: string[] = [
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
    await appendToSheet(GOOGLE_SHEET_ID, ANALYTICS_SHEET_NAME, [row]);
    console.log('[Analytics] Saved analytics snapshot to Google Sheets');
  } catch (error) {
    console.error('[Analytics] Failed to save analytics to Google Sheets:', error);
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

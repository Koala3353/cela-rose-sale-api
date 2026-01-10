import { appendToSheet } from './sheets.js';

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
  // New: Delivery vs Pickup
  deliveryOrders: number;
  pickupOrders: number;
  // New: Peak hours (orders by hour 0-23)
  ordersByHour: number[];
  peakHour: number | null;
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
  // Lifetime accumulators (Process uptime)
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
    // New tracking
    deliveryOrders: number;
    pickupOrders: number;
    ordersByHour: number[]; // Array of 24 elements (0-23)
  };

  // Deltas (Unsaved changes)
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
    // New tracking
    deliveryOrders: number;
    pickupOrders: number;
  };

  startedAt: string;
  lastSavedAt: string;
}

// Initialize 24-hour array with zeros
const createHourArray = () => new Array(24).fill(0);

const state: AnalyticsState = {
  total: {
    homePageViews: 0,
    shopPageViews: 0,
    productViews: 0,
    sessions: 0,
    orders: 0,
    revenue: 0,
    productsSold: 0,
    apiCalls: 0,
    uniqueUsers: new Set<string>(),
    deliveryOrders: 0,
    pickupOrders: 0,
    ordersByHour: createHourArray()
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
    newUniqueUsersCount: 0,
    deliveryOrders: 0,
    pickupOrders: 0
  },
  startedAt: new Date().toISOString(),
  lastSavedAt: new Date().toISOString()
};

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ANALYTICS_SHEET_NAME = 'Analytics';

// Debounce saves
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 60000; // Save every 60 seconds max to avoid spamming sheets

/**
 * Initialize analytics
 */
export async function initAnalytics(): Promise<void> {
  console.log('[Analytics] App initialized. Ready to log events.');
}

/**
 * Flush pending deltas to Google Sheets
 */
export async function saveAnalytics(force = false): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  const doSave = async () => {
    try {
      // Check if there is anything to save
      const hasData = Object.values(state.delta).some(val => typeof val === 'number' && val > 0);
      if (!hasData) return;

      if (!GOOGLE_SHEET_ID) {
        console.warn('[Analytics] ⚠️ Save skipped: No GOOGLE_SHEET_ID');
        return;
      }

      // Prepare row data
      // Columns: Timestamp, HomeViews, ShopViews, ProductViews, NewUsers, Sessions, Orders, Revenue, ApiCalls, Source, Type, ProductsSold, DeliveryOrders, PickupOrders
      const now = new Date().toISOString();
      const row: string[] = [
        now, // Timestamp
        String(state.delta.homePageViews),
        String(state.delta.shopPageViews),
        String(state.delta.productViews),
        String(state.delta.newUniqueUsersCount),
        String(state.delta.sessions),
        String(state.delta.orders),
        String(state.delta.revenue),
        String(state.delta.apiCalls),
        state.startedAt, // Tracking which server instance sent this
        'BATCH_LOG', // Type of log
        String(state.delta.productsSold),
        String(state.delta.deliveryOrders),
        String(state.delta.pickupOrders)
      ];

      // Append to sheet
      await appendToSheet(GOOGLE_SHEET_ID!, ANALYTICS_SHEET_NAME, [row]);

      console.log('[Analytics] 💾 Flushed batch to sheets:', {
        views: state.delta.homePageViews + state.delta.shopPageViews,
        revenue: state.delta.revenue,
        delivery: state.delta.deliveryOrders,
        pickup: state.delta.pickupOrders
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
        newUniqueUsersCount: 0,
        deliveryOrders: 0,
        pickupOrders: 0
      };

      state.lastSavedAt = now;

    } catch (error) {
      console.error('[Analytics] Failed to save analytics:', error);
    }
  };

  if (force) {
    await doSave();
  } else {
    saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
  }
}

/**
 * Track user helper
 */
function trackUser(userId?: string) {
  if (!userId) return;
  if (!state.total.uniqueUsers.has(userId)) {
    state.total.uniqueUsers.add(userId);
    state.delta.newUniqueUsersCount++;
  }
}

/**
 * Track a home page view
 */
export async function trackHomePageView(userId?: string): Promise<void> {
  state.total.homePageViews++;
  state.delta.homePageViews++;
  trackUser(userId);
  await saveAnalytics();
}

/**
 * Track a shop page view
 */
export async function trackShopPageView(userId?: string): Promise<void> {
  state.total.shopPageViews++;
  state.delta.shopPageViews++;
  trackUser(userId);
  await saveAnalytics();
}

/**
 * Track a product view
 */
export async function trackProductView(productId: string, userId?: string): Promise<void> {
  state.total.productViews++;
  state.delta.productViews++;
  trackUser(userId);
  await saveAnalytics();
}

/**
 * Track a new session
 */
export async function trackSession(userId?: string): Promise<void> {
  state.total.sessions++;
  state.delta.sessions++;
  trackUser(userId);
  await saveAnalytics();
}

/**
 * Track an order with delivery type
 * @param orderTotal - Total order amount
 * @param itemsCount - Number of items in order
 * @param deliveryType - 'deliver' or 'pickup'
 * @param userId - Optional user ID
 */
export async function trackOrder(
  orderTotal: number,
  itemsCount: number,
  deliveryType?: 'deliver' | 'pickup' | string,
  userId?: string
): Promise<void> {
  state.total.orders++;
  state.delta.orders++;

  state.total.revenue += orderTotal;
  state.delta.revenue += orderTotal;

  state.total.productsSold += itemsCount;
  state.delta.productsSold += itemsCount;

  // Track delivery vs pickup
  if (deliveryType === 'deliver') {
    state.total.deliveryOrders++;
    state.delta.deliveryOrders++;
  } else if (deliveryType === 'pickup') {
    state.total.pickupOrders++;
    state.delta.pickupOrders++;
  }

  // Track order hour for peak hours analysis
  const hour = new Date().getHours(); // 0-23 in server timezone
  state.total.ordersByHour[hour]++;

  trackUser(userId);
  await saveAnalytics(true); // Force save on important events like orders
}

/**
 * Track an API call
 */
export function trackApiCall(): void {
  state.total.apiCalls++;
  state.delta.apiCalls++;
}

/**
 * Get current analytics snapshot (accumulated since server start)
 */
export function getAnalyticsSnapshot(): AnalyticsSnapshot {
  const now = new Date();
  const started = new Date(state.startedAt);
  const uptimeSeconds = Math.floor((now.getTime() - started.getTime()) / 1000);

  // Find peak hour (hour with most orders)
  let peakHour: number | null = null;
  let maxOrders = 0;
  state.total.ordersByHour.forEach((count, hour) => {
    if (count > maxOrders) {
      maxOrders = count;
      peakHour = hour;
    }
  });

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
    // New metrics
    deliveryOrders: state.total.deliveryOrders,
    pickupOrders: state.total.pickupOrders,
    ordersByHour: [...state.total.ordersByHour],
    peakHour,
    startedAt: state.startedAt,
    lastUpdatedAt: state.lastSavedAt,
    uptimeSeconds,
  };
}

/**
 * Reset analytics (for testing)
 */
export function resetAnalytics(): void {
  state.total = {
    homePageViews: 0,
    shopPageViews: 0,
    productViews: 0,
    sessions: 0,
    orders: 0,
    revenue: 0,
    productsSold: 0,
    apiCalls: 0,
    uniqueUsers: new Set<string>(),
    deliveryOrders: 0,
    pickupOrders: 0,
    ordersByHour: createHourArray()
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
    newUniqueUsersCount: 0,
    deliveryOrders: 0,
    pickupOrders: 0
  };
  state.startedAt = new Date().toISOString();
}

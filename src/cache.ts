import { CachedData } from './types.js';

/**
 * Simple in-memory cache with TTL support
 * Automatically refreshes data in the background
 */
export class CacheManager<T> {
  private cache: Map<string, CachedData<T>> = new Map();
  private refreshCallbacks: Map<string, () => Promise<T>> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 30000) {
    this.ttl = ttlMs;
  }

  /**
   * Get cached data, returns null if not found or expired
   */
  get(key: string): CachedData<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Return cached data even if expired (stale-while-revalidate pattern)
    return cached;
  }

  /**
   * Check if cache entry is still fresh
   */
  isFresh(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() < cached.expiresAt;
  }

  /**
   * Set cache data
   */
  set(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.ttl
    });
    console.log(`[Cache] Updated '${key}' - expires in ${this.ttl / 1000}s`);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.stopAutoRefresh(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.refreshIntervals.forEach((interval) => clearInterval(interval));
    this.refreshIntervals.clear();
    this.refreshCallbacks.clear();
    console.log('[Cache] Cleared all cache entries');
  }

  /**
   * Get cache age in milliseconds
   */
  getAge(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    return Date.now() - cached.timestamp;
  }

  /**
   * Setup automatic background refresh for a key
   */
  setupAutoRefresh(key: string, refreshFn: () => Promise<T>): void {
    // Store the refresh callback
    this.refreshCallbacks.set(key, refreshFn);

    // Clear any existing interval
    this.stopAutoRefresh(key);

    // Set up new interval
    const interval = setInterval(async () => {
      try {
        console.log(`[Cache] Auto-refreshing '${key}'...`);
        const newData = await refreshFn();
        this.set(key, newData);
      } catch (error) {
        console.error(`[Cache] Auto-refresh failed for '${key}':`, error);
      }
    }, this.ttl);

    this.refreshIntervals.set(key, interval);
    console.log(`[Cache] Auto-refresh enabled for '${key}' every ${this.ttl / 1000}s`);
  }

  /**
   * Stop automatic refresh for a key
   */
  stopAutoRefresh(key: string): void {
    const interval = this.refreshIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(key);
    }
  }

  /**
   * Force refresh a specific key
   */
  async forceRefresh(key: string): Promise<T | null> {
    const refreshFn = this.refreshCallbacks.get(key);
    if (!refreshFn) {
      console.warn(`[Cache] No refresh callback registered for '${key}'`);
      return null;
    }

    try {
      console.log(`[Cache] Force refreshing '${key}'...`);
      const newData = await refreshFn();
      this.set(key, newData);
      return newData;
    } catch (error) {
      console.error(`[Cache] Force refresh failed for '${key}':`, error);
      throw error;
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { keys: string[]; totalEntries: number; autoRefreshKeys: string[] } {
    return {
      keys: Array.from(this.cache.keys()),
      totalEntries: this.cache.size,
      autoRefreshKeys: Array.from(this.refreshIntervals.keys())
    };
  }
}

// Create singleton instance with 30 second TTL
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '30000', 10);
export const cache = new CacheManager<any>(CACHE_TTL);

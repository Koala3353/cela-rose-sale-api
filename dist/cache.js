"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.CacheManager = void 0;
/**
 * Simple in-memory cache with TTL support
 * Automatically refreshes data in the background
 */
class CacheManager {
    constructor(ttlMs = 30000) {
        this.cache = new Map();
        this.refreshCallbacks = new Map();
        this.refreshIntervals = new Map();
        this.ttl = ttlMs;
    }
    /**
     * Get cached data, returns null if not found or expired
     */
    get(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        // Return cached data even if expired (stale-while-revalidate pattern)
        return cached;
    }
    /**
     * Check if cache entry is still fresh
     */
    isFresh(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return false;
        return Date.now() < cached.expiresAt;
    }
    /**
     * Set cache data
     */
    set(key, data) {
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
    delete(key) {
        this.cache.delete(key);
        this.stopAutoRefresh(key);
    }
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.refreshIntervals.forEach((interval) => clearInterval(interval));
        this.refreshIntervals.clear();
        this.refreshCallbacks.clear();
        console.log('[Cache] Cleared all cache entries');
    }
    /**
     * Get cache age in milliseconds
     */
    getAge(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        return Date.now() - cached.timestamp;
    }
    /**
     * Setup automatic background refresh for a key
     */
    setupAutoRefresh(key, refreshFn) {
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
            }
            catch (error) {
                console.error(`[Cache] Auto-refresh failed for '${key}':`, error);
            }
        }, this.ttl);
        this.refreshIntervals.set(key, interval);
        console.log(`[Cache] Auto-refresh enabled for '${key}' every ${this.ttl / 1000}s`);
    }
    /**
     * Stop automatic refresh for a key
     */
    stopAutoRefresh(key) {
        const interval = this.refreshIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.refreshIntervals.delete(key);
        }
    }
    /**
     * Force refresh a specific key
     */
    async forceRefresh(key) {
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
        }
        catch (error) {
            console.error(`[Cache] Force refresh failed for '${key}':`, error);
            throw error;
        }
    }
    /**
     * Get cache stats
     */
    getStats() {
        return {
            keys: Array.from(this.cache.keys()),
            totalEntries: this.cache.size,
            autoRefreshKeys: Array.from(this.refreshIntervals.keys())
        };
    }
}
exports.CacheManager = CacheManager;
// Create singleton instance with 30 second TTL
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '30000', 10);
exports.cache = new CacheManager(CACHE_TTL);
//# sourceMappingURL=cache.js.map
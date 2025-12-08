import { CachedData } from './types';
/**
 * Simple in-memory cache with TTL support
 * Automatically refreshes data in the background
 */
export declare class CacheManager<T> {
    private cache;
    private refreshCallbacks;
    private refreshIntervals;
    private ttl;
    constructor(ttlMs?: number);
    /**
     * Get cached data, returns null if not found or expired
     */
    get(key: string): CachedData<T> | null;
    /**
     * Check if cache entry is still fresh
     */
    isFresh(key: string): boolean;
    /**
     * Set cache data
     */
    set(key: string, data: T): void;
    /**
     * Delete cache entry
     */
    delete(key: string): void;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Get cache age in milliseconds
     */
    getAge(key: string): number | null;
    /**
     * Setup automatic background refresh for a key
     */
    setupAutoRefresh(key: string, refreshFn: () => Promise<T>): void;
    /**
     * Stop automatic refresh for a key
     */
    stopAutoRefresh(key: string): void;
    /**
     * Force refresh a specific key
     */
    forceRefresh(key: string): Promise<T | null>;
    /**
     * Get cache stats
     */
    getStats(): {
        keys: string[];
        totalEntries: number;
        autoRefreshKeys: string[];
    };
}
export declare const cache: CacheManager<any>;
//# sourceMappingURL=cache.d.ts.map
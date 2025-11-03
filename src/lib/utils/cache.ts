/**
 * Client-Side Caching Utilities (Phase 3 Tier 2)
 *
 * Provides localStorage-based caching with TTL support and
 * stale-while-revalidate pattern for optimal performance.
 */

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
	ttl?: number; // Default: 5 minutes
	staleWhileRevalidate?: boolean; // Default: true
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'bb_cache_'; // booze-and-books cache prefix

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get item from cache
 */
export function getCacheItem<T>(key: string): T | null {
	if (!isBrowser()) return null;

	try {
		const item = localStorage.getItem(CACHE_PREFIX + key);
		if (!item) return null;

		const entry: CacheEntry<T> = JSON.parse(item);
		return entry.data;
	} catch (error) {
		console.warn('Cache read error:', error);
		return null;
	}
}

/**
 * Check if cache entry is valid (not expired)
 */
export function isCacheValid(key: string): boolean {
	if (!isBrowser()) return false;

	try {
		const item = localStorage.getItem(CACHE_PREFIX + key);
		if (!item) return false;

		const entry: CacheEntry<unknown> = JSON.parse(item);
		const age = Date.now() - entry.timestamp;
		return age < entry.ttl;
	} catch (error) {
		return false;
	}
}

/**
 * Check if cache entry is stale but still usable for SWR
 */
export function isCacheStale(key: string): boolean {
	if (!isBrowser()) return false;

	try {
		const item = localStorage.getItem(CACHE_PREFIX + key);
		if (!item) return false;

		const entry: CacheEntry<unknown> = JSON.parse(item);
		const age = Date.now() - entry.timestamp;

		// Stale if older than TTL but younger than 2x TTL
		return age >= entry.ttl && age < entry.ttl * 2;
	} catch (error) {
		return false;
	}
}

/**
 * Set item in cache
 */
export function setCacheItem<T>(key: string, data: T, options: CacheOptions = {}): void {
	if (!isBrowser()) return;

	const { ttl = DEFAULT_TTL } = options;

	try {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl
		};

		localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
	} catch (error) {
		// Handle quota exceeded or other localStorage errors
		console.warn('Cache write error:', error);

		// Try to clear old entries and retry
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			clearOldCache();
			try {
				const entry: CacheEntry<T> = {
					data,
					timestamp: Date.now(),
					ttl
				};
				localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
			} catch (retryError) {
				console.error('Cache write failed after cleanup:', retryError);
			}
		}
	}
}

/**
 * Remove item from cache
 */
export function removeCacheItem(key: string): void {
	if (!isBrowser()) return;

	try {
		localStorage.removeItem(CACHE_PREFIX + key);
	} catch (error) {
		console.warn('Cache remove error:', error);
	}
}

/**
 * Clear all cache entries for this app
 */
export function clearCache(): void {
	if (!isBrowser()) return;

	try {
		const keys = Object.keys(localStorage);
		keys.forEach(key => {
			if (key.startsWith(CACHE_PREFIX)) {
				localStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.warn('Cache clear error:', error);
	}
}

/**
 * Clear expired cache entries
 */
export function clearOldCache(): void {
	if (!isBrowser()) return;

	try {
		const keys = Object.keys(localStorage);
		const now = Date.now();

		keys.forEach(key => {
			if (!key.startsWith(CACHE_PREFIX)) return;

			try {
				const item = localStorage.getItem(key);
				if (!item) return;

				const entry: CacheEntry<unknown> = JSON.parse(item);
				const age = now - entry.timestamp;

				// Remove if older than 2x TTL
				if (age > entry.ttl * 2) {
					localStorage.removeItem(key);
				}
			} catch (error) {
				// Invalid entry, remove it
				localStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.warn('Cache cleanup error:', error);
	}
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
	totalEntries: number;
	totalSize: number;
	oldestEntry: number | null;
	newestEntry: number | null;
} {
	if (!isBrowser()) {
		return { totalEntries: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
	}

	let totalEntries = 0;
	let totalSize = 0;
	let oldestEntry: number | null = null;
	let newestEntry: number | null = null;

	try {
		const keys = Object.keys(localStorage);
		const now = Date.now();

		keys.forEach(key => {
			if (!key.startsWith(CACHE_PREFIX)) return;

			const item = localStorage.getItem(key);
			if (!item) return;

			totalEntries++;
			totalSize += item.length;

			try {
				const entry: CacheEntry<unknown> = JSON.parse(item);
				const age = now - entry.timestamp;

				if (oldestEntry === null || age > oldestEntry) {
					oldestEntry = age;
				}
				if (newestEntry === null || age < newestEntry) {
					newestEntry = age;
				}
			} catch (error) {
				// Skip invalid entries
			}
		});
	} catch (error) {
		console.warn('Cache stats error:', error);
	}

	return { totalEntries, totalSize, oldestEntry, newestEntry };
}

/**
 * Stale-While-Revalidate Pattern
 *
 * Returns cached data immediately if available (even if stale),
 * then fetches fresh data in the background.
 *
 * @param key Cache key
 * @param fetchFn Function to fetch fresh data
 * @param options Cache options
 * @returns Cached data (if available) and a promise for fresh data
 */
export function useSWR<T>(
	key: string,
	fetchFn: () => Promise<T>,
	options: CacheOptions = {}
): {
	cached: T | null;
	isStale: boolean;
	refresh: Promise<T>;
} {
	const cached = getCacheItem<T>(key);
	const isValid = isCacheValid(key);
	const isStale = isCacheStale(key);

	// If cache is valid, return cached data without refetching
	if (isValid && cached !== null) {
		return {
			cached,
			isStale: false,
			refresh: Promise.resolve(cached)
		};
	}

	// If cache is stale, return cached data but fetch fresh in background
	if (isStale && cached !== null) {
		const refresh = fetchFn().then(data => {
			setCacheItem(key, data, options);
			return data;
		});

		return {
			cached,
			isStale: true,
			refresh
		};
	}

	// No valid cache, fetch fresh data
	const refresh = fetchFn().then(data => {
		setCacheItem(key, data, options);
		return data;
	});

	return {
		cached,
		isStale: false,
		refresh
	};
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern: string | RegExp): void {
	if (!isBrowser()) return;

	try {
		const keys = Object.keys(localStorage);
		const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

		keys.forEach(key => {
			if (!key.startsWith(CACHE_PREFIX)) return;

			const cacheKey = key.substring(CACHE_PREFIX.length);
			if (regex.test(cacheKey)) {
				localStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.warn('Cache invalidation error:', error);
	}
}

/**
 * Automatically clear old cache on app load
 * Only runs in browser environment to avoid SSR issues
 */
let cleanupIntervalId: number | undefined;

export function initCacheCleanup(): void {
	if (!isBrowser() || cleanupIntervalId) return;

	// Clear old cache on load (runs once)
	clearOldCache();

	// Set up periodic cleanup (every 5 minutes)
	cleanupIntervalId = window.setInterval(() => {
		clearOldCache();
	}, 5 * 60 * 1000) as unknown as number;
}

/**
 * Stop automatic cache cleanup (for cleanup/testing)
 */
export function stopCacheCleanup(): void {
	if (cleanupIntervalId) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = undefined;
	}
}

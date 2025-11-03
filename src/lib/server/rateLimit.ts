/**
 * Rate Limiting Utility
 *
 * Provides in-memory rate limiting for API endpoints to prevent abuse.
 * Uses a sliding window approach with automatic cleanup of old entries.
 *
 * IMPORTANT: This is an in-memory implementation suitable for single-instance deployments.
 * For multi-instance production deployments, consider using Redis or a similar distributed store.
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

interface RateLimitConfig {
	/** Maximum number of requests allowed within the window */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Custom error message */
	message?: string;
}

class RateLimiter {
	private store = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Cleanup old entries every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 5 * 60 * 1000);
	}

	/**
	 * Check if a request should be rate limited
	 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
	 * @param config - Rate limit configuration
	 * @returns Object with isLimited flag and remaining requests
	 */
	check(
		identifier: string,
		config: RateLimitConfig
	): { isLimited: boolean; remaining: number; resetAt: number } {
		const now = Date.now();
		const entry = this.store.get(identifier);

		// If no entry exists or window has expired, create new entry
		if (!entry || now > entry.resetAt) {
			const resetAt = now + config.windowMs;
			this.store.set(identifier, {
				count: 1,
				resetAt
			});
			return {
				isLimited: false,
				remaining: config.maxRequests - 1,
				resetAt
			};
		}

		// Increment count
		entry.count++;

		// Check if limit exceeded
		if (entry.count > config.maxRequests) {
			return {
				isLimited: true,
				remaining: 0,
				resetAt: entry.resetAt
			};
		}

		return {
			isLimited: false,
			remaining: config.maxRequests - entry.count,
			resetAt: entry.resetAt
		};
	}

	/**
	 * Reset rate limit for a specific identifier
	 */
	reset(identifier: string): void {
		this.store.delete(identifier);
	}

	/**
	 * Clean up expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		const entries = Array.from(this.store.entries());
		for (const [key, entry] of entries) {
			if (now > entry.resetAt) {
				this.store.delete(key);
			}
		}
	}

	/**
	 * Get current store size (for monitoring)
	 */
	getStoreSize(): number {
		return this.store.size;
	}

	/**
	 * Clear all entries (useful for testing)
	 */
	clear(): void {
		this.store.clear();
	}

	/**
	 * Cleanup on shutdown
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.store.clear();
	}
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
	/** Strict limit for authentication endpoints (5 requests per 15 minutes) */
	AUTH: {
		maxRequests: 5,
		windowMs: 15 * 60 * 1000,
		message: 'Too many authentication attempts. Please try again later.'
	},
	/** Moderate limit for general API endpoints (100 requests per minute) */
	API: {
		maxRequests: 100,
		windowMs: 60 * 1000,
		message: 'Too many requests. Please slow down.'
	},
	/** Strict limit for password reset (3 requests per hour) */
	PASSWORD_RESET: {
		maxRequests: 3,
		windowMs: 60 * 60 * 1000,
		message: 'Too many password reset attempts. Please try again later.'
	},
	/** Moderate limit for search endpoints (30 requests per minute) */
	SEARCH: {
		maxRequests: 30,
		windowMs: 60 * 1000,
		message: 'Too many search requests. Please slow down.'
	},
	/** Strict limit for email sending (5 requests per hour) */
	EMAIL: {
		maxRequests: 5,
		windowMs: 60 * 60 * 1000,
		message: 'Too many email requests. Please try again later.'
	}
} as const;

/**
 * Get client identifier from request
 * Uses IP address or user ID as fallback
 */
export function getClientIdentifier(request: Request, userId?: string): string {
	// Use user ID if authenticated
	if (userId) {
		return `user:${userId}`;
	}

	// Try to get IP from various headers (Cloudflare, other proxies)
	const forwardedFor = request.headers.get('x-forwarded-for');
	const realIp = request.headers.get('x-real-ip');
	const cfConnectingIp = request.headers.get('cf-connecting-ip');

	const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
	return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
	identifier: string,
	config: RateLimitConfig
): { isLimited: boolean; remaining: number; resetAt: number } {
	return rateLimiter.check(identifier, config);
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string): void {
	rateLimiter.reset(identifier);
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats(): { storeSize: number } {
	return {
		storeSize: rateLimiter.getStoreSize()
	};
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimits(): void {
	rateLimiter.clear();
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
	process.on('SIGTERM', () => rateLimiter.destroy());
	process.on('SIGINT', () => rateLimiter.destroy());
}

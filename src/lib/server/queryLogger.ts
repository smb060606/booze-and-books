/**
 * Database Query Performance Logger
 *
 * Tracks query performance metrics for optimization and monitoring.
 * In production, logs should be sent to a centralized logging service.
 *
 * Part of Phase 3: Performance Optimization
 */

export interface QueryLog {
	operation: string;
	table: string;
	duration: number;
	timestamp: Date;
	params?: Record<string, any>;
	error?: string;
	rowCount?: number;
}

export interface QueryStats {
	operation: string;
	count: number;
	avgDuration: number;
	minDuration: number;
	maxDuration: number;
	totalDuration: number;
	errorCount: number;
}

class QueryLogger {
	private logs: QueryLog[] = [];
	private readonly MAX_LOGS = 1000; // Keep last 1000 queries in memory
	private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms threshold for slow queries

	/**
	 * Start timing a query
	 */
	startQuery(operation: string, table: string, params?: Record<string, any>): (error?: string, rowCount?: number) => void {
		const startTime = performance.now();

		return (error?: string, rowCount?: number) => {
			const endTime = performance.now();
			const duration = endTime - startTime;

			const log: QueryLog = {
				operation,
				table,
				duration,
				timestamp: new Date(),
				params,
				error,
				rowCount
			};

			this.addLog(log);

			// Log slow queries
			if (duration > this.SLOW_QUERY_THRESHOLD) {
				console.warn(`[SLOW QUERY] ${operation} on ${table} took ${duration.toFixed(2)}ms`, {
					params,
					rowCount
				});
			}

			// Log errors
			if (error) {
				console.error(`[QUERY ERROR] ${operation} on ${table}:`, error);
			}

			// In development, log all queries for debugging
			if (import.meta.env.DEV) {
				console.log(`[QUERY] ${operation} on ${table}: ${duration.toFixed(2)}ms (${rowCount || 0} rows)`);
			}
		};
	}

	/**
	 * Add a log entry
	 */
	private addLog(log: QueryLog): void {
		this.logs.push(log);

		// Keep only the last MAX_LOGS entries
		if (this.logs.length > this.MAX_LOGS) {
			this.logs.shift();
		}
	}

	/**
	 * Get query statistics grouped by operation
	 */
	getStats(operation?: string): QueryStats[] {
		const statsMap = new Map<string, QueryStats>();

		const logsToAnalyze = operation
			? this.logs.filter(log => log.operation === operation)
			: this.logs;

		for (const log of logsToAnalyze) {
			const key = `${log.operation}_${log.table}`;
			const existing = statsMap.get(key);

			if (existing) {
				existing.count++;
				existing.totalDuration += log.duration;
				existing.avgDuration = existing.totalDuration / existing.count;
				existing.minDuration = Math.min(existing.minDuration, log.duration);
				existing.maxDuration = Math.max(existing.maxDuration, log.duration);
				if (log.error) existing.errorCount++;
			} else {
				statsMap.set(key, {
					operation: log.operation,
					count: 1,
					avgDuration: log.duration,
					minDuration: log.duration,
					maxDuration: log.duration,
					totalDuration: log.duration,
					errorCount: log.error ? 1 : 0
				});
			}
		}

		return Array.from(statsMap.values());
	}

	/**
	 * Get slow queries (above threshold)
	 */
	getSlowQueries(threshold = this.SLOW_QUERY_THRESHOLD): QueryLog[] {
		return this.logs
			.filter(log => log.duration > threshold)
			.sort((a, b) => b.duration - a.duration);
	}

	/**
	 * Get recent query logs
	 */
	getRecentLogs(limit = 50): QueryLog[] {
		return this.logs.slice(-limit).reverse();
	}

	/**
	 * Get queries with errors
	 */
	getErrorLogs(): QueryLog[] {
		return this.logs.filter(log => log.error);
	}

	/**
	 * Clear all logs
	 */
	clear(): void {
		this.logs = [];
	}

	/**
	 * Get summary of query performance
	 */
	getSummary(): {
		totalQueries: number;
		totalErrors: number;
		avgQueryTime: number;
		slowQueries: number;
	} {
		const totalQueries = this.logs.length;
		const totalErrors = this.logs.filter(log => log.error).length;
		const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
		const avgQueryTime = totalQueries > 0 ? totalDuration / totalQueries : 0;
		const slowQueries = this.logs.filter(log => log.duration > this.SLOW_QUERY_THRESHOLD).length;

		return {
			totalQueries,
			totalErrors,
			avgQueryTime,
			slowQueries
		};
	}

	/**
	 * Export logs for analysis (e.g., to send to logging service)
	 */
	exportLogs(): QueryLog[] {
		return [...this.logs];
	}
}

// Singleton instance (with HMR guard to prevent multiple instances)
const globalForQueryLogger = globalThis as unknown as {
	queryLogger: QueryLogger | undefined;
};

export const queryLogger = globalForQueryLogger.queryLogger ?? new QueryLogger();
globalForQueryLogger.queryLogger = queryLogger;

/**
 * Utility function for wrapping Supabase queries with logging
 *
 * @example
 * const books = await logQuery(
 *   'SELECT',
 *   'books',
 *   { userId: user.id },
 *   async () => {
 *     const { data, error } = await supabase
 *       .from('books')
 *       .select('*')
 *       .eq('owner_id', user.id);
 *
 *     if (error) throw error;
 *     return data;
 *   }
 * );
 */
export async function logQuery<T>(
	operation: string,
	table: string,
	params: Record<string, any>,
	queryFn: () => Promise<T>
): Promise<T> {
	const endLog = queryLogger.startQuery(operation, table, params);

	try {
		const result = await queryFn();
		const rowCount = Array.isArray(result) ? result.length : undefined;
		endLog(undefined, rowCount);
		return result;
	} catch (error) {
		endLog(error instanceof Error ? error.message : String(error));
		throw error;
	}
}

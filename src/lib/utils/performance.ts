/**
 * Web Vitals Performance Tracking (Phase 3 Tier 2)
 *
 * Tracks Core Web Vitals metrics for performance monitoring:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

export interface PerformanceMetric {
	name: string;
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	delta?: number;
	id?: string;
	navigationType?: string;
}

export interface PerformanceThresholds {
	good: number;
	needsImprovement: number;
}

// Web Vitals thresholds (from web.dev)
const THRESHOLDS: Record<string, PerformanceThresholds> = {
	LCP: { good: 2500, needsImprovement: 4000 },
	FID: { good: 100, needsImprovement: 300 },
	CLS: { good: 0.1, needsImprovement: 0.25 },
	FCP: { good: 1800, needsImprovement: 3000 },
	TTFB: { good: 800, needsImprovement: 1800 }
};

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
	const threshold = THRESHOLDS[name];
	if (!threshold) return 'good';

	if (value <= threshold.good) return 'good';
	if (value <= threshold.needsImprovement) return 'needs-improvement';
	return 'poor';
}

/**
 * Check if we're in a browser environment with PerformanceObserver
 */
function supportsPerformanceObserver(): boolean {
	return (
		typeof window !== 'undefined' &&
		'PerformanceObserver' in window &&
		'PerformanceEntry' in window
	);
}

/**
 * Report metric to console (development) or analytics service (production)
 */
function reportMetric(metric: PerformanceMetric): void {
	if (import.meta.env.DEV) {
		const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
		console.log(
			`${emoji} [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
		);
	}

	// In production, send to analytics service
	// Example: analytics.track('web_vital', metric);
	if (typeof window !== 'undefined' && (window as any).gtag) {
		(window as any).gtag('event', metric.name, {
			value: Math.round(metric.value),
			metric_rating: metric.rating,
			metric_delta: metric.delta
		});
	}
}

/**
 * Track Largest Contentful Paint (LCP)
 * Good: < 2.5s, Needs Improvement: < 4s, Poor: >= 4s
 */
export function trackLCP(): void {
	if (!supportsPerformanceObserver()) return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1] as any;

			const metric: PerformanceMetric = {
				name: 'LCP',
				value: lastEntry.renderTime || lastEntry.loadTime,
				rating: getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
				id: lastEntry.id
			};

			reportMetric(metric);
		});

		observer.observe({ type: 'largest-contentful-paint', buffered: true });
	} catch (error) {
		console.warn('LCP tracking error:', error);
	}
}

/**
 * Track First Input Delay (FID)
 * Good: < 100ms, Needs Improvement: < 300ms, Poor: >= 300ms
 */
export function trackFID(): void {
	if (!supportsPerformanceObserver()) return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				const metric: PerformanceMetric = {
					name: 'FID',
					value: entry.processingStart - entry.startTime,
					rating: getRating('FID', entry.processingStart - entry.startTime),
					id: entry.id
				};

				reportMetric(metric);
			});
		});

		observer.observe({ type: 'first-input', buffered: true });
	} catch (error) {
		console.warn('FID tracking error:', error);
	}
}

/**
 * Track Cumulative Layout Shift (CLS)
 * Good: < 0.1, Needs Improvement: < 0.25, Poor: >= 0.25
 */
export function trackCLS(): void {
	if (!supportsPerformanceObserver()) return;

	try {
		let clsValue = 0;
		let clsEntries: any[] = [];

		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
					clsEntries.push(entry);
				}
			});

			const metric: PerformanceMetric = {
				name: 'CLS',
				value: clsValue,
				rating: getRating('CLS', clsValue),
				delta: clsValue
			};

			reportMetric(metric);
		});

		observer.observe({ type: 'layout-shift', buffered: true });
	} catch (error) {
		console.warn('CLS tracking error:', error);
	}
}

/**
 * Track First Contentful Paint (FCP)
 * Good: < 1.8s, Needs Improvement: < 3s, Poor: >= 3s
 */
export function trackFCP(): void {
	if (!supportsPerformanceObserver()) return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				if (entry.name === 'first-contentful-paint') {
					const metric: PerformanceMetric = {
						name: 'FCP',
						value: entry.startTime,
						rating: getRating('FCP', entry.startTime)
					};

					reportMetric(metric);
				}
			});
		});

		observer.observe({ type: 'paint', buffered: true });
	} catch (error) {
		console.warn('FCP tracking error:', error);
	}
}

/**
 * Track Time to First Byte (TTFB)
 * Good: < 800ms, Needs Improvement: < 1800ms, Poor: >= 1800ms
 */
export function trackTTFB(): void {
	if (typeof window === 'undefined' || !window.performance) return;

	try {
		const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		if (!navEntry) return;

		const ttfb = navEntry.responseStart - navEntry.requestStart;

		const metric: PerformanceMetric = {
			name: 'TTFB',
			value: ttfb,
			rating: getRating('TTFB', ttfb),
			navigationType: navEntry.type
		};

		reportMetric(metric);
	} catch (error) {
		console.warn('TTFB tracking error:', error);
	}
}

/**
 * Track custom performance mark
 */
export function trackCustomMetric(name: string, startMark: string, endMark?: string): void {
	if (typeof window === 'undefined' || !window.performance) return;

	try {
		if (endMark) {
			performance.mark(endMark);
		}

		const measureName = `custom_${name}`;
		performance.measure(measureName, startMark, endMark);

		const measure = performance.getEntriesByName(measureName)[0];
		if (measure) {
			console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);

			// Report to analytics
			if ((window as any).gtag) {
				(window as any).gtag('event', 'custom_metric', {
					metric_name: name,
					value: Math.round(measure.duration)
				});
			}
		}
	} catch (error) {
		console.warn('Custom metric tracking error:', error);
	}
}

/**
 * Start tracking a custom operation
 */
export function startPerformanceMark(name: string): void {
	if (typeof window === 'undefined' || !window.performance) return;

	try {
		performance.mark(`${name}_start`);
	} catch (error) {
		console.warn('Performance mark error:', error);
	}
}

/**
 * End tracking a custom operation
 */
export function endPerformanceMark(name: string): number | null {
	if (typeof window === 'undefined' || !window.performance) return null;

	try {
		const endMarkName = `${name}_end`;
		performance.mark(endMarkName);

		const measureName = `measure_${name}`;
		performance.measure(measureName, `${name}_start`, endMarkName);

		const measure = performance.getEntriesByName(measureName)[0];
		if (measure) {
			console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
			return measure.duration;
		}
	} catch (error) {
		console.warn('Performance mark error:', error);
	}

	return null;
}

/**
 * Get navigation timing metrics
 */
export function getNavigationMetrics(): Record<string, number> | null {
	if (typeof window === 'undefined' || !window.performance) return null;

	try {
		const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		if (!navEntry) return null;

		return {
			dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
			tcp: navEntry.connectEnd - navEntry.connectStart,
			ttfb: navEntry.responseStart - navEntry.requestStart,
			download: navEntry.responseEnd - navEntry.responseStart,
			domInteractive: navEntry.domInteractive,
			domComplete: navEntry.domComplete,
			loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart
		};
	} catch (error) {
		console.warn('Navigation metrics error:', error);
		return null;
	}
}

/**
 * Initialize all Web Vitals tracking
 * Should be called explicitly from the root layout, not on module load
 */
export function initPerformanceTracking(): void {
	if (typeof window === 'undefined') return;

	// Wait for page load
	if (document.readyState === 'complete') {
		startTracking();
	} else {
		window.addEventListener('load', startTracking, { once: true });
	}
}

function startTracking(): void {
	trackLCP();
	trackFID();
	trackCLS();
	trackFCP();
	trackTTFB();

	// Log navigation metrics after load
	setTimeout(() => {
		const metrics = getNavigationMetrics();
		if (metrics && import.meta.env.DEV) {
			console.table(metrics);
		}
	}, 0);
}

/**
 * Get current performance score estimate (0-100)
 */
export function getPerformanceScore(): number {
	if (typeof window === 'undefined' || !window.performance) return 0;

	try {
		const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		if (!navEntry) return 0;

		// Simple scoring based on load time
		const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;

		if (loadTime < 1000) return 100;
		if (loadTime < 2000) return 90;
		if (loadTime < 3000) return 75;
		if (loadTime < 5000) return 60;
		if (loadTime < 7000) return 40;
		return 20;
	} catch (error) {
		return 0;
	}
}

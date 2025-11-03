/**
 * Security Logging Utility
 *
 * Provides structured logging for security events to help detect and respond
 * to potential security issues.
 *
 * In production, these logs should be sent to a centralized logging service
 * like Datadog, Sentry, or CloudWatch for monitoring and alerting.
 */

export enum SecurityEventType {
	AUTH_SUCCESS = 'AUTH_SUCCESS',
	AUTH_FAILURE = 'AUTH_FAILURE',
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	INVALID_INPUT = 'INVALID_INPUT',
	UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
	SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
	CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
	SESSION_EXPIRED = 'SESSION_EXPIRED',
	PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export enum SecurityEventSeverity {
	INFO = 'INFO',
	WARNING = 'WARNING',
	ERROR = 'ERROR',
	CRITICAL = 'CRITICAL'
}

interface SecurityEvent {
	type: SecurityEventType;
	severity: SecurityEventSeverity;
	timestamp: string;
	userId?: string;
	email?: string;
	ip?: string;
	userAgent?: string;
	path?: string;
	message: string;
	metadata?: Record<string, unknown>;
}

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
	const logEntry: SecurityEvent = {
		...event,
		timestamp: new Date().toISOString()
	};

	// In development, log to console with color coding
	const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

	if (isDev) {
		const colors = {
			INFO: '\x1b[36m', // Cyan
			WARNING: '\x1b[33m', // Yellow
			ERROR: '\x1b[31m', // Red
			CRITICAL: '\x1b[35m' // Magenta
		};
		const reset = '\x1b[0m';

		console.log(
			`${colors[event.severity]}[SECURITY ${event.severity}]${reset} ${event.type}:`,
			event.message,
			event.metadata ? event.metadata : ''
		);
	} else {
		// In production, log as JSON for easy parsing by logging services
		console.log(JSON.stringify(logEntry));
	}

	// TODO: In production, send to centralized logging service
	// Example integrations:
	// - Sentry.captureMessage()
	// - Datadog logger
	// - CloudWatch Logs
	// - Your own logging endpoint
}

/**
 * Helper functions for common security events
 */

export function logAuthSuccess(params: {
	userId: string;
	email: string;
	ip?: string;
	userAgent?: string;
	path?: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.AUTH_SUCCESS,
		severity: SecurityEventSeverity.INFO,
		userId: params.userId,
		email: params.email,
		ip: params.ip,
		userAgent: params.userAgent,
		path: params.path,
		message: `User ${params.email} logged in successfully`
	});
}

export function logAuthFailure(params: {
	email?: string;
	ip?: string;
	userAgent?: string;
	path?: string;
	reason: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.AUTH_FAILURE,
		severity: SecurityEventSeverity.WARNING,
		email: params.email,
		ip: params.ip,
		userAgent: params.userAgent,
		path: params.path,
		message: `Authentication failed: ${params.reason}`,
		metadata: { reason: params.reason }
	});
}

export function logRateLimitExceeded(params: {
	ip?: string;
	userId?: string;
	path?: string;
	limit: number;
}): void {
	logSecurityEvent({
		type: SecurityEventType.RATE_LIMIT_EXCEEDED,
		severity: SecurityEventSeverity.WARNING,
		userId: params.userId,
		ip: params.ip,
		path: params.path,
		message: `Rate limit exceeded (${params.limit} requests)`,
		metadata: { limit: params.limit }
	});
}

export function logInvalidInput(params: {
	userId?: string;
	ip?: string;
	path?: string;
	field: string;
	value?: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.INVALID_INPUT,
		severity: SecurityEventSeverity.INFO,
		userId: params.userId,
		ip: params.ip,
		path: params.path,
		message: `Invalid input detected in field: ${params.field}`,
		metadata: {
			field: params.field,
			// Only log first 100 chars of value for privacy
			value: params.value?.substring(0, 100)
		}
	});
}

export function logUnauthorizedAccess(params: {
	userId?: string;
	email?: string;
	ip?: string;
	path: string;
	resource: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.UNAUTHORIZED_ACCESS,
		severity: SecurityEventSeverity.ERROR,
		userId: params.userId,
		email: params.email,
		ip: params.ip,
		path: params.path,
		message: `Unauthorized access attempt to ${params.resource}`,
		metadata: { resource: params.resource }
	});
}

export function logSuspiciousActivity(params: {
	userId?: string;
	ip?: string;
	path?: string;
	description: string;
	metadata?: Record<string, unknown>;
}): void {
	logSecurityEvent({
		type: SecurityEventType.SUSPICIOUS_ACTIVITY,
		severity: SecurityEventSeverity.CRITICAL,
		userId: params.userId,
		ip: params.ip,
		path: params.path,
		message: `Suspicious activity detected: ${params.description}`,
		metadata: params.metadata
	});
}

export function logCsrfValidationFailed(params: {
	userId?: string;
	ip?: string;
	path?: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.CSRF_VALIDATION_FAILED,
		severity: SecurityEventSeverity.ERROR,
		userId: params.userId,
		ip: params.ip,
		path: params.path,
		message: 'CSRF token validation failed'
	});
}

export function logPermissionDenied(params: {
	userId: string;
	email?: string;
	ip?: string;
	path: string;
	resource: string;
	requiredPermission: string;
}): void {
	logSecurityEvent({
		type: SecurityEventType.PERMISSION_DENIED,
		severity: SecurityEventSeverity.WARNING,
		userId: params.userId,
		email: params.email,
		ip: params.ip,
		path: params.path,
		message: `Permission denied for ${params.resource} (requires ${params.requiredPermission})`,
		metadata: {
			resource: params.resource,
			requiredPermission: params.requiredPermission
		}
	});
}

/**
 * Extract request metadata for security logging
 */
export function getRequestMetadata(request: Request): {
	ip?: string;
	userAgent?: string;
	path: string;
} {
	// Try to get IP from various headers
	const forwardedFor = request.headers.get('x-forwarded-for');
	const realIp = request.headers.get('x-real-ip');
	const cfConnectingIp = request.headers.get('cf-connecting-ip');

	const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0];
	const userAgent = request.headers.get('user-agent') || undefined;
	const path = new URL(request.url).pathname;

	return { ip, userAgent, path };
}

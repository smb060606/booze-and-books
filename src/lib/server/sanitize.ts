/**
 * Input Sanitization Utilities
 *
 * Provides functions for sanitizing and validating user input to prevent
 * XSS, SQL injection, and other injection attacks.
 *
 * Note: This is defense in depth. The primary protection comes from:
 * 1. Supabase's parameterized queries (prevents SQL injection)
 * 2. Svelte's automatic HTML escaping (prevents XSS)
 * 3. Content Security Policy headers (prevents inline script execution)
 */

/**
 * Strip HTML tags from input to prevent XSS
 * Useful for plain text fields like names, descriptions, etc.
 */
export function stripHtml(input: string): string {
	return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string input by trimming whitespace and removing HTML
 */
export function sanitizeString(input: string, maxLength?: number): string {
	let sanitized = input.trim();
	sanitized = stripHtml(sanitized);

	if (maxLength && sanitized.length > maxLength) {
		sanitized = sanitized.substring(0, maxLength);
	}

	return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
	const trimmed = email.trim().toLowerCase();

	// Basic email regex (not perfect, but good enough for sanitization)
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(trimmed)) {
		return null;
	}

	// Max length check (254 is RFC 5321 limit)
	if (trimmed.length > 254) {
		return null;
	}

	return trimmed;
}

/**
 * Validate and sanitize username
 * Allows alphanumeric, underscores, hyphens
 */
export function sanitizeUsername(username: string): string | null {
	const trimmed = username.trim().toLowerCase();

	// Username validation: 3-20 characters, alphanumeric + underscore/hyphen
	const usernameRegex = /^[a-z0-9_-]{3,20}$/;

	if (!usernameRegex.test(trimmed)) {
		return null;
	}

	return trimmed;
}

/**
 * Sanitize URL to prevent javascript: protocol and other dangerous schemes
 */
export function sanitizeUrl(url: string): string | null {
	const trimmed = url.trim();

	try {
		const parsed = new URL(trimmed);

		// Only allow http, https, and mailto protocols
		if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
			return null;
		}

		return trimmed;
	} catch {
		// Invalid URL
		return null;
	}
}

/**
 * Sanitize and validate phone number
 * Removes all non-digit characters except + for country code
 */
export function sanitizePhone(phone: string): string | null {
	// Remove all characters except digits and +
	const sanitized = phone.replace(/[^\d+]/g, '');

	// Basic validation: must have at least 10 digits
	const digitCount = sanitized.replace(/\+/g, '').length;
	if (digitCount < 10 || digitCount > 15) {
		return null;
	}

	return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
	input: string | number,
	options?: {
		min?: number;
		max?: number;
		integer?: boolean;
	}
): number | null {
	const num = typeof input === 'string' ? parseFloat(input) : input;

	if (isNaN(num) || !isFinite(num)) {
		return null;
	}

	if (options?.integer && !Number.isInteger(num)) {
		return null;
	}

	if (options?.min !== undefined && num < options.min) {
		return null;
	}

	if (options?.max !== undefined && num > options.max) {
		return null;
	}

	return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: unknown): boolean {
	if (typeof input === 'boolean') {
		return input;
	}

	if (typeof input === 'string') {
		const lower = input.toLowerCase().trim();
		return lower === 'true' || lower === '1' || lower === 'yes';
	}

	if (typeof input === 'number') {
		return input !== 0;
	}

	return false;
}

/**
 * Sanitize UUID (common in Supabase)
 */
export function sanitizeUuid(uuid: string): string | null {
	const trimmed = uuid.trim().toLowerCase();

	// UUID v4 regex
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

	if (!uuidRegex.test(trimmed)) {
		return null;
	}

	return trimmed;
}

/**
 * Sanitize date string
 */
export function sanitizeDate(dateString: string): Date | null {
	try {
		const date = new Date(dateString);

		if (isNaN(date.getTime())) {
			return null;
		}

		// Reject dates too far in the past or future (reasonable bounds)
		const minDate = new Date('1900-01-01');
		const maxDate = new Date('2100-12-31');

		if (date < minDate || date > maxDate) {
			return null;
		}

		return date;
	} catch {
		return null;
	}
}

/**
 * Sanitize JSON input
 * Validates that input is valid JSON and optionally validates structure
 */
export function sanitizeJson<T = unknown>(
	input: string,
	validator?: (parsed: unknown) => parsed is T
): T | null {
	try {
		const parsed = JSON.parse(input);

		if (validator && !validator(parsed)) {
			return null;
		}

		return parsed as T;
	} catch {
		return null;
	}
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
	input: unknown,
	options?: {
		maxLength?: number;
		maxItems?: number;
	}
): string[] | null {
	if (!Array.isArray(input)) {
		return null;
	}

	if (options?.maxItems && input.length > options.maxItems) {
		return null;
	}

	const sanitized: string[] = [];

	for (const item of input) {
		if (typeof item !== 'string') {
			return null;
		}

		const cleaned = sanitizeString(item, options?.maxLength);
		if (cleaned) {
			sanitized.push(cleaned);
		}
	}

	return sanitized;
}

/**
 * Sanitize object by applying sanitizers to specific fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
	input: unknown,
	schema: {
		[K in keyof T]: (value: unknown) => T[K] | null;
	}
): T | null {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return null;
	}

	const result = {} as T;

	for (const [key, sanitizer] of Object.entries(schema)) {
		const value = (input as Record<string, unknown>)[key];
		const sanitized = sanitizer(value);

		if (sanitized === null) {
			return null;
		}

		result[key as keyof T] = sanitized;
	}

	return result;
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
	/** Full name (2-100 characters, letters, spaces, hyphens, apostrophes) */
	FULL_NAME: /^[a-zA-Z\s'-]{2,100}$/,

	/** Username (3-20 characters, alphanumeric, underscore, hyphen) */
	USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,

	/** ISBN-10 or ISBN-13 */
	ISBN: /^(?:\d{9}[\dX]|\d{13})$/,

	/** Postal code (flexible, 3-10 alphanumeric + spaces/hyphens) */
	POSTAL_CODE: /^[A-Z0-9\s-]{3,10}$/i,

	/** Strong password (min 8 chars, at least 1 uppercase, 1 lowercase, 1 number) */
	STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
} as const;

/**
 * Validate input against a regex pattern
 */
export function validatePattern(input: string, pattern: RegExp): boolean {
	return pattern.test(input);
}

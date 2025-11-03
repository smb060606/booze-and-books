/**
 * CSRF Protection Utility
 *
 * Provides Cross-Site Request Forgery (CSRF) protection using the
 * Double Submit Cookie pattern.
 *
 * How it works:
 * 1. Generate a random CSRF token
 * 2. Set it in a cookie (httpOnly, secure, sameSite)
 * 3. Include it in forms or request headers
 * 4. Validate that cookie value matches submitted value
 *
 * Note: SvelteKit forms automatically get CSRF protection via the
 * use:enhance directive. This utility is for additional API endpoint protection.
 */

import { randomBytes } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
	return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token in cookie
 */
export function setCsrfCookie(cookies: {
	set: (name: string, value: string, options: Record<string, unknown>) => void;
}): string {
	const secureFlag = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
	const token = generateCsrfToken();

	cookies.set(CSRF_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: secureFlag,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 24 hours
	});

	return token;
}

/**
 * Get CSRF token from cookie
 */
export function getCsrfToken(cookies: { get: (name: string) => string | undefined }): string | null {
	return cookies.get(CSRF_COOKIE_NAME)?? null;
}

/**
 * Get CSRF token from request headers
 */
export function getCsrfTokenFromHeaders(request: Request): string | null {
	return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token from request
 * Checks both header and form data
 */
export async function validateCsrfToken(
	request: Request,
	cookies: { get: (name: string) => string | undefined }
): Promise<boolean> {
	// Skip CSRF validation for safe HTTP methods
	const method = request.method.toUpperCase();
	if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		return true;
	}

	// Get token from cookie
	const cookieToken = getCsrfToken(cookies);
	if (!cookieToken) {
		return false;
	}

	// Try to get token from header first
	let submittedToken = getCsrfTokenFromHeaders(request);

	// If not in header, try to get from form data (for traditional form submissions)
	if (!submittedToken && request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
		try {
			const formData = await request.clone().formData();
			submittedToken = formData.get('csrf_token')?.toString()?? null;
		} catch {
			// Not form data or parsing failed
		}
	}

	// If not in header or form, try JSON body
	if (!submittedToken && request.headers.get('content-type')?.includes('application/json')) {
		try {
			const body = await request.clone().json();
			submittedToken = body.csrf_token?? null;
		} catch {
			// Not JSON or parsing failed
		}
	}

	if (!submittedToken) {
		return false;
	}

	// Compare tokens (constant-time comparison to prevent timing attacks)
	return timingSafeEqual(cookieToken, submittedToken);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always comparing the full strings
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length!== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

/**
 * CSRF middleware for route handlers
 * Usage:
 * ```typescript
 * export async function POST({ request, cookies }: RequestEvent) {
 *   if (!await validateCsrfToken(request, cookies)) {
 *     return json({ error: 'Invalid CSRF token' }, { status: 403 });
 *   }
 *   //... rest of handler
 * }
 * ```
 */
export async function requireValidCsrfToken(
	request: Request,
	cookies: { get: (name: string) => string | undefined }
): Promise<{ valid: true } | { valid: false; error: string; status: number }> {
	const isValid = await validateCsrfToken(request, cookies);

	if (!isValid) {
		return {
			valid: false,
			error: 'Invalid or missing CSRF token. Please refresh the page and try again.',
			status: 403
		};
	}

	return { valid: true };
}

/**
 * Generate CSRF token for use in forms/headers
 * This should be called in +page.server.ts load functions to provide
 * the token to the client
 */
export function getCsrfTokenForClient(cookies: {
	get: (name: string) => string | undefined;
	set: (name: string, value: string, options: Record<string, unknown>) => void;
}): string {
	let token = getCsrfToken(cookies);

	if (!token) {
		token = setCsrfCookie(cookies);
	}

	return token;
}

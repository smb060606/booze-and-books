/**
 * Standard Supabase Authentication - Login Endpoint
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '$lib/server/rateLimit';
import {
	logAuthSuccess,
	logAuthFailure,
	logRateLimitExceeded,
	getRequestMetadata
} from '$lib/server/securityLog';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const metadata = getRequestMetadata(request);

    // Rate limiting - prevent brute force attacks
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.AUTH);

    if (rateLimitResult.isLimited) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);

      // Log rate limit exceeded
      logRateLimitExceeded({
        ip: metadata.ip,
        path: metadata.path,
        limit: RATE_LIMITS.AUTH.maxRequests
      });

      return json(
        {
          error: RATE_LIMITS.AUTH.message,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': RATE_LIMITS.AUTH.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
          }
        }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: (key, value, options) => {
          cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          cookies.delete(key, { ...options, path: '/' });
        },
      },
    });

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log authentication failure
      logAuthFailure({
        email,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        path: metadata.path,
        reason: error.message
      });

      return json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.user) {
      // Log authentication failure
      logAuthFailure({
        email,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        path: metadata.path,
        reason: 'No user returned'
      });

      return json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Log successful authentication
    logAuthSuccess({
      userId: data.user.id,
      email: data.user.email || 'unknown',
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      path: metadata.path
    });

    return json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || null,
        user_metadata: data.user.user_metadata,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

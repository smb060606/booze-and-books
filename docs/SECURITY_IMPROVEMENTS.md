# Security Improvements

This document describes the security enhancements implemented in the Booze & Books application to protect against common web vulnerabilities and attacks.

## Overview

The application now includes comprehensive security measures across multiple layers:
- **Security Headers** - HTTP headers to prevent common attacks
- **Rate Limiting** - Protection against brute force and DoS attacks
- **Input Sanitization** - Validation and sanitization of user input
- **Security Logging** - Structured logging for security events
- **CSRF Protection** - Cross-Site Request Forgery prevention

---

## Security Headers

**File**: [src/hooks.server.ts](../src/hooks.server.ts)

### Headers Implemented

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking iframe embedding |
| `Content-Security-Policy` | `frame-ancestors 'none'` | Modern alternative to X-Frame-Options |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection for older browsers |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS (production only) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Permissions-Policy` | `geolocation=(self), microphone=(), camera=()` | Restricts browser features |

### Testing Headers

You can verify headers in production using:

```bash
curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
```

Or use online tools:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

---

## Rate Limiting

**File**: [src/lib/server/rateLimit.ts](../src/lib/server/rateLimit.ts)

### Implementation

The application uses an in-memory sliding window rate limiter to prevent abuse. This is suitable for single-instance deployments (e.g., Vercel single region).

### Rate Limit Configurations

| Endpoint Type | Max Requests | Window | Use Case |
|--------------|--------------|--------|----------|
| `AUTH` | 5 | 15 minutes | Login/signup endpoints |
| `API` | 100 | 1 minute | General API endpoints |
| `PASSWORD_RESET` | 3 | 1 hour | Password reset requests |
| `SEARCH` | 30 | 1 minute | Search endpoints |
| `EMAIL` | 5 | 1 hour | Email sending |

### Usage Example

```typescript
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '$lib/server/rateLimit';

export async function POST({ request }: RequestEvent) {
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.AUTH);

  if (rateLimitResult.isLimited) {
    return json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString()
        }
      }
    );
  }

  // ... rest of handler
}
```

### Client Identification

The rate limiter identifies clients by:
1. **User ID** (if authenticated) - format: `user:uuid`
2. **IP Address** (fallback) - format: `ip:x.x.x.x`

IP detection supports common proxy headers:
- `cf-connecting-ip` (Cloudflare)
- `x-real-ip` (Nginx)
- `x-forwarded-for` (Standard)

### Scaling Considerations

**Important**: The current in-memory implementation is suitable for:
- ✅ Single-instance deployments (Vercel single region)
- ✅ Development and testing
- ❌ Multi-instance production (rate limits won't be shared)

For multi-instance production, migrate to:
- Redis (recommended for distributed rate limiting)
- Cloudflare Rate Limiting
- Upstash (serverless Redis)

---

## Input Sanitization

**File**: [src/lib/server/sanitize.ts](../src/lib/server/sanitize.ts)

### Available Sanitizers

| Function | Purpose | Returns |
|----------|---------|---------|
| `sanitizeString(input, maxLength?)` | Strip HTML, trim, limit length | `string` |
| `sanitizeEmail(email)` | Validate and normalize email | `string \| null` |
| `sanitizeUsername(username)` | Validate username (3-20 chars, alphanumeric) | `string \| null` |
| `sanitizeUrl(url)` | Validate URL and block dangerous protocols | `string \| null` |
| `sanitizeNumber(input, options?)` | Parse and validate numbers | `number \| null` |
| `sanitizeUuid(uuid)` | Validate UUID format | `string \| null` |
| `sanitizeDate(dateString)` | Parse and validate dates | `Date \| null` |
| `sanitizeStringArray(input, options?)` | Sanitize array of strings | `string[] \| null` |

### Usage Example

```typescript
import { sanitizeEmail, sanitizeString } from '$lib/server/sanitize';

export async function POST({ request }: RequestEvent) {
  const { email, name } = await request.json();

  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    return json({ error: 'Invalid email' }, { status: 400 });
  }

  const sanitizedName = sanitizeString(name, 100);

  // Use sanitized values...
}
```

### Validation Patterns

The module includes pre-defined regex patterns:

```typescript
import { VALIDATION_PATTERNS, validatePattern } from '$lib/server/sanitize';

// Validate full name
validatePattern(name, VALIDATION_PATTERNS.FULL_NAME);

// Validate strong password
validatePattern(password, VALIDATION_PATTERNS.STRONG_PASSWORD);

// Validate ISBN
validatePattern(isbn, VALIDATION_PATTERNS.ISBN);
```

### Defense in Depth

Input sanitization provides an additional layer of security alongside:
1. **Supabase Parameterized Queries** - Prevents SQL injection
2. **Svelte Auto-Escaping** - Prevents XSS in templates
3. **CSP Headers** - Blocks inline script execution

---

## Security Logging

**File**: [src/lib/server/securityLog.ts](../src/lib/server/securityLog.ts)

### Event Types

| Event Type | Severity | When to Log |
|------------|----------|-------------|
| `AUTH_SUCCESS` | INFO | Successful login/signup |
| `AUTH_FAILURE` | WARNING | Failed authentication attempt |
| `RATE_LIMIT_EXCEEDED` | WARNING | Rate limit hit |
| `INVALID_INPUT` | INFO | Invalid input detected |
| `UNAUTHORIZED_ACCESS` | ERROR | Access to protected resource without auth |
| `SUSPICIOUS_ACTIVITY` | CRITICAL | Potential security threat |
| `CSRF_VALIDATION_FAILED` | ERROR | CSRF token mismatch |
| `PERMISSION_DENIED` | WARNING | Insufficient permissions |

### Usage Example

```typescript
import { logAuthSuccess, logAuthFailure, getRequestMetadata } from '$lib/server/securityLog';

export async function POST({ request }: RequestEvent) {
  const metadata = getRequestMetadata(request);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logAuthFailure({
      email,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      path: metadata.path,
      reason: error.message
    });
    return json({ error: error.message }, { status: 401 });
  }

  logAuthSuccess({
    userId: data.user.id,
    email: data.user.email!,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    path: metadata.path
  });

  return json({ success: true });
}
```

### Log Format

**Development**: Colored console output
```
[SECURITY WARNING] AUTH_FAILURE: Authentication failed: Invalid credentials
```

**Production**: JSON format for log aggregation
```json
{
  "type": "AUTH_FAILURE",
  "severity": "WARNING",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "path": "/api/auth/login",
  "message": "Authentication failed: Invalid credentials"
}
```

### Integration with Monitoring Services

To integrate with external logging services, modify [src/lib/server/securityLog.ts:47-50](../src/lib/server/securityLog.ts#L47-L50):

```typescript
// Sentry
Sentry.captureMessage(event.message, { level: event.severity.toLowerCase() });

// Datadog
logger.log(event.severity, event.message, event.metadata);

// Custom endpoint
await fetch('https://your-logging-endpoint.com', {
  method: 'POST',
  body: JSON.stringify(logEntry)
});
```

---

## CSRF Protection

**File**: [src/lib/server/csrf.ts](../src/lib/server/csrf.ts)

### Implementation

The application uses the **Double Submit Cookie** pattern for CSRF protection:
1. Generate random token
2. Set in httpOnly cookie
3. Include in form/request header
4. Validate cookie matches submitted value

### SvelteKit Forms

SvelteKit provides built-in CSRF protection for forms using `use:enhance`. No additional action needed for standard form submissions.

### API Endpoints

For API endpoints accepting JSON, implement CSRF protection:

#### Server-side (Generate Token)

```typescript
// src/routes/app/+page.server.ts
import { getCsrfTokenForClient } from '$lib/server/csrf';

export async function load({ cookies }) {
  return {
    csrfToken: getCsrfTokenForClient(cookies)
  };
}
```

#### Client-side (Include Token)

```typescript
// src/routes/app/+page.svelte
<script lang="ts">
  export let data;

  async function submitForm() {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': data.csrfToken
      },
      body: JSON.stringify({ /* data */ })
    });
  }
</script>
```

#### Server-side (Validate Token)

```typescript
// src/routes/api/endpoint/+server.ts
import { validateCsrfToken } from '$lib/server/csrf';
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  // Validate CSRF token
  if (!await validateCsrfToken(request, cookies)) {
    return json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // ... rest of handler
}
```

### Helper Middleware

For convenience, use the helper function:

```typescript
import { requireValidCsrfToken } from '$lib/server/csrf';

export async function POST({ request, cookies }) {
  const csrfCheck = await requireValidCsrfToken(request, cookies);

  if (!csrfCheck.valid) {
    return json({ error: csrfCheck.error }, { status: csrfCheck.status });
  }

  // ... rest of handler
}
```

---

## Protected Endpoints

The following endpoints have been enhanced with security measures:

### Authentication Endpoints

| Endpoint | Rate Limit | Security Features |
|----------|------------|------------------|
| `POST /api/auth/login` | 5 per 15 min | Rate limiting, security logging |
| `POST /api/auth/signup` | 5 per 15 min | Rate limiting, security logging |
| `POST /api/auth/logout` | None | Session invalidation |

### Future Enhancements

Consider adding:
- CSRF protection for state-changing API endpoints
- Input sanitization in book/profile creation endpoints
- Rate limiting for search and discovery endpoints
- Security logging for swap transactions

---

## Security Best Practices

### Environment Variables

**Never commit secrets to version control**. All sensitive values should be in `.env`:

```bash
# ❌ Never do this
PUBLIC_API_KEY=sk_live_abc123...

# ✅ Do this
PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=... # Not PUBLIC
```

See [.env.example](../.env.example) for all required variables.

### Password Requirements

Consider enforcing strong passwords:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

Use the validation pattern:
```typescript
import { VALIDATION_PATTERNS } from '$lib/server/sanitize';

if (!VALIDATION_PATTERNS.STRONG_PASSWORD.test(password)) {
  // Reject weak password
}
```

### Session Management

The application uses Supabase's built-in session management:
- Sessions expire after inactivity
- Refresh tokens rotate automatically
- Session validation on every request via `safeGetSession()`

### Supabase Row Level Security (RLS)

Ensure RLS is enabled on all tables:
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own books" ON books
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Testing Security

### Rate Limiting

Test rate limiting with:
```bash
# Send 6 requests rapidly (limit is 5)
for i in {1..6}; do
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

Expected: 6th request returns 429 status.

### Security Headers

```bash
curl -I https://your-domain.com | grep X-Frame-Options
# Expected: X-Frame-Options: DENY
```

### Input Sanitization

Test with malicious input:
```bash
curl -X POST https://your-domain.com/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"XSS\")</script>"}'
```

Expected: HTML tags stripped, sanitized value returned.

---

## Security Checklist

Before deploying to production:

- [ ] All environment variables properly set (no defaults in code)
- [ ] HTTPS enforced (Vercel handles this automatically)
- [ ] Security headers verified with [securityheaders.com](https://securityheaders.com/)
- [ ] Rate limiting tested on auth endpoints
- [ ] Supabase RLS policies reviewed and tested
- [ ] Service role key never exposed to client
- [ ] CSRF protection enabled on state-changing endpoints
- [ ] Security logging integrated with monitoring service
- [ ] Input validation on all user-submitted data
- [ ] Error messages don't leak sensitive information
- [ ] Database backups configured in Supabase
- [ ] Incident response plan documented

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email the maintainer directly at: security@boozeandbooks.me
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide updates on the fix timeline.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [SvelteKit Security](https://kit.svelte.dev/docs/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: November 2025
**Version**: 1.0.0

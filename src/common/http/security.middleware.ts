import { HttpStatus } from '@nestjs/common';

type SecurityHeadersRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  method: string;
  path?: string;
  socket: {
    remoteAddress?: string | null;
  };
  url: string;
};

type SecurityHeadersResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => SecurityHeadersResponse;
  json: (body: unknown) => void;
};

type NextFunction = () => void;

type AuthRateLimitRule = {
  limit: number;
  windowMs: number;
};

const authRateLimits = new Map<string, AuthRateLimitRule>([
  ['POST:/auth/login', { limit: 10, windowMs: 15 * 60_000 }],
  ['POST:/auth/register', { limit: 5, windowMs: 60 * 60_000 }],
  ['POST:/auth/refresh', { limit: 30, windowMs: 5 * 60_000 }],
]);

const authRateLimitStore = new Map<
  string,
  {
    count: number;
    resetAtMs: number;
  }
>();
const MAX_AUTH_RATE_LIMIT_KEYS = 10_000;

export function attachSecurityHeaders(
  request: SecurityHeadersRequest,
  response: SecurityHeadersResponse,
  next: NextFunction,
): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );

  const forwardedProto = request.headers['x-forwarded-proto'];
  const isHttps =
    (isTrustedProxyEnabled() &&
      (forwardedProto === 'https' ||
        (Array.isArray(forwardedProto) && forwardedProto.includes('https')))) ||
    false;

  if (process.env.NODE_ENV === 'production' && isHttps) {
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  next();
}

export function attachAuthRateLimit(
  request: SecurityHeadersRequest,
  response: SecurityHeadersResponse,
  next: NextFunction,
): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const rule = authRateLimits.get(resolveRouteKey(request));

  if (!rule) {
    next();
    return;
  }

  const now = Date.now();
  pruneExpiredRateLimitEntries(now);
  const clientKey = `${resolveClientIp(request)}:${resolveRouteKey(request)}`;
  const current = authRateLimitStore.get(clientKey);
  const nextWindow =
    !current || current.resetAtMs <= now
      ? {
          count: 0,
          resetAtMs: now + rule.windowMs,
        }
      : current;

  nextWindow.count += 1;
  authRateLimitStore.set(clientKey, nextWindow);

  if (authRateLimitStore.size > MAX_AUTH_RATE_LIMIT_KEYS) {
    authRateLimitStore.delete(clientKey);
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts',
        details: null,
      },
    });
    return;
  }

  if (nextWindow.count > rule.limit) {
    response.setHeader(
      'Retry-After',
      Math.max(1, Math.ceil((nextWindow.resetAtMs - now) / 1000)).toString(),
    );
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts',
        details: null,
      },
    });
    return;
  }

  next();
}

function resolveRouteKey(request: SecurityHeadersRequest): string {
  const pathname = request.path ?? request.url.split('?')[0] ?? request.url;
  return `${request.method.toUpperCase()}:${pathname}`;
}

function resolveClientIp(request: SecurityHeadersRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (isTrustedProxyEnabled() && typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (isTrustedProxyEnabled() && Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}

function isTrustedProxyEnabled(): boolean {
  return ['1', 'true'].includes((process.env.TRUST_PROXY ?? '').trim().toLowerCase());
}

function pruneExpiredRateLimitEntries(now: number): void {
  for (const [key, value] of authRateLimitStore.entries()) {
    if (value.resetAtMs <= now) {
      authRateLimitStore.delete(key);
    }
  }
}

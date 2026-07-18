import type { Env } from './types';

export const DEFAULT_ALLOWED_ORIGIN = 'https://hub.yamanashi.dev';

function isSingleValidOrigin(value: string): boolean {
  if (value === '*' || /[\s,]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
}

function resolveConfiguredOrigin(
  value: string | undefined,
  varName: string,
  options: { sensitive?: boolean } = {}
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (isSingleValidOrigin(trimmed)) {
    return trimmed;
  }

  const detail = options.sensitive ? '(value redacted)' : `"${trimmed}"`;
  console.warn(
    `Invalid ${varName} ${detail}: must be a single http(s) origin with no path, query, wildcard, or additional origins. Ignoring.`
  );
  return undefined;
}

export function getAllowedOrigins(env: Env): string[] {
  const primary = resolveConfiguredOrigin(env.ALLOWED_ORIGIN, 'ALLOWED_ORIGIN') ?? DEFAULT_ALLOWED_ORIGIN;
  const extra = resolveConfiguredOrigin(env.EXTRA_ALLOWED_ORIGIN, 'EXTRA_ALLOWED_ORIGIN', { sensitive: true });

  return extra && extra !== primary ? [primary, extra] : [primary];
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowedOrigins = getAllowedOrigins(env);
  const primaryOrigin = allowedOrigins[0] ?? DEFAULT_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get('Origin');
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : primaryOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

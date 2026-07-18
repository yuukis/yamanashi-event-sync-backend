import type { Env } from './types';

export const DEFAULT_ALLOWED_ORIGIN = 'https://hub.yamanashi.dev';

// ワイルドカードや複数オリジン(カンマ/空白区切り)は許可しない。
// `new URL(value).origin === value` の比較により、パス・クエリ・末尾スラッシュ等が
// 付与された値やワイルドカードも弾かれる。
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

function resolveConfiguredOrigin(value: string | undefined, varName: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (isSingleValidOrigin(trimmed)) {
    return trimmed;
  }

  console.warn(
    `Invalid ${varName} "${trimmed}": must be a single http(s) origin with no path, query, wildcard, or additional origins. Ignoring.`
  );
  return undefined;
}

// 許可オリジンの一覧を返す。先頭が既定の許可オリジン(通常は本番オリジン)、
// 2番目以降は EXTRA_ALLOWED_ORIGIN 等、リポジトリに公開しない追加オリジン。
export function getAllowedOrigins(env: Env): string[] {
  const primary = resolveConfiguredOrigin(env.ALLOWED_ORIGIN, 'ALLOWED_ORIGIN') ?? DEFAULT_ALLOWED_ORIGIN;
  const extra = resolveConfiguredOrigin(env.EXTRA_ALLOWED_ORIGIN, 'EXTRA_ALLOWED_ORIGIN');

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

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

export function getAllowedOrigin(env: Env): string {
  const configured = env.ALLOWED_ORIGIN?.trim();

  if (configured && configured.length > 0) {
    if (isSingleValidOrigin(configured)) {
      return configured;
    }
    console.warn(
      `Invalid ALLOWED_ORIGIN "${configured}": must be a single http(s) origin with no path, query, wildcard, or additional origins. Falling back to default.`
    );
  }

  return DEFAULT_ALLOWED_ORIGIN;
}

export function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(env),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

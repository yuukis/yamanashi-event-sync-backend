import type { Env } from './types';

export const DEFAULT_ALLOWED_ORIGIN = 'https://hub.yamanashi.dev';

export function getAllowedOrigin(env: Env): string {
  const configured = env.ALLOWED_ORIGIN?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGIN;
}

export function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(env),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

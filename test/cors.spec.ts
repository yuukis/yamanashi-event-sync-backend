import { describe, expect, it } from 'vitest';
import { corsHeaders, DEFAULT_ALLOWED_ORIGIN, getAllowedOrigins } from '../src/cors';
import type { Env } from '../src/types';

function buildEnv(overrides: Partial<Env> = {}): Env {
  return { SYNC_KV: {} as Env['SYNC_KV'], ...overrides };
}

function requestWithOrigin(origin: string | undefined): Request {
  const headers = new Headers();
  if (origin !== undefined) {
    headers.set('Origin', origin);
  }
  return new Request('https://example.com/sync', { headers });
}

describe('getAllowedOrigins', () => {
  it('未設定の場合はデフォルトオリジンのみを返す', () => {
    expect(getAllowedOrigins(buildEnv())).toEqual([DEFAULT_ALLOWED_ORIGIN]);
  });

  it('有効なALLOWED_ORIGINが設定されている場合はそれを先頭で返す', () => {
    expect(getAllowedOrigins(buildEnv({ ALLOWED_ORIGIN: 'https://example.com' }))).toEqual(['https://example.com']);
  });

  it('ワイルドカードが設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigins(buildEnv({ ALLOWED_ORIGIN: '*' }))).toEqual([DEFAULT_ALLOWED_ORIGIN]);
  });

  it('有効なEXTRA_ALLOWED_ORIGINが設定されている場合は2件目として追加する', () => {
    expect(
      getAllowedOrigins(
        buildEnv({ ALLOWED_ORIGIN: 'https://hub.yamanashi.dev', EXTRA_ALLOWED_ORIGIN: 'https://dev.example.com' })
      )
    ).toEqual(['https://hub.yamanashi.dev', 'https://dev.example.com']);
  });

  it('不正なEXTRA_ALLOWED_ORIGINは無視される', () => {
    expect(
      getAllowedOrigins(buildEnv({ ALLOWED_ORIGIN: 'https://hub.yamanashi.dev', EXTRA_ALLOWED_ORIGIN: '*' }))
    ).toEqual(['https://hub.yamanashi.dev']);
  });

  it('EXTRA_ALLOWED_ORIGINがALLOWED_ORIGINと同じ場合は重複させない', () => {
    expect(
      getAllowedOrigins(
        buildEnv({ ALLOWED_ORIGIN: 'https://hub.yamanashi.dev', EXTRA_ALLOWED_ORIGIN: 'https://hub.yamanashi.dev' })
      )
    ).toEqual(['https://hub.yamanashi.dev']);
  });
});

describe('corsHeaders', () => {
  const env = buildEnv({ ALLOWED_ORIGIN: 'https://hub.yamanashi.dev', EXTRA_ALLOWED_ORIGIN: 'https://dev.example.com' });

  it('リクエストのOriginが許可オリジンと一致する場合はそれを反映する(本番オリジン)', () => {
    const headers = corsHeaders(requestWithOrigin('https://hub.yamanashi.dev'), env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://hub.yamanashi.dev');
  });

  it('リクエストのOriginが許可オリジンと一致する場合はそれを反映する(追加オリジン)', () => {
    const headers = corsHeaders(requestWithOrigin('https://dev.example.com'), env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://dev.example.com');
  });

  it('リクエストのOriginが許可リストにない場合は既定オリジンを返す', () => {
    const headers = corsHeaders(requestWithOrigin('https://evil.example.com'), env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://hub.yamanashi.dev');
  });

  it('Originヘッダーがない場合は既定オリジンを返す', () => {
    const headers = corsHeaders(requestWithOrigin(undefined), env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://hub.yamanashi.dev');
  });

  it('Vary: Origin を付与する', () => {
    const headers = corsHeaders(requestWithOrigin(undefined), env);
    expect(headers['Vary']).toBe('Origin');
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_ALLOWED_ORIGIN, getAllowedOrigin } from '../src/cors';
import type { Env } from '../src/types';

function envWithOrigin(allowedOrigin: string | undefined): Env {
  return { SYNC_KV: {} as Env['SYNC_KV'], ALLOWED_ORIGIN: allowedOrigin };
}

describe('getAllowedOrigin', () => {
  it('未設定の場合はデフォルトオリジンを返す', () => {
    expect(getAllowedOrigin(envWithOrigin(undefined))).toBe(DEFAULT_ALLOWED_ORIGIN);
  });

  it('有効な単一オリジンが設定されている場合はそれを返す', () => {
    expect(getAllowedOrigin(envWithOrigin('https://example.com'))).toBe('https://example.com');
  });

  it('ワイルドカード("*")が設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigin(envWithOrigin('*'))).toBe(DEFAULT_ALLOWED_ORIGIN);
  });

  it('カンマ区切りの複数オリジンが設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigin(envWithOrigin('https://a.example.com,https://b.example.com'))).toBe(
      DEFAULT_ALLOWED_ORIGIN
    );
  });

  it('空白区切りの複数オリジンが設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigin(envWithOrigin('https://a.example.com https://b.example.com'))).toBe(
      DEFAULT_ALLOWED_ORIGIN
    );
  });

  it('パスを含む値が設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigin(envWithOrigin('https://example.com/path'))).toBe(DEFAULT_ALLOWED_ORIGIN);
  });

  it('不正なURLが設定されている場合はデフォルトにフォールバックする', () => {
    expect(getAllowedOrigin(envWithOrigin('not-a-url'))).toBe(DEFAULT_ALLOWED_ORIGIN);
  });
});

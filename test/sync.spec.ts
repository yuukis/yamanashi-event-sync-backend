import { env, SELF } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';

const ORIGIN = 'http://localhost';

function postSync(body: unknown, init?: RequestInit) {
  return SELF.fetch(`${ORIGIN}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
}

function getSync(code: string) {
  return SELF.fetch(`${ORIGIN}/sync/${code}`, { method: 'GET' });
}

describe('POST /sync', () => {
  it('発行したコードでデータを1回だけ取得できる', async () => {
    const payload = { version: 1, uids: ['event_383282@connpass.com', 'event_384783@connpass.com'] };

    const postResponse = await postSync(payload);
    expect(postResponse.status).toBe(200);

    const postBody = await postResponse.json<{ code: string; expires_at: string }>();
    expect(postBody.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(postBody.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/);

    const getResponse = await getSync(postBody.code);
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers.get('Cache-Control')).toBe('no-store');
    const getBody = await getResponse.json();
    expect(getBody).toEqual(payload);

    // 一度きりの取得: 再取得は404になる
    const secondGetResponse = await getSync(postBody.code);
    expect(secondGetResponse.status).toBe(404);
  });

  it('レスポンスにCache-Control: no-storeが設定される', async () => {
    const response = await postSync({ version: 1, uids: ['event_1@connpass.com'] });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('小文字のコードでも取得できる(大文字小文字を区別しない)', async () => {
    const payload = { version: 1, uids: ['event_1@connpass.com'] };
    const postResponse = await postSync(payload);
    const { code } = await postResponse.json<{ code: string }>();

    const getResponse = await getSync(code.toLowerCase());
    expect(getResponse.status).toBe(200);
  });

  it('空のuids配列は400になる', async () => {
    const response = await postSync({ version: 1, uids: [] });
    expect(response.status).toBe(400);
  });

  it('uidsが存在しない場合は400になる', async () => {
    const response = await postSync({ version: 1 });
    expect(response.status).toBe(400);
  });

  it('uidsに文字列以外が含まれる場合は400になる', async () => {
    const response = await postSync({ version: 1, uids: ['ok', 123] });
    expect(response.status).toBe(400);
  });

  it('versionが1以外の場合は400になる', async () => {
    const response = await postSync({ version: 2, uids: ['event_1@connpass.com'] });
    expect(response.status).toBe(400);
  });

  it('不正なJSONの場合は400になる', async () => {
    const response = await SELF.fetch(`${ORIGIN}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    expect(response.status).toBe(400);
  });

  it('ペイロードが上限サイズを超える場合は413になる', async () => {
    const payload = { version: 1, uids: Array.from({ length: 20000 }, (_, i) => `event_${i}@connpass.com`) };
    const response = await postSync(payload);
    expect(response.status).toBe(413);
  });
});

describe('GET /sync/:code', () => {
  it('存在しないコードの取得は404になる', async () => {
    const response = await getSync('ZZZZZZ');
    expect(response.status).toBe(404);
  });

  it('コード形式が不正な場合は404になる', async () => {
    const response = await getSync('!!!');
    expect(response.status).toBe(404);
  });

  it('KVのdelete失敗時もデータ自体は200で返す', async () => {
    const payload = { version: 1, uids: ['event_1@connpass.com'] };
    const postResponse = await postSync(payload);
    const { code } = await postResponse.json<{ code: string }>();

    const deleteSpy = vi.spyOn(env.SYNC_KV, 'delete').mockRejectedValueOnce(new Error('KV unavailable'));

    const getResponse = await getSync(code);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual(payload);

    deleteSpy.mockRestore();
  });

  it('404レスポンスのエラーメッセージ表記が統一されている', async () => {
    const notExistResponse = await getSync('ZZZZZZ');
    const invalidFormatResponse = await getSync('!!!');
    const unknownRouteResponse = await SELF.fetch(`${ORIGIN}/unknown`, { method: 'GET' });

    const bodies = await Promise.all(
      [notExistResponse, invalidFormatResponse, unknownRouteResponse].map((res) => res.json<{ error: string }>())
    );

    for (const body of bodies) {
      expect(body.error).toBe('Not Found');
    }
  });
});

describe('CORS', () => {
  it('OPTIONSリクエストにCORSヘッダーを返す', async () => {
    const response = await SELF.fetch(`${ORIGIN}/sync`, { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://hub.yamanashi.dev');
  });
});

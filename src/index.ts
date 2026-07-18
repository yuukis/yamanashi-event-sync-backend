import { generateUniqueCode, CODE_CHARSET, CODE_LENGTH } from './code';
import { corsHeaders } from './cors';
import { isValidSyncPayload, formatExpiresAt, MAX_PAYLOAD_BYTES, TTL_SECONDS } from './sync';
import type { Env } from './types';

const CODE_PATTERN = new RegExp(`^[${CODE_CHARSET}]{${CODE_LENGTH}}$`);

// 発行コード・同期データはいずれも一度きり利用が前提のため、
// 中間キャッシュ等に残らないよう明示的にキャッシュを禁止する。
function responseHeaders(env: Env): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...corsHeaders(env),
  };
}

function jsonResponse(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(env),
  });
}

async function handlePostSync(request: Request, env: Env): Promise<Response> {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return jsonResponse({ error: 'Payload too large' }, 413, env);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
    return jsonResponse({ error: 'Payload too large' }, 413, env);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, env);
  }

  if (!isValidSyncPayload(payload)) {
    return jsonResponse({ error: 'Invalid payload' }, 400, env);
  }

  const code = await generateUniqueCode(env.SYNC_KV);
  await env.SYNC_KV.put(code, rawBody, { expirationTtl: TTL_SECONDS });

  const expiresAt = formatExpiresAt(Date.now() + TTL_SECONDS * 1000);

  return jsonResponse({ code, expires_at: expiresAt }, 200, env);
}

async function handleGetSync(rawCode: string, env: Env): Promise<Response> {
  const code = rawCode.toUpperCase();

  if (!CODE_PATTERN.test(code)) {
    return jsonResponse({ error: 'Not Found' }, 404, env);
  }

  const value = await env.SYNC_KV.get(code);
  if (value === null) {
    return jsonResponse({ error: 'Not Found' }, 404, env);
  }

  // 一度きりの取得: 返却後は即座に削除する
  await env.SYNC_KV.delete(code);

  return new Response(value, {
    status: 200,
    headers: responseHeaders(env),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method === 'POST' && url.pathname === '/sync') {
      try {
        return await handlePostSync(request, env);
      } catch (err) {
        console.error(err);
        return jsonResponse({ error: 'Internal Server Error' }, 500, env);
      }
    }

    const getSyncMatch = url.pathname.match(/^\/sync\/([^/]+)$/);
    if (request.method === 'GET' && getSyncMatch) {
      const code = getSyncMatch[1];
      if (code === undefined) {
        return jsonResponse({ error: 'Not Found' }, 404, env);
      }
      try {
        return await handleGetSync(code, env);
      } catch (err) {
        console.error(err);
        return jsonResponse({ error: 'Internal Server Error' }, 500, env);
      }
    }

    return jsonResponse({ error: 'Not Found' }, 404, env);
  },
} satisfies ExportedHandler<Env>;

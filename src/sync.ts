import type { SyncPayload } from './types';

export const MAX_PAYLOAD_BYTES = 100 * 1024;
export const TTL_SECONDS = 600;

export function isValidSyncPayload(payload: unknown): payload is SyncPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  if (candidate.version !== 1) {
    return false;
  }

  if (!Array.isArray(candidate.uids) || candidate.uids.length === 0) {
    return false;
  }

  return candidate.uids.every((uid) => typeof uid === 'string');
}

export function formatExpiresAt(expiresAtMs: number): string {
  // 中継サーバー・フロントエンドともに山梨県内での利用を前提としているため、
  // タイムゾーンは JST (+09:00) に固定してフォーマットする。
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const jst = new Date(expiresAtMs + JST_OFFSET_MS);

  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = jst.getUTCFullYear();
  const mm = pad(jst.getUTCMonth() + 1);
  const dd = pad(jst.getUTCDate());
  const hh = pad(jst.getUTCHours());
  const mi = pad(jst.getUTCMinutes());
  const ss = pad(jst.getUTCSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
}

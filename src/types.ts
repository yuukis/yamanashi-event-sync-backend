export interface Env {
  SYNC_KV: KVNamespace;
  ALLOWED_ORIGIN?: string;
  // 開発環境などの追加許可オリジン。リポジトリに公開したくない値のため
  // wrangler.toml の [vars] には書かず、`wrangler secret put` で設定する。
  EXTRA_ALLOWED_ORIGIN?: string;
}

export interface SyncPayload {
  version: 1;
  uids: string[];
}

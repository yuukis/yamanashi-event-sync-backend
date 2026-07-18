export interface Env {
  SYNC_KV: KVNamespace;
  ALLOWED_ORIGIN?: string;
}

export interface SyncPayload {
  version: 1;
  uids: string[];
}

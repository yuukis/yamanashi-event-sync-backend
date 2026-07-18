/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { Env as WorkerEnv } from '../src/types';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends WorkerEnv {}
}

// `cloudflare:test`'s `env` export is typed as `Cloudflare.Env`, which is normally
// populated by `wrangler types`. Extend it here so `env.SYNC_KV` type-checks in tests.
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {}
  }
}

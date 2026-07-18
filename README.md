# yamanashi-event-sync-backend

A short-lived relay server used by the [yamanashi-event-frontend](https://github.com/yuukis/yamanashi-event-frontend) multi-device sync feature ([frontend#60](https://github.com/yuukis/yamanashi-event-frontend/issues/60)).

Built on Cloudflare Workers + Workers KV. Data (such as a list of "planning to attend" event UIDs) is registered and issued a 6-character code, which can then be read on another device to retrieve the original data. Data is stored in KV for 10 minutes only and is deleted once retrieved. This service has no authentication or account features — it is for anonymous, one-time use only.

Note: retrieval is best-effort one-time due to Workers KV's eventually-consistent nature; a duplicate read from another PoP shortly after the first is theoretically possible.

## API

### `POST /sync`

Registers data and issues a 6-character code.

Request body (JSON, 100KB limit):

```json
{ "version": 1, "uids": ["event_383282@connpass.com", "event_384783@connpass.com"] }
```

- `uids` must be a non-empty array of strings
- `version` must be `1`

Response (200):

```json
{ "code": "A3K9P2", "expires_at": "2026-07-18T12:10:00+09:00" }
```

Errors:

- `400` — invalid request body (malformed JSON, `version` mismatch, empty or invalid `uids`)
- `413` — payload exceeds 100KB

### `GET /sync/:code`

Retrieves the data associated with a code. `code` is case-insensitive.

- On a successful retrieval, the data for that code is immediately deleted from KV (one-time retrieval)
- Returns `404` if the code does not exist, has expired, or was already retrieved

Response (200):

```json
{ "version": 1, "uids": ["event_383282@connpass.com", "event_384783@connpass.com"] }
```

## Local development

```bash
npm install
npm run dev
```

`wrangler dev` starts the Worker locally (using a local KV store automatically).

### Tests

```bash
npm test
```

Runs tests inside the Workers runtime via `vitest` + `@cloudflare/vitest-pool-workers`.

### Type checking

```bash
npm run typecheck
```

## Deployment

```bash
npx wrangler login

# First time only: create the KV namespace and set the resulting IDs in wrangler.toml
npx wrangler kv namespace create SYNC_KV
npx wrangler kv namespace create SYNC_KV --preview

npm run deploy
```

Replace the `id` / `preview_id` values in the `[[kv_namespaces]]` section of `wrangler.toml` with the namespace IDs created by the commands above.

## Environment variables

| Variable               | Description                                                                    | Default                     |
| ----------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `ALLOWED_ORIGIN`       | CORS-allowed origin (a single origin only; wildcards are not supported)          | `https://hub.yamanashi.dev` |
| `EXTRA_ALLOWED_ORIGIN` | An additional CORS-allowed origin (also a single origin; optional)               | _(none)_                     |

`ALLOWED_ORIGIN` is set in the `[vars]` section of `wrangler.toml` and is public (visible in this repository). To prevent abuse of this service for relaying data from arbitrary origins, wildcards (`*`) and multiple origins in one variable are intentionally unsupported — each variable holds exactly one origin.

`EXTRA_ALLOWED_ORIGIN` is meant for an origin you don't want to expose in the repo (e.g. an internal dev environment hostname). Set it as a Cloudflare **secret** instead of a `[vars]` entry, so it's never committed:

```bash
npx wrangler secret put EXTRA_ALLOWED_ORIGIN
```

For local development, put it in a `.dev.vars` file (already gitignored) instead:

```
EXTRA_ALLOWED_ORIGIN=https://your-dev-host.example.com
```

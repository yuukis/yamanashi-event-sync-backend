# yamanashi-event-sync-backend

[yamanashi-event-frontend](https://github.com/yuukis/yamanashi-event-frontend) の複数端末間同期機能([frontend#60](https://github.com/yuukis/yamanashi-event-frontend/issues/60))が利用する、短命な一時中継サーバーです。

Cloudflare Workers + Workers KV で実装されています。発行された6桁のコードを別端末で読み取ると、元のデータ(参加予定マークのUID一覧など)が取得できます。データはKVに10分間だけ保存され、一度取得されると即座に削除されます。認証やアカウント機能は持たない、匿名・一時利用のみのサービスです。

## API

### `POST /sync`

データを登録し、6桁のコードを発行します。

リクエストボディ(JSON、上限100KB):

```json
{ "version": 1, "uids": ["event_383282@connpass.com", "event_384783@connpass.com"] }
```

- `uids` は空でない文字列配列である必要があります
- `version` は `1` 固定です

レスポンス(200):

```json
{ "code": "A3K9P2", "expires_at": "2026-07-18T12:10:00+09:00" }
```

エラー:

- `400` — リクエストボディが不正(JSONとして不正、`version` 不一致、`uids` が空または不正)
- `413` — ペイロードが100KBを超過

### `GET /sync/:code`

コードに対応するデータを取得します。`code` は大文字小文字を区別しません。

- 取得に成功すると、そのコードのデータはKVから即座に削除されます(一度きりの取得)
- 存在しない・期限切れ・取得済みのコードを指定した場合は `404` を返します

レスポンス(200):

```json
{ "version": 1, "uids": ["event_383282@connpass.com", "event_384783@connpass.com"] }
```

## ローカル開発

```bash
npm install
npm run dev
```

`wrangler dev` がローカルでWorkerを起動します(ローカルKVを自動的に使用します)。

### テスト

```bash
npm test
```

`vitest` + `@cloudflare/vitest-pool-workers` により、Workersランタイム上でテストを実行します。

### 型チェック

```bash
npm run typecheck
```

## デプロイ

```bash
npx wrangler login

# 初回のみ: KV Namespaceを作成し、出力されたIDを wrangler.toml に設定する
npx wrangler kv namespace create SYNC_KV
npx wrangler kv namespace create SYNC_KV --preview

npm run deploy
```

`wrangler.toml` の `[[kv_namespaces]]` セクションにある `id` / `preview_id` を、上記コマンドで作成したNamespaceのIDに置き換えてください。

## 環境変数

| 変数名           | 説明                                                                 | デフォルト値                  |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------ |
| `ALLOWED_ORIGIN` | CORSで許可するオリジン(単一のオリジンのみ指定可能。ワイルドカード不可) | `https://hub.yamanashi.dev` |

`wrangler.toml` の `[vars]` セクション、または `wrangler deploy` 時の環境ごとの設定で上書きできます。任意のオリジンからのデータ中継を防ぐため、ワイルドカード(`*`)は指定できない運用とし、必ず単一のオリジンを設定してください。

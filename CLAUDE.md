# x-harness-oss 開発ルール

## 役割分担（絶対に守ること）

### Cloudflare Worker／Pages の責務
- DBの読み書き（D1）
- Claude APIによる分析
- UIの表示・データ配信
- ダッシュボードからの「指示」をDBに記録する

### ローカル MCP の責務（ユーザーのマシン上で動く Node.js プロセス）
- Xのスクレイピング（`@the-convocation/twitter-scraper` によるクッキー認証）
- Xへの投稿（クッキー認証）
- DBの未処理タスクを監視して実行し、結果をWorker経由でDBに書き戻す

### 絶対禁止
- Worker から X に向けた fetch を書く（`api.twitter.com` も `x.com/i/api` も）
  → CloudflareのIPはXにブロックされ空レスポンスが返る
- X 公式 API（OAuth）を使う → すべてクッキースクレイピングで代替

## コミュニケーション構造

```
[ダッシュボード] ──指示をDBに書く──▶ [Worker / D1]
[ダッシュボード] ◀──結果を表示────── [Worker / D1]
                                          ↑↓ ポーリング
                                    [ローカルMCP]  ──クッキーでスクレイピング──▶ X
                                  （ユーザーのマシン）
```

## デプロイ

```bash
# Web（変更後は毎回必須）
cd apps/web && pnpm build
cd /Users/besus/Sites/Claude/x-harness-oss && wrangler pages deploy apps/web/out --project-name x-harness-oss

# Worker
cd apps/worker && wrangler deploy
```

確認URL: https://x-harness-oss.pages.dev/
ローカル環境は使わない。

## ファイル読み込みルール（トークン節約）

- 200行超のファイルは全読みしない。`grep` か `smart_outline` で当たりをつけてから `Read` の `offset` / `limit` で該当範囲のみ読む
- 広域検索は `Explore` subagent に投げて、結果のサマリだけ受け取る
- PM2 ログは `--lines 10〜15` で十分（同じ行の繰り返しが多い）。さらに絞るときは `grep` で
- 大きな JSON レスポンスは `-o /tmp/xxx.json` に保存し、`python3` / `jq` で必要なフィールドだけ抽出する
- このリポジトリの代表的な巨大ファイル（参考、全読み厳禁）:
  - `apps/web/src/app/campaign/page.tsx` (約1,100行)
  - `apps/worker/src/routes/posts.ts` (約820行)
  - `apps/web/src/app/posts/page.tsx` (約820行)

## セッション分割の指針

- 1セッション = 1タスク（コミットでクローズできる粒度）
- 調査が長引いたら、コミット → 新セッションで実装
- 累積 50k トークンを超えたら一度 `/clear` するか新セッションへ移る

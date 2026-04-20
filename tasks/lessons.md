# 教訓メモ（同じミスをしないために）

## ルール1: コード修正だけでは既存DBデータは変わらない
- データ生成パイプラインのバグを直したら、**必ずDBの古いデータを削除して再生成する**
- 例: daily_reportの日付・いいね数フィルターを直した → 既存レコードを消してMCPで再実行しないと画面に反映されない

## ルール2: daily_report修正後の確認手順
1. 古いdaily_reportレコードをDBから削除（`DELETE FROM collected_posts WHERE query = 'daily_report'`）
2. MCP `generate_daily_report` ツールで再生成
3. ダッシュボードでdateが正しいか・いいね0件がないか確認

## ルール3: Twitterの日付フォーマット
- v1.1 APIは `"Thu Apr 10 12:34:56 +0000 2025"` 形式で返す
- DBに保存する前に `new Date(t.created_at).toISOString()` でISO変換する
- 変換しないと一部環境でパースエラーになる

## ルール4: デプロイ後の確認
- Workerをデプロイしただけでは画面（Cloudflare Pages）は更新されない
- `pnpm --filter web build` → `wrangler pages deploy out --branch=main` の両方が必要

## ルール6: MCPからWorkerにデータを渡す場合もフィルターを適用する
- `report.ts` でスクレイパー結果をWorkerに渡す際、min_likes/min_retweetsをMCP側で先に適用する
- Worker側の `/api/search-themes/run` は body.tweets があると Worker 内フィルターをスキップする設計
- フィルターは「データを生成する場所」で必ずかける

## ルール7: Worker の execute 結果の型
- `POST /api/posts/pending/execute` は `{ success: true, data: [...] }` （配列直接）を返す
- フロントは `res.data?.results` ではなく `res.data as any[]` で受け取る

## ルール8: スケジュール実行の ct0 は毎回 refreshCt0() で取得する
- TWITTER_CT0 環境変数は固定値なのですぐ期限切れになる
- scheduled() 内でも authToken さえあれば refreshCt0() で最新 ct0 を取得できる

## ルール5: フィルター条件はコードとDBデータの両方で確認
- min_likes/min_retweetsの閾値フィルターを追加しても、既存の0いいねレコードは残る
- 修正後は必ず既存データを消してから動作確認する

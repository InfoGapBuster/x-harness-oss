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

## ルール5: フィルター条件はコードとDBデータの両方で確認
- min_likes/min_retweetsの閾値フィルターを追加しても、既存の0いいねレコードは残る
- 修正後は必ず既存データを消してから動作確認する

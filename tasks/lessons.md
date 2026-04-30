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

## ルール8: ct0 は scraper のクッキーから直接取得する（旧 refreshCt0 は廃止）
- `verify_credentials.json` は X 側で廃止済み。auth_token だけで叩くと「ゲストセッション扱い」になり guest 用 ct0 (CSRF 不一致) が返る
- その guest ct0 を使って CreateTweet を叩くと **401 "Could not authenticate (32)"** で失敗する
- 正解: `scraper.getCookies()` から auth_token と ct0 をペアで取得する。クッキーは常にペアで保存されているので別経路で refresh する必要はない
- 該当コミット: 2026-04-27 `packages/mcp/src/tools/post.ts` の `refreshCt0()` を削除

## ルール9: X の「日次上限 (code 344)」は失敗試行とセッション信頼度で決まる
- 1日2400件は名目上の上限。実際は **失敗POST + クッキーの新しさ + 異常検知** で動的に絞られる
- 短時間に 401 を量産すると「不審セッション」と判定され、新規クッキーは数件で上限到達することがある
- 症状: HTTP 200 + `{"errors":[{"code":344,"message":"daily limit"}]}`
- 対処:
  1. 24時間ほど書き込みを止めてセッション信頼度を回復させる
  2. ブラウザから新しい auth_token / ct0 を取り直す
  3. デーモン (`pm2 stop x-harness-daemon`) も止めて余計な試行をしない

## ルール5: フィルター条件はコードとDBデータの両方で確認
- min_likes/min_retweetsの閾値フィルターを追加しても、既存の0いいねレコードは残る
- 修正後は必ず既存データを消してから動作確認する

## ルール10: 引用RTを連投すると X が tweet_results 空オブジェクトを返す
- 同種の引用RTを短時間に連続で送ると、2件目以降は HTTP 200 で `{"data":{"create_tweet":{"tweet_results":{}}}}` が返る（投稿は作成されない）
- これはエラーではなく X 側のスパムフィルターによる無音拒否
- 対処: `execute_pending_posts` は複数件あるとき各投稿の間に **5分待機** を挿入する（`POST_INTERVAL_MS = 5 * 60 * 1000`）
- 待機中は次のポーリングが重ならないよう daemon に `isPolling` ガードを設置している
- 該当コミット: 2026-04-29 `packages/mcp/src/tools/post.ts` / `daemon.ts`

#!/usr/bin/env node
/**
 * x-harness ポーリングデーモン
 * ダッシュボードからの generate_daily_report / execute_pending_posts 指示を
 * 10分ごとに検出してローカルで実行する。
 *
 * 起動: node dist/daemon.js
 * 常駐: pm2 start dist/daemon.js --name x-harness-daemon
 */

import { XHarnessClient } from './client.js';
import { handleCommandTool } from './tools/commands.js';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10分

const API_URL = process.env.X_HARNESS_API_URL ?? 'http://localhost:8787';
const API_KEY = process.env.X_HARNESS_API_KEY ?? '';
const X_ACCOUNT_ID = process.env.X_ACCOUNT_ID ?? '';

if (!X_ACCOUNT_ID) {
  console.error('[daemon] X_ACCOUNT_ID が未設定です。環境変数に設定してください。');
  process.exit(1);
}

const client = new XHarnessClient(API_URL, API_KEY);

let isPolling = false;

async function poll() {
  if (isPolling) return; // 前回のポーリングが投稿間隔待機などで継続中ならスキップ
  isPolling = true;
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  try {
    const result = await handleCommandTool(
      'process_pending_commands',
      { xAccountId: X_ACCOUNT_ID },
      client,
    );
    if (!result.includes('未処理コマンドはありません')) {
      console.log(`[${now}] ${result}`);
    }
  } catch (err: any) {
    console.error(`[${now}] ポーリングエラー: ${err.message}`);
  } finally {
    isPolling = false;
  }
}

console.log(`[daemon] 起動しました。${POLL_INTERVAL_MS / 60000}分ごとにポーリングします。`);
console.log(`[daemon] API: ${API_URL} / Account: ${X_ACCOUNT_ID}`);

poll(); // 起動時にすぐ実行
setInterval(poll, POLL_INTERVAL_MS);

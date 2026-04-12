import { DbCollectedPost } from '@x-harness/db';

export function generateEmailReport(posts: any[]): string {
  const date = new Date().toLocaleDateString('ja-JP');
  let body = `【X-Harness 今朝の注目ポストレポート - ${date}】\n\n`;
  body += `本日厳選した10件のポストをお届けします。管理画面から引用RTや返信が可能です。\n`;
  body += `--------------------------------------------------\n\n`;

  posts.forEach((p, i) => {
    body += `${i + 1}. @${p.authorUsername || 'unknown'} のポスト\n`;
    body += `本文: ${p.text}\n`;
    body += `反響: ❤️ ${p.publicMetrics?.like_count || 0}  🔁 ${p.publicMetrics?.retweet_count || 0}\n`;
    body += `\n【AI解説】\n${p.commentary || '解説なし'}\n`;
    body += `\n【返信ポスト案】\n${p.replyDraft || '案なし'}\n`;
    body += `リンク: https://x.com/i/status/${p.id}\n`;
    body += `--------------------------------------------------\n\n`;
  });

  body += `\n管理画面でアクションを実行する:\nhttps://your-worker-url.workers.dev/admin\n`;

  return body;
}

/**
 * 送信処理の雛形（ResendやSendGrid、あるいはGmail APIなどのAPIを叩く想定）
 */
export async function sendEmail(apiKey: string, to: string, subject: string, content: string): Promise<void> {
  // ここでは例として Resend API (https://resend.com) などの汎用的なAPIを叩く例を示します
  // ユーザーの環境に合わせて Gmail API などに差し替え可能です
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'X-Harness <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: content,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Failed to send email:', error);
  }
}

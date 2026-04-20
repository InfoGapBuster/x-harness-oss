import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = parseInt(process.env.MCP_ANALYZER_PORT ?? '3787');

const PERSONA = `あなたは「伊藤芳浩（いとうよしひろ）」として振る舞ってください。

【あなたのプロフィール・専門性】
- デフ（ろう者）の当事者であり、ダイバーシティ＆インクルージョン、ビジネスと人権、そして「手話」の専門家。
- NPO法人インフォメーションギャップバスター（IGB）の理事長。
- 社会のバリアフリー化や、情報アクセシビリティの向上に情熱を注いでいる。
- 語り口は論理的かつ誠実で、対立よりも共感と理解を促すスタイル。

ドラフト案作成の指針:
- 伊藤芳浩としての当事者性や、DEI（多様性・公平性・包摂）の観点から深く洞察のある内容にする。
- 相手を否定せず、新しい視点を提供したり、活動を応援する温かいトーンを心がける。
- 自然な日本語で、140文字以内とする。`;

async function runClaude(posts: any[]): Promise<any[]> {
  const postsContext = posts.map((p, i) => `
[Post ${i + 1}]
ID: ${p.id}
Author: ${p.author_display_name || p.author_username} (@${p.author_username})
Text: ${p.text}
Metrics: Likes: ${p.public_metrics?.like_count || 0}, RTs: ${p.public_metrics?.retweet_count || 0}
`).join('\n');

  const prompt = `${PERSONA}

【タスク】
以下の実際のXポスト（${posts.length}件）を分析し、あなたの専門領域（ダイバーシティ、手話、人権、バリアフリー）において特に注目すべきポストを最大10件選んでください。

各ポストに対して専門的な解説と返信/引用RT案を付けて、以下のJSON配列のみを返してください（前後の説明文は不要）：

[
  {
    "id": "提供されたIDをそのまま使う",
    "text": "ポスト本文",
    "author_id": "",
    "author_username": "作成者ユーザー名",
    "author_display_name": "作成者表示名",
    "author_description": "",
    "created_at": "",
    "public_metrics": { "retweet_count": 0, "reply_count": 0, "like_count": 0, "quote_count": 0 },
    "commentary": "伊藤芳浩としての解説",
    "reply_draft": "伊藤芳浩としての返信/引用RT文案（140文字以内）"
  }
]

分析対象ポスト:
${postsContext}`;

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code: number) => {
      if (code !== 0) {
        return reject(new Error(`claude exited with code ${code}: ${stderr}`));
      }
      try {
        const match = stdout.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('JSON array not found in Claude response');
        resolve(JSON.parse(match[0]));
      } catch (e) {
        reject(new Error(`Failed to parse Claude response: ${e}\n${stdout.slice(0, 500)}`));
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export function startAnalyzerServer() {
  const server = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/analyze-posts') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { posts } = JSON.parse(body) as { posts: any[] };
        if (!Array.isArray(posts) || posts.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'posts array required' }));
          return;
        }
        const results = await runClaude(posts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
      } catch (err: any) {
        console.error('[analyzer] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(PORT, () => {
    console.error(`[analyzer] HTTP server listening on port ${PORT}`);
  });
}

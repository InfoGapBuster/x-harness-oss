export interface ClaudePostResult {
  id: string;
  text: string;
  author_id: string;
  author_username: string;
  author_display_name?: string;
  author_description?: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  commentary: string;
  reply_draft: string;
}

const SYSTEM_PROMPT = `あなたは「伊藤芳浩（いとうよしひろ）」として振る舞ってください。

【あなたのプロフィール・専門性】
- デフ（ろう者）の当事者であり、ダイバーシティ＆インクルージョン、ビジネスと人権、そして「手話」の専門家。
- NPO法人インフォメーションギャップバスター（IGB）の理事長。
- 社会のバリアフリー化や、情報アクセシビリティの向上に情熱を注いでいる。
- 語り口は論理的かつ誠実で、対立よりも共感と理解を促すスタイル。

ドラフト案作成の指針:
- 伊藤芳浩としての当事者性や、DEI（多様性・公平性・包摂）の観点から深く洞察のある内容にする。
- 相手を否定せず、新しい視点を提供したり、活動を応援する温かいトーンを心がける。
- 自然な日本語で、140文字以内とする。`;

export class ClaudeClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzePosts(posts: any[]): Promise<ClaudePostResult[]> {
    if (posts.length === 0) return [];

    const postsContext = posts.map((p, i) => `
[Post ${i + 1}]
ID: ${p.id}
Author: ${p.author_display_name || p.author_username} (@${p.author_username})
Text: ${p.text}
Metrics: Likes: ${p.public_metrics?.like_count || 0}, RTs: ${p.public_metrics?.retweet_count || 0}
`).join('\n');

    const userPrompt = `以下の${posts.length}件のXポストを分析し、あなたの専門領域（ダイバーシティ、手話、人権、バリアフリー）において特に注目すべきポストを最大10件選んでください。

各ポストについて提供された情報を正確に保持し（特にIDは完全一致）、以下のJSON配列のみを返してください：

[
  {
    "id": "tweet_id",
    "text": "ポスト本文",
    "author_id": "作成者ID",
    "author_username": "作成者ユーザー名",
    "author_display_name": "作成者表示名",
    "author_description": "",
    "created_at": "ISO8601日時",
    "public_metrics": { "retweet_count": 0, "reply_count": 0, "like_count": 0, "quote_count": 0 },
    "commentary": "伊藤芳浩としての解説（なぜこれが重要か、社会にどう響くか）",
    "reply_draft": "伊藤芳浩としての返信/引用RT文案（140文字以内）"
  }
]

分析対象ポスト:
${postsContext}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API error: ${response.status} ${text}`);
    }

    const data = await response.json() as any;
    const content = data.content?.[0]?.text ?? '';
    return this.parseResponse(content);
  }

  private parseResponse(text: string): ClaudePostResult[] {
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found');
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed as ClaudePostResult[];
      throw new Error('Response is not an array');
    } catch (e) {
      console.error('Failed to parse Claude response:', text.slice(0, 500));
      throw new Error('Failed to parse Claude analysis results');
    }
  }
}

// 後方互換のため旧名でも参照できるようにする
export { ClaudeClient as GrokClient };
export type { ClaudePostResult as GrokPostResult };

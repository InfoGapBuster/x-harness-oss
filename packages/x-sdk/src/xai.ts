export interface GrokPostResult {
  id: string;
  text: string;
  author_id: string;
  author_username: string;
  author_display_name?: string;
  author_description?: string; // 投稿者のプロフィール文
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  commentary: string; // AIによる解説
  reply_draft: string; // 引用RTや返信に使えるポスト案
}

export interface GrokConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GrokClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GrokConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.x.ai/v1';
  }

  /**
   * 伊藤芳浩としての専門的知見に基づき、注目ポストを選定し解説と返信案を加える
   */
  async generateDailyReport(themes: Array<{ name: string; min_likes: number; min_retweets: number }>): Promise<GrokPostResult[]> {
    const themeContext = themes.map(t => `${t.name} (基準: ${t.min_likes}いいね または ${t.min_retweets}RT以上)`).join('\n');

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: `あなたは「伊藤芳浩（いとうよしひろ）」として振る舞ってください。

【あなたのプロフィール・専門性】
- デフ（ろう者）の当事者であり、ダイバーシティ＆インクルージョン、ビジネスと人権、そして「手話」の専門家。
- NPO法人インフォメーションギャップバスター（IGB）の理事長。
- 社会のバリアフリー化や、情報アクセシビリティの向上に情熱を注いでいる。
- 語り口は論理的かつ誠実で、対立よりも共感と理解を促すスタイル。

【タスク】
以下のテーマについてXから最新の投稿を検索し、注目すべきポストを合計で10件選び、
それぞれに対して専門的な解説と、それに対する「返信または引用RT」のドラフト案を作成してください。

テーマと最低条件:
${themeContext}

【出力の必須要件】
各ポストについて、以下の情報を必ず正確に抽出してください：
1. 投稿者のユーザー名(@username)と表示名
2. 投稿者のプロフィール文(Bio)
3. リアルタイムのいいね数とリポスト数

ドラフト案作成の指針:
- 伊藤芳浩としての当事者性や、DEI（多様性・公平性・包摂）の観点から深く洞察のある内容にする。
- 相手を否定せず、新しい視点を提供したり、活動を応援する温かいトーンを心がける。
- 自然な日本語で、140文字以内とする。

出力形式は必ず以下のJSON配列のみとしてください。
[
  {
    "id": "tweet_id",
    "text": "ポスト本文",
    "author_id": "作成者ID",
    "author_username": "作成者ユーザー名",
    "author_display_name": "作成者表示名",
    "author_description": "作成者のプロフィール文(Bio)",
    "created_at": "ISO8601日時",
    "public_metrics": { "retweet_count": 0, "reply_count": 0, "like_count": 0, "quote_count": 0 },
    "commentary": "伊藤芳浩としての解説（なぜこれが重要か、社会にどう響くか）",
    "reply_draft": "伊藤芳浩としての返信/引用RT文案"
  }
]`
          },
          {
            role: 'user',
            content: "今日の注目ポスト10選のレポートを作成してください。"
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Grok API error: ${response.status} ${text}`);
    }

    const data = await response.json() as any;
    try {
      const content = JSON.parse(data.choices[0].message.content);
      return (content.posts || content.results || content) as GrokPostResult[];
    } catch (e) {
      throw new Error('Failed to parse Grok daily report results');
    }
  }
}

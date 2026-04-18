import { getScraper, SearchMode } from '../scraper.js';

export const xSearchToolDefs = [
  {
    name: 'search_x_posts',
    description: 'X (Twitter) をキーワードで検索して投稿を取得する（X API 不要）',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '検索クエリ（例: "TypeScript lang:ja -is:retweet"）' },
        maxTweets: { type: 'number', description: '最大取得件数（デフォルト: 20）' },
        mode: { type: 'string', enum: ['Latest', 'Top'], description: '検索モード（デフォルト: Latest）' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_user_tweets',
    description: '特定ユーザーの最近のツイートを取得する（X API 不要）',
    inputSchema: {
      type: 'object' as const,
      properties: {
        username: { type: 'string', description: 'X のユーザー名（@ なし）' },
        maxTweets: { type: 'number', description: '最大取得件数（デフォルト: 20）' },
      },
      required: ['username'],
    },
  },
];

export async function handleXSearchTool(name: string, a: Record<string, any>): Promise<string> {
  const scraper = await getScraper();

  if (name === 'search_x_posts') {
    const query: string = a.query;
    const max: number = a.maxTweets ?? 20;
    const mode = a.mode === 'Top' ? SearchMode.Top : SearchMode.Latest;

    const tweets: object[] = [];
    for await (const tweet of scraper.searchTweets(query, max, mode)) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        username: tweet.username,
        name: tweet.name,
        created_at: tweet.timeParsed,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        url: tweet.permanentUrl,
      });
    }
    return JSON.stringify({ count: tweets.length, tweets });
  }

  if (name === 'get_user_tweets') {
    const max: number = a.maxTweets ?? 20;
    const tweets: object[] = [];
    for await (const tweet of scraper.getTweets(a.username, max)) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.timeParsed,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        url: tweet.permanentUrl,
      });
    }
    return JSON.stringify({ count: tweets.length, tweets });
  }

  throw new Error(`Unknown tool: ${name}`);
}

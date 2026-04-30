import { Hono } from 'hono';
import { getActiveSearchThemes, getAllSearchThemes, createSearchTheme, updateSearchTheme, deleteSearchTheme, saveCollectedPosts, getXAccountById } from '@x-harness/db';
import { ClaudeClient } from '@x-harness/x-sdk';
import type { Env } from '../index.js';

const searchThemes = new Hono<Env>();

// GET /api/search-themes — List all search themes
searchThemes.get('/api/search-themes', async (c) => {
  const themes = await getAllSearchThemes(c.env.DB);
  return c.json({ success: true, data: themes });
});

// POST /api/search-themes — Create a new search theme
searchThemes.post('/api/search-themes', async (c) => {
  const body = await c.req.json<{ name: string; query: string; min_likes?: number; min_retweets?: number; is_active?: number }>();
  if (!body.name || !body.query) return c.json({ success: false, error: 'name and query required' }, 400);

  const theme = await createSearchTheme(c.env.DB, {
    name: body.name,
    query: body.query,
    min_likes: body.min_likes ?? 0,
    min_retweets: body.min_retweets ?? 0,
    is_active: body.is_active ?? 1,
  });

  return c.json({ success: true, data: theme }, 201);
});

// PUT /api/search-themes/:id
searchThemes.put('/api/search-themes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  await updateSearchTheme(c.env.DB, id, body);
  return c.json({ success: true });
});

// DELETE /api/search-themes/:id
searchThemes.delete('/api/search-themes/:id', async (c) => {
  const id = c.req.param('id');
  await deleteSearchTheme(c.env.DB, id);
  return c.json({ success: true });
});

// POST /api/search-themes/run — Claude レポート生成
// body に tweets[] を含めるとスクレイピングをスキップ（MCP ローカルツール用）
searchThemes.post('/api/search-themes/run', async (c) => {
  const anthropicApiKey = c.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) return c.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, 500);

  const xAccountId = c.req.query('xAccountId');
  if (!xAccountId) return c.json({ success: false, error: 'xAccountId required' }, 400);

  const account = await getXAccountById(c.env.DB, xAccountId);
  if (!account) return c.json({ success: false, error: 'Account not found' }, 404);

  const body = await c.req.json<{ tweets?: any[] }>().catch(() => ({}));

  // 検索はローカルMCPが担当。tweets[] なしの呼び出しは受け付けない。
  if (!body.tweets || body.tweets.length === 0) {
    return c.json({ success: false, error: 'Claude Code の generate_daily_report ツールから実行してください（検索はローカルMCPが担当します）' }, 422);
  }

  const themes = await getActiveSearchThemes(c.env.DB);
  const globalMinLikes = themes.length > 0 ? Math.min(...themes.map(t => t.min_likes ?? 0)) : 0;
  const globalMinRts = themes.length > 0 ? Math.min(...themes.map(t => t.min_retweets ?? 0)) : 0;
  const allTweets = body.tweets.filter((t: any) =>
    (t.public_metrics?.like_count ?? 0) >= globalMinLikes &&
    (t.public_metrics?.retweet_count ?? 0) >= globalMinRts
  );
  console.log(`[DEBUG] Pre-fetched tweets: ${body.tweets.length} → ${allTweets.length} after filter`);

  // 2. Claude で分析
  const claude = new ClaudeClient(anthropicApiKey);
  try {
    console.log(`[DEBUG] Sending ${allTweets.length} tweets to Claude`);
    const report = await claude.analyzePosts(allTweets.slice(0, 50));
    console.log(`[DEBUG] Claude selected ${report.length} posts`);

    const toSave = report.map(p => ({
      id: p.id,
      authorId: p.author_id,
      authorUsername: p.author_username,
      authorDisplayName: p.author_display_name,
      text: p.text,
      createdAt: p.created_at,
      publicMetrics: {
        ...p.public_metrics,
        author_description: p.author_description,
      },
      commentary: p.commentary,
      replyDraft: p.reply_draft,
    }));

    await saveCollectedPosts(c.env.DB, xAccountId, 'daily_report', toSave);
    return c.json({ success: true, data: { count: toSave.length } });
  } catch (err: any) {
    console.error(`[ERROR] Claude analysis failed:`, err.message);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export { searchThemes };

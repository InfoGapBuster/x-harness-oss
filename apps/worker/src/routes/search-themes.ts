import { Hono } from 'hono';
import { getActiveSearchThemes, getAllSearchThemes, createSearchTheme, updateSearchTheme, deleteSearchTheme, saveCollectedPosts, getXAccountById } from '@x-harness/db';
import { ClaudeClient, XClient } from '@x-harness/x-sdk';
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

// PUT /api/search-themes/:id — Update an existing search theme
searchThemes.put('/api/search-themes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  await updateSearchTheme(c.env.DB, id, body);
  return c.json({ success: true });
});

// DELETE /api/search-themes/:id — Delete a search theme
searchThemes.delete('/api/search-themes/:id', async (c) => {
  const id = c.req.param('id');
  await deleteSearchTheme(c.env.DB, id);
  return c.json({ success: true });
});

// POST /api/search-themes/run — Manually trigger Claude report generation
searchThemes.post('/api/search-themes/run', async (c) => {
  const anthropicApiKey = c.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) return c.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, 500);

  const xAccountId = c.req.query('xAccountId');
  if (!xAccountId) return c.json({ success: false, error: 'xAccountId required' }, 400);

  const account = await getXAccountById(c.env.DB, xAccountId);
  if (!account) return c.json({ success: false, error: 'Account not found' }, 404);

  const themes = await getActiveSearchThemes(c.env.DB);
  if (themes.length === 0) return c.json({ success: false, error: 'No active search themes' }, 400);

  const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
    ? new XClient({
        type: 'oauth1',
        consumerKey: account.consumer_key,
        consumerSecret: account.consumer_secret,
        accessToken: account.access_token,
        accessTokenSecret: account.access_token_secret,
      })
    : new XClient(account.access_token);

  // 1. Fetch real tweets for each theme
  const allTweets: any[] = [];
  const errors: string[] = [];
  console.log(`[DEBUG] Starting manual report run for ${themes.length} themes`);

  for (const theme of themes) {
    try {
      const searchQuery = `${theme.query} lang:ja -is:retweet`;
      const searchRes = await xClient.searchRecentTweets(searchQuery);

      if (searchRes.data && searchRes.data.length > 0) {
        const usersMap = new Map(searchRes.includes?.users?.map((u: any) => [u.id, u]) || []);
        const mapped = searchRes.data.map((t: any) => {
          const user = usersMap.get(t.author_id);
          return {
            id: t.id,
            text: t.text,
            author_id: t.author_id,
            author_username: user?.username,
            author_display_name: user?.name,
            public_metrics: t.public_metrics,
            created_at: t.created_at,
          };
        });
        allTweets.push(...mapped);
      }
    } catch (err: any) {
      console.error(`[ERROR] Search failed for theme ${theme.name}:`, err.message);
      errors.push(`${theme.name}: ${err.message}`);
    }
  }

  if (allTweets.length === 0) {
    const errorMsg = errors.length > 0
      ? `X APIエラーが発生しました: ${errors[0]}`
      : '条件に一致するポストが見つかりませんでした。';
    return c.json({ success: false, error: errorMsg }, 402);
  }

  // 2. Analyze with Claude
  const claude = new ClaudeClient(anthropicApiKey);
  try {
    console.log(`[DEBUG] Sending ${allTweets.length} tweets to Claude for analysis`);
    const report = await claude.analyzePosts(allTweets.slice(0, 50));
    console.log(`[DEBUG] Claude selected ${report.length} posts for the report`);

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

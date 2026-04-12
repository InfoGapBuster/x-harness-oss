import { Hono } from 'hono';
import { getActiveSearchThemes, getAllSearchThemes, createSearchTheme, updateSearchTheme, deleteSearchTheme, saveCollectedPosts } from '@x-harness/db';
import { GrokClient } from '@x-harness/x-sdk';
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

// POST /api/search-themes/run — Manually trigger Grok report generation
searchThemes.post('/api/search-themes/run', async (c) => {
  const xaiApiKey = c.env.XAI_API_KEY;
  if (!xaiApiKey) return c.json({ success: false, error: 'XAI_API_KEY not configured' }, 500);

  const xAccountId = c.req.query('xAccountId');
  if (!xAccountId) return c.json({ success: false, error: 'xAccountId required' }, 400);

  const themes = await getActiveSearchThemes(c.env.DB);
  if (themes.length === 0) return c.json({ success: false, error: 'No active search themes' }, 400);

  const grok = new GrokClient({ apiKey: xaiApiKey });
  try {
    const report = await grok.generateDailyReport(themes.map(t => ({
      name: t.name,
      min_likes: t.min_likes,
      min_retweets: t.min_retweets,
    })));

    // Save to collected_posts with commentary in a dedicated field or prepended to text
    const toSave = report.map(p => ({
      id: p.id,
      authorId: p.author_id,
      authorUsername: p.author_username,
      authorDisplayName: p.author_display_name,
      text: p.text,
      createdAt: p.created_at,
      publicMetrics: p.public_metrics,
      commentary: p.commentary,
      replyDraft: p.reply_draft,
    }));

    await saveCollectedPosts(c.env.DB, xAccountId, 'daily_report', toSave);

    return c.json({ success: true, data: { count: toSave.length } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export { searchThemes };

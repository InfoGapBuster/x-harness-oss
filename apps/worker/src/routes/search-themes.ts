import { Hono } from 'hono';
import { getActiveSearchThemes, saveCollectedPosts } from '@x-harness/db';
import { GrokClient } from '@x-harness/x-sdk';
import type { Env } from '../index.js';

const searchThemes = new Hono<Env>();

// GET /api/search-themes — List active search themes
searchThemes.get('/api/search-themes', async (c) => {
  const themes = await getActiveSearchThemes(c.env.DB);
  return c.json({ success: true, data: themes });
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
    // For now, we'll store them in collected_posts with query="daily_report"
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

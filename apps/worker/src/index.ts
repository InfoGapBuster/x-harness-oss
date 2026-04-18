import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { XClient } from '@x-harness/x-sdk';
import { getXAccounts, hasSnapshotForToday, recordSnapshot } from '@x-harness/db';
import { authMiddleware } from './middleware/auth.js';
import { health } from './routes/health.js';
import { engagementGates } from './routes/engagement-gates.js';
import { followers } from './routes/followers.js';
import { tags } from './routes/tags.js';
import { posts } from './routes/posts.js';
import { users } from './routes/users.js';
import { xAccounts } from './routes/x-accounts.js';
import { processEngagementGates } from './services/engagement-gate.js';
import { processScheduledPosts } from './services/post-scheduler.js';
import { EngagementCache } from './services/reply-trigger-cache.js';
import { stepSequences } from './routes/step-sequences.js';
import { verify } from './routes/verify.js';
import { staff } from './routes/staff.js';
import { dm } from './routes/dm.js';
import { usage } from './routes/usage.js';
import { xaa } from './routes/xaa.js';
import { campaigns } from './routes/campaigns.js';
import { setup } from './routes/setup.js';
import { searchThemes } from './routes/search-themes.js';
import { processStepSequences } from './services/step-processor.js';
import { getActiveSearchThemes, saveCollectedPosts } from '@x-harness/db';
import { ClaudeClient } from '@x-harness/x-sdk';
import { searchTweetsWithCookies } from './services/x-search.js';
import { generateEmailReport, sendEmail } from './services/notifier.js';

export type Env = {
  Bindings: {
    DB: D1Database;
    API_KEY: string;
    ANTHROPIC_API_KEY?: string;
    TWITTER_AUTH_TOKEN?: string;
    TWITTER_CT0?: string;
    RESEND_API_KEY?: string; // For email notifications
    NOTIFY_EMAIL?: string; // Destination email
    X_ACCESS_TOKEN: string;
    X_REFRESH_TOKEN: string;
    WORKER_URL: string;
    LINE_HARNESS_URL?: string;
    LINE_HARNESS_API_KEY?: string;
  };
  Variables: {
    staffRole?: 'admin' | 'editor' | 'viewer';
    staffId?: string;
    staffName?: string;
  };
};

const app = new Hono<Env>();

app.use('*', cors({ origin: '*' }));
app.use('*', authMiddleware);

app.route('/', health);
app.route('/', verify);
app.route('/', engagementGates);
app.route('/', followers);
app.route('/', tags);
app.route('/', posts);
app.route('/', users);
app.route('/', xAccounts);
app.route('/', stepSequences);
app.route('/', staff);
app.route('/', dm);
app.route('/', usage);
app.route('/', xaa);
app.route('/', campaigns);
app.route('/', setup);
app.route('/', searchThemes);

// Settings API (key-value store)
app.get('/api/settings', async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value, updated_at FROM settings').all<{ key: string; value: string; updated_at: string }>();
  const settings: Record<string, string> = {};
  for (const r of rows.results) settings[r.key] = r.value;
  return c.json({ success: true, data: settings });
});

app.put('/api/settings', async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(body)) {
    await c.env.DB.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?')
      .bind(key, value, now, value, now).run();
  }
  return c.json({ success: true });
});

// LINE Connections API
app.get('/api/line-connections', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, name, worker_url, created_at FROM line_connections ORDER BY created_at DESC').all<{ id: string; name: string; worker_url: string; created_at: string }>();
  return c.json({ success: true, data: rows.results });
});

app.get('/api/line-connections/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM line_connections WHERE id = ?').bind(c.req.param('id')).first<{ id: string; name: string; worker_url: string; api_key: string; created_at: string }>();
  if (!row) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: row });
});

app.post('/api/line-connections', async (c) => {
  const body = await c.req.json<{ name: string; workerUrl: string; apiKey: string }>();
  if (!body.name || !body.workerUrl || !body.apiKey) return c.json({ success: false, error: 'name, workerUrl, apiKey required' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO line_connections (id, name, worker_url, api_key, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(id, body.name, body.workerUrl.replace(/\/$/, ''), body.apiKey).run();
  return c.json({ success: true, data: { id, name: body.name, workerUrl: body.workerUrl } }, 201);
});

app.delete('/api/line-connections/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM line_connections WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

async function getSettingBool(db: D1Database, key: string, defaultValue = false): Promise<boolean> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  if (!row) return defaultValue;
  return row.value === 'true' || row.value === '1';
}

async function scheduled(
  _event: ScheduledEvent,
  env: Env['Bindings'],
  _ctx: ExecutionContext,
): Promise<void> {
  // Auto-features are OFF by default to avoid unexpected API costs.
  // Users enable them from the dashboard settings page.
  const autoEnabled = await getSettingBool(env.DB, 'auto_features_enabled', false);

  const dbAccounts = await getXAccounts(env.DB);

  if (autoEnabled) {
    const jobs: Promise<void>[] = [];
    for (const account of dbAccounts) {
      const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
        ? new XClient({
            type: 'oauth1',
            consumerKey: account.consumer_key,
            consumerSecret: account.consumer_secret,
            accessToken: account.access_token,
            accessTokenSecret: account.access_token_secret,
          })
        : new XClient(account.access_token);
      const cache = new EngagementCache();
      jobs.push(processEngagementGates(env.DB, xClient, account.id, false, cache));
      jobs.push(processScheduledPosts(env.DB, xClient, account.id));
    }
    await Promise.allSettled(jobs);
  }

  // Record daily follower snapshots
  for (const account of dbAccounts) {
    try {
      const alreadyRecorded = await hasSnapshotForToday(env.DB, account.id);
      if (alreadyRecorded) continue;
      const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
        ? new XClient({
            type: 'oauth1',
            consumerKey: account.consumer_key,
            consumerSecret: account.consumer_secret,
            accessToken: account.access_token,
            accessTokenSecret: account.access_token_secret,
          })
        : new XClient(account.access_token);
      const me = await xClient.getMe();
      if (me.public_metrics) {
        await recordSnapshot(env.DB, {
          xAccountId: account.id,
          followersCount: me.public_metrics.followers_count,
          followingCount: me.public_metrics.following_count,
          tweetCount: me.public_metrics.tweet_count,
        });
      }
    } catch {
      // Non-blocking — continue with other accounts
    }
  }

  // Process step sequences (also gated by auto_features_enabled)
  if (autoEnabled) {
    const buildXClient = async (accountId: string): Promise<XClient | null> => {
      const account = dbAccounts.find((a) => a.id === accountId);
      if (!account) return null;
      return account.consumer_key && account.consumer_secret && account.access_token_secret
        ? new XClient({
            type: 'oauth1',
            consumerKey: account.consumer_key,
            consumerSecret: account.consumer_secret,
            accessToken: account.access_token,
            accessTokenSecret: account.access_token_secret,
          })
        : new XClient(account.access_token);
    };
    await processStepSequences(env.DB, buildXClient);
  }

  // Daily Claude Search Report (6 AM JST)
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  const jstMinute = now.getUTCMinutes();

  const reportsEnabled = await getSettingBool(env.DB, 'auto_reports_enabled', false);
  const anthropicApiKey = env.ANTHROPIC_API_KEY;
  const authToken = env.TWITTER_AUTH_TOKEN;
  const ct0 = env.TWITTER_CT0;

  if (reportsEnabled && anthropicApiKey && authToken && ct0 && jstHour === 6 && jstMinute < 10 && dbAccounts.length > 0) {
    try {
      const themes = await getActiveSearchThemes(env.DB);
      if (themes.length > 0) {
        const account = dbAccounts[0];

        // 1. クッキー認証でツイートを取得
        const allTweets: any[] = [];
        for (const theme of themes) {
          try {
            const query = `${theme.query} lang:ja -filter:retweets`;
            const tweets = await searchTweetsWithCookies(query, authToken, ct0);
            allTweets.push(...tweets);
          } catch (err) {
            console.error(`Scheduled search failed for theme ${theme.name}:`, err);
          }
        }

        if (allTweets.length > 0) {
          // 2. Analyze with Claude
          const claude = new ClaudeClient(anthropicApiKey);
          const report = await claude.analyzePosts(allTweets.slice(0, 50));

          const toSave = report.map((p: any) => ({
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

          await saveCollectedPosts(env.DB, account.id, 'daily_report', toSave);

          if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
            const emailContent = generateEmailReport(toSave);
            await sendEmail(
              env.RESEND_API_KEY,
              env.NOTIFY_EMAIL,
              `【X-Harness】今朝の注目ポストレポート (${new Date().toLocaleDateString('ja-JP')})`,
              emailContent
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate daily Claude report:', err);
    }
  }
}

export default {
  fetch: app.fetch,
  scheduled,
};

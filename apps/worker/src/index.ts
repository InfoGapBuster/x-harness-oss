import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { XClient } from '@x-harness/x-sdk';
import { getXAccounts } from '@x-harness/db';
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

export type Env = {
  Bindings: {
    DB: D1Database;
    API_KEY: string;
    X_ACCESS_TOKEN: string;
    X_REFRESH_TOKEN: string;
    WORKER_URL: string;
  };
};

const app = new Hono<Env>();

app.use('*', cors({ origin: '*' }));
app.use('*', authMiddleware);

app.route('/', health);
app.route('/', engagementGates);
app.route('/', followers);
app.route('/', tags);
app.route('/', posts);
app.route('/', users);
app.route('/', xAccounts);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

async function scheduled(
  _event: ScheduledEvent,
  env: Env['Bindings'],
  _ctx: ExecutionContext,
): Promise<void> {
  const dbAccounts = await getXAccounts(env.DB);

  // Only run scheduled jobs for accounts that exist in the DB (token must be registered)
  const jobs: Promise<void>[] = [];
  for (const account of dbAccounts) {
    const xClient = new XClient(account.access_token);
    jobs.push(processEngagementGates(env.DB, xClient, account.id));
    jobs.push(processScheduledPosts(env.DB, xClient, account.id));
  }
  await Promise.allSettled(jobs);
}

export default {
  fetch: app.fetch,
  scheduled,
};

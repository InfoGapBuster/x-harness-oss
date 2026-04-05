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
import { processStepSequences } from './services/step-processor.js';

export type Env = {
  Bindings: {
    DB: D1Database;
    API_KEY: string;
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

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

async function scheduled(
  _event: ScheduledEvent,
  env: Env['Bindings'],
  _ctx: ExecutionContext,
): Promise<void> {
  const dbAccounts = await getXAccounts(env.DB);

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

  // Process step sequences
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

export default {
  fetch: app.fetch,
  scheduled,
};

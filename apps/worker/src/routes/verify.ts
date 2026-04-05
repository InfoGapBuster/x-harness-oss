import { Hono } from 'hono';
import { getEngagementGateById, getDeliveredUserIds, getXAccounts } from '@x-harness/db';
import type { Env } from '../index.js';
import { EngagementCache, checkConditions } from '../services/reply-trigger-cache.js';
import { XClient } from '@x-harness/x-sdk';

const verify = new Hono<Env>();

verify.get('/api/engagement-gates/:id/verify', async (c) => {
  const gateId = c.req.param('id');
  const username = c.req.query('username')?.replace('@', '').trim();

  if (!username) {
    return c.json({ success: false, error: 'username query parameter required' }, 400);
  }

  const gate = await getEngagementGateById(c.env.DB, gateId);
  if (!gate) {
    return c.json({ success: false, error: 'Gate not found' }, 404);
  }

  if (!gate.is_active) {
    return c.json({ success: false, error: 'This gate is no longer active' }, 400);
  }
  if (gate.expires_at && new Date(gate.expires_at).getTime() <= Date.now()) {
    return c.json({ success: false, error: 'This gate has expired' }, 400);
  }

  // Verify only supports reply-trigger gates
  if (gate.trigger_type !== 'reply') {
    return c.json({ success: false, error: 'Verify is only supported for reply-trigger gates' }, 400);
  }

  // Build XClient for this gate's account
  const accounts = await getXAccounts(c.env.DB);
  const account = accounts.find((a) => a.id === gate.x_account_id);
  if (!account) {
    return c.json({ success: false, error: 'X account not found' }, 500);
  }

  const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
    ? new XClient({
        type: 'oauth1',
        consumerKey: account.consumer_key,
        consumerSecret: account.consumer_secret,
        accessToken: account.access_token,
        accessTokenSecret: account.access_token_secret,
      })
    : new XClient(account.access_token);

  // Resolve username to user ID
  let xUser;
  try {
    xUser = await xClient.getUserByUsername(username);
  } catch {
    return c.json({
      success: true,
      data: {
        eligible: false,
        conditions: { reply: false, like: false, repost: false, follow: false },
        message: 'Xアカウントが見つかりません',
      },
    });
  }

  // Check if already delivered (by x_user_id to handle username changes)
  const deliveredIds = await getDeliveredUserIds(c.env.DB, gateId);
  if (deliveredIds.has(xUser.id)) {
    return c.json({
      success: true,
      data: {
        eligible: true,
        alreadyDelivered: true,
        conditions: { reply: true, like: true, repost: true, follow: true },
      },
    });
  }

  // Check reply
  let hasReplied = false;
  try {
    const keyword = gate.reply_keyword ? ` "${gate.reply_keyword}"` : '';
    const result = await xClient.searchRecentTweets(`conversation_id:${gate.post_id} is:reply from:${username}${keyword}`);
    hasReplied = !!(result.data && result.data.length > 0);
  } catch {
    hasReplied = false;
  }

  // Check other conditions using cache
  const cache = new EngagementCache();
  const conditions = await checkConditions(xClient, cache, gate, xUser.id, account.x_user_id);
  conditions.reply = hasReplied;

  const eligible = conditions.reply
    && (!gate.require_like || conditions.like)
    && (!gate.require_repost || conditions.repost)
    && (!gate.require_follow || conditions.follow);

  // Record delivery for verify_only gates
  if (eligible && gate.action_type === 'verify_only') {
    const { createDelivery } = await import('@x-harness/db');
    await createDelivery(c.env.DB, gateId, xUser.id, username, null, 'delivered');
  }

  const response: Record<string, unknown> = {
    eligible,
    conditions: {
      reply: conditions.reply,
      like: gate.require_like ? conditions.like : null,
      repost: gate.require_repost ? conditions.repost : null,
      follow: gate.require_follow ? conditions.follow : null,
    },
  };

  if (!eligible) {
    response.message = '条件を満たしていません';
  }

  return c.json({ success: true, data: response });
});

// GET /api/engagement-gates/:id/repliers — list users who replied (for form dropdown)
verify.get('/api/engagement-gates/:id/repliers', async (c) => {
  const gateId = c.req.param('id');

  const gate = await getEngagementGateById(c.env.DB, gateId);
  if (!gate) {
    return c.json({ success: false, error: 'Gate not found' }, 404);
  }

  if (!gate.is_active) {
    return c.json({ success: false, error: 'This gate is no longer active' }, 400);
  }

  if (gate.trigger_type !== 'reply') {
    return c.json({ success: false, error: 'Only supported for reply-trigger gates' }, 400);
  }

  // Build XClient
  const accounts = await getXAccounts(c.env.DB);
  const account = accounts.find((a) => a.id === gate.x_account_id);
  if (!account) {
    return c.json({ success: false, error: 'X account not found' }, 500);
  }

  const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
    ? new XClient({
        type: 'oauth1',
        consumerKey: account.consumer_key,
        consumerSecret: account.consumer_secret,
        accessToken: account.access_token,
        accessTokenSecret: account.access_token_secret,
      })
    : new XClient(account.access_token);

  // Fetch reply users
  try {
    const keyword = gate.reply_keyword ? ` "${gate.reply_keyword}"` : '';
    const result = await xClient.searchRecentTweets(
      `conversation_id:${gate.post_id} is:reply${keyword}`,
    );

    if (!result.data || result.data.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const includes = (result as any).includes as { users?: any[] } | undefined;
    const userMap = new Map<string, any>();
    if (includes?.users) {
      for (const u of includes.users) userMap.set(u.id, u);
    }

    const seen = new Set<string>();
    const repliers: { username: string; displayName: string; profileImageUrl: string | null }[] = [];

    for (const tweet of result.data) {
      if (seen.has(tweet.author_id)) continue;
      seen.add(tweet.author_id);

      const u = userMap.get(tweet.author_id);
      if (u) {
        repliers.push({
          username: u.username,
          displayName: u.name,
          profileImageUrl: u.profile_image_url || null,
        });
      }
    }

    return c.json({ success: true, data: repliers });
  } catch (err) {
    console.error('GET repliers error:', err);
    return c.json({ success: false, error: 'Failed to fetch repliers' }, 500);
  }
});

export { verify };

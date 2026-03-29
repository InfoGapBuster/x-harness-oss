import { Hono } from 'hono';
import { createXAccount, getXAccounts, getXAccountById, updateXAccount, getEngagementGates } from '@x-harness/db';
import type { Env } from '../index.js';

const xAccounts = new Hono<Env>();

function serialize(a: any) {
  return {
    id: a.id,
    xUserId: a.x_user_id,
    username: a.username,
    displayName: a.display_name,
    isActive: !!a.is_active,
    createdAt: a.created_at,
  };
}

xAccounts.post('/api/x-accounts', async (c) => {
  const body = await c.req.json<{
    xUserId: string;
    username: string;
    accessToken: string;
    refreshToken?: string;
    displayName?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessTokenSecret?: string;
  }>();
  if (!body.xUserId || !body.username || !body.accessToken) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }
  const account = await createXAccount(c.env.DB, body);
  return c.json({ success: true, data: serialize(account) }, 201);
});

xAccounts.get('/api/x-accounts', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM x_accounts ORDER BY created_at').all<any>();

  const activeGates = await getEngagementGates(c.env.DB, { activeOnly: true });
  const totalApiCalls = activeGates.reduce((sum, g) => sum + (g.api_calls_total ?? 0), 0);

  return c.json({
    success: true,
    data: result.results.map(serialize),
    polling: {
      activeGates: activeGates.length,
      totalApiCalls,
      estimatedTotalCost: `$${(totalApiCalls * 0.005).toFixed(2)}`,
      gates: activeGates.map((g) => ({
        id: g.id,
        postId: g.post_id,
        strategy: g.polling_strategy ?? 'hot_window',
        nextPollAt: g.next_poll_at,
        expiresAt: g.expires_at,
        apiCallsTotal: g.api_calls_total ?? 0,
      })),
    },
  });
});

xAccounts.put('/api/x-accounts/:id', async (c) => {
  const body = await c.req.json<{
    accessToken?: string;
    refreshToken?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessTokenSecret?: string;
    isActive?: boolean;
  }>();
  const existing = await getXAccountById(c.env.DB, c.req.param('id'));
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404);
  await updateXAccount(c.env.DB, c.req.param('id'), body);
  return c.json({ success: true });
});

export { xAccounts };

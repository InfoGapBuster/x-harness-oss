import { XClient, XApiRateLimitError } from '@x-harness/x-sdk';
import {
  getEngagementGates, getDeliveredUserIds, createDelivery,
  upsertFollower,
} from '@x-harness/db';
import type { DbEngagementGate } from '@x-harness/db';
import { addJitter, varyTemplate, checkRateLimit, incrementRateLimit } from './stealth.js';

export async function processEngagementGates(db: D1Database, xClient: XClient, xAccountId?: string): Promise<void> {
  const allGates = await getEngagementGates(db, { activeOnly: true });
  const gates = xAccountId ? allGates.filter((g) => g.x_account_id === xAccountId) : allGates;

  for (const gate of gates) {
    try {
      await processOneGate(db, xClient, gate);
    } catch (err) {
      if (err instanceof XApiRateLimitError) {
        console.error('Rate limited — stopping engagement gate processing');
        return;
      }
      console.error(`Error processing gate ${gate.id}:`, err);
    }
  }
}

async function processOneGate(
  db: D1Database,
  xClient: XClient,
  gate: DbEngagementGate,
): Promise<void> {
  // DM delivery is Phase 2 — skip silently to avoid leaking private content as a public mention
  if (gate.action_type !== 'mention_post') return;

  let engagedUsers;
  if (gate.trigger_type === 'like') {
    engagedUsers = await xClient.getLikingUsers(gate.post_id);
  } else if (gate.trigger_type === 'repost') {
    engagedUsers = await xClient.getRetweetedBy(gate.post_id);
  } else {
    return;
  }

  if (!engagedUsers.data || engagedUsers.data.length === 0) return;

  const deliveredIds = await getDeliveredUserIds(db, gate.id);
  const newUsers = engagedUsers.data.filter((u) => !deliveredIds.has(u.id));

  for (const user of newUsers) {
    if (!checkRateLimit(gate.x_account_id)) {
      console.log(`Rate limit reached for account ${gate.x_account_id}, pausing`);
      return;
    }

    await addJitter(30_000, 180_000);

    // Apply stealth variation before URL substitution to avoid corrupting links
    let text = varyTemplate(gate.template.replace('{username}', user.username));
    if (gate.link) text = text.replace('{link}', gate.link);

    try {
      const tweet = await xClient.createTweet({ text: `@${user.username} ${text}` });
      await createDelivery(db, gate.id, user.id, user.username, tweet.id, 'delivered');
      incrementRateLimit(gate.x_account_id);

      await upsertFollower(db, {
        xAccountId: gate.x_account_id,
        xUserId: user.id,
        username: user.username,
        displayName: user.name,
        profileImageUrl: user.profile_image_url,
        followerCount: user.public_metrics?.followers_count,
        followingCount: user.public_metrics?.following_count,
      });

      if (gate.line_harness_url && gate.line_harness_api_key) {
        triggerLineHarness(gate.line_harness_url, gate.line_harness_api_key, gate.line_harness_tag, gate.line_harness_scenario_id, user.username).catch(() => {});
      }
    } catch (err) {
      if (err instanceof XApiRateLimitError) throw err;
      console.error(`Failed to deliver to @${user.username}:`, err);
      await createDelivery(db, gate.id, user.id, user.username, null, 'failed');
    }
  }
}

async function triggerLineHarness(
  apiUrl: string, apiKey: string, tag: string | null, scenarioId: string | null, xUsername: string,
): Promise<void> {
  if (tag) {
    await fetch(`${apiUrl}/api/friends/tag-by-metadata`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadataKey: 'x_username', metadataValue: xUsername, tagName: tag }),
    });
  }
}

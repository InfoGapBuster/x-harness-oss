import { XClient } from '@x-harness/x-sdk';
import { upsertFollower } from '@x-harness/db';

export async function syncFollowers(db: D1Database, xClient: XClient, xAccountId: string): Promise<void> {
  const me = await xClient.getMe();
  let paginationToken: string | undefined;

  do {
    const response = await xClient.getFollowers(me.id, paginationToken);
    if (!response.data) break;

    for (const user of response.data) {
      await upsertFollower(db, {
        xAccountId,
        xUserId: user.id,
        username: user.username,
        displayName: user.name,
        profileImageUrl: user.profile_image_url,
        followerCount: user.public_metrics?.followers_count,
        followingCount: user.public_metrics?.following_count,
      });
    }

    paginationToken = response.meta?.next_token;
  } while (paginationToken);
}

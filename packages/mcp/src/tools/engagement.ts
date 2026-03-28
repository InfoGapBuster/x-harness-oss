export const engagementToolDefs = [
  { name: 'like_post', description: 'Like a tweet', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'unlike_post', description: 'Unlike a tweet', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'retweet', description: 'Retweet a post', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'unretweet', description: 'Remove a retweet', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'bookmark', description: 'Bookmark a tweet', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'remove_bookmark', description: 'Remove a bookmark', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
];

export const postToolDefs = [
  { name: 'create_post', description: 'Create a new tweet/post', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, text: { type: 'string' }, replyToTweetId: { type: 'string' }, quoteTweetId: { type: 'string' } }, required: ['xAccountId', 'text'] } },
  { name: 'delete_post', description: 'Delete a tweet by ID', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, tweetId: { type: 'string' } }, required: ['xAccountId', 'tweetId'] } },
  { name: 'get_post', description: 'Get a tweet with metrics', inputSchema: { type: 'object' as const, properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'search_posts', description: 'Search recent tweets', inputSchema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'schedule_post', description: 'Schedule a post', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, text: { type: 'string' }, scheduledAt: { type: 'string' } }, required: ['xAccountId', 'text', 'scheduledAt'] } },
];

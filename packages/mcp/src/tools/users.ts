export const userToolDefs = [
  { name: 'get_user', description: 'Get X user info', inputSchema: { type: 'object' as const, properties: { username: { type: 'string' }, userId: { type: 'string' } } } },
  { name: 'search_users', description: 'Search for X users', inputSchema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'follow', description: 'Follow a user', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, targetUserId: { type: 'string' } }, required: ['xAccountId', 'targetUserId'] } },
  { name: 'unfollow', description: 'Unfollow a user', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, targetUserId: { type: 'string' } }, required: ['xAccountId', 'targetUserId'] } },
  { name: 'get_followers', description: 'Get followers', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' } }, required: ['xAccountId'] } },
  { name: 'get_following', description: 'Get following', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' } }, required: ['xAccountId'] } },
];

export const analyticsToolDefs = [
  { name: 'get_post_metrics', description: 'Get tweet metrics', inputSchema: { type: 'object' as const, properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'get_gate_analytics', description: 'Get gate delivery stats', inputSchema: { type: 'object' as const, properties: { gateId: { type: 'string' } }, required: ['gateId'] } },
  { name: 'account_summary', description: 'Get account summary', inputSchema: { type: 'object' as const, properties: {} } },
];

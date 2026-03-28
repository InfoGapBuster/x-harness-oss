export const gateToolDefs = [
  { name: 'create_engagement_gate', description: 'Create an engagement gate (auto-reply)', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, postId: { type: 'string' }, triggerType: { type: 'string', enum: ['like', 'repost', 'reply', 'follow', 'quote'] }, actionType: { type: 'string', enum: ['mention_post', 'dm'] }, template: { type: 'string' }, link: { type: 'string' }, lotteryEnabled: { type: 'boolean' }, lotteryRate: { type: 'number' }, lotteryWinTemplate: { type: 'string' }, lotteryLoseTemplate: { type: 'string' } }, required: ['xAccountId', 'postId', 'triggerType', 'actionType', 'template'] } },
  { name: 'list_engagement_gates', description: 'List all engagement gates', inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'get_gate_deliveries', description: 'Get deliveries for a gate', inputSchema: { type: 'object' as const, properties: { gateId: { type: 'string' } }, required: ['gateId'] } },
  { name: 'process_gates', description: 'Manually trigger gate processing', inputSchema: { type: 'object' as const, properties: {} } },
];

export const dmToolDefs = [
  { name: 'send_dm', description: 'Send a DM', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, recipientId: { type: 'string' }, text: { type: 'string' } }, required: ['xAccountId', 'recipientId', 'text'] } },
  { name: 'get_dm_events', description: 'Get DM events', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, conversationId: { type: 'string' } }, required: ['xAccountId'] } },
];

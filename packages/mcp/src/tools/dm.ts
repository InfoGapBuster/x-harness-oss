export const dmToolDefs = [
  { name: 'send_dm', description: 'DMを送信する', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, participantId: { type: 'string', description: '送信先ユーザーID' }, text: { type: 'string' } }, required: ['xAccountId', 'participantId', 'text'] } },
  { name: 'get_dm_conversations', description: 'DM会話一覧を取得する', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' } }, required: [] } },
  { name: 'get_dm_messages', description: '特定のDM会話のメッセージ履歴を取得する', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, conversationId: { type: 'string', description: '会話ID' } }, required: ['conversationId'] } },
  { name: 'get_dm_events', description: 'DMイベント一覧を取得する', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, conversationId: { type: 'string' } }, required: ['xAccountId'] } },
];

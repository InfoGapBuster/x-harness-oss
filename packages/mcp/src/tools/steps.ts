export const stepToolDefs = [
  { name: 'create_step_sequence', description: 'Create a step sequence', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' }, name: { type: 'string' } }, required: ['xAccountId', 'name'] } },
  { name: 'add_step_message', description: 'Add a step message', inputSchema: { type: 'object' as const, properties: { sequenceId: { type: 'string' }, stepOrder: { type: 'number' }, delayMinutes: { type: 'number' }, actionType: { type: 'string', enum: ['mention_post', 'dm'] }, template: { type: 'string' }, link: { type: 'string' }, conditionTag: { type: 'string' } }, required: ['sequenceId', 'stepOrder', 'delayMinutes', 'actionType', 'template'] } },
  { name: 'enroll_user', description: 'Enroll user in sequence', inputSchema: { type: 'object' as const, properties: { sequenceId: { type: 'string' }, xUserId: { type: 'string' }, xUsername: { type: 'string' } }, required: ['sequenceId', 'xUserId'] } },
  { name: 'list_step_sequences', description: 'List step sequences', inputSchema: { type: 'object' as const, properties: { xAccountId: { type: 'string' } } } },
];

export const staffToolDefs = [
  { name: 'list_staff', description: 'スタッフ一覧を取得する', inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'create_staff', description: 'スタッフを作成する', inputSchema: { type: 'object' as const, properties: { name: { type: 'string' }, role: { type: 'string' } }, required: ['name', 'role'] } },
  { name: 'update_staff', description: 'スタッフ情報を更新する', inputSchema: { type: 'object' as const, properties: { id: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, isActive: { type: 'boolean' } }, required: ['id'] } },
  { name: 'delete_staff', description: 'スタッフを削除する', inputSchema: { type: 'object' as const, properties: { id: { type: 'string' } }, required: ['id'] } },
];

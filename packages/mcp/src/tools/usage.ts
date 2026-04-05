export const usageToolDefs = [
  {
    name: 'get_usage_summary',
    description: 'API使用量サマリーを取得する',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string' },
        startDate: { type: 'string', description: '集計開始日（YYYY-MM-DD）' },
        endDate: { type: 'string', description: '集計終了日（YYYY-MM-DD）' },
      },
    },
  },
  {
    name: 'get_usage_daily',
    description: 'API使用量の日別内訳を取得する',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string' },
        startDate: { type: 'string', description: '集計開始日（YYYY-MM-DD）' },
        endDate: { type: 'string', description: '集計終了日（YYYY-MM-DD）' },
      },
    },
  },
  {
    name: 'get_usage_by_gate',
    description: 'ゲートごとのAPI使用量内訳を取得する',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string' },
        startDate: { type: 'string', description: '集計開始日（YYYY-MM-DD）' },
        endDate: { type: 'string', description: '集計終了日（YYYY-MM-DD）' },
      },
    },
  },
];

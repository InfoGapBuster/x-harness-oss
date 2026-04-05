export const campaignToolDefs = [
  {
    name: 'create_campaign',
    description: 'エンゲージメントゲート作成＋キャンペーンリンク生成を一括で行う',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string' },
        postId: { type: 'string', description: 'キャンペーン対象ツイートID' },
        conditions: {
          type: 'object',
          properties: {
            requireLike: { type: 'boolean' },
            requireRepost: { type: 'boolean' },
          },
          description: '参加条件（like/repost）',
        },
        lineHarnessUrl: { type: 'string', description: 'LINE Harness Worker URL（LINE連携する場合）' },
        lineHarnessApiKey: { type: 'string', description: 'LINE Harness APIキー（LINE連携する場合）' },
        formId: { type: 'string', description: 'LINEフォームID（LINE連携する場合）' },
        ref: { type: 'string', description: 'キャンペーン識別子（/r/{ref} のパス部分）' },
      },
      required: ['xAccountId', 'postId'],
    },
  },
];

import type { XHarnessClient } from '../client.js';
import { handleReportTool } from './report.js';
import { handlePostTool } from './post.js';

export const commandToolDefs = [
  {
    name: 'process_pending_commands',
    description:
      'ダッシュボードから送信された未処理コマンドを取得して実行する。' +
      'generate_daily_report / execute_pending_posts をローカルで実行し、完了後にコマンドを削除する。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string', description: 'X アカウント ID' },
      },
      required: ['xAccountId'],
    },
  },
];

export async function handleCommandTool(
  name: string,
  a: Record<string, any>,
  client: XHarnessClient,
): Promise<string> {
  if (name !== 'process_pending_commands') throw new Error(`Unknown tool: ${name}`);

  const res = await client.get<{ success: boolean; data: Array<{ id: string; command: string; createdAt: string }> }>(
    `/api/commands/pending?xAccountId=${encodeURIComponent(a.xAccountId)}`,
  );
  const commands = res.data ?? [];
  if (commands.length === 0) return 'ダッシュボードからの未処理コマンドはありません。';

  const results: string[] = [];
  for (const cmd of commands) {
    try {
      let output = '';
      if (cmd.command === 'generate_daily_report') {
        output = await handleReportTool('generate_daily_report', { xAccountId: a.xAccountId }, client);
      } else if (cmd.command === 'execute_pending_posts') {
        output = await handlePostTool('execute_pending_posts', { xAccountId: a.xAccountId }, client);
      } else {
        output = `未知のコマンド: ${cmd.command}`;
      }
      await client.del(`/api/commands/${cmd.id}`);
      results.push(`[${cmd.command}] ${output}`);
    } catch (err: any) {
      results.push(`[${cmd.command}] 失敗: ${err.message}`);
    }
  }
  return results.join('\n\n');
}

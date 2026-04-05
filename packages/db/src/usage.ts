import { jstNow } from './utils.js';

export interface DbApiUsageLog {
  id: string;
  x_account_id: string;
  endpoint: string;
  request_count: number;
  date: string;
  created_at: string;
}

export interface UsageSummary {
  totalRequests: number;
  totalCost: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
}

export interface DailyUsage {
  date: string;
  totalRequests: number;
  totalCost: number;
}

export interface GateUsage {
  id: string;
  x_account_id: string;
  post_id: string;
  trigger_type: string;
  api_calls_total: number;
  estimatedCost: number;
}

const COST_PER_REQUEST = 0.0002;

export async function incrementApiUsage(db: D1Database, xAccountId: string, endpoint: string): Promise<void> {
  const id = crypto.randomUUID();
  const date = jstNow().slice(0, 10);
  const now = jstNow();
  await db
    .prepare(`
      INSERT INTO api_usage_logs (id, x_account_id, endpoint, request_count, date, created_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT (x_account_id, endpoint, date)
      DO UPDATE SET request_count = request_count + 1
    `)
    .bind(id, xAccountId, endpoint, date, now)
    .run();
}

export async function getUsageSummary(
  db: D1Database,
  xAccountId?: string,
  startDate?: string,
  endDate?: string,
): Promise<UsageSummary> {
  const conditions: string[] = [];
  const bindings: (string | null)[] = [];

  if (xAccountId) {
    conditions.push('x_account_id = ?');
    bindings.push(xAccountId);
  }
  if (startDate) {
    conditions.push('date >= ?');
    bindings.push(startDate);
  }
  if (endDate) {
    conditions.push('date <= ?');
    bindings.push(endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db
    .prepare(`SELECT endpoint, SUM(request_count) as total FROM api_usage_logs ${where} GROUP BY endpoint`)
    .bind(...bindings)
    .all<{ endpoint: string; total: number }>();

  const byEndpoint: Array<{ endpoint: string; count: number }> = [];
  let totalRequests = 0;
  for (const row of rows.results) {
    byEndpoint.push({ endpoint: row.endpoint, count: row.total });
    totalRequests += row.total;
  }

  return {
    totalRequests,
    totalCost: totalRequests * COST_PER_REQUEST,
    byEndpoint,
  };
}

export async function getDailyUsage(db: D1Database, xAccountId?: string, days = 30): Promise<DailyUsage[]> {
  const conditions: string[] = [`date >= date('now', '-${days} days')`];
  const bindings: string[] = [];

  if (xAccountId) {
    conditions.push('x_account_id = ?');
    bindings.push(xAccountId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = await db
    .prepare(`SELECT date, SUM(request_count) as total FROM api_usage_logs ${where} GROUP BY date ORDER BY date ASC`)
    .bind(...bindings)
    .all<{ date: string; total: number }>();

  return rows.results.map((row) => ({
    date: row.date,
    totalRequests: row.total,
    totalCost: row.total * COST_PER_REQUEST,
  }));
}

export async function getUsageByGate(db: D1Database): Promise<GateUsage[]> {
  const rows = await db
    .prepare('SELECT id, x_account_id, post_id, trigger_type, api_calls_total FROM engagement_gates WHERE api_calls_total > 0 ORDER BY api_calls_total DESC')
    .all<{ id: string; x_account_id: string; post_id: string; trigger_type: string; api_calls_total: number }>();

  return rows.results.map((row) => ({
    id: row.id,
    x_account_id: row.x_account_id,
    post_id: row.post_id,
    trigger_type: row.trigger_type,
    api_calls_total: row.api_calls_total,
    estimatedCost: row.api_calls_total * COST_PER_REQUEST,
  }));
}

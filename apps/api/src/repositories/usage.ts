import type { AgentRole } from '@yule/shared-types';
import type { Db } from '../db/connection.js';

type Row = Record<string, unknown>;

/** Daily token accounting per role — backs the daily/role cap checks. */
export class UsageRepo {
  constructor(private readonly db: Db) {}

  private today(now: string): string {
    return now.slice(0, 10); // YYYY-MM-DD
  }

  add(role: AgentRole, tokens: number, now: string): void {
    const day = this.today(now);
    this.db
      .prepare(
        `INSERT INTO token_usage (day, role, tokens) VALUES (?,?,?)
         ON CONFLICT(day, role) DO UPDATE SET tokens = tokens + excluded.tokens`,
      )
      .run(day, role, tokens);
  }

  spentToday(now: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(tokens),0) AS total FROM token_usage WHERE day = ?')
      .get(this.today(now)) as Row | undefined;
    return Number(row?.total ?? 0);
  }

  spentByRoleToday(role: AgentRole, now: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(tokens),0) AS total FROM token_usage WHERE day = ? AND role = ?')
      .get(this.today(now), role) as Row | undefined;
    return Number(row?.total ?? 0);
  }

  /** Per-role totals for today (for the status/agents endpoints). */
  byRoleToday(now: string): Record<string, number> {
    const rows = this.db
      .prepare('SELECT role, tokens FROM token_usage WHERE day = ?')
      .all(this.today(now)) as Row[];
    const out: Record<string, number> = {};
    for (const r of rows) out[String(r.role)] = Number(r.tokens);
    return out;
  }
}

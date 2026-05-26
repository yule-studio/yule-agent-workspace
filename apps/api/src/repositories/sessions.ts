import type { Session } from '@yule/shared-types';
import type { Db } from '../db/connection.js';
import { rowToSession } from '../db/mappers.js';

type Row = Record<string, unknown>;

export class SessionRepo {
  constructor(private readonly db: Db) {}

  insert(s: Session): Session {
    this.db
      .prepare(
        `INSERT INTO sessions (id, task_id, role, agent_id, group_id, state, prior_state, runtime_mode, approval_json,
           budget_cap, budget_used, budget_escalation_ratio, budget_escalated,
           fp_diff, fp_issue, snapshot_json, created_at, updated_at, closed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        s.id,
        s.taskId,
        s.role,
        s.agentId,
        s.groupId,
        s.state,
        s.priorState,
        s.runtimeMode,
        s.approval ? JSON.stringify(s.approval) : null,
        s.budget.cap,
        s.budget.used,
        s.budget.escalationRatio,
        s.budget.escalated ? 1 : 0,
        s.fingerprints.diff,
        s.fingerprints.issue,
        s.snapshot ? JSON.stringify(s.snapshot) : null,
        s.createdAt,
        s.updatedAt,
        s.closedAt,
      );
    return s;
  }

  get(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Row | undefined;
    return row ? rowToSession(row) : null;
  }

  listByTask(taskId: string): Session[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions WHERE task_id = ? ORDER BY created_at ASC')
      .all(taskId) as Row[];
    return rows.map(rowToSession);
  }

  listActive(): Session[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions WHERE closed_at IS NULL ORDER BY updated_at DESC')
      .all() as Row[];
    return rows.map(rowToSession);
  }

  /** Persist the full mutable surface of a session in one statement. */
  save(s: Session): Session {
    this.db
      .prepare(
        `UPDATE sessions SET agent_id = ?, group_id = ?, state = ?, prior_state = ?, runtime_mode = ?, approval_json = ?,
           budget_cap = ?, budget_used = ?, budget_escalation_ratio = ?, budget_escalated = ?,
           fp_diff = ?, fp_issue = ?, snapshot_json = ?, updated_at = ?, closed_at = ?
         WHERE id = ?`,
      )
      .run(
        s.agentId,
        s.groupId,
        s.state,
        s.priorState,
        s.runtimeMode,
        s.approval ? JSON.stringify(s.approval) : null,
        s.budget.cap,
        s.budget.used,
        s.budget.escalationRatio,
        s.budget.escalated ? 1 : 0,
        s.fingerprints.diff,
        s.fingerprints.issue,
        s.snapshot ? JSON.stringify(s.snapshot) : null,
        s.updatedAt,
        s.closedAt,
        s.id,
      );
    return s;
  }
}

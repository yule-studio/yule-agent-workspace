import type { SessionTransition } from '@yule/shared-types';
import type { Db } from '../db/connection.js';
import { rowToTransition } from '../db/mappers.js';

type Row = Record<string, unknown>;

export class TransitionRepo {
  constructor(private readonly db: Db) {}

  insert(t: SessionTransition): SessionTransition {
    this.db
      .prepare(
        `INSERT INTO transitions (id, session_id, event, from_state, to_state, actor, reason, tokens_spent, at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(t.id, t.sessionId, t.event, t.fromState, t.toState, t.actor, t.reason, t.tokensSpent, t.at);
    return t;
  }

  listBySession(sessionId: string): SessionTransition[] {
    const rows = this.db
      .prepare('SELECT * FROM transitions WHERE session_id = ? ORDER BY at ASC')
      .all(sessionId) as Row[];
    return rows.map(rowToTransition);
  }
}

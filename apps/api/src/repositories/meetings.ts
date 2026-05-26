import type { MeetingView } from '@yule/shared-types';
import type { Db } from '../db/connection.js';

type Row = Record<string, unknown>;

/**
 * Meetings — a gathering of agents around a shared topic. Decoupled from the
 * one-session-per-task rule: a meeting just references agent ids, so several
 * agents can be "in a meeting" and the office seats them around a table.
 */
export class MeetingRepo {
  constructor(private readonly db: Db) {}

  upsert(m: MeetingView, now: string): void {
    this.db
      .prepare(
        `INSERT INTO meetings (group_id, topic, state, participants, created_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(group_id) DO UPDATE SET topic = excluded.topic, state = excluded.state, participants = excluded.participants`,
      )
      .run(m.groupId, m.topic, m.state, JSON.stringify(m.participantIds), now);
  }

  list(): MeetingView[] {
    const rows = this.db.prepare('SELECT * FROM meetings').all() as Row[];
    return rows.map((r) => ({
      groupId: String(r.group_id),
      topic: String(r.topic),
      state: r.state ? (String(r.state) as MeetingView['state']) : null,
      participantIds: JSON.parse(String(r.participants)) as string[],
    }));
  }

  /** agentId -> meeting it participates in (for quick lookup). */
  byAgent(): Map<string, MeetingView> {
    const map = new Map<string, MeetingView>();
    for (const m of this.list()) for (const id of m.participantIds) map.set(id, m);
    return map;
  }
}

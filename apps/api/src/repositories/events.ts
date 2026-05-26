import type { WorkspaceEvent } from '@yule/shared-types';
import type { Db } from '../db/connection.js';

type Row = Record<string, unknown>;

/**
 * Event log. Backs SSE catch-up (clients can replay missed events) and alert
 * deduplication (the Discord bridge must not spam repeated alerts).
 */
export class EventRepo {
  constructor(private readonly db: Db) {}

  /**
   * Append an event. For alerts a `dedupeKey` may be supplied; if an event with
   * that key already exists the insert is skipped and `false` is returned.
   */
  append(event: WorkspaceEvent, dedupeKey: string | null): boolean {
    if (dedupeKey) {
      const existing = this.db
        .prepare('SELECT 1 FROM events WHERE dedupe_key = ?')
        .get(dedupeKey) as Row | undefined;
      if (existing) return false;
    }
    this.db
      .prepare('INSERT INTO events (id, type, at, dedupe_key, payload_json) VALUES (?,?,?,?,?)')
      .run(event.id, event.type, event.at, dedupeKey, JSON.stringify(event));
    return true;
  }

  /** Events since a given id (exclusive), for SSE reconnection catch-up. */
  since(lastId: string | null, limit = 200): WorkspaceEvent[] {
    const rows = lastId
      ? (this.db
          .prepare(
            `SELECT payload_json FROM events
             WHERE at > (SELECT at FROM events WHERE id = ?)
             ORDER BY at ASC LIMIT ?`,
          )
          .all(lastId, limit) as Row[])
      : (this.db.prepare('SELECT payload_json FROM events ORDER BY at DESC LIMIT ?').all(limit) as Row[]);
    return rows.map((r) => JSON.parse(String(r.payload_json)) as WorkspaceEvent);
  }

  recent(limit = 50): WorkspaceEvent[] {
    const rows = this.db
      .prepare('SELECT payload_json FROM events ORDER BY at DESC LIMIT ?')
      .all(limit) as Row[];
    return rows.map((r) => JSON.parse(String(r.payload_json)) as WorkspaceEvent).reverse();
  }
}

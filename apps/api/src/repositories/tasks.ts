import type { Task } from '@yule/shared-types';
import type { Db } from '../db/connection.js';
import { rowToTask } from '../db/mappers.js';

type Row = Record<string, unknown>;

export class TaskRepo {
  constructor(private readonly db: Db) {}

  insert(task: Task): Task {
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, source, work_item_key, role, priority,
           active_session_id, github_repo, github_issue, github_pr, github_branch,
           created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        task.id,
        task.title,
        task.description,
        task.source,
        task.workItemKey,
        task.role,
        task.priority,
        task.activeSessionId,
        task.github?.repo ?? null,
        task.github?.issueNumber ?? null,
        task.github?.prNumber ?? null,
        task.github?.branch ?? null,
        task.createdAt,
        task.updatedAt,
      );
    return task;
  }

  get(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Row | undefined;
    return row ? rowToTask(row) : null;
  }

  findByWorkItemKey(key: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE work_item_key = ?').get(key) as Row | undefined;
    return row ? rowToTask(row) : null;
  }

  list(): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Row[];
    return rows.map(rowToTask);
  }

  setActiveSession(taskId: string, sessionId: string | null, now: string): void {
    this.db
      .prepare('UPDATE tasks SET active_session_id = ?, updated_at = ? WHERE id = ?')
      .run(sessionId, now, taskId);
  }

  updateGithub(taskId: string, github: NonNullable<Task['github']>, now: string): void {
    this.db
      .prepare(
        `UPDATE tasks SET github_repo = ?, github_issue = ?, github_pr = ?, github_branch = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(github.repo, github.issueNumber, github.prNumber, github.branch, now, taskId);
  }
}

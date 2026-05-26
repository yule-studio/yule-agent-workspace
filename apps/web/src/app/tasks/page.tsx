'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { AGENT_ROLES, type AgentRole, type Task } from '@yule/shared-types';

/** Tasks grouped by the state of their active session — a Kanban-style board. */
export default function Tasks() {
  const { data, reload } = useLive<{ tasks: Task[] }>(
    () => api.tasks(),
    ['task.created', 'task.updated', 'session.transition', 'session.created'],
  );
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<AgentRole>('engineering');
  const [busy, setBusy] = useState(false);

  // Each task -> its active session state requires fetching; instead we fetch
  // tasks and bucket by a lightweight per-task state lookup.
  const tasks = data?.tasks ?? [];

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.createTask({ title, role, source: 'operator', autostart: true });
      setTitle('');
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Tasks & Sessions</h2>
        <ConnectionDot />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>New task</h3>
        <div className="row">
          <input
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as AgentRole)} style={{ width: 160 }}>
            {AGENT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="primary" disabled={busy} onClick={create}>
            Create & run
          </button>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          “Create & run” opens a canonical session, submits it, and drives it to the first human gate (e.g.
          approval) under budget control.
        </p>
      </div>

      <TaskBoard tasks={tasks} />
    </div>
  );
}

function TaskBoard({ tasks }: { tasks: Task[] }) {
  // Group by role for a stable, readable board; the per-task state lives on the
  // task detail page (a task has many sessions over its lifetime).
  const byRole = AGENT_ROLES.map((r) => ({ role: r, items: tasks.filter((t) => t.role === r) })).filter(
    (g) => g.items.length > 0,
  );
  if (tasks.length === 0) return <p className="muted">No tasks yet — create one above.</p>;
  return (
    <div className="board">
      {byRole.map((g) => (
        <div key={g.role} className="col">
          <h4>
            <span>{g.role}</span>
            <span className="mono muted">{g.items.length}</span>
          </h4>
          {g.items.map((t) => (
            <div key={t.id} className="taskcard">
              <Link href={`/tasks/${t.id}`} className="t">
                {t.title}
              </Link>
              <div className="small muted">
                {t.priority} · {t.source}
                {t.github?.issueNumber ? ` · #${t.github.issueNumber}` : ''}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

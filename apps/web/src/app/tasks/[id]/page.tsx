'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge } from '@/components/StateBadge';
import { SessionPanel } from '@/components/SessionPanel';
import type { Session, Task } from '@yule/shared-types';

export default function TaskDetail() {
  const id = String(useParams().id);
  const { data } = useLive<{ task: Task; sessions: Session[] }>(
    () => api.task(id),
    ['session.transition', 'task.updated', 'session.created'],
    [id],
  );
  if (!data) return <p className="muted">Loading…</p>;
  const { task, sessions } = data;
  const active = sessions.find((s) => !s.closedAt);

  return (
    <div>
      <div className="page-head">
        <h2>{task.title}</h2>
        <ConnectionDot />
      </div>
      <p className="small muted">
        {task.role} · {task.priority} · from {task.source}
        {task.workItemKey ? ` · ${task.workItemKey}` : ''}
        {task.github?.repo ? ` · ${task.github.repo}` : ''}
      </p>
      {task.description && <p>{task.description}</p>}

      <div className="grid cols-3">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>Active session</h3>
          {active ? (
            <SessionPanel sessionId={active.id} />
          ) : (
            <NoActiveSession taskId={task.id} />
          )}
        </div>
        <div className="card">
          <h3>Session history ({sessions.length})</h3>
          {sessions.map((s) => (
            <div key={s.id} className="taskcard">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <StateBadge state={s.state} />
                <Link className="small" href={`/sessions/${s.id}`}>
                  open →
                </Link>
              </div>
              <div className="small muted mono">{s.id.slice(0, 8)} · {s.budget.used} tok</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoActiveSession({ taskId }: { taskId: string }) {
  return (
    <div>
      <p className="muted">No active session.</p>
      <button
        onClick={async () => {
          await api.openSession(taskId);
          location.reload();
        }}
      >
        Open new session
      </button>
    </div>
  );
}

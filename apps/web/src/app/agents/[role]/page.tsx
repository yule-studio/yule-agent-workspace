'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import { SessionPanel } from '@/components/SessionPanel';
import {
  AGENT_ROLE_LABEL,
  RUNTIME_MODE_PROFILE,
  type AgentPresence,
  type Task,
} from '@yule/shared-types';

export default function AgentDetail() {
  const role = String(useParams().role);
  const { data } = useLive<{ presence: AgentPresence; tasks: Task[] }>(
    () => api.agent(role),
    ['agent.presence', 'session.transition', 'task.created'],
    [role],
  );
  if (!data) return <p className="muted">Loading…</p>;
  const { presence, tasks } = data;

  return (
    <div>
      <div className="page-head">
        <h2>
          {AGENT_ROLE_LABEL[presence.role]} <StateBadge state={presence.state} /> <ModePill mode={presence.mode} />
        </h2>
        <ConnectionDot />
      </div>
      <p className="muted small">{RUNTIME_MODE_PROFILE[presence.mode].description}</p>

      <div className="grid cols-3">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>Current session</h3>
          {presence.currentSessionId ? (
            <SessionPanel sessionId={presence.currentSessionId} />
          ) : (
            <p className="muted">Idle — no active session.</p>
          )}
        </div>
        <div className="card">
          <h3>Tasks ({tasks.length})</h3>
          {tasks.map((t) => (
            <div key={t.id} className="taskcard">
              <Link href={`/tasks/${t.id}`} className="t">
                {t.title}
              </Link>
              <div className="small muted">{t.priority} · {t.source}</div>
            </div>
          ))}
          {tasks.length === 0 && <p className="muted small">No tasks yet.</p>}
        </div>
      </div>
    </div>
  );
}

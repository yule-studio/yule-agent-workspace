'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import { SessionPanel } from '@/components/SessionPanel';
import { AGENT_ROLE_LABEL, type AgentRole, type AgentView, type Task } from '@yule/shared-types';

export default function RoleDetail() {
  const role = String(useParams().role);
  const { data } = useLive<{ role: string; agents: AgentView[]; tasks: Task[] }>(
    () => api.agentsByRole(role),
    ['agent.presence', 'session.transition', 'task.created', 'session.created'],
    [role],
  );
  if (!data) return <p className="muted">Loading…</p>;
  const { agents, tasks } = data;
  const active = agents.find((a) => a.currentSessionId);

  return (
    <div>
      <div className="page-head">
        <h2>{AGENT_ROLE_LABEL[role as AgentRole] ?? role} — {agents.length} agents</h2>
        <ConnectionDot />
      </div>

      <div className="grid cols-3">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>Members</h3>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Activity</th>
                <th>State</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.currentSessionId ? (
                      <Link href={`/sessions/${a.currentSessionId}`}>{a.name}</Link>
                    ) : (
                      a.name
                    )}
                    <div className="small muted">{a.title}</div>
                  </td>
                  <td>{a.activity}</td>
                  <td>
                    <StateBadge state={a.state} />
                  </td>
                  <td>
                    <ModePill mode={a.mode} />
                  </td>
                  <td className="small muted">{a.statusLine ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {active?.currentSessionId && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Active session — {active.name}</h3>
          <SessionPanel sessionId={active.currentSessionId} />
        </div>
      )}
    </div>
  );
}

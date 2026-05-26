'use client';
import Link from 'next/link';
import { useAgents, useStatus } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import { AGENT_ROLE_LABEL } from '@yule/shared-types';

export default function Dashboard() {
  const status = useStatus();
  const live = useAgents();
  const s = status.data;
  const agents = live.data?.agents ?? [];
  const meetings = live.data?.meetings ?? [];

  const needs = agents.filter((a) =>
    ['awaiting_approval', 'blocked', 'ready_to_merge', 'failed'].includes(a.state ?? ''),
  );
  const busy = agents.filter((a) => a.activity !== 'idle');

  return (
    <div>
      <div className="page-head">
        <h2>Dashboard</h2>
        <ConnectionDot />
      </div>

      {status.error && <p className="badge" style={{ background: 'var(--s-failed)' }}>API: {status.error}</p>}

      <div className="grid cols-4">
        <div className="card">
          <h3>Agents</h3>
          <div className="stat">
            {s?.agents ?? agents.length}
            <span className="unit"> · {s?.activeAgents ?? busy.length} active</span>
          </div>
          <span className="small muted">registry · {live.data ? new Set(agents.map((a) => a.role)).size : '—'} departments</span>
        </div>
        <div className="card">
          <h3>Active sessions</h3>
          <div className="stat">{s?.activeSessions ?? '—'}</div>
          <span className="small muted">{s?.meetings ?? meetings.length} meeting(s)</span>
        </div>
        <div className="card">
          <h3>Needs attention</h3>
          <div className="stat" style={{ color: needs.length ? 'var(--s-awaiting_approval)' : undefined }}>
            {needs.length}
          </div>
          <span className="small muted">{s?.blocked ?? 0} blocked · {s?.failed ?? 0} failed</span>
        </div>
        <div className="card">
          <h3>Tokens today</h3>
          <div className="stat">
            {s ? (s.tokens.spentToday / 1000).toFixed(1) : '—'}
            <span className="unit"> k / {s ? (s.tokens.dailyCap / 1000).toFixed(0) : '—'}k</span>
          </div>
          <div className="bar" style={{ marginTop: 8 }}>
            <span style={{ width: `${s ? Math.min(100, (s.tokens.spentToday / s.tokens.dailyCap) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>Needs you</h3>
          {needs.length === 0 && <p className="muted small">Nothing waiting — all clear.</p>}
          {needs.map((a) => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
              <span>
                <strong>{a.name}</strong> <span className="small muted">{AGENT_ROLE_LABEL[a.role]}</span>{' '}
                <StateBadge state={a.state} />
              </span>
              <span className="small muted">{a.statusLine}</span>
              {a.currentSessionId && <Link href={`/sessions/${a.currentSessionId}`}>open →</Link>}
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Sessions by state</h3>
          {Object.entries(s?.sessionsByState ?? {}).map(([state, n]) => (
            <div key={state} className="row" style={{ justifyContent: 'space-between', padding: '3px 0' }}>
              <StateBadge state={state as never} />
              <span className="mono">{n}</span>
            </div>
          ))}
          {Object.keys(s?.sessionsByState ?? {}).length === 0 && <p className="muted small">No active sessions.</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Working now ({busy.length})</h3>
        {busy.length === 0 ? (
          <p className="muted small">All agents idle.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Dept</th>
                <th>Activity</th>
                <th>State</th>
                <th>Mode</th>
                <th>Task</th>
              </tr>
            </thead>
            <tbody>
              {busy.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.currentSessionId ? <Link href={`/sessions/${a.currentSessionId}`}>{a.name}</Link> : a.name}
                  </td>
                  <td className="small muted">{AGENT_ROLE_LABEL[a.role]}</td>
                  <td>{a.activity}</td>
                  <td>
                    <StateBadge state={a.state} />
                  </td>
                  <td>
                    <ModePill mode={a.mode} />
                  </td>
                  <td className="muted small">{a.currentTaskTitle ?? a.statusLine ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

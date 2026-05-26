'use client';
import Link from 'next/link';
import { api, type StatusPayload } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import type { AgentPresence } from '@yule/shared-types';

export default function Dashboard() {
  const status = useLive<StatusPayload>(() => api.status(), ['session.transition', 'task.created', 'session.created']);
  const agents = useLive<{ agents: AgentPresence[] }>(
    () => api.agents(),
    ['agent.presence', 'session.transition'],
  );

  const s = status.data;
  const waiting = (agents.data?.agents ?? []).filter(
    (a) => a.state === 'awaiting_approval' || a.state === 'blocked' || a.state === 'ready_to_merge',
  );

  return (
    <div>
      <div className="page-head">
        <h2>Dashboard</h2>
        <ConnectionDot />
      </div>

      {status.error && <p className="badge" style={{ background: 'var(--s-failed)' }}>API: {status.error}</p>}

      <div className="grid cols-4">
        <div className="card">
          <h3>Tasks</h3>
          <div className="stat">{s?.tasks ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Active sessions</h3>
          <div className="stat">{s?.activeSessions ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Tokens today</h3>
          <div className="stat">
            {s ? (s.tokens.spentToday / 1000).toFixed(1) : '—'}
            <span className="unit"> k / {s ? (s.tokens.dailyCap / 1000).toFixed(0) : '—'}k cap</span>
          </div>
          <div className="bar" style={{ marginTop: 8 }}>
            <span style={{ width: `${s ? Math.min(100, (s.tokens.spentToday / s.tokens.dailyCap) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="card">
          <h3>Engine</h3>
          <div className="stat" style={{ fontSize: 20 }}>
            {s?.adapter.mode ?? '—'}
          </div>
          <span className="small muted">agent-core adapter</span>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3>Needs you</h3>
          {waiting.length === 0 && <p className="muted small">Nothing waiting — all clear.</p>}
          {waiting.map((a) => (
            <div key={a.role} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
              <span>
                <strong>{a.role}</strong> <StateBadge state={a.state} />
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
        <h3>Agents</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>State</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Tokens today</th>
            </tr>
          </thead>
          <tbody>
            {(agents.data?.agents ?? []).map((a) => (
              <tr key={a.role}>
                <td>
                  <Link href={`/agents/${a.role}`}>{a.role}</Link>
                </td>
                <td>
                  <StateBadge state={a.state} />
                </td>
                <td>
                  <ModePill mode={a.mode} />
                </td>
                <td className="muted small">{a.statusLine ?? '—'}</td>
                <td className="mono">{a.tokensToday.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

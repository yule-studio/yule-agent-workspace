'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { StateBadge, ModePill } from './StateBadge';
import type { Session, SessionTransition, TransitionEvent } from '@yule/shared-types';

/**
 * Full session control surface: state, budget, approval gates, transition
 * affordances, and the audit timeline. Operator actions are policy-driven here,
 * not in Discord.
 */
export function SessionPanel({ sessionId, compact }: { sessionId: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const live = useLive<{ session: Session; transitions: SessionTransition[]; availableEvents: TransitionEvent[] }>(
    () => api.session(sessionId),
    ['session.transition', 'session.escalation'],
    [sessionId],
  );

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      live.reload();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (live.error) return <p className="badge" style={{ background: 'var(--s-failed)' }}>{live.error}</p>;
  if (!live.data) return <p className="muted">Loading…</p>;

  const { session, transitions, availableEvents } = live.data;
  const b = session.budget;
  const pct = Math.min(100, (b.used / b.cap) * 100);
  const barClass = b.escalated ? 'crit' : pct > b.escalationRatio * 100 ? 'warn' : '';

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row">
          <StateBadge state={session.state} /> <ModePill mode={session.runtimeMode} />
        </span>
        <span className="small muted mono">{session.role}</span>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Token budget</label>
        <div className="bar">
          <span className={barClass} style={{ width: `${pct}%` }} />
        </div>
        <span className="small muted">
          {b.used.toLocaleString()} / {b.cap.toLocaleString()} tokens
          {b.escalated ? ' · escalated' : ''}
        </span>
      </div>

      {session.approval && (
        <p className="small">
          Decision: <strong>{session.approval.decision}</strong> by {session.approval.by} via{' '}
          {session.approval.via}
        </p>
      )}

      {/* Approval gate */}
      {session.state === 'awaiting_approval' && (
        <div className="row" style={{ margin: '10px 0' }}>
          <button className="primary" disabled={busy} onClick={() => act(() => api.decide(sessionId, 'approved'))}>
            Approve
          </button>
          <button disabled={busy} onClick={() => act(() => api.decide(sessionId, 'changes_requested'))}>
            Request changes
          </button>
          <button disabled={busy} onClick={() => act(() => api.decide(sessionId, 'rejected'))}>
            Reject
          </button>
        </div>
      )}

      {/* Generic affordances */}
      <div className="row" style={{ margin: '10px 0' }}>
        <button disabled={busy} onClick={() => act(() => api.advance(sessionId))}>
          Advance once
        </button>
        <button disabled={busy} onClick={() => act(() => api.run(sessionId))}>
          Run to gate
        </button>
        {availableEvents
          .filter((e) => !['approve', 'request_changes'].includes(e))
          .map((e) => (
            <button key={e} disabled={busy} onClick={() => act(() => api.transition(sessionId, e))}>
              {e.replace(/_/g, ' ')}
            </button>
          ))}
      </div>
      {err && <p className="small" style={{ color: 'var(--s-failed)' }}>{err}</p>}

      {session.snapshot && (
        <div className="field">
          <label>Snapshot (compacted context)</label>
          <pre className="small mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {session.snapshot.summary}
          </pre>
        </div>
      )}

      {!compact && (
        <div className="field">
          <label>Transition history ({transitions.length})</label>
          <ul className="timeline">
            {transitions
              .slice()
              .reverse()
              .map((t) => (
                <li key={t.id}>
                  <span className="mono">{t.at.slice(11, 19)}</span> {t.fromState} → <strong>{t.toState}</strong>{' '}
                  <span className="muted">({t.event}{t.tokensSpent ? `, ${t.tokensSpent} tok` : ''})</span>
                  {t.reason && <div className="muted small">{t.reason}</div>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

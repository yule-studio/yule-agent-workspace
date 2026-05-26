'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { SessionPanel } from '@/components/SessionPanel';
import { StateBadge } from '@/components/StateBadge';
import { AGENT_DESK, AGENT_ROLE_LABEL, type AgentPresence } from '@yule/shared-types';

/** Emoji avatars per role — static "art", everything else is code-driven. */
const AVATAR: Record<string, string> = {
  engineering: '👷',
  planning: '🗺️',
  product: '📦',
  marketing: '📣',
  'sales-cs': '🎧',
  finance: '💰',
  hr: '🧑‍💼',
  legal: '⚖️',
};

// Office is a 10x10 grid; desk coords (0..9) map to percentage positions.
const CELL = 100 / 10;

function bubbleClass(state: AgentPresence['state']): string {
  if (state === 'awaiting_approval' || state === 'ready_to_merge') return 'bubble warn';
  if (state === 'blocked' || state === 'failed') return 'bubble alert';
  return 'bubble';
}

export default function Office() {
  const [selected, setSelected] = useState<AgentPresence | null>(null);
  const { data } = useLive<{ agents: AgentPresence[] }>(
    () => api.agents(),
    ['agent.presence', 'session.transition', 'session.created'],
  );
  const agents = data?.agents ?? [];

  return (
    <div>
      <div className="page-head">
        <h2>Pixel Office</h2>
        <ConnectionDot />
      </div>
      <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>
        Each desk is a role-based agent. State badge + speech bubble are live; click a desk to open its
        session and act on it.
      </p>

      <div className="office">
        {agents.map((a) => {
          const desk = AGENT_DESK[a.role];
          const showBubble = a.statusLine && a.state && a.state !== 'queued';
          return (
            <div
              key={a.role}
              className="desk"
              style={{ left: `${(desk.x + 0.5) * CELL}%`, top: `${(desk.y + 0.5) * CELL}%` }}
              onClick={() => setSelected(a)}
              title={`${AGENT_ROLE_LABEL[a.role]} — ${a.state ?? 'idle'}`}
            >
              {showBubble && <div className={bubbleClass(a.state)}>{a.statusLine}</div>}
              <div className="ring" style={{ borderColor: a.state ? `var(--s-${a.state})` : undefined }}>
                <span className="avatar">{AVATAR[a.role] ?? '🤖'}</span>
              </div>
              <div className="name">{AGENT_ROLE_LABEL[a.role]}</div>
              <StateBadge state={a.state} />
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="drawer">
          <button className="close" onClick={() => setSelected(null)}>
            ✕
          </button>
          <h3 style={{ marginTop: 0 }}>
            {AVATAR[selected.role]} {AGENT_ROLE_LABEL[selected.role]}
          </h3>
          <p className="small muted">
            mode {selected.mode} · {selected.tokensToday.toLocaleString()} tokens today
          </p>
          {selected.currentSessionId ? (
            <SessionPanel sessionId={selected.currentSessionId} compact />
          ) : (
            <p className="muted">Idle — no active session.</p>
          )}
        </div>
      )}
    </div>
  );
}

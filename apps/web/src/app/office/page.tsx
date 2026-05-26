'use client';
import { useState } from 'react';
import { useAgents } from '@/lib/live';
import { SessionPanel } from '@/components/SessionPanel';
import { StateBadge } from '@/components/StateBadge';
import { OfficeMap } from '@/office/OfficeMap';
import { AGENT_ROLE_LABEL, type AgentView } from '@yule/shared-types';

export default function Office() {
  const [selected, setSelected] = useState<AgentView | null>(null);
  const { data } = useAgents();
  const agents = data?.agents ?? [];
  const meetings = data?.meetings ?? [];

  return (
    <>
      <OfficeMap agents={agents} meetings={meetings} onSelect={setSelected} />

      {selected && (
        <div className="drawer">
          <button className="close" onClick={() => setSelected(null)}>
            ✕
          </button>
          <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
          <p className="small muted" style={{ marginTop: -6 }}>
            {AGENT_ROLE_LABEL[selected.role]} · {selected.title}
          </p>
          <div className="row" style={{ marginBottom: 12 }}>
            <StateBadge state={selected.state} />
            <span className="mode">{selected.activity}</span>
            {selected.groupId && <span className="mode">in meeting</span>}
          </div>
          {selected.currentSessionId ? (
            <SessionPanel sessionId={selected.currentSessionId} compact />
          ) : (
            <p className="muted small">
              {selected.statusLine ?? 'Idle — available for work. Assign a task and this agent spins up a session.'}
            </p>
          )}
        </div>
      )}
    </>
  );
}

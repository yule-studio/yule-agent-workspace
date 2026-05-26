'use client';
import Link from 'next/link';
import { useAgents } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import { AGENT_ROLE_LABEL, AGENT_ROLES, type AgentRole, type AgentView } from '@yule/shared-types';

export default function Agents() {
  const { data } = useAgents();
  const agents = data?.agents ?? [];
  const byRole = AGENT_ROLES.map((r) => ({ role: r, items: agents.filter((a) => a.role === r) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div>
      <div className="page-head">
        <h2>Agents — {agents.length} registered</h2>
        <ConnectionDot />
      </div>
      {byRole.map((g) => (
        <div key={g.role} style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
            <Link href={`/agents/${g.role}`}>{AGENT_ROLE_LABEL[g.role as AgentRole]}</Link>{' '}
            <span className="small muted">{g.items.length}</span>
          </h3>
          <div className="grid cols-4">
            {g.items.map((a) => (
              <AgentCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentCard({ a }: { a: AgentView }) {
  const inner = (
    <div className="card" style={{ color: 'inherit' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{a.name}</strong>
        <ModePill mode={a.mode} />
      </div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        {a.title}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <StateBadge state={a.state} />
        <span className="small muted">{a.activity}</span>
      </div>
      {a.statusLine && <p className="small muted" style={{ marginBottom: 0 }}>{a.statusLine}</p>}
    </div>
  );
  return a.currentSessionId ? <Link href={`/sessions/${a.currentSessionId}`}>{inner}</Link> : inner;
}

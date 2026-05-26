'use client';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLive } from '@/lib/live';
import { ConnectionDot } from '@/components/Nav';
import { StateBadge, ModePill } from '@/components/StateBadge';
import { AGENT_ROLE_LABEL, RUNTIME_MODE_PROFILE, type AgentPresence } from '@yule/shared-types';

export default function Agents() {
  const { data } = useLive<{ agents: AgentPresence[] }>(
    () => api.agents(),
    ['agent.presence', 'session.transition'],
  );
  return (
    <div>
      <div className="page-head">
        <h2>Agents</h2>
        <ConnectionDot />
      </div>
      <div className="grid cols-4">
        {(data?.agents ?? []).map((a) => (
          <Link key={a.role} href={`/agents/${a.role}`} className="card" style={{ color: 'inherit' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{AGENT_ROLE_LABEL[a.role]}</strong>
              <ModePill mode={a.mode} />
            </div>
            <div style={{ margin: '10px 0' }}>
              <StateBadge state={a.state} />
            </div>
            <p className="small muted" style={{ minHeight: 30 }}>
              {a.statusLine ?? RUNTIME_MODE_PROFILE[a.mode].description}
            </p>
            <span className="small mono muted">{a.tokensToday.toLocaleString()} tok today</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

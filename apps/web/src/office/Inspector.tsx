'use client';
/**
 * Right-hand inspector — fills the space beside the building/floor scene with
 * live context: the focused floor's teams + agents + activity, and an HQ-wide
 * activity stream. Keeps the building/map itself free of card clutter.
 */
import type { AgentView } from '@yule/shared-types';
import type { Building, Floor } from './org.js';

export function Inspector({
  building,
  floor,
  onEnter,
}: {
  building: Building;
  floor: Floor | null;
  onEnter: (id: string) => void;
}) {
  const totalActive = building.floors.reduce((n, f) => n + f.activeCount, 0);
  const totalAgents = building.floors.reduce((n, f) => n + f.agents.length, 0);
  const active = building.floors.flatMap((f) => f.agents).filter((a) => a.activity !== 'idle');

  return (
    <aside className="inspector">
      <div className="insp-head">
        <span className="insp-eyebrow">Yule HQ</span>
        <h3>{floor ? floor.name : 'Building overview'}</h3>
        <p className="muted small">
          {totalAgents} agents · {totalActive} active · {building.floors.length} floors
        </p>
      </div>

      {floor ? (
        <div className="insp-floor">
          {floor.teams.length === 0 && <p className="muted small">Executive suite — your office. No assigned agents.</p>}
          {floor.teams.map((t) => (
            <div key={t.id} className="insp-team">
              <div className="insp-team-h">
                <span style={{ color: floor.accent }}>{t.name}</span>
                <span className="muted small">{t.agents.length}</span>
              </div>
              {t.agents.map((a) => (
                <AgentRow key={a.id} a={a} />
              ))}
            </div>
          ))}
          <button className="enter-btn" onClick={() => onEnter(floor.id)} style={{ borderColor: floor.accent }}>
            Enter {floor.name} →
          </button>
        </div>
      ) : (
        <p className="muted small insp-hint">Hover a floor to inspect it · click to enter.</p>
      )}

      <div className="insp-stream">
        <div className="insp-stream-h">Activity</div>
        {active.length === 0 && <p className="muted small">All quiet across the building.</p>}
        {active.slice(0, 10).map((a) => (
          <div key={a.id} className="stream-row">
            <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b636d' }} />
            <span className="sr-name">{a.name}</span>
            <span className="muted">{a.activity}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function AgentRow({ a }: { a: AgentView }) {
  return (
    <div className="insp-agent">
      <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b636d' }} />
      <span className="ia-name">{a.name}</span>
      <span className="muted small">{a.activity}</span>
    </div>
  );
}

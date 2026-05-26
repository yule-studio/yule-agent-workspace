'use client';
/**
 * Yule HQ building view — a cross-section of the tower. Each floor is a slab
 * with one lit window per agent (colour = live state), team chips, and activity
 * counts. Click a floor to drop into its detailed top-down office.
 */
import type { AgentView } from '@yule/shared-types';
import type { Building } from './org.js';

export function BuildingView({
  building,
  onEnter,
}: {
  building: Building;
  onEnter: (floorId: string) => void;
}) {
  return (
    <div className="building-wrap">
      <div className="building">
        <div className="roof">
          <span className="roof-sign">YULE&nbsp;HQ</span>
          <span className="roof-light" />
        </div>
        {building.floors.map((f) => (
          <button key={f.id} className="bfloor" onClick={() => onEnter(f.id)} style={{ borderColor: f.accent }}>
            <span className="bfloor-bar" style={{ background: f.accent }} />
            <div className="bfloor-head">
              <b style={{ color: f.accent }}>{f.name}</b>
              <span className="muted small">
                {f.teams.length} teams · {f.agents.length} agents · {f.activeCount} active
              </span>
            </div>
            <div className="windows">
              {f.agents.map((a) => (
                <Window key={a.id} a={a} />
              ))}
            </div>
            <div className="bfloor-teams">
              {f.teams.map((t) => (
                <span key={t.id} className="team-chip">
                  {t.name} <i>{t.agents.length}</i>
                </span>
              ))}
            </div>
            <span className="enter">Enter →</span>
          </button>
        ))}
        <div className="ground" />
      </div>
    </div>
  );
}

function Window({ a }: { a: AgentView }) {
  const active = a.activity !== 'idle';
  return (
    <span
      className={`bwin ${active ? 'on' : ''}`}
      title={`${a.name} · ${a.activity}`}
      style={active && a.state ? { background: `var(--s-${a.state})` } : undefined}
    />
  );
}

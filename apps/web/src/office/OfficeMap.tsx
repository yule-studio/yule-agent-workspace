'use client';
/**
 * Yule HQ shell — fills the viewport: a floating HUD (Building/Floor + floor
 * navigator + follow), the building facade or a floor scene as the hero stage,
 * and a right inspector. The building/map is the focus, not chrome.
 */
import { useEffect, useMemo, useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import { BuildingScene } from './BuildingScene.js';
import { FloorView } from './FloorView.js';
import { Inspector } from './Inspector.js';
import { buildBuilding, busiestFloorId, type Floor } from './org.js';
import { useKst } from './useKst.js';

export function OfficeMap({
  agents,
  meetings,
  onSelect,
}: {
  agents: AgentView[];
  meetings: MeetingView[];
  onSelect: (a: AgentView) => void;
}) {
  const building = useMemo(() => buildBuilding(agents), [agents]);
  const kst = useKst();
  const [view, setView] = useState<'building' | 'floor'>('building');
  const [floorId, setFloorId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [hoverFloor, setHoverFloor] = useState<Floor | null>(null);
  const [inspect, setInspect] = useState(false); // inspector closed by default

  useEffect(() => {
    if (building.floors.length === 0) return;
    if (!floorId || !building.floors.some((f) => f.id === floorId)) setFloorId(building.floors[0]!.id);
  }, [building, floorId]);

  useEffect(() => {
    if (!follow) return;
    const id = busiestFloorId(building);
    if (id) {
      setFloorId(id);
      setView('floor');
    }
  }, [follow, building]);

  const floor = building.floors.find((f) => f.id === floorId) ?? building.floors[0] ?? null;
  const inspectFloor = view === 'building' ? (hoverFloor ?? floor) : floor;

  const enter = (id: string) => {
    setFloorId(id);
    setView('floor');
  };

  return (
    <div className="hq-root">
      <div className="hq-hud">
        <div className="seg">
          <button className={view === 'building' ? 'on' : ''} onClick={() => setView('building')}>
            Building
          </button>
          <button className={view === 'floor' ? 'on' : ''} onClick={() => setView('floor')}>
            Floor
          </button>
        </div>
        {view === 'floor' && (
          <select className="floor-select" value={floorId ?? ''} onChange={(e) => setFloorId(e.target.value)} aria-label="Floor">
            {building.floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.activeCount > 0 ? ` · ${f.activeCount} active` : ''}
              </option>
            ))}
          </select>
        )}
        <div className={`kst-chip phase-${kst.phase}`} title={`KST ${kst.time} · ${kst.shift}`}>
          <span className="kst-orb" />
          {kst.time}
        </div>
        <button
          className={`hud-icon ${follow ? 'on' : ''}`}
          onClick={() => setFollow((f) => !f)}
          title={follow ? 'Following active floor' : 'Follow active floor'}
          aria-pressed={follow}
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
            <circle cx="8" cy="8" r="2.4" />
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button className={`hud-icon ${inspect ? 'on' : ''}`} onClick={() => setInspect((o) => !o)} title="Details" aria-pressed={inspect}>
          <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
            <circle cx="8" cy="4" r="1.3" />
            <rect x="6.8" y="6.6" width="2.4" height="6.4" rx="1" />
          </svg>
        </button>
      </div>

      <div className="hq-stage">
        {view === 'building' || !floor ? (
          <BuildingScene
            building={building}
            selectedId={floorId}
            meetings={meetings}
            phase={kst.phase}
            minutes={kst.minutes}
            onEnter={enter}
            onHover={setHoverFloor}
          />
        ) : (
          <FloorView floor={floor} meetings={meetings} onSelect={onSelect} />
        )}
        <Inspector building={building} floor={inspectFloor} onEnter={enter} open={inspect} onClose={() => setInspect(false)} />
      </div>
    </div>
  );
}

'use client';
/**
 * Yule HQ shell — fills the viewport: a floating HUD (Building/Floor + floor
 * navigator + follow), the building facade or a floor scene as the hero stage,
 * and a right inspector. The building/map is the focus, not chrome.
 */
import { useEffect, useMemo, useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import { BuildingFacade } from './BuildingFacade.js';
import { FloorView } from './FloorView.js';
import { Inspector } from './Inspector.js';
import { buildBuilding, busiestFloorId, type Floor } from './org.js';

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
  const [view, setView] = useState<'building' | 'floor'>('building');
  const [floorId, setFloorId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [hoverFloor, setHoverFloor] = useState<Floor | null>(null);

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
          <div className="floor-tabs">
            {building.floors.map((f) => (
              <button
                key={f.id}
                className={f.id === floorId ? 'on' : ''}
                onClick={() => setFloorId(f.id)}
                style={f.id === floorId ? { borderColor: f.accent, color: f.accent } : undefined}
              >
                {f.name}
                {f.activeCount > 0 && <i className="ft-count">{f.activeCount}</i>}
              </button>
            ))}
          </div>
        )}
        <label className={`follow ${follow ? 'on' : ''}`}>
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          Follow active
        </label>
      </div>

      <div className="hq-body">
        <div className="hq-stage">
          {view === 'building' || !floor ? (
            <BuildingFacade
              building={building}
              selectedId={floorId}
              meetings={meetings}
              onEnter={enter}
              onHover={setHoverFloor}
            />
          ) : (
            <FloorView floor={floor} meetings={meetings} onSelect={onSelect} />
          )}
        </div>
        <Inspector building={building} floor={inspectFloor} onEnter={enter} />
      </div>
    </div>
  );
}

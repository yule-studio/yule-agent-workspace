'use client';
/**
 * Yule HQ shell: switches between the Building overview and a detailed Floor
 * view, with a floating floor selector + a "follow active" mode that jumps to
 * the busiest floor. The map is the hero; controls float over it.
 */
import { useEffect, useMemo, useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import { BuildingView } from './BuildingView.js';
import { FloorView } from './FloorView.js';
import { buildBuilding, busiestFloorId } from './org.js';

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

  // default + keep selection valid as floors change
  useEffect(() => {
    if (building.floors.length === 0) return;
    if (!floorId || !building.floors.some((f) => f.id === floorId)) {
      setFloorId(building.floors[0]!.id);
    }
  }, [building, floorId]);

  // follow-active: track the busiest floor
  useEffect(() => {
    if (!follow) return;
    const id = busiestFloorId(building);
    if (id) {
      setFloorId(id);
      setView('floor');
    }
  }, [follow, building]);

  const floor = building.floors.find((f) => f.id === floorId) ?? building.floors[0] ?? null;

  function enter(id: string) {
    setFloorId(id);
    setView('floor');
  }

  return (
    <div className="hq">
      <div className="hq-controls">
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
                <i className="ft-count">{f.activeCount}</i>
              </button>
            ))}
          </div>
        )}

        <label className={`follow ${follow ? 'on' : ''}`}>
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          Follow active
        </label>
      </div>

      {view === 'building' || !floor ? (
        <BuildingView building={building} onEnter={enter} />
      ) : (
        <FloorView floor={floor} meetings={meetings} onSelect={onSelect} />
      )}
    </div>
  );
}

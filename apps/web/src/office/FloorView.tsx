'use client';
/**
 * Detailed top-down office for one floor: a dense cubicle farm (one pod per
 * agent, grouped by team), shared rooms (meeting / review / standup / lounge),
 * an ops/dashboard wall, scattered props, and the floor's agents as moving
 * characters that walk to the room their state implies.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import { Character } from './Character.js';
import { Prop } from './sprites.js';
import { layoutFloor, ZONES, FLOOR } from './layout.js';
import { usePositions } from './usePositions.js';
import type { Floor } from './org.js';

function useFit(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const u = () => setS(Math.max(0.4, Math.min(1.1, el.clientWidth / FLOOR.w)));
    u();
    const ro = new ResizeObserver(u);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s];
}

const NEEDS = (a: AgentView) => a.activity === 'waiting' || a.activity === 'blocked';

export function FloorView({
  floor,
  meetings,
  onSelect,
}: {
  floor: Floor;
  meetings: MeetingView[];
  onSelect: (a: AgentView) => void;
}) {
  const [ref, scale] = useFit();
  const layout = useMemo(() => layoutFloor(floor), [floor]);
  const positioned = usePositions(floor.agents, layout.deskByAgent);
  const meetingZone = ZONES.find((z) => z.id === 'meeting-room')!;
  const opsX = 856;
  const opsY = 524;

  // a meeting with at least one participant on this floor
  const floorIds = new Set(floor.agents.map((a) => a.id));
  const meeting = meetings.find((m) => m.participantIds.some((id) => floorIds.has(id)));

  return (
    <div className="floor-frame">
      <div className="floor-viewport" ref={ref} style={{ height: FLOOR.h * scale }}>
        <div className="floor-stage" style={{ width: FLOOR.w, height: FLOOR.h, transform: `scale(${scale})` }}>
          {/* walls */}
          <div className="wall top" style={{ height: FLOOR.wall }} />
          <div className="wall bottom" style={{ height: FLOOR.wall }} />
          <div className="wall left" style={{ width: FLOOR.wall }} />
          <div className="wall right" style={{ width: FLOOR.wall }} />

          {/* room backgrounds */}
          {ZONES.map((z) => (
            <div
              key={z.id}
              className={`room ${z.id}`}
              style={{ left: z.rect.x, top: z.rect.y, width: z.rect.w, height: z.rect.h }}
            >
              <span className="room-label">{z.label}</span>
            </div>
          ))}
          {/* ops / dashboard wall */}
          <div className="room ops" style={{ left: opsX, top: opsY, width: 388, height: 238 }}>
            <span className="room-label">Ops Wall</span>
            <div className="ops-metrics">
              <b style={{ color: floor.accent }}>{floor.name}</b>
              <span>{floor.agents.length} agents</span>
              <span className="on">{floor.activeCount} active</span>
            </div>
          </div>

          {/* top windows */}
          {[120, 300, 480, 660].map((x) => (
            <Prop key={x} kind="window" x={x} y={2} />
          ))}

          {/* meeting room furniture */}
          <Prop kind="round-table" x={meetingZone.rect.x + meetingZone.rect.w / 2 - 75} y={120} />
          <Prop kind="whiteboard" x={meetingZone.rect.x + 22} y={70} w={150} />
          <Prop kind="plant-tall" x={meetingZone.rect.x + meetingZone.rect.w - 50} y={70} />
          {meeting && (
            <div
              className="meeting-topic"
              style={{ left: meetingZone.rect.x + meetingZone.rect.w / 2, top: meetingZone.rect.y - 22 }}
            >
              <span className="mt-live" /> {meeting.topic} · {meeting.participantIds.filter((id) => floorIds.has(id)).length}
            </div>
          )}

          {/* review room */}
          <Prop kind="long-table" x={856 + 388 / 2 - 115} y={392} />
          <Prop kind="cabinet" x={856 + 388 - 40} y={350} />

          {/* standup */}
          <Prop kind="rug" x={70} y={636} w={300} h={150} tone="violet" />
          <Prop kind="whiteboard" x={150} y={604} w={120} h={36} />

          {/* lounge + cafe */}
          <Prop kind="rug" x={470} y={636} w={300} h={150} />
          <Prop kind="sofa" x={500} y={648} />
          <Prop kind="coffee-bar" x={660} y={744} />
          <Prop kind="water-cooler" x={790} y={636} />
          <Prop kind="plant-tall" x={440} y={636} />

          {/* ops wall furniture */}
          <Prop kind="server-rack" x={opsX + 24} y={opsY + 70} />
          <Prop kind="server-rack" x={opsX + 130} y={opsY + 70} />
          <Prop kind="server-rack" x={opsX + 236} y={opsY + 70} />

          {/* scattered props for life */}
          <Prop kind="printer" x={800} y={120} />
          <Prop kind="cabinet" x={22} y={120} />
          <Prop kind="cabinet" x={22} y={300} />
          <Prop kind="plant" x={812} y={300} />
          <Prop kind="trash" x={790} y={470} />
          <Prop kind="postits" x={300} y={26} />

          {/* cubicles + chairs */}
          {layout.cubicles.map((c) => (
            <div key={c.agentId}>
              <Prop kind="cubicle" x={c.x - 75} y={c.y - 64} />
              <Prop kind="chair" x={c.x - 15} y={c.y + 6} />
            </div>
          ))}
          {/* team labels */}
          {layout.teamLabels.map((t, i) => (
            <span key={i} className="team-label" style={{ left: t.x, top: t.y, color: floor.accent }}>
              {t.name}
            </span>
          ))}

          {/* characters */}
          {floor.agents.map((a) => {
            const p = positioned.get(a.id);
            if (!p) return null;
            const working = a.activity === 'coding' || a.activity === 'running';
            return (
              <div
                key={a.id}
                className="agent"
                style={{ left: p.pos.x, top: p.pos.y, zIndex: Math.round(p.pos.y) + 500 }}
                onClick={() => onSelect(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(a)}
                title={`${a.name} · ${a.activity}`}
              >
                {NEEDS(a) && a.statusLine && (
                  <div className={`pixel-bubble ${a.activity === 'blocked' ? 'alert' : 'warn'}`}>{a.statusLine}</div>
                )}
                <Character seed={a.avatarSeed} activity={a.activity} walking={p.walking} />
                {working && !p.walking && <span className="live-dot" />}
                <div className="nameplate">
                  <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b6678' }} />
                  {a.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

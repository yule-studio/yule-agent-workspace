'use client';
/**
 * The pixel office. Renders a fit-to-width stage with: perimeter walls, an ops
 * wall, a department desk farm (one desk per agent, generated dynamically),
 * shared rooms (meeting / review / standup / lounge+cafe), and one moving
 * character per agent. Characters walk to the room their state implies.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import { Character } from './Character.js';
import { Furniture } from './sprites.js';
import { assignDesks, ROLE_TINT, ZONES } from './stage.js';
import { usePositions } from './usePositions.js';
import { STAGE } from './types.js';
import { AGENT_ROLE_LABEL } from '@yule/shared-types';

function useFitScale(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.42, Math.min(1.05, el.clientWidth / STAGE.w)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, scale];
}

function Desk({ x, y, tint }: { x: number; y: number; tint: string }) {
  return (
    <>
      <div className="desk-mat" style={{ left: x, top: y, background: tint }} />
      <div className="farm-desk" style={{ left: x, top: y - 14, zIndex: Math.round(y) }}>
        <div className="fd-monitor" />
        <div className="fd-keys" />
      </div>
    </>
  );
}

export function OfficeMap({
  agents,
  meetings,
  onSelect,
}: {
  agents: AgentView[];
  meetings: MeetingView[];
  onSelect: (a: AgentView) => void;
}) {
  const [ref, scale] = useFitScale();
  const desks = useMemo(() => assignDesks(agents), [agents]);
  const positioned = usePositions(agents);
  const meeting = meetings[0] ?? null;
  const meetingZone = ZONES.find((z) => z.id === 'meeting-room')!;

  const busy = agents.filter((a) => a.activity !== 'idle').length;

  return (
    <div className="office-frame">
      <div className="office-viewport" ref={ref} style={{ height: STAGE.h * scale }}>
        <div className="office-stage" style={{ width: STAGE.w, height: STAGE.h, transform: `scale(${scale})` }}>
          {/* walls */}
          <div className="wall top" style={{ height: STAGE.wall }} />
          <div className="wall bottom" style={{ height: STAGE.wall }} />
          <div className="wall left" style={{ width: STAGE.wall }} />
          <div className="wall right" style={{ width: STAGE.wall }} />

          {/* ops wall display */}
          <div className="ops-wall">
            <span className="ops-title">YULE HQ · OPS</span>
            <span className="ops-stat">{agents.length} agents</span>
            <span className="ops-stat on">{busy} active</span>
            <span className="ops-stat">{meetings.length} meeting</span>
          </div>

          {/* top windows */}
          {[120, 300, 520, 700].map((x) => (
            <Furniture key={x} kind="window" x={x} y={4} />
          ))}

          {/* room floors + labels */}
          {ZONES.map((z) => (
            <div
              key={z.id}
              className={`room ${z.id === 'meeting-room' ? 'glass floor-tile' : z.id === 'lounge' ? 'floor-rug-rust' : 'floor-zone'}`}
              style={{ left: z.rect.x, top: z.rect.y, width: z.rect.w, height: z.rect.h, zIndex: 1 }}
            >
              <span className="room-label">{z.label}</span>
            </div>
          ))}

          {/* meeting room furniture + live topic */}
          <Furniture kind="round-table" x={meetingZone.rect.x + meetingZone.rect.w / 2 - 75} y={130} />
          <Furniture kind="whiteboard" x={meetingZone.rect.x + 30} y={84} w={150} />
          <Furniture kind="plant-tall" x={meetingZone.rect.x + meetingZone.rect.w - 56} y={84} />
          {meeting && (
            <div
              className="meeting-topic"
              style={{
                left: meetingZone.rect.x + meetingZone.rect.w / 2,
                top: meetingZone.rect.y - 24,
                transform: 'translateX(-50%)',
              }}
            >
              <span className="mt-live" /> {meeting.topic} · {meeting.participantIds.length} in room
            </div>
          )}

          {/* review table */}
          <Furniture kind="long-table" x={862 + 384 / 2 - 115} y={400} />
          <Furniture kind="plant" x={1196} y={352} />

          {/* standup / planning */}
          <Furniture kind="rug" x={862 + 40} y={600} w={300} h={150} tone="teal" />
          <Furniture kind="standup-board" x={862 + 384 / 2 - 60} y={560} />

          {/* lounge + cafe */}
          <Furniture kind="sofa" x={90} y={648} />
          <Furniture kind="coffee-table" x={150} y={712} />
          <Furniture kind="cafe-counter" x={560} y={648} />
          <Furniture kind="stool" x={600} y={712} />
          <Furniture kind="stool" x={660} y={712} />
          <Furniture kind="plant-tall" x={470} y={648} />
          <Furniture kind="plant" x={760} y={760} />

          {/* wall plants + shelves */}
          <Furniture kind="bookshelf" x={30} y={140} w={26} h={150} />
          <Furniture kind="bookshelf" x={30} y={320} w={26} h={150} />
          <Furniture kind="plant-tall" x={812} y={86} />

          {/* desk farm — one desk per agent, department tinted */}
          {desks.map((d) => (
            <div key={d.agentId}>
              <Desk x={d.seat.x} y={d.seat.y} tint={ROLE_TINT[d.role]} />
              {d.labelRole && (
                <span className="dept-label" style={{ left: d.seat.x, top: d.seat.y - 44 }}>
                  {AGENT_ROLE_LABEL[d.labelRole]}
                </span>
              )}
            </div>
          ))}

          {/* characters */}
          {agents.map((a) => {
            const p = positioned.get(a.id);
            if (!p) return null;
            const needs = a.activity === 'waiting' || a.activity === 'blocked';
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
                {needs && a.statusLine && (
                  <div className={`pixel-bubble ${a.activity === 'blocked' ? 'alert' : 'warn'}`}>{a.statusLine}</div>
                )}
                <Character seed={a.avatarSeed} role={a.role} activity={a.activity} walking={p.walking} />
                {working && !p.walking && <span className="live-dot" />}
                <div className="nameplate">
                  <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#7c6f5d' }} />
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

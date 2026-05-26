'use client';
/**
 * Detailed top-down office for one floor, scaled to FIT its container (fills the
 * viewport, no wasted space). Normal floors render a dense cubicle farm + shared
 * rooms; the Executive floor renders the operator's CEO office (사장실).
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
    const u = () => {
      const sc = Math.min(el.clientWidth / FLOOR.w, el.clientHeight / FLOOR.h);
      setS(Math.max(0.3, Math.min(1.4, sc)));
    };
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
  return (
    <div className="floor-frame" ref={ref}>
      <div
        className="floor-stage"
        style={{ width: FLOOR.w, height: FLOOR.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {floor.id === 'executive' ? <CeoOffice /> : <TeamFloor floor={floor} meetings={meetings} onSelect={onSelect} />}
      </div>
    </div>
  );
}

function Walls() {
  return (
    <>
      <div className="wall top" style={{ height: FLOOR.wall }} />
      <div className="wall bottom" style={{ height: FLOOR.wall }} />
      <div className="wall left" style={{ width: FLOOR.wall }} />
      <div className="wall right" style={{ width: FLOOR.wall }} />
    </>
  );
}

function TeamFloor({
  floor,
  meetings,
  onSelect,
}: {
  floor: Floor;
  meetings: MeetingView[];
  onSelect: (a: AgentView) => void;
}) {
  const layout = useMemo(() => layoutFloor(floor), [floor]);
  const positioned = usePositions(floor.agents, layout.deskByAgent);
  const mz = ZONES.find((z) => z.id === 'meeting-room')!;
  const opsX = 856;
  const opsY = 524;
  const floorIds = new Set(floor.agents.map((a) => a.id));
  const meeting = meetings.find((m) => m.participantIds.some((id) => floorIds.has(id)));

  return (
    <>
      <Walls />
      {ZONES.map((z) => (
        <div key={z.id} className={`room ${z.id}`} style={{ left: z.rect.x, top: z.rect.y, width: z.rect.w, height: z.rect.h }}>
          <span className="room-label">{z.label}</span>
        </div>
      ))}
      <div className="room ops" style={{ left: opsX, top: opsY, width: 388, height: 238 }}>
        <span className="room-label">Ops Wall</span>
        <div className="ops-metrics">
          <b style={{ color: floor.accent }}>{floor.name}</b>
          <span>{floor.agents.length} agents</span>
          <span className="on">{floor.activeCount} active</span>
        </div>
      </div>

      {[120, 300, 480, 660].map((x) => (
        <Prop key={x} kind="window" x={x} y={2} />
      ))}

      {/* meeting room */}
      <Prop kind="round-table" x={mz.rect.x + mz.rect.w / 2 - 75} y={120} />
      <Prop kind="whiteboard" x={mz.rect.x + 22} y={70} w={150} />
      <Prop kind="plant-tall" x={mz.rect.x + mz.rect.w - 50} y={70} />
      {meeting && (
        <div className="meeting-topic" style={{ left: mz.rect.x + mz.rect.w / 2, top: mz.rect.y - 22 }}>
          <span className="mt-live" /> {meeting.topic} · {meeting.participantIds.filter((id) => floorIds.has(id)).length}
        </div>
      )}

      {/* review room */}
      <Prop kind="long-table" x={856 + 388 / 2 - 115} y={392} />
      <Prop kind="cabinet" x={856 + 388 - 40} y={350} />
      <Prop kind="plant" x={870} y={470} />

      {/* standup */}
      <Prop kind="rug" x={70} y={636} w={300} h={150} tone="violet" />
      <Prop kind="whiteboard" x={150} y={604} w={120} h={36} />

      {/* lounge + cafe */}
      <Prop kind="rug" x={470} y={636} w={300} h={150} />
      <Prop kind="sofa" x={500} y={648} />
      <Prop kind="coffee-bar" x={660} y={744} />
      <Prop kind="water-cooler" x={790} y={636} />
      <Prop kind="plant-tall" x={440} y={636} />

      {/* ops racks */}
      <Prop kind="server-rack" x={opsX + 24} y={opsY + 70} />
      <Prop kind="server-rack" x={opsX + 130} y={opsY + 70} />
      <Prop kind="server-rack" x={opsX + 236} y={opsY + 70} />

      {/* scattered props */}
      <Prop kind="printer" x={800} y={120} />
      <Prop kind="cabinet" x={22} y={120} />
      <Prop kind="cabinet" x={22} y={300} />
      <Prop kind="plant" x={812} y={300} />
      <Prop kind="trash" x={790} y={470} />
      <Prop kind="postits" x={300} y={26} />
      <Prop kind="plant" x={420} y={470} />

      {/* cubicles + chairs */}
      {layout.cubicles.map((c) => (
        <div key={c.agentId}>
          <Prop kind="cubicle" x={c.x - 75} y={c.y - 64} />
          <Prop kind="chair" x={c.x - 15} y={c.y + 6} />
        </div>
      ))}
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
            className={`agent ${NEEDS(a) ? 'attn' : ''}`}
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
              <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b636d' }} />
              {a.name}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** The operator's office (사장실) — distinct, premium, no assigned agents. */
function CeoOffice() {
  return (
    <>
      <Walls />
      {[120, 300, 900, 1080].map((x) => (
        <Prop key={x} kind="window" x={x} y={2} />
      ))}
      <span className="room-label" style={{ left: 40, top: 30, fontSize: 13, color: '#b59bd1' }}>
        Executive Office · 사장실
      </span>

      <Prop kind="rug" x={360} y={250} w={560} h={300} tone="violet" />

      {/* executive desk + operator */}
      <Prop kind="long-table" x={520} y={300} w={260} h={90} />
      <Prop kind="chair" x={636} y={402} w={42} h={42} />
      <div className="agent" style={{ left: 650, top: 396, zIndex: 600 }} title="You · Operator">
        <Character seed={3} activity="idle" walking={false} />
        <div className="nameplate">
          <span className="np-dot" style={{ background: '#b59bd1' }} />
          You · Operator
        </div>
      </div>

      {/* guest seating facing the desk */}
      <Prop kind="rug" x={500} y={590} w={300} h={180} />
      <Prop kind="sofa" x={520} y={600} />
      <Prop kind="sofa" x={520} y={712} />
      <Prop kind="plant" x={760} y={600} />

      {/* lounge corner */}
      <Prop kind="rug" x={120} y={560} w={300} h={180} />
      <Prop kind="sofa" x={150} y={580} />
      <Prop kind="coffee-bar" x={170} y={668} w={120} h={44} />
      <Prop kind="plant-tall" x={70} y={560} />
      <Prop kind="trash" x={400} y={560} />

      {/* shelves + plants + meeting nook */}
      <Prop kind="cabinet" x={22} y={150} h={220} />
      <Prop kind="cabinet" x={22} y={400} h={140} />
      <Prop kind="plant-tall" x={1180} y={120} />
      <Prop kind="rug" x={940} y={500} w={240} h={200} tone="violet" />
      <Prop kind="round-table" x={980} y={520} w={150} h={130} />
      <Prop kind="plant" x={1190} y={690} />
      <Prop kind="printer" x={1190} y={430} />
      <Prop kind="whiteboard" x={950} y={120} w={170} />
      <Prop kind="server-rack" x={1130} y={300} />
    </>
  );
}

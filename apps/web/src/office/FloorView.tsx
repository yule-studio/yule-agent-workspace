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

/** Small pixel speech bubble per activity (kept short so it doesn't cover the map). */
function bubbleFor(a: AgentView): { text: string; cls: string } | null {
  switch (a.activity) {
    case 'blocked':
      return { text: 'Blocked', cls: 'alert' };
    case 'waiting':
      return a.state === 'awaiting_approval'
        ? { text: 'Approve?', cls: 'warn' }
        : { text: 'Need input', cls: 'warn' };
    case 'meeting':
      return { text: '…', cls: 'meet' };
    case 'reviewing':
      return { text: 'Reviewing', cls: 'calm' };
    default:
      return null;
  }
}

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

      {/* meeting room — table + chairs around + whiteboard + plant + cables */}
      <Prop kind="round-table" x={mz.rect.x + mz.rect.w / 2 - 75} y={118} />
      {[[-86, 60], [70, 60], [-86, 190], [70, 190]].map(([dx, dy], i) => (
        <Prop key={i} kind="chair" seed={i} x={mz.rect.x + mz.rect.w / 2 + dx} y={mz.rect.y + dy} />
      ))}
      <Prop kind="whiteboard" x={mz.rect.x + 18} y={66} w={150} />
      <Prop kind="plant" x={mz.rect.x + mz.rect.w - 44} y={66} seed={2} />
      {meeting && (
        <div className="meeting-topic" style={{ left: mz.rect.x + mz.rect.w / 2, top: mz.rect.y - 22 }}>
          <span className="mt-live" /> {meeting.topic} · {meeting.participantIds.filter((id) => floorIds.has(id)).length}
        </div>
      )}

      {/* review room — long table + chairs + cabinet + docs */}
      <Prop kind="long-table" x={856 + 388 / 2 - 115} y={392} />
      {[[-90, -8], [-30, -8], [40, -8], [-60, 86], [10, 86]].map(([dx, dy], i) => (
        <Prop key={i} kind="chair" seed={i + 1} x={856 + 388 / 2 + dx} y={422 + dy} />
      ))}
      <Prop kind="file-cabinet" x={856 + 388 - 48} y={350} />
      <Prop kind="document-stack" x={1190} y={420} />

      {/* standup — rug + whiteboard + a couple plants */}
      <Prop kind="rug" x={70} y={636} w={300} h={150} tone="violet" />
      <Prop kind="whiteboard" x={150} y={602} w={120} h={36} />
      <Prop kind="plant" x={350} y={742} seed={4} />

      {/* lounge + cafe — sofa, coffee bar, water cooler, plants, small rug */}
      <Prop kind="rug" x={470} y={636} w={300} h={150} tone="rose" />
      <Prop kind="sofa" x={500} y={648} />
      <Prop kind="coffee-bar" x={660} y={744} />
      <Prop kind="water-cooler" x={790} y={636} />
      <Prop kind="plant" x={440} y={640} seed={0} />
      <Prop kind="document-stack" x={620} y={700} />

      {/* ops wall — racks + secure cabinet + box */}
      <Prop kind="server-rack" x={opsX + 20} y={opsY + 70} />
      <Prop kind="server-rack" x={opsX + 120} y={opsY + 70} />
      <Prop kind="server-rack" x={opsX + 220} y={opsY + 70} />
      <Prop kind="file-cabinet" x={opsX + 318} y={opsY + 84} />
      <Prop kind="cardboard-box" x={opsX + 24} y={opsY + 160} />

      {/* base scatter (fills empty floor) */}
      <Prop kind="bookshelf" x={20} y={150} />
      <Prop kind="file-cabinet" x={20} y={300} />
      <Prop kind="plant" x={20} y={372} seed={1} />
      <Prop kind="trash" x={120} y={500} />
      <Prop kind="cardboard-box" x={780} y={300} />
      <Prop kind="plant" x={810} y={372} seed={3} />
      <Prop kind="printer" x={788} y={120} />
      <Prop kind="postits" x={300} y={24} />
      <Prop kind="shelf" x={420} y={22} />
      <Prop kind="document-stack" x={560} y={26} />
      <Prop kind="trash" x={760} y={500} />

      {/* per-floor accent props (team character) */}
      <FloorAccent name={floor.name} />

      {/* cubicles + chairs (occupied + furnished-empty, for density) */}
      {layout.cubicles.map((c, i) => (
        <div key={c.agentId ?? `empty-${i}`}>
          <Prop kind="cubicle" seed={i * 5 + 1} x={c.x - 75} y={c.y - 82} />
          <Prop kind="chair" seed={i * 3 + 2} x={c.x - 16} y={c.y + 4} />
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
        const bubble = bubbleFor(a);
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
            {bubble && <div className={`pixel-bubble ${bubble.cls}`}>{bubble.text}</div>}
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
      <Prop kind="rug" x={120} y={560} w={300} h={180} tone="rose" />
      <Prop kind="sofa" x={150} y={580} />
      <Prop kind="coffee-bar" x={170} y={668} w={120} h={44} />
      <Prop kind="plant" x={70} y={556} seed={0} />
      <Prop kind="trash" x={400} y={560} />

      {/* shelves + plants + meeting nook + assistant desk */}
      <Prop kind="bookshelf" x={22} y={150} h={220} />
      <Prop kind="file-cabinet" x={22} y={400} />
      <Prop kind="document-stack" x={70} y={420} />
      <Prop kind="plant" x={1180} y={120} seed={2} />
      <Prop kind="small-rug" x={930} y={520} w={240} h={170} tone="violet" />
      <Prop kind="round-table" x={970} y={520} w={150} h={130} />
      <Prop kind="chair" seed={1} x={1010} y={510} />
      <Prop kind="chair" seed={2} x={1090} y={600} />
      <Prop kind="plant" x={1190} y={690} seed={4} />
      <Prop kind="cubicle" seed={9} x={250} y={150} />
      <Prop kind="chair" seed={5} x={320} y={262} />
      <Prop kind="printer" x={1190} y={430} />
      <Prop kind="whiteboard" x={950} y={120} w={170} />
      <Prop kind="wall-board" x={520} y={120} />
    </>
  );
}

/** Per-floor accent props — gives each team a distinct office character. Placed
 *  in the open aisle below the cubicles so they don't collide with desks. */
function FloorAccent({ name }: { name: string }) {
  const n = name.toLowerCase();
  const P = (kind: Parameters<typeof Prop>[0]['kind'], x: number, y: number, seed = 0) => (
    <Prop kind={kind} x={x} y={y} seed={seed} />
  );
  if (n.includes('engineering'))
    return <>{P('server-rack', 660, 470)}{P('cardboard-box', 120, 478)}{P('document-stack', 300, 540)}{P('cardboard-box', 360, 470)}</>;
  if (n.includes('ai') || n.includes('product'))
    return <>{P('wall-board', 120, 450)}{P('postits', 320, 540)}{P('shelf', 480, 470)}{P('whiteboard', 620, 452, 0)}</>;
  if (n.includes('growth') || n.includes('sales'))
    return <>{P('wall-board', 120, 450)}{P('shelf', 480, 470)}{P('document-stack', 320, 540)}{P('plant', 660, 470, 3)}</>;
  if (n.includes('platform') || n.includes('ops'))
    return <>{P('server-rack', 120, 460)}{P('server-rack', 300, 460)}{P('file-cabinet', 500, 460)}{P('cardboard-box', 660, 472)}</>;
  if (n.includes('operation'))
    return <>{P('file-cabinet', 120, 460)}{P('file-cabinet', 180, 460)}{P('printer', 320, 470)}{P('document-stack', 460, 480)}{P('plant', 660, 470, 1)}</>;
  return <>{P('plant', 300, 470, 2)}{P('shelf', 480, 470)}</>;
}

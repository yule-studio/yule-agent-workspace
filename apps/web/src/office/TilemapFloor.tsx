'use client';
/**
 * Floor View = a Tiled tilemap background (see tilemap.ts) with agents as the
 * ONLY interactive overlay. No hand-drawn furniture. Agents from the registry
 * are allocated to seats parsed from the map's `seats` object layer; placement
 * is status-driven (meeting → meeting-room seats, otherwise their desk).
 * Click / speech bubble / waiting indicator / selection are preserved.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView } from '@yule/shared-types';
import { Character } from './Character.js';
import type { Floor } from './org.js';
import { drawTilemap, loadOffice, mapPixelSize, readSeats, type SeatSlot, type TiledMap } from './tilemap.js';

function bubbleFor(a: AgentView): { text: string; cls: string } | null {
  switch (a.activity) {
    case 'blocked':
      return { text: 'Blocked', cls: 'alert' };
    case 'waiting':
      return a.state === 'awaiting_approval' ? { text: 'Approve?', cls: 'warn' } : { text: 'Need input', cls: 'warn' };
    case 'meeting':
      return { text: '…', cls: 'meet' };
    case 'reviewing':
      return { text: 'Reviewing', cls: 'calm' };
    default:
      return null;
  }
}

const isLead = (a: AgentView) => a.kind === 'department' || /lead|coordinator|principal|head/i.test(a.title);

/** Allocate agents to seats: lead → office, meeting agents → meeting room, rest → desks. */
function allocate(agents: AgentView[], seats: SeatSlot[]): { agent: AgentView; seat: SeatSlot }[] {
  const pool = (role: string) => seats.filter((s) => s.role === role);
  const members = pool('member');
  const review = pool('review');
  const leadSeat = pool('tech-lead')[0] ?? members[0];
  const out: { agent: AgentView; seat: SeatSlot }[] = [];

  const lead = agents.find(isLead) ?? null;
  if (lead && leadSeat) out.push({ agent: lead, seat: leadSeat });

  const rest = agents.filter((a) => a !== lead);
  const inMeeting = rest.filter((a) => a.activity === 'meeting');
  const atDesk = rest.filter((a) => a.activity !== 'meeting');

  let r = 0;
  for (const a of inMeeting) {
    const seat = review[r++] ?? members.shift();
    if (seat) out.push({ agent: a, seat });
  }
  let m = 0;
  const free = members.filter((s) => !out.some((o) => o.seat === s));
  for (const a of atDesk) {
    const seat = free[m++];
    if (seat) out.push({ agent: a, seat });
  }
  return out;
}

export function TilemapFloor({
  floor,
  onSelect,
}: {
  floor: Floor;
  meetings: { participantIds: string[]; topic: string }[];
  onSelect: (a: AgentView) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [asset, setAsset] = useState<{ map: TiledMap; seats: SeatSlot[]; native: { w: number; h: number } } | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number; s: number }>({ w: 960, h: 608, s: 1 });

  // load map + tileset, paint the canvas once ready
  useEffect(() => {
    let alive = true;
    loadOffice().then(({ map, image }) => {
      if (!alive) return;
      const cv = canvasRef.current;
      const native = mapPixelSize(map);
      if (cv) {
        cv.width = native.w;
        cv.height = native.h;
        const ctx = cv.getContext('2d');
        if (ctx) drawTilemap(ctx, map, image);
      }
      setAsset({ map, seats: readSeats(map), native });
    });
    return () => {
      alive = false;
    };
  }, []);

  // fit-to-container
  useEffect(() => {
    const el = ref.current;
    if (!el || !asset) return;
    const update = () => {
      const s = Math.min(el.clientWidth / asset.native.w, el.clientHeight / asset.native.h);
      setDim({ w: asset.native.w * s, h: asset.native.h * s, s });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [asset]);

  const placed = useMemo(() => (asset ? allocate(floor.agents, asset.seats) : []), [asset, floor]);

  return (
    <div className="pixel-floor" ref={ref}>
      <div className="pf-stage" style={{ width: dim.w, height: dim.h }}>
        <canvas ref={canvasRef} style={{ width: dim.w, height: dim.h, imageRendering: 'pixelated' }} />
        {placed.map(({ agent: a, seat }) => {
          const left = seat.x * dim.s;
          const top = (seat.y + 6) * dim.s;
          const bubble = bubbleFor(a);
          const working = a.activity === 'coding' || a.activity === 'running';
          return (
            <div
              key={a.id}
              className={`agent seated ${a.activity === 'waiting' || a.activity === 'blocked' ? 'attn' : ''}`}
              style={{ left, top, transform: `translate(-50%, -100%) scale(${dim.s})`, transformOrigin: 'center bottom', zIndex: Math.round(seat.y) + 500 }}
              onClick={() => onSelect(a)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(a)}
              title={`${a.name} · ${a.activity}`}
            >
              {bubble && <div className={`pixel-bubble ${bubble.cls}`}>{bubble.text}</div>}
              <Character seed={a.avatarSeed} activity={a.activity} walking={false} seated />
              {working && <span className="live-dot" />}
              <div className="nameplate">
                <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b636d' }} />
                {a.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

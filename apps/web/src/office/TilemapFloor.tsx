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
import { drawTile, drawTilemap, loadOffice, mapPixelSize, readAccents, readSeats, type SeatSlot, type TiledMap, type TileIndex } from './tilemap.js';

// Activity-sentence speech bubbles. Quiet on idle/coding (the live-dot already
// signals working) so the map isn't covered in chatter.
function bubbleFor(a: AgentView): { text: string; cls: string } | null {
  switch (a.activity) {
    case 'blocked':
      return { text: 'Blocked — need help', cls: 'alert' };
    case 'waiting':
      return a.state === 'awaiting_approval' ? { text: 'Waiting for approval…', cls: 'warn' } : { text: 'Need input?', cls: 'warn' };
    case 'meeting':
      return { text: '…', cls: 'meet' };
    case 'reviewing':
      return { text: 'Need review?', cls: 'calm' };
    case 'running':
      return { text: 'Running tests…', cls: 'calm' };
    case 'reading':
      return { text: 'Reading docs…', cls: 'calm' };
    case 'planning':
      return { text: 'Planning…', cls: 'calm' };
    default:
      return null; // idle / coding / done → no bubble
  }
}

const MENU_ITEMS = ['Assign Task', 'New Session', 'Session History', 'Stop Task'] as const;

const isLead = (a: AgentView) => a.kind === 'department' || /lead|coordinator|principal|head/i.test(a.title);

/** The direction an agent should face — its seat's `facing` metadata (toward its desk). */
function faceOf(seat: SeatSlot): 'up' | 'down' | 'left' | 'right' {
  return seat.facing === 'down' || seat.facing === 'left' || seat.facing === 'right' ? seat.facing : 'up';
}

/** Floor-type-specific decorative tiles drawn into the reserved accent slots. */
function accentTiles(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('engineering')) return ['server', 'rack', 'box', 'server', 'clutter', 'server'];
  if (n.includes('ai') || n.includes('product')) return ['corkboard', 'postits', 'docs', 'whiteboard_l', 'postits', 'docs'];
  if (n.includes('growth') || n.includes('sales')) return ['board_kanban', 'docs', 'postits', 'poster', 'sidetable', 'docs'];
  if (n.includes('platform') || n.includes('ops') || n.includes('operation')) return ['rack', 'cabinet', 'box', 'server', 'trash', 'cabinet'];
  return ['plant_b', 'bookshelf_t', 'docs', 'sidetable', 'plant_s', 'cabinet'];
}

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
  const [asset, setAsset] = useState<{
    map: TiledMap;
    image: HTMLImageElement;
    tiles: TileIndex;
    seats: SeatSlot[];
    accents: { x: number; y: number }[];
    native: { w: number; h: number };
  } | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number; s: number }>({ w: 960, h: 608, s: 1 });

  // load map + tileset + tile index once
  useEffect(() => {
    let alive = true;
    loadOffice().then(({ map, image, tiles }) => {
      if (!alive) return;
      setAsset({ map, image, tiles, seats: readSeats(map), accents: readAccents(map), native: mapPixelSize(map) });
    });
    return () => {
      alive = false;
    };
  }, []);

  // paint the canvas: base tilemap + per-floor decorative accents (repaint on floor change)
  useEffect(() => {
    if (!asset) return;
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = asset.native.w;
    cv.height = asset.native.h;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    drawTilemap(ctx, asset.map, asset.image);
    const tints = accentTiles(floor.name);
    asset.accents.forEach((a, i) => drawTile(ctx, asset.image, asset.tiles, tints[i % tints.length]!, a.x - asset.tiles.tile / 2, a.y - asset.tiles.tile / 2));
  }, [asset, floor]);

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
  const [menu, setMenu] = useState<{ a: AgentView; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement).closest?.('.ctx-menu')) setMenu(null); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [menu]);

  return (
    <div className="pixel-floor" ref={ref}>
      <div className="pf-stage" style={{ width: dim.w, height: dim.h }}>
        <canvas ref={canvasRef} style={{ width: dim.w, height: dim.h, imageRendering: 'pixelated' }} />
        {placed.map(({ agent: a, seat }) => {
          const fy = faceOf(seat);
          const left = seat.x * dim.s;
          // down-facing agents sit below the seat point so the body lands on the
          // chair (not the desk/wall above); others keep the bottom anchor.
          const top = (seat.y + (fy === 'down' ? 26 : 6)) * dim.s;
          const bubble = bubbleFor(a);
          const working = a.activity === 'coding' || a.activity === 'running';
          return (
            <div
              key={a.id}
              className={`agent seated ${a.activity === 'waiting' || a.activity === 'blocked' ? 'attn' : ''}`}
              style={{ left, top, transform: `translate(-50%, -100%) scale(${dim.s})`, transformOrigin: 'center bottom', zIndex: Math.round(seat.y) + 500 }}
              onClick={(e) => { e.stopPropagation(); setMenu({ a, x: e.clientX, y: e.clientY }); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(a)}
              title={`${a.name} · ${a.activity}`}
            >
              {bubble && <div className={`pixel-bubble ${bubble.cls}`}>{bubble.text}</div>}
              <Character seed={a.avatarSeed} activity={a.activity} walking={false} seated facing={fy} />
              {working && <span className="live-dot" />}
              <div className="nameplate">
                <span className="np-dot" style={{ background: a.state ? `var(--s-${a.state})` : '#5b636d' }} />
                {a.name}
              </div>
            </div>
          );
        })}
      </div>
      {menu && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
          <div className="ctx-head">{menu.a.name}</div>
          {MENU_ITEMS.map((label) => (
            <button key={label} onClick={() => { onSelect(menu.a); setMenu(null); }}>
              {label}
            </button>
          ))}
          <button className="ctx-cancel" onClick={() => setMenu(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

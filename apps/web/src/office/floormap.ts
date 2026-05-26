/**
 * Data-driven floor map. A floor is described as a high-resolution pixel canvas
 * (ART space) with rooms, a cubicle bullpen, desk seats and props. The canvas
 * renderer (pixeldraw) paints this as ONE pixel-art bitmap; agents are placed on
 * top from `seats`. Generation is dynamic — agents fill desks, extras stay
 * furnished-empty — and per-floor props vary by team so the map isn't uniform.
 */
import type { Floor } from './org.js';

/** Logical art resolution. Drawn 1:1 then upscaled with image-rendering:pixelated. */
export const ART = { w: 640, h: 416, wall: 7 } as const;

export type PropKind =
  | 'plant'
  | 'plant2'
  | 'printer'
  | 'cabinet'
  | 'bookshelf'
  | 'box'
  | 'docs'
  | 'water'
  | 'server'
  | 'whiteboard'
  | 'sofa'
  | 'coffee'
  | 'trash'
  | 'postits'
  | 'desk-small'
  | 'rug'
  // tech lead office + support spaces
  | 'chair'
  | 'exec-desk'
  | 'meeting-table'
  | 'lamp'
  | 'status-light'
  | 'wall-note'
  | 'roadmap'
  | 'door';

export interface XY {
  x: number;
  y: number;
}
export interface DeskSlot {
  x: number; // desk top-left (art px)
  y: number;
  seed: number;
  agentId: string | null;
}
export interface Seat extends XY {
  agentId: string;
}
/**
 * A reserved seat / placement slot in the office layout. Furniture is always
 * drawn here; an agent is only rendered when `agentId` is set. This is the
 * structural hook for future Tech-Lead / Assistant / visitor agents — the
 * layout is ready before the agents exist.
 */
export interface Placement extends XY {
  kind: 'tech-lead' | 'assistant' | 'visitor' | 'review' | 'member';
  agentId: string | null;
}
export interface PropItem {
  kind: PropKind;
  x: number;
  y: number;
  seed?: number;
  w?: number;
  h?: number;
  tone?: string;
}
export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  floor: 'carpet' | 'tile' | 'rug-violet' | 'rug-rose';
  label?: string;
}
export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface FloorMap {
  desks: DeskSlot[];
  seats: Map<string, Seat>;
  props: PropItem[];
  rooms: Room[];
  walls: Wall[]; // interior partitions (perimeter drawn separately)
  placements: Placement[]; // reserved seats (tech-lead / assistant / visitor / review)
  accent: string;
}

const BULLPEN = { x: ART.wall + 4, y: ART.wall + 4, cols: 5, cw: 98, ch: 92, top: 6 };

function deskXY(i: number): XY {
  const c = i % BULLPEN.cols;
  const r = Math.floor(i / BULLPEN.cols);
  return { x: BULLPEN.x + c * BULLPEN.cw, y: BULLPEN.y + r * BULLPEN.ch };
}

/** team character → which extra props show in the bottom rooms / right strip */
function teamProps(name: string): PropItem[] {
  const n = name.toLowerCase();
  const right = 556; // right strip x
  if (n.includes('engineering'))
    return [
      { kind: 'server', x: right, y: 24 },
      { kind: 'box', x: right + 6, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
      { kind: 'docs', x: 470, y: 250 },
      { kind: 'server', x: 470, y: 300 },
    ];
  if (n.includes('ai') || n.includes('product'))
    return [
      { kind: 'whiteboard', x: right - 4, y: 22, w: 78 },
      { kind: 'postits', x: right + 16, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
      { kind: 'whiteboard', x: 250, y: 226, w: 78 },
      { kind: 'docs', x: 470, y: 250 },
    ];
  if (n.includes('growth') || n.includes('sales'))
    return [
      { kind: 'whiteboard', x: right - 4, y: 22, w: 78 },
      { kind: 'docs', x: right + 10, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
      { kind: 'postits', x: 470, y: 250 },
    ];
  if (n.includes('platform') || n.includes('ops'))
    return [
      { kind: 'server', x: right, y: 24 },
      { kind: 'server', x: right, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 160 },
      { kind: 'box', x: 470, y: 250 },
    ];
  if (n.includes('operation'))
    return [
      { kind: 'cabinet', x: right + 4, y: 24 },
      { kind: 'cabinet', x: right + 34, y: 24 },
      { kind: 'printer', x: right + 8, y: 100 },
      { kind: 'docs', x: right + 12, y: 150 },
    ];
  return [
    { kind: 'plant2', x: right + 10, y: 30 },
    { kind: 'cabinet', x: right + 4, y: 110 },
    { kind: 'docs', x: 470, y: 250 },
  ];
}

export function buildTeamMap(floor: Floor): FloorMap {
  const agents = floor.teams.flatMap((t) => t.agents);
  const rows = Math.min(2, Math.max(2, Math.ceil(agents.length / BULLPEN.cols)));
  const slots = rows * BULLPEN.cols;
  const desks: DeskSlot[] = [];
  const seats = new Map<string, Seat>();
  for (let i = 0; i < slots; i++) {
    const { x, y } = deskXY(i);
    const agent = agents[i] ?? null;
    desks.push({ x, y, seed: i * 5 + 1, agentId: agent ? agent.id : null });
    if (agent) seats.set(agent.id, { x: x + 49, y: y + 74, agentId: agent.id });
  }

  // bottom three rooms (like the reference: manager office, lounge, private office)
  const roomY = ART.wall + 200;
  const roomH = ART.h - roomY - ART.wall;
  const rooms: Room[] = [
    { x: ART.wall, y: roomY, w: 206, h: roomH, floor: 'carpet', label: 'Lounge' },
    { x: ART.wall + 210, y: roomY, w: 206, h: roomH, floor: 'tile', label: 'Manager' },
    { x: ART.wall + 420, y: roomY, w: ART.w - ART.wall * 2 - 420, h: roomH, floor: 'tile', label: 'Focus' },
  ];
  const walls: Wall[] = [
    { x: ART.wall, y: roomY - 4, w: ART.w - ART.wall * 2, h: 5 }, // divider between bullpen and rooms
    { x: ART.wall + 206, y: roomY, w: 5, h: roomH },
    { x: ART.wall + 416, y: roomY, w: 5, h: roomH },
  ];

  const props: PropItem[] = [
    // lounge — small rug + sofa cluster + cafe corner (not a big empty box)
    { kind: 'rug', x: ART.wall + 18, y: roomY + 64, w: 120, h: 80, tone: 'rose' },
    { kind: 'sofa', x: ART.wall + 24, y: roomY + 30 },
    { kind: 'coffee', x: ART.wall + 30, y: roomY + 100 },
    { kind: 'plant2', x: ART.wall + 8, y: roomY + 60 },
    { kind: 'water', x: ART.wall + 170, y: roomY + 18 },
    { kind: 'plant', x: ART.wall + 168, y: roomY + 110 },
    { kind: 'docs', x: ART.wall + 150, y: roomY + 60 },
    { kind: 'trash', x: ART.wall + 178, y: roomY + 150 },
    // manager / meeting room — desk + chair-ish + printer + plant + board + docs
    { kind: 'desk-small', x: ART.wall + 268, y: roomY + 36, w: 90, h: 46 },
    { kind: 'whiteboard', x: ART.wall + 224, y: roomY + 16, w: 76 },
    { kind: 'printer', x: ART.wall + 224, y: roomY + 116 },
    { kind: 'plant', x: ART.wall + 326, y: roomY + 116 },
    { kind: 'docs', x: ART.wall + 360, y: roomY + 40 },
    { kind: 'box', x: ART.wall + 360, y: roomY + 110 },
    // private / focus office — desk + monitor + cabinet + plant + bookshelf
    { kind: 'desk-small', x: ART.wall + 466, y: roomY + 30, w: 96, h: 50 },
    { kind: 'cabinet', x: ART.wall + 428, y: roomY + 26 },
    { kind: 'bookshelf', x: ART.wall + 424, y: roomY + 90 },
    { kind: 'plant2', x: ART.wall + 540, y: roomY + 96 },
    { kind: 'docs', x: ART.wall + 470, y: roomY + 92 },
    { kind: 'trash', x: ART.wall + 540, y: roomY + 150 },
    // scatter near the bullpen edges
    { kind: 'bookshelf', x: ART.wall + 2, y: 18 },
    { kind: 'trash', x: 506, y: 182 },
    { kind: 'plant', x: 2, y: 150 },
    ...teamProps(floor.name),
  ];

  return { desks, seats, props, rooms, walls, accent: floor.accent };
}

/** Executive (사장실) — one large office instead of a bullpen. */
export function buildExecMap(floor: Floor): FloorMap {
  const cx = ART.w / 2;
  const seats = new Map<string, Seat>();
  seats.set('operator', { x: cx, y: 172, agentId: 'operator' });
  const props: PropItem[] = [
    { kind: 'rug', x: cx - 150, y: 80, w: 300, h: 150, tone: 'violet' },
    { kind: 'desk-small', x: cx - 52, y: 96, w: 104, h: 52 },
    { kind: 'bookshelf', x: ART.wall + 6, y: 30 },
    { kind: 'bookshelf', x: ART.wall + 34, y: 30 },
    { kind: 'cabinet', x: ART.wall + 6, y: 150 },
    { kind: 'plant2', x: ART.w - ART.wall - 40, y: 30 },
    { kind: 'plant2', x: ART.w - ART.wall - 40, y: 250 },
    // guest seating
    { kind: 'rug', x: cx - 120, y: 250, w: 240, h: 120, tone: 'rose' },
    { kind: 'sofa', x: cx - 96, y: 256 },
    { kind: 'coffee', x: cx - 30, y: 320 },
    { kind: 'plant', x: cx + 86, y: 256 },
    // meeting nook
    { kind: 'desk-small', x: ART.w - ART.wall - 150, y: 250, w: 100, h: 60 },
    { kind: 'whiteboard', x: ART.w - ART.wall - 150, y: 30, w: 90 },
    { kind: 'printer', x: ART.w - ART.wall - 60, y: 150 },
  ];
  return { desks: [], seats, props, rooms: [], walls: [], placements: [], accent: floor.accent };
}

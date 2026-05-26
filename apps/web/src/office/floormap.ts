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

/** team character → accent props along the right margin of the bullpen (y < 190) */
function bullpenStrip(name: string): PropItem[] {
  const n = name.toLowerCase();
  const right = 556; // right margin x (past the 5th cubicle column)
  if (n.includes('engineering'))
    return [
      { kind: 'server', x: right, y: 24 },
      { kind: 'box', x: right + 6, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
    ];
  if (n.includes('ai') || n.includes('product'))
    return [
      { kind: 'whiteboard', x: right - 4, y: 22, w: 78 },
      { kind: 'postits', x: right + 16, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
    ];
  if (n.includes('growth') || n.includes('sales'))
    return [
      { kind: 'whiteboard', x: right - 4, y: 22, w: 78 },
      { kind: 'docs', x: right + 10, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 150 },
    ];
  if (n.includes('platform') || n.includes('ops') || n.includes('operation'))
    return [
      { kind: 'server', x: right, y: 24 },
      { kind: 'server', x: right, y: 96 },
      { kind: 'cabinet', x: right + 4, y: 160 },
    ];
  return [
    { kind: 'plant2', x: right + 10, y: 30 },
    { kind: 'cabinet', x: right + 4, y: 110 },
  ];
}

/**
 * Per-team character of the Tech Lead Office: the roadmap-board flavour plus a
 * couple of extra props in the support corner and inside the lead office, so
 * Engineering / Product / Growth / Ops floors don't look copy-pasted.
 */
function leadOfficeFlavour(
  name: string,
  ctr: number,
  lead: number,
  right: number,
  roomY: number,
): { board: string; support: PropItem[]; office: PropItem[] } {
  const n = name.toLowerCase();
  if (n.includes('engineering'))
    return {
      board: 'review', // review / incident board
      support: [{ kind: 'server', x: ctr + 80, y: roomY + 6 }],
      office: [{ kind: 'docs', x: lead + 6, y: roomY + 78 }],
    };
  if (n.includes('ai') || n.includes('product'))
    return {
      board: 'planning',
      support: [{ kind: 'postits', x: ctr + 82, y: roomY + 10 }],
      office: [{ kind: 'whiteboard', x: lead + 4, y: roomY + 80, w: 64 }],
    };
  if (n.includes('growth') || n.includes('sales'))
    return {
      board: 'campaign',
      support: [{ kind: 'docs', x: ctr + 82, y: roomY + 10 }],
      office: [{ kind: 'postits', x: lead + 8, y: roomY + 80 }],
    };
  if (n.includes('platform') || n.includes('ops') || n.includes('operation'))
    return {
      board: 'secure',
      support: [{ kind: 'cabinet', x: ctr + 80, y: roomY + 6 }],
      office: [{ kind: 'server', x: lead + 4, y: roomY + 78 }],
    };
  return {
    board: 'roadmap',
    support: [{ kind: 'docs', x: ctr + 82, y: roomY + 10 }],
    office: [{ kind: 'plant', x: lead + 6, y: roomY + 80 }],
  };
}

/** A floor's tech lead — department coordinator or an explicit *-lead member. */
function findLead(agents: Floor['teams'][number]['agents']): Floor['teams'][number]['agents'][number] | null {
  return agents.find((a) => a.kind === 'department' || /lead|coordinator|principal|head/i.test(a.title)) ?? null;
}

export function buildTeamMap(floor: Floor): FloorMap {
  const all = floor.teams.flatMap((t) => t.agents);
  const lead = findLead(all);
  const members = all.filter((a) => a !== lead);

  // ── main workspace: cubicle bullpen (the lead sits in the office, not here) ──
  const rows = 2;
  const slots = rows * BULLPEN.cols;
  const desks: DeskSlot[] = [];
  const seats = new Map<string, Seat>();
  for (let i = 0; i < slots; i++) {
    const { x, y } = deskXY(i);
    const agent = members[i] ?? null;
    desks.push({ x, y, seed: i * 5 + 1, agentId: agent ? agent.id : null });
    if (agent) seats.set(agent.id, { x: x + 49, y: y + 74, agentId: agent.id });
  }

  // ── bottom band: Review nook | Support corner | Tech Lead Office ──
  const roomY = ART.wall + 200; // 207
  const roomH = ART.h - roomY - ART.wall; // 202
  const nookX = ART.wall; // 7
  const ctrX = 256; // support/reception corner
  const leadX = 378; // tech lead office
  const rightEdge = ART.w - ART.wall; // 633
  const flav = leadOfficeFlavour(floor.name, ctrX, leadX, rightEdge, roomY);

  const rooms: Room[] = [
    { x: nookX, y: roomY, w: ctrX - nookX - 6, h: roomH, floor: 'carpet', label: 'Review' },
    { x: ctrX, y: roomY, w: leadX - ctrX - 6, h: roomH, floor: 'carpet', label: 'Support' },
    { x: leadX, y: roomY, w: rightEdge - leadX, h: roomH, floor: 'tile', label: 'Tech Lead' },
  ];
  // interior walls with door gaps → a corridor links the bullpen to the offices
  const walls: Wall[] = [
    { x: nookX, y: roomY - 4, w: 291, h: 5 }, // bullpen↔bottom (left of corridor)
    { x: 342, y: roomY - 4, w: rightEdge - 342, h: 5 }, // bullpen↔bottom (right of corridor)
    { x: ctrX - 6, y: roomY + 64, w: 5, h: roomH - 64 }, // nook↔support (door gap at top)
    { x: leadX - 6, y: roomY, w: 5, h: 36 }, // office wall (top stub)
    { x: leadX - 6, y: roomY + 96, w: 5, h: roomH - 96 }, // office wall (bottom) → entrance gap
  ];

  // lead desk geometry (also drives the lead's seat + chair)
  const ldDeskX = leadX + 56;
  const ldDeskY = roomY + 44;
  const ldCx = leadX + 122; // desk centre = 500
  const ldChairY = roomY + 118;
  if (lead) seats.set(lead.id, { x: ldCx, y: roomY + 132, agentId: lead.id });

  const props: PropItem[] = [
    // ── Review / meeting nook (team gathers here) ──
    { kind: 'rug', x: nookX + 30, y: roomY + 54, w: 168, h: 120, tone: 'violet' },
    { kind: 'meeting-table', x: nookX + 62, y: roomY + 78, w: 110, h: 60 },
    { kind: 'chair', x: nookX + 92, y: roomY + 64 },
    { kind: 'chair', x: nookX + 150, y: roomY + 64 },
    { kind: 'chair', x: nookX + 92, y: roomY + 150 },
    { kind: 'chair', x: nookX + 150, y: roomY + 150 },
    { kind: 'whiteboard', x: nookX + 40, y: roomY + 6, w: 92 },
    { kind: 'plant2', x: nookX + 6, y: roomY + 150 },
    { kind: 'plant', x: nookX + 212, y: roomY + 8 },
    // ── Support corner: reception/assistant desk + storage/printer ──
    { kind: 'desk-small', x: ctrX + 18, y: roomY + 44, w: 86, h: 46 },
    { kind: 'chair', x: ctrX + 61, y: roomY + 102 },
    { kind: 'cabinet', x: ctrX + 6, y: roomY + 6 },
    { kind: 'cabinet', x: ctrX + 40, y: roomY + 6 },
    { kind: 'printer', x: ctrX + 10, y: roomY + 124 },
    { kind: 'box', x: ctrX + 12, y: roomY + 156 },
    { kind: 'docs', x: ctrX + 80, y: roomY + 156 },
    ...flav.support,
    // ── Tech Lead Office ──
    { kind: 'rug', x: leadX + 40, y: roomY + 40, w: 168, h: 132, tone: 'rose' },
    { kind: 'roadmap', x: leadX + 44, y: roomY + 6, w: 132, tone: flav.board },
    { kind: 'exec-desk', x: ldDeskX, y: ldDeskY, w: 132, h: 62 },
    { kind: 'chair', x: ldCx, y: ldChairY }, // lead chair (agent sits here)
    { kind: 'chair', x: leadX + 86, y: roomY + 158 }, // visitor chairs facing the desk
    { kind: 'chair', x: leadX + 158, y: roomY + 158 },
    { kind: 'bookshelf', x: leadX + 4, y: roomY + 100 },
    { kind: 'cabinet', x: rightEdge - 34, y: roomY + 118 },
    { kind: 'plant2', x: rightEdge - 36, y: roomY + 22 },
    { kind: 'lamp', x: ldDeskX + 6, y: roomY + 52 }, // desk lamp on the lead desk (left corner)
    { kind: 'wall-note', x: rightEdge - 98, y: roomY + 6 },
    { kind: 'status-light', x: rightEdge - 64, y: roomY + 8 },
    { kind: 'door', x: leadX - 12, y: roomY + 58 },
    ...flav.office,
    // ── scatter near the bullpen edges ──
    { kind: 'bookshelf', x: ART.wall + 2, y: 18 },
    { kind: 'plant', x: 2, y: 150 },
    ...bullpenStrip(floor.name),
  ];

  // reserved seats — furniture is drawn above; agents slot in here later
  const placements: Placement[] = [
    { kind: 'tech-lead', x: ldCx, y: roomY + 132, agentId: lead?.id ?? null },
    { kind: 'assistant', x: ctrX + 61, y: roomY + 116, agentId: null },
    { kind: 'visitor', x: leadX + 86, y: roomY + 172, agentId: null },
    { kind: 'visitor', x: leadX + 158, y: roomY + 172, agentId: null },
    { kind: 'review', x: nookX + 92, y: roomY + 78, agentId: null },
    { kind: 'review', x: nookX + 150, y: roomY + 78, agentId: null },
    { kind: 'review', x: nookX + 92, y: roomY + 164, agentId: null },
    { kind: 'review', x: nookX + 150, y: roomY + 164, agentId: null },
  ];

  return { desks, seats, props, rooms, walls, placements, accent: floor.accent };
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

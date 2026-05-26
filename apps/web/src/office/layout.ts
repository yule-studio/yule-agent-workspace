/**
 * Per-floor spatial layout. Given a Floor (teams of agents), it generates a
 * dense cubicle farm (one desk per agent, grouped by team with team labels) plus
 * shared rooms (meeting / review / standup / lounge / ops). Fully dynamic: more
 * agents → more desks; nothing is hardcoded to a fixed count.
 */
import type { AgentView, LocationIntent } from '@yule/shared-types';
import type { Floor } from './org.js';

export const FLOOR = { w: 1280, h: 820, wall: 18 } as const;

export interface XY {
  x: number;
  y: number;
}
export interface CubicleSpot extends XY {
  agentId: string | null; // null = furnished-but-empty workstation (fills the floor)
}
export interface TeamLabel {
  name: string;
  x: number;
  y: number;
}
export type ZoneId = 'meeting-room' | 'review-table' | 'planning-area' | 'lounge';
export interface ZoneDef {
  id: ZoneId;
  label: string;
  rect: { x: number; y: number; w: number; h: number };
  seat: (i: number, total: number) => XY;
}

const WORK = { x: 44, y: 52, cols: 5, cw: 150, ch: 116, top: 82 };
const RX = 856;
const RW = 388;

export const ZONES: ZoneDef[] = [
  {
    id: 'meeting-room',
    label: 'Meeting Room',
    rect: { x: RX, y: 58, w: RW, h: 258 },
    seat: (i, total) => {
      const cx = RX + RW / 2;
      const cy = 186;
      const r = 102;
      const a = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.72 };
    },
  },
  {
    id: 'review-table',
    label: 'Review Room',
    rect: { x: RX, y: 332, w: RW, h: 180 },
    seat: (i) => {
      const cx = RX + RW / 2;
      const side = i % 2 === 0 ? -1 : 1;
      const col = Math.floor(i / 2) % 3;
      return { x: cx - 100 + col * 100, y: 422 + side * 50 };
    },
  },
  {
    id: 'planning-area',
    label: 'Standup',
    rect: { x: 44, y: 596, w: 372, h: 204 },
    seat: (i, total) => {
      const cx = 230;
      const cy = 712;
      const r = 116;
      const spread = Math.PI * 1.1;
      const a = -Math.PI / 2 - spread / 2 + (total > 1 ? (i / (total - 1)) * spread : 0);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.66 };
    },
  },
  {
    id: 'lounge',
    label: 'Lounge & Cafe',
    rect: { x: 436, y: 596, w: 396, h: 204 },
    seat: (i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return { x: 500 + col * 92, y: 672 + row * 70 };
    },
  },
];

const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));

const INTENT_ZONE: Record<LocationIntent, ZoneId | 'desk'> = {
  desk: 'desk',
  focus: 'desk',
  'meeting-room': 'meeting-room',
  'review-table': 'review-table',
  'planning-area': 'planning-area',
  lounge: 'lounge',
};

export interface FloorLayout {
  deskByAgent: Map<string, XY>;
  cubicles: CubicleSpot[];
  teamLabels: TeamLabel[];
}

const slotXY = (i: number): XY => {
  const c = i % WORK.cols;
  const r = Math.floor(i / WORK.cols);
  return { x: WORK.x + WORK.cw / 2 + c * WORK.cw, y: WORK.y + WORK.top + r * WORK.ch };
};

/**
 * Build the cubicle farm. Agents occupy the first slots; the rest of the grid is
 * filled with furnished-but-empty workstations so the office reads as a full,
 * dense floor (not a few desks on an empty plane).
 */
export function layoutFloor(floor: Floor): FloorLayout {
  const deskByAgent = new Map<string, XY>();
  const cubicles: CubicleSpot[] = [];
  const teamLabels: TeamLabel[] = [];

  const flat = floor.teams.flatMap((t) => t.agents);
  const rows = Math.min(3, Math.max(2, Math.ceil(flat.length / WORK.cols)));
  const slots = rows * WORK.cols;

  flat.forEach((a, i) => {
    const xy = slotXY(i);
    deskByAgent.set(a.id, xy);
    cubicles.push({ agentId: a.id, x: xy.x, y: xy.y });
  });
  for (let i = flat.length; i < slots; i++) {
    const xy = slotXY(i);
    cubicles.push({ agentId: null, x: xy.x, y: xy.y });
  }

  // team labels at the first desk of each team
  let idx = 0;
  for (const team of floor.teams) {
    if (team.agents.length) {
      const xy = slotXY(idx);
      teamLabels.push({ name: team.name, x: xy.x, y: xy.y - WORK.top + 8 });
      idx += team.agents.length;
    }
  }
  return { deskByAgent, cubicles, teamLabels };
}

/** Resolve each agent's target seat this frame (desk, or packed into a zone). */
export function resolveFloorTargets(agents: AgentView[], deskByAgent: Map<string, XY>): Map<string, XY> {
  const targets = new Map<string, XY>();
  const queues = new Map<ZoneId, AgentView[]>();
  for (const a of agents) {
    const z = INTENT_ZONE[a.locationIntent];
    if (z === 'desk') targets.set(a.id, deskByAgent.get(a.id) ?? { x: 200, y: 200 });
    else {
      const q = queues.get(z) ?? [];
      q.push(a);
      queues.set(z, q);
    }
  }
  for (const [zid, q] of queues) {
    const zone = ZONE_BY_ID.get(zid)!;
    q.sort((a, b) => a.id.localeCompare(b.id));
    q.forEach((a, idx) => targets.set(a.id, zone.seat(idx, q.length)));
  }
  return targets;
}

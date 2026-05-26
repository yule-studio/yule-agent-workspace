/**
 * Office spatial model — fully dynamic. Home desks are generated from however
 * many agents the registry returns (grouped by department), and shared zones
 * (meeting room, review table, planning circle, lounge) allocate seats on
 * demand. Adding agents or departments never breaks the layout.
 */
import { AGENT_ROLES, type AgentRole, type AgentView } from '@yule/shared-types';
import { INTENT_ZONE, type DeskAssignment, type Seat, type ZoneId } from './types.js';

const ROLE_ORDER = new Map(AGENT_ROLES.map((r, i) => [r, i]));

/** Soft department tint for desk mats. */
export const ROLE_TINT: Record<AgentRole, string> = {
  engineering: '#3f7d8a',
  planning: '#9367d4',
  product: '#3f7dcf',
  marketing: '#d9618f',
  'sales-cs': '#4caf50',
  finance: '#39507a',
  hr: '#e08a3c',
  legal: '#5b6678',
};

// ── desk farm (left / centre open plan) ──────────────────────────────────
const FARM = { x0: 96, y0: 132, cols: 5, dx: 150, dy: 104 };

/**
 * Assign every agent a stable home desk, grouped by department (sorted by role
 * then name) and flowed row-major. Returns one assignment per agent + which
 * desks should show a department label.
 */
export function assignDesks(agents: AgentView[]): DeskAssignment[] {
  const sorted = [...agents].sort((a, b) => {
    const r = (ROLE_ORDER.get(a.role) ?? 99) - (ROLE_ORDER.get(b.role) ?? 99);
    return r !== 0 ? r : a.name.localeCompare(b.name);
  });
  let lastRole: AgentRole | null = null;
  return sorted.map((a, i) => {
    const col = i % FARM.cols;
    const row = Math.floor(i / FARM.cols);
    const labelRole = a.role !== lastRole ? a.role : null;
    lastRole = a.role;
    return {
      agentId: a.id,
      role: a.role,
      seat: { x: FARM.x0 + col * FARM.dx, y: FARM.y0 + row * FARM.dy },
      labelRole,
    };
  });
}

// ── shared zones ──────────────────────────────────────────────────────────
export interface ZoneDef {
  id: ZoneId;
  label: string;
  rect: { x: number; y: number; w: number; h: number };
  seat: (i: number, total: number) => Seat;
}

const RIGHT_X = 862;
const RIGHT_W = 384;

export const ZONES: ZoneDef[] = [
  {
    id: 'meeting-room',
    label: 'Meeting Room',
    rect: { x: RIGHT_X, y: 70, w: RIGHT_W, h: 250 },
    seat: (i, total) => {
      const cx = RIGHT_X + RIGHT_W / 2;
      const cy = 195;
      const r = 96;
      const a = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.74 };
    },
  },
  {
    id: 'review-table',
    label: 'Review Table',
    rect: { x: RIGHT_X, y: 344, w: RIGHT_W, h: 178 },
    seat: (i) => {
      const cx = RIGHT_X + RIGHT_W / 2;
      const cols = 3;
      const side = i % 2 === 0 ? -1 : 1;
      const col = Math.floor(i / 2) % cols;
      return { x: cx - 96 + col * 96, y: 433 + side * 46 };
    },
  },
  {
    id: 'planning-area',
    label: 'Standup',
    rect: { x: RIGHT_X, y: 548, w: RIGHT_W, h: 250 },
    seat: (i, total) => {
      const cx = RIGHT_X + RIGHT_W / 2;
      const cy = 700;
      const r = 104;
      const spread = Math.PI * 1.15;
      const a = -Math.PI / 2 - spread / 2 + (total > 1 ? (i / (total - 1)) * spread : 0);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7 };
    },
  },
  {
    id: 'lounge',
    label: 'Lounge & Cafe',
    rect: { x: 44, y: 624, w: 786, h: 196 },
    seat: (i) => {
      const perRow = 6;
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      return { x: 110 + col * 116, y: 690 + row * 70 };
    },
  },
];

const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));

/**
 * Resolve every agent's target seat for this frame. Agents wanting a shared
 * zone are packed into that zone's seats in a stable order so none overlap.
 */
export function resolveTargets(agents: AgentView[], desks: Map<string, Seat>): Map<string, Seat> {
  const targets = new Map<string, Seat>();
  const zoneQueues = new Map<ZoneId, AgentView[]>();

  for (const a of agents) {
    const zone = INTENT_ZONE[a.locationIntent];
    if (zone === 'desk') {
      targets.set(a.id, desks.get(a.id) ?? { x: 200, y: 200 });
    } else {
      const q = zoneQueues.get(zone) ?? [];
      q.push(a);
      zoneQueues.set(zone, q);
    }
  }

  for (const [zoneId, queue] of zoneQueues) {
    const zone = ZONE_BY_ID.get(zoneId)!;
    queue.sort((a, b) => a.id.localeCompare(b.id));
    queue.forEach((a, i) => targets.set(a.id, zone.seat(i, queue.length)));
  }
  return targets;
}

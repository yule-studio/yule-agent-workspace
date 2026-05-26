import type { AgentRole, LocationIntent } from '@yule/shared-types';

/** Fixed logical pixel stage, scaled to fit the viewport. */
export const STAGE = { w: 1280, h: 860, wall: 22 } as const;

export interface Seat {
  x: number;
  y: number;
}

export interface DeskAssignment {
  agentId: string;
  role: AgentRole;
  seat: Seat;
  /** First desk of a department run — gets a label. */
  labelRole: AgentRole | null;
}

export type ZoneId = 'meeting-room' | 'review-table' | 'planning-area' | 'lounge';

/** Where each location intent sends an agent. */
export const INTENT_ZONE: Record<LocationIntent, ZoneId | 'desk'> = {
  desk: 'desk',
  focus: 'desk',
  'meeting-room': 'meeting-room',
  'review-table': 'review-table',
  'planning-area': 'planning-area',
  lounge: 'lounge',
};

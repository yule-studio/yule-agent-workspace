/**
 * Agent registry vocabulary.
 *
 * An *agent* is a concrete worker, not a role. The engine (`yule-studio-agent`)
 * defines department agents (engineering, planning, …) each with member agents
 * (tech-lead, backend-engineer, …). One agent === one character in the office.
 * Roles are only placement metadata — the number of agents is dynamic and may
 * have many per role.
 */
import type { AgentRole } from './roles.js';
import type { RuntimeMode } from './runtime.js';
import type { SessionState } from './states.js';

export type AgentKind = 'department' | 'member';

/** A registry entry as reported by the engine adapter (`listAgents`). */
export interface StudioAgent {
  /** Stable id, e.g. "engineering-agent/backend-engineer". */
  id: string;
  /** Display name, e.g. "Backend Engineer". */
  name: string;
  /** Department this agent belongs to (placement metadata). */
  role: AgentRole;
  /** Member slug / title, e.g. "backend-engineer" or "coordinator". */
  title: string;
  kind: AgentKind;
  /** Deterministic seed for the character's appearance. */
  avatarSeed: number;
}

/** What an agent is doing right now — drives animation + where it stands. */
export const AGENT_ACTIVITIES = [
  'idle',
  'coding',
  'reading',
  'running',
  'waiting',
  'blocked',
  'meeting',
  'planning',
  'reviewing',
  'done',
] as const;
export type AgentActivity = (typeof AGENT_ACTIVITIES)[number];

/** Which zone an agent wants to be in. The office moves the character there. */
export const LOCATION_INTENTS = [
  'desk',
  'meeting-room',
  'review-table',
  'planning-area',
  'lounge',
  'focus',
] as const;
export type LocationIntent = (typeof LOCATION_INTENTS)[number];

/** Live, per-agent view shared by the dashboard and the pixel office. */
export interface AgentView {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  kind: AgentKind;
  avatarSeed: number;
  activity: AgentActivity;
  locationIntent: LocationIntent;
  state: SessionState | null;
  mode: RuntimeMode;
  statusLine: string | null;
  currentSessionId: string | null;
  currentTaskTitle: string | null;
  /** Meeting group id when this agent is in a gathered session. */
  groupId: string | null;
  tokensToday: number;
  updatedAt: string;
}

/** A gathering of agents around a shared session/topic (meeting room). */
export interface MeetingView {
  groupId: string;
  topic: string;
  participantIds: string[];
  state: SessionState | null;
}

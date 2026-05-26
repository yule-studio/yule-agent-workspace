/**
 * Canonical domain models — the source-of-truth shapes persisted by the
 * workspace backend. Discord, GitHub, and the engine all map onto these; none
 * of them owns the state.
 */
import type { AgentRole } from './roles.js';
import type { RuntimeMode } from './runtime.js';
import type { SessionState, TransitionEvent } from './states.js';

export type ISODateString = string;

/** Where a task originated. The workspace is the SoT regardless of source. */
export type TaskSource = 'discord' | 'github' | 'operator' | 'agent' | 'api';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * A Task is the canonical *work item*. It is stable across retries. A task may
 * link to an external work item (e.g. a GitHub issue) via `workItemKey`, which
 * enforces the one-canonical-session-per-work-item invariant.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  source: TaskSource;
  /** Stable external identity, e.g. "github:yule-studio/repo#42". Unique when set. */
  workItemKey: string | null;
  role: AgentRole;
  priority: TaskPriority;
  /** id of the single active (non-terminal) session, if any. */
  activeSessionId: string | null;
  github: GithubLink | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GithubLink {
  repo: string; // "owner/name"
  issueNumber: number | null;
  prNumber: number | null;
  branch: string | null;
}

/**
 * A Session is one execution attempt of a Task through the state machine.
 * History = all sessions of a task; at most one is active at a time.
 */
export interface Session {
  id: string;
  taskId: string;
  role: AgentRole;
  state: SessionState;
  /** Where to return to after `unblock`. Set when entering `blocked`. */
  priorState: SessionState | null;
  runtimeMode: RuntimeMode;
  /** Approval is persisted on the session so it survives restarts/re-entry. */
  approval: ApprovalRecord | null;
  budget: TokenBudget;
  /** Fingerprints used to skip re-analysis of unchanged inputs. */
  fingerprints: SessionFingerprints;
  /** Latest compacted summary used for cheap context recall. */
  snapshot: SessionSnapshot | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  closedAt: ISODateString | null;
}

export interface ApprovalRecord {
  decision: 'approved' | 'rejected' | 'changes_requested';
  by: string; // operator id / discord user
  via: 'workspace' | 'discord' | 'api';
  note: string | null;
  at: ISODateString;
}

export interface TokenBudget {
  /** Hard ceiling for this session. */
  cap: number;
  used: number;
  /** used/cap >= escalationRatio surfaces an operator escalation. */
  escalationRatio: number;
  escalated: boolean;
}

export interface SessionFingerprints {
  diff: string | null;
  issue: string | null;
}

export interface SessionSnapshot {
  summary: string;
  /** Approximate token size of the snapshot itself (for budgeting). */
  tokens: number;
  createdAt: ISODateString;
}

/** A recorded state transition — the audit log of a session. */
export interface SessionTransition {
  id: string;
  sessionId: string;
  event: TransitionEvent;
  fromState: SessionState;
  toState: SessionState;
  actor: string; // who/what fired it
  reason: string | null;
  tokensSpent: number;
  at: ISODateString;
}

/** Live presence of a role-based agent, derived from its sessions. */
export interface AgentPresence {
  role: AgentRole;
  mode: RuntimeMode;
  /** State of the agent's current focus session, if any. */
  state: SessionState | null;
  currentSessionId: string | null;
  /** Short status line shown in the speech bubble. */
  statusLine: string | null;
  tokensToday: number;
  updatedAt: ISODateString;
}

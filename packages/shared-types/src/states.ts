/**
 * Canonical session state machine vocabulary.
 *
 * These are *data only* — the transition adjacency map lives here so every
 * layer (api, web, bot, adapter) agrees on the shape of the graph, while the
 * behavioural logic (guards, idempotency, terminal protection) lives in
 * `@yule/core`. Splitting it this way keeps the contract serializable and the
 * logic testable.
 */

export const SESSION_STATES = [
  'draft',
  'queued',
  'planning',
  'awaiting_approval',
  'approved',
  'executing',
  'reviewing',
  'blocked',
  'ready_to_merge',
  'deploying',
  'done',
  'failed',
  'abandoned',
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

/**
 * Terminal states never transition outward. This is the core guard that
 * prevents an abandoned/discarded session from being accidentally revived:
 * to continue work you must open a *new* session on the task.
 */
export const TERMINAL_STATES: readonly SessionState[] = ['done', 'abandoned'];

/**
 * A non-terminal session is "active" and counts against the
 * one-canonical-session-per-task invariant.
 */
export function isTerminal(state: SessionState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * Named transitions. The state machine is event-driven: a caller fires a
 * `TransitionEvent`, the machine decides the resulting state. Naming the
 * events (rather than just target states) lets the same target be reached for
 * different reasons and keeps the audit log meaningful.
 */
export const TRANSITION_EVENTS = [
  'submit', // draft -> queued
  'pick_up', // queued -> planning
  'plan_ready', // planning -> awaiting_approval
  'approve', // awaiting_approval -> approved
  'request_changes', // awaiting_approval/reviewing -> planning/executing
  'start_execution', // approved -> executing
  'submit_for_review', // executing -> reviewing
  'review_passed', // reviewing -> ready_to_merge
  'block', // (planning|executing|reviewing) -> blocked
  'unblock', // blocked -> previous active phase
  'merge', // ready_to_merge -> deploying
  'deploy_succeeded', // deploying -> done
  'complete', // ready_to_merge -> done (no deploy step)
  'fail', // any active -> failed
  'retry', // failed -> queued
  'abandon', // any non-terminal -> abandoned
] as const;

export type TransitionEvent = (typeof TRANSITION_EVENTS)[number];

/**
 * Allowed transitions as (fromState, event) -> toState. Anything not present
 * here is rejected by the machine. `unblock` is resolved dynamically from the
 * stored `priorState`, so it is not encoded statically.
 */
export const TRANSITIONS: ReadonlyArray<{
  from: SessionState;
  event: TransitionEvent;
  to: SessionState;
}> = [
  { from: 'draft', event: 'submit', to: 'queued' },
  { from: 'draft', event: 'abandon', to: 'abandoned' },

  { from: 'queued', event: 'pick_up', to: 'planning' },
  { from: 'queued', event: 'abandon', to: 'abandoned' },

  { from: 'planning', event: 'plan_ready', to: 'awaiting_approval' },
  { from: 'planning', event: 'block', to: 'blocked' },
  { from: 'planning', event: 'fail', to: 'failed' },
  { from: 'planning', event: 'abandon', to: 'abandoned' },

  { from: 'awaiting_approval', event: 'approve', to: 'approved' },
  { from: 'awaiting_approval', event: 'request_changes', to: 'planning' },
  { from: 'awaiting_approval', event: 'abandon', to: 'abandoned' },

  { from: 'approved', event: 'start_execution', to: 'executing' },
  { from: 'approved', event: 'abandon', to: 'abandoned' },

  { from: 'executing', event: 'submit_for_review', to: 'reviewing' },
  { from: 'executing', event: 'block', to: 'blocked' },
  { from: 'executing', event: 'fail', to: 'failed' },
  { from: 'executing', event: 'abandon', to: 'abandoned' },

  { from: 'reviewing', event: 'review_passed', to: 'ready_to_merge' },
  { from: 'reviewing', event: 'request_changes', to: 'executing' },
  { from: 'reviewing', event: 'block', to: 'blocked' },
  { from: 'reviewing', event: 'fail', to: 'failed' },
  { from: 'reviewing', event: 'abandon', to: 'abandoned' },

  // unblock is handled dynamically (returns to priorState); abandon still allowed.
  { from: 'blocked', event: 'fail', to: 'failed' },
  { from: 'blocked', event: 'abandon', to: 'abandoned' },

  { from: 'ready_to_merge', event: 'merge', to: 'deploying' },
  { from: 'ready_to_merge', event: 'complete', to: 'done' },
  { from: 'ready_to_merge', event: 'block', to: 'blocked' },
  { from: 'ready_to_merge', event: 'abandon', to: 'abandoned' },

  { from: 'deploying', event: 'deploy_succeeded', to: 'done' },
  { from: 'deploying', event: 'fail', to: 'failed' },

  { from: 'failed', event: 'retry', to: 'queued' },
  { from: 'failed', event: 'abandon', to: 'abandoned' },
];

/** States from which `unblock` is meaningful and where it returns to. */
export const BLOCKABLE_STATES: readonly SessionState[] = [
  'planning',
  'executing',
  'reviewing',
  'ready_to_merge',
];

/**
 * Canonical session state machine — pure decision logic.
 *
 * Design rules baked in here:
 *  - Terminal states (`done`, `abandoned`) never transition outward. This is
 *    what prevents a discarded session from being accidentally revived: to
 *    continue, the caller must open a NEW session on the task.
 *  - Re-entry is idempotent: firing an event that would land in the state the
 *    session is already in is a successful no-op, not an error.
 *  - `block`/`unblock` are stateful: entering `blocked` records the prior phase
 *    so `unblock` returns to exactly where work left off.
 *
 * The machine never performs I/O. It returns a decision; the service layer
 * persists it and emits events.
 */
import {
  BLOCKABLE_STATES,
  isTerminal,
  TRANSITIONS,
  type SessionState,
  type TransitionEvent,
} from '@yule/shared-types';

export interface TransitionDecision {
  ok: boolean;
  /** Resulting state, or null when the transition is rejected. */
  toState: SessionState | null;
  /**
   * New value to persist into `session.priorState`. `undefined` means leave it
   * unchanged; `null` clears it.
   */
  priorState?: SessionState | null;
  /** True when the event was a no-op because we are already in the target. */
  idempotent: boolean;
  reason: string | null;
}

/** Static (from, event) -> to lookup. */
function lookupTarget(state: SessionState, event: TransitionEvent): SessionState | null {
  const hit = TRANSITIONS.find((t) => t.from === state && t.event === event);
  return hit ? hit.to : null;
}

/** Does any transition with this event land in `state`? (used for idempotency) */
function eventReaches(event: TransitionEvent, state: SessionState): boolean {
  return TRANSITIONS.some((t) => t.event === event && t.to === state);
}

/**
 * Decide the result of firing `event` from `state` (with `priorState` for
 * blocked sessions). Pure — safe to call anywhere.
 */
export function resolveTransition(
  state: SessionState,
  event: TransitionEvent,
  priorState: SessionState | null,
): TransitionDecision {
  // Terminal guard — never revive a done/abandoned session.
  if (isTerminal(state)) {
    return {
      ok: false,
      toState: null,
      idempotent: false,
      reason: `session is terminal (${state}); open a new session to continue`,
    };
  }

  // Dynamic unblock: return to the recorded prior phase.
  if (event === 'unblock') {
    if (state !== 'blocked') {
      return { ok: false, toState: null, idempotent: false, reason: 'unblock is only valid from blocked' };
    }
    if (!priorState || !BLOCKABLE_STATES.includes(priorState)) {
      return {
        ok: false,
        toState: null,
        idempotent: false,
        reason: 'cannot unblock: no valid prior state recorded',
      };
    }
    return { ok: true, toState: priorState, priorState: null, idempotent: false, reason: null };
  }

  const target = lookupTarget(state, event);
  if (target === null) {
    // Idempotent no-op: we are already where this event would have taken us.
    if (eventReaches(event, state)) {
      return { ok: true, toState: state, idempotent: true, reason: null };
    }
    return {
      ok: false,
      toState: null,
      idempotent: false,
      reason: `no transition for event '${event}' from state '${state}'`,
    };
  }

  // Entering blocked records where to come back to.
  if (target === 'blocked') {
    return { ok: true, toState: 'blocked', priorState: state, idempotent: false, reason: null };
  }

  return { ok: true, toState: target, idempotent: false, reason: null };
}

/** Convenience: is this event currently fireable from this state? */
export function canTransition(
  state: SessionState,
  event: TransitionEvent,
  priorState: SessionState | null,
): boolean {
  return resolveTransition(state, event, priorState).ok;
}

/** All events fireable from a given state (for UI affordances). */
export function availableEvents(state: SessionState, priorState: SessionState | null): TransitionEvent[] {
  if (isTerminal(state)) return [];
  const events = new Set<TransitionEvent>();
  for (const t of TRANSITIONS) {
    if (t.from === state) events.add(t.event);
  }
  if (state === 'blocked' && priorState && BLOCKABLE_STATES.includes(priorState)) {
    events.add('unblock');
  }
  return [...events];
}

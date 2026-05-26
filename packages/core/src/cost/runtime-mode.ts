/**
 * Runtime-mode selection. Maps a session's current state to the cheapest
 * runtime mode that still lets it make progress. This is the rule that keeps
 * idle agents at zero inference cost while letting active work proceed.
 */
import { MODE_MAX_TIER, type ModelTier, type RuntimeMode, type SessionState } from '@yule/shared-types';

/**
 * The canonical state -> mode mapping. Expensive `heavy` reasoning is reserved
 * for exactly the moments that justify it: planning, review/merge decisions.
 */
export function modeForState(state: SessionState | null): RuntimeMode {
  switch (state) {
    case null:
    case 'done':
    case 'abandoned':
      return 'idle';
    case 'queued':
      return 'watch';
    case 'planning':
    case 'reviewing':
      return 'heavy'; // analysis / merge decisions justify the strong model
    case 'awaiting_approval':
    case 'blocked':
      return 'human'; // waiting on a person; no autonomous reasoning
    case 'approved':
    case 'executing':
    case 'ready_to_merge':
    case 'deploying':
      return 'active';
    case 'draft':
    case 'failed':
      return 'watch';
    default:
      return 'watch';
  }
}

/** Strongest model tier permitted while in this mode. */
export function maxTierFor(mode: RuntimeMode): ModelTier {
  return MODE_MAX_TIER[mode];
}

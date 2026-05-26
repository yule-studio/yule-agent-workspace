/**
 * Derive an agent's office behaviour from its session state. Pure mapping so the
 * API and any client agree on where a character should be and what it's doing.
 */
import type { AgentActivity, LocationIntent, SessionState } from '@yule/shared-types';

export function deriveActivity(state: SessionState | null): AgentActivity {
  switch (state) {
    case 'planning':
      return 'planning';
    case 'awaiting_approval':
      return 'waiting';
    case 'approved':
    case 'executing':
      return 'coding';
    case 'reviewing':
    case 'ready_to_merge':
      return 'reviewing';
    case 'deploying':
      return 'running';
    case 'blocked':
    case 'failed':
      return 'blocked';
    case 'done':
      return 'done';
    default:
      return 'idle';
  }
}

/** Which zone the agent should walk to. `inMeeting` overrides everything. */
export function deriveLocationIntent(state: SessionState | null, inMeeting: boolean): LocationIntent {
  if (inMeeting) return 'meeting-room';
  switch (state) {
    case 'planning':
      return 'planning-area';
    case 'awaiting_approval':
    case 'reviewing':
    case 'ready_to_merge':
    case 'blocked':
    case 'failed':
      return 'review-table';
    case 'approved':
    case 'executing':
    case 'deploying':
      return 'desk';
    case 'done':
      return 'lounge';
    default:
      return 'desk';
  }
}

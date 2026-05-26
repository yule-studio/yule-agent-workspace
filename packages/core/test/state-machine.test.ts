import { describe, expect, it } from 'vitest';
import {
  availableEvents,
  canTransition,
  resolveTransition,
} from '../src/state-machine.js';

describe('resolveTransition — happy path', () => {
  it('walks the canonical lifecycle', () => {
    expect(resolveTransition('draft', 'submit', null).toState).toBe('queued');
    expect(resolveTransition('queued', 'pick_up', null).toState).toBe('planning');
    expect(resolveTransition('planning', 'plan_ready', null).toState).toBe('awaiting_approval');
    expect(resolveTransition('awaiting_approval', 'approve', null).toState).toBe('approved');
    expect(resolveTransition('approved', 'start_execution', null).toState).toBe('executing');
    expect(resolveTransition('executing', 'submit_for_review', null).toState).toBe('reviewing');
    expect(resolveTransition('reviewing', 'review_passed', null).toState).toBe('ready_to_merge');
    expect(resolveTransition('ready_to_merge', 'merge', null).toState).toBe('deploying');
    expect(resolveTransition('deploying', 'deploy_succeeded', null).toState).toBe('done');
  });
});

describe('terminal guard — discarded sessions never revive', () => {
  it('rejects every event from done', () => {
    for (const ev of ['submit', 'pick_up', 'retry', 'start_execution'] as const) {
      const r = resolveTransition('done', ev, null);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/terminal/);
    }
  });

  it('rejects every event from abandoned', () => {
    const r = resolveTransition('abandoned', 'retry', null);
    expect(r.ok).toBe(false);
  });
});

describe('idempotent re-entry', () => {
  it('treats a repeated transition as a successful no-op', () => {
    const r = resolveTransition('queued', 'submit', null); // already past submit
    expect(r.ok).toBe(true);
    expect(r.idempotent).toBe(true);
    expect(r.toState).toBe('queued');
  });

  it('rejects a genuinely invalid transition', () => {
    const r = resolveTransition('queued', 'deploy_succeeded', null);
    expect(r.ok).toBe(false);
    expect(r.idempotent).toBe(false);
  });
});

describe('block / unblock round-trip', () => {
  it('records prior state on block and restores it on unblock', () => {
    const blocked = resolveTransition('executing', 'block', null);
    expect(blocked.toState).toBe('blocked');
    expect(blocked.priorState).toBe('executing');

    const unblocked = resolveTransition('blocked', 'unblock', 'executing');
    expect(unblocked.ok).toBe(true);
    expect(unblocked.toState).toBe('executing');
    expect(unblocked.priorState).toBeNull();
  });

  it('refuses to unblock without a valid prior state', () => {
    expect(resolveTransition('blocked', 'unblock', null).ok).toBe(false);
    expect(resolveTransition('blocked', 'unblock', 'done').ok).toBe(false);
  });
});

describe('introspection helpers', () => {
  it('canTransition agrees with resolveTransition', () => {
    expect(canTransition('draft', 'submit', null)).toBe(true);
    expect(canTransition('draft', 'merge', null)).toBe(false);
  });

  it('availableEvents is empty for terminal states', () => {
    expect(availableEvents('done', null)).toEqual([]);
    expect(availableEvents('awaiting_approval', null)).toContain('approve');
    expect(availableEvents('blocked', 'executing')).toContain('unblock');
  });
});

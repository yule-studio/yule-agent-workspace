import { describe, expect, it } from 'vitest';
import { checkBudget, newBudget, recordSpend } from '../src/cost/budget.js';
import { fingerprintDiff, needsReanalysis } from '../src/cost/fingerprint.js';
import { selectTier } from '../src/cost/model-tier.js';
import { modeForState } from '../src/cost/runtime-mode.js';

describe('token budget', () => {
  it('allows spend under cap and blocks over cap', () => {
    const b = newBudget(1000, 0.8);
    expect(checkBudget(b, 500).allowed).toBe(true);
    expect(checkBudget(b, 1500).allowed).toBe(false);
  });

  it('escalates once the ratio is crossed', () => {
    let b = newBudget(1000, 0.8);
    b = recordSpend(b, 850);
    expect(b.escalated).toBe(true);
    expect(checkBudget(b, 10).escalate).toBe(true);
  });
});

describe('runtime mode selection', () => {
  it('keeps finished/empty work idle (zero cost)', () => {
    expect(modeForState(null)).toBe('idle');
    expect(modeForState('done')).toBe('idle');
  });

  it('reserves heavy reasoning for planning and review', () => {
    expect(modeForState('planning')).toBe('heavy');
    expect(modeForState('reviewing')).toBe('heavy');
    expect(modeForState('executing')).toBe('active');
    expect(modeForState('awaiting_approval')).toBe('human');
  });
});

describe('model tier clamping', () => {
  it('clamps a strong-desired step down when the mode forbids it', () => {
    // watch mode caps at triage, so a plan step gets clamped.
    const r = selectTier('plan', 'watch');
    expect(r.tier).toBe('triage');
    expect(r.clamped).toBe(true);
  });

  it('allows strong model in heavy mode', () => {
    expect(selectTier('review', 'heavy').tier).toBe('strong');
  });
});

describe('diff fingerprinting', () => {
  it('ignores volatile header lines so cosmetic churn is skipped', () => {
    const a = 'index abc123..def456\n@@ -1,2 +1,2 @@\n-old\n+new';
    const b = 'index 999000..111222\n@@ -3,4 +3,4 @@\n-old\n+new';
    expect(fingerprintDiff(a)).toBe(fingerprintDiff(b));
    expect(needsReanalysis(fingerprintDiff(a), fingerprintDiff(b))).toBe(false);
  });
});

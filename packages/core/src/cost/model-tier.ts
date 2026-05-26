/**
 * Model-tier routing. Cheap models do routing/triage; the strong model is only
 * spent on execution-critical steps. The concrete model IDs are configuration
 * (the engine owns the actual providers) — here we decide the *tier*.
 */
import {
  type ModelTier,
  type RuntimeMode,
  type SessionState,
  type StepKind,
} from '@yule/shared-types';
import { maxTierFor, modeForState } from './runtime-mode.js';

const STEP_DESIRED_TIER: Record<StepKind, ModelTier> = {
  route: 'triage',
  summarize: 'triage',
  execute: 'standard',
  synthesize: 'strong',
  plan: 'strong',
  review: 'strong',
};

/**
 * Pick the tier for a step, clamped so it can never exceed what the current
 * runtime mode allows. Returns the tier plus the reason it was (or wasn't)
 * allowed to use the strong model — useful for audit.
 */
export function selectTier(
  step: StepKind,
  mode: RuntimeMode,
): { tier: ModelTier; clamped: boolean } {
  const desired = STEP_DESIRED_TIER[step];
  const ceiling = maxTierFor(mode);
  const order: ModelTier[] = ['triage', 'standard', 'strong'];
  const tier = order.indexOf(desired) <= order.indexOf(ceiling) ? desired : ceiling;
  return { tier, clamped: tier !== desired };
}

/** Convenience that derives the mode from state then selects the tier. */
export function tierForStateStep(
  state: SessionState | null,
  step: StepKind,
): { tier: ModelTier; mode: RuntimeMode; clamped: boolean } {
  const mode = modeForState(state);
  const { tier, clamped } = selectTier(step, mode);
  return { tier, mode, clamped };
}

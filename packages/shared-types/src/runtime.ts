/**
 * Runtime modes and model tiers — the vocabulary of the token/cost model.
 *
 * The central idea: 24/7 presence must NOT mean 24/7 expensive inference. An
 * agent's `RuntimeMode` gates how much it is allowed to think, and the
 * `ModelTier` chosen for a step decides which model actually runs.
 */

export const RUNTIME_MODES = ['idle', 'watch', 'active', 'heavy', 'human'] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

/**
 * Human-meaningful description + relative cost weight of each mode. Used by the
 * scheduler to keep agents in the cheapest viable mode.
 */
export const RUNTIME_MODE_PROFILE: Record<
  RuntimeMode,
  { label: string; costWeight: number; allowsInference: boolean; description: string }
> = {
  idle: {
    label: 'Idle',
    costWeight: 0,
    allowsInference: false,
    description: 'No work assigned. No polling, no inference. Woken only by events.',
  },
  watch: {
    label: 'Watch',
    costWeight: 1,
    allowsInference: false,
    description: 'Subscribed to events (webhooks/queue). Cheap triage only, no reasoning LLM calls.',
  },
  active: {
    label: 'Active',
    costWeight: 4,
    allowsInference: true,
    description: 'Executing a task with the standard model and a bounded context window.',
  },
  heavy: {
    label: 'Heavy reasoning',
    costWeight: 10,
    allowsInference: true,
    description: 'Strong model + expanded context. Reserved for planning, review/merge, synthesis.',
  },
  human: {
    label: 'Human interaction',
    costWeight: 2,
    allowsInference: true,
    description: 'Paused on a human: awaiting approval, answering a question, or blocked on input.',
  },
};

export const MODEL_TIERS = ['triage', 'standard', 'strong'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/** A unit of agent work. Each step has a desired model tier (see @yule/core). */
export const STEP_KINDS = ['route', 'plan', 'execute', 'review', 'synthesize', 'summarize'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/**
 * Which model tier a given runtime mode is allowed to use. The scheduler/router
 * never escalates beyond this without an explicit reason.
 */
export const MODE_MAX_TIER: Record<RuntimeMode, ModelTier> = {
  idle: 'triage',
  watch: 'triage',
  active: 'standard',
  heavy: 'strong',
  human: 'standard',
};

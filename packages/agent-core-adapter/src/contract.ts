/**
 * The contract between the workspace (state owner) and the engine
 * (`yule-studio-agent`, the executor).
 *
 * Responsibility split:
 *  - The WORKSPACE owns canonical state, budgets, approvals, and decides which
 *    step to run next and at which model tier.
 *  - The ENGINE executes a single bounded step and reports what happened: how
 *    many tokens it spent and what transition it proposes. It never mutates
 *    workspace state directly.
 *
 * This keeps the engine stateless from the workspace's point of view and makes
 * the whole loop replaceable by a mock for offline local-dev.
 */
import type {
  AgentRole,
  GithubLink,
  ModelTier,
  SessionState,
  StepKind,
  TransitionEvent,
} from '@yule/shared-types';

export interface AgentStepRequest {
  taskId: string;
  sessionId: string;
  role: AgentRole;
  state: SessionState;
  step: StepKind;
  /** Tier the workspace authorized for this step (already budget-clamped). */
  tier: ModelTier;
  context: {
    title: string;
    description: string;
    /** Compacted prior context (bounded) — the engine expands only if needed. */
    snapshot: string | null;
    github: GithubLink | null;
  };
  /** Token ceiling the engine must not exceed for this single step. */
  maxTokens: number;
}

export interface AgentStepResult {
  ok: boolean;
  /** Actual tokens spent — the workspace records this against the budget. */
  tokensSpent: number;
  /** Transition the engine proposes; the workspace validates + applies it. */
  proposedEvent: TransitionEvent | null;
  /** One-line human summary for the audit log / snapshot. */
  summary: string;
  /** Optional structured artifacts produced by the step. */
  artifacts?: {
    plan?: string;
    diff?: string;
    prUrl?: string;
    branch?: string;
    note?: string;
  };
  /** Set when the step concludes a human decision is required. */
  needsApproval?: boolean;
  /** Set when the step could not proceed and the session should block. */
  blockedReason?: string;
}

export interface AdapterHealth {
  ok: boolean;
  mode: 'mock' | 'http';
  detail: string;
}

export interface AgentCoreAdapter {
  describe(): { mode: 'mock' | 'http'; engineUrl?: string };
  health(): Promise<AdapterHealth>;
  /** Execute exactly one bounded step and report the outcome. */
  runStep(req: AgentStepRequest): Promise<AgentStepResult>;
}

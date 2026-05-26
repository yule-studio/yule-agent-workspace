/**
 * MockAgentCoreAdapter — drives the full lifecycle offline with deterministic,
 * cheap "work". This is the default adapter so the workspace is runnable with
 * zero external dependencies: no engine, no API keys, no network.
 *
 * It does NOT pretend to do real reasoning. It returns plausible transitions +
 * small token counts so the state machine, budgets, and UI can be exercised.
 */
import type { StepKind, StudioAgent } from '@yule/shared-types';
import type { AdapterHealth, AgentCoreAdapter, AgentStepRequest, AgentStepResult } from './contract.js';
import { defaultRoster } from './roster.js';

/** Deterministic pseudo-token cost per step kind (keeps demos affordable). */
const STEP_COST: Record<StepKind, number> = {
  route: 80,
  summarize: 120,
  execute: 2400,
  plan: 1800,
  review: 1500,
  synthesize: 3000,
};

export class MockAgentCoreAdapter implements AgentCoreAdapter {
  describe() {
    return { mode: 'mock' as const };
  }

  async health(): Promise<AdapterHealth> {
    return { ok: true, mode: 'mock', detail: 'mock adapter — offline, deterministic' };
  }

  async listAgents(): Promise<StudioAgent[]> {
    return defaultRoster();
  }

  async runStep(req: AgentStepRequest): Promise<AgentStepResult> {
    const tokensSpent = Math.min(STEP_COST[req.step] ?? 100, req.maxTokens);

    switch (req.step) {
      case 'plan':
        return {
          ok: true,
          tokensSpent,
          proposedEvent: 'plan_ready',
          summary: `Planned "${req.context.title}" — 3 steps drafted, awaiting approval.`,
          artifacts: { plan: `1. scope\n2. implement\n3. test\n(mock plan for ${req.taskId})` },
          needsApproval: true,
        };
      case 'execute':
        return {
          ok: true,
          tokensSpent,
          proposedEvent: 'submit_for_review',
          summary: `Implemented changes for "${req.context.title}".`,
          artifacts: {
            branch: `feat/${req.taskId.slice(0, 8)}`,
            diff: `--- a/mock.ts\n+++ b/mock.ts\n@@\n-old\n+new (${req.taskId})`,
          },
        };
      case 'review':
        return {
          ok: true,
          tokensSpent,
          proposedEvent: 'review_passed',
          summary: 'Review passed — no blocking issues found.',
        };
      case 'synthesize':
        return {
          ok: true,
          tokensSpent,
          proposedEvent: null,
          summary: 'Synthesized a summary note.',
          artifacts: { note: `Decision summary for ${req.taskId} (mock).` },
        };
      case 'route':
      case 'summarize':
      default:
        return {
          ok: true,
          tokensSpent,
          proposedEvent: null,
          summary: `Ran ${req.step} (mock).`,
        };
    }
  }
}

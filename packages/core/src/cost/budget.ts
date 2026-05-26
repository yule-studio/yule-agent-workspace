/**
 * Token budgeting — per-session, per-role, and per-day caps with escalation.
 *
 * These are the guardrails that make 24/7 operation affordable: every inference
 * step is checked against budgets before it runs, and crossing the escalation
 * ratio surfaces an operator alert instead of silently burning tokens.
 */
import type { TokenBudget } from '@yule/shared-types';

export interface BudgetCheck {
  allowed: boolean;
  /** True once used/cap has crossed the escalation ratio. */
  escalate: boolean;
  remaining: number;
  reason: string | null;
}

export function newBudget(cap: number, escalationRatio = 0.8): TokenBudget {
  return { cap, used: 0, escalationRatio, escalated: false };
}

/** Check whether `estimatedTokens` more spend is permitted under the budget. */
export function checkBudget(budget: TokenBudget, estimatedTokens: number): BudgetCheck {
  const projected = budget.used + Math.max(0, estimatedTokens);
  const remaining = Math.max(0, budget.cap - budget.used);
  if (projected > budget.cap) {
    return {
      allowed: false,
      escalate: true,
      remaining,
      reason: `session budget exhausted: ${budget.used}/${budget.cap} used, requested ${estimatedTokens}`,
    };
  }
  const escalate = projected >= budget.cap * budget.escalationRatio;
  return { allowed: true, escalate, remaining, reason: null };
}

/** Record actual spend, returning the updated budget (immutably). */
export function recordSpend(budget: TokenBudget, tokens: number): TokenBudget {
  const used = budget.used + Math.max(0, tokens);
  const escalated = budget.escalated || used >= budget.cap * budget.escalationRatio;
  return { ...budget, used, escalated };
}

/**
 * Daily / role caps live outside a single session, so the service passes them
 * in alongside the running totals. Cheap to evaluate, no I/O.
 */
export interface GlobalCaps {
  dailyCap: number;
  roleCap: number;
}

export interface GlobalUsage {
  spentToday: number;
  spentByRoleToday: number;
}

export function checkGlobalCaps(
  caps: GlobalCaps,
  usage: GlobalUsage,
  estimatedTokens: number,
): BudgetCheck {
  if (usage.spentToday + estimatedTokens > caps.dailyCap) {
    return {
      allowed: false,
      escalate: true,
      remaining: Math.max(0, caps.dailyCap - usage.spentToday),
      reason: `daily workspace token cap reached (${usage.spentToday}/${caps.dailyCap})`,
    };
  }
  if (usage.spentByRoleToday + estimatedTokens > caps.roleCap) {
    return {
      allowed: false,
      escalate: true,
      remaining: Math.max(0, caps.roleCap - usage.spentByRoleToday),
      reason: `role daily token cap reached (${usage.spentByRoleToday}/${caps.roleCap})`,
    };
  }
  return { allowed: true, escalate: false, remaining: caps.dailyCap - usage.spentToday, reason: null };
}

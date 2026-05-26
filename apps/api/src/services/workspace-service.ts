/**
 * WorkspaceService — the orchestration core. It is the ONLY place that mutates
 * canonical state, so every invariant lives here:
 *
 *  - one canonical task per work item (workItemKey)
 *  - one active session per task (idempotent re-entry returns the existing one)
 *  - all state changes go through the pure state machine in @yule/core
 *  - token budgets / daily caps are enforced before any inference step
 *  - human gates (approval, blocked, ready_to_merge) are never auto-passed
 *
 * Discord, GitHub, and the engine call into this; none of them holds state.
 */
import { randomUUID } from 'node:crypto';
import {
  availableEvents,
  buildSnapshot,
  checkBudget,
  checkGlobalCaps,
  modeForState,
  newBudget,
  recordSpend,
  resolveTransition,
  tierForStateStep,
} from '@yule/core';
import type { AgentCoreAdapter, AgentStepResult } from '@yule/agent-core-adapter';
import {
  AGENT_ROLES,
  isTerminal,
  type AgentPresence,
  type AgentRole,
  type ApprovalRecord,
  type Session,
  type SessionState,
  type StepKind,
  type Task,
  type TaskPriority,
  type TaskSource,
  type TransitionEvent,
} from '@yule/shared-types';
import type { ApiConfig } from '../config.js';
import type { EventBus } from '../events/bus.js';
import type { EventRepo } from '../repositories/events.js';
import type { SessionRepo } from '../repositories/sessions.js';
import type { TaskRepo } from '../repositories/tasks.js';
import type { TransitionRepo } from '../repositories/transitions.js';
import type { UsageRepo } from '../repositories/usage.js';
import { ServiceError } from './errors.js';

/** Which engine step a session state implies (only inference-bearing states). */
const STATE_STEP: Partial<Record<SessionState, StepKind>> = {
  planning: 'plan',
  executing: 'execute',
  reviewing: 'review',
};

/** Free (no-engine) transitions that `advance` performs automatically. */
const AUTO_TRANSITION: Partial<Record<SessionState, TransitionEvent>> = {
  queued: 'pick_up',
  approved: 'start_execution',
};

/** States where `advance` must stop and wait for a human / policy decision. */
const HUMAN_GATES: SessionState[] = ['awaiting_approval', 'blocked', 'ready_to_merge', 'draft'];

export interface CreateTaskInput {
  title: string;
  description?: string;
  source: TaskSource;
  role: AgentRole;
  priority?: TaskPriority;
  workItemKey?: string | null;
  github?: Task['github'];
  budgetCap?: number;
}

export interface Repos {
  tasks: TaskRepo;
  sessions: SessionRepo;
  transitions: TransitionRepo;
  usage: UsageRepo;
  events: EventRepo;
}

export class WorkspaceService {
  constructor(
    private readonly repos: Repos,
    private readonly bus: EventBus,
    private readonly adapter: AgentCoreAdapter,
    private readonly config: ApiConfig,
  ) {}

  private now(): string {
    return new Date().toISOString();
  }

  // ── Tasks ───────────────────────────────────────────────────────────────

  createTask(input: CreateTaskInput): { task: Task; created: boolean } {
    // Canonical-per-work-item: return the existing task instead of duplicating.
    if (input.workItemKey) {
      const existing = this.repos.tasks.findByWorkItemKey(input.workItemKey);
      if (existing) return { task: existing, created: false };
    }
    const now = this.now();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? '',
      source: input.source,
      workItemKey: input.workItemKey ?? null,
      role: input.role,
      priority: input.priority ?? 'normal',
      activeSessionId: null,
      github: input.github ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.repos.tasks.insert(task);
    this.bus.publish('task.created', { task });
    return { task, created: true };
  }

  getTask(id: string): Task {
    const task = this.repos.tasks.get(id);
    if (!task) throw new ServiceError(404, `task ${id} not found`);
    return task;
  }

  listTasks(): Task[] {
    return this.repos.tasks.list();
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  /**
   * Open the canonical session for a task. Idempotent: if an active session
   * already exists, it is returned rather than creating a second one (also
   * guarded by a DB unique index).
   */
  openSession(taskId: string, budgetCap?: number): { session: Session; created: boolean } {
    const task = this.getTask(taskId);
    if (task.activeSessionId) {
      const existing = this.repos.sessions.get(task.activeSessionId);
      if (existing && !isTerminal(existing.state)) return { session: existing, created: false };
    }
    const now = this.now();
    const session: Session = {
      id: randomUUID(),
      taskId: task.id,
      role: task.role,
      state: 'draft',
      priorState: null,
      runtimeMode: modeForState('draft'),
      approval: null,
      budget: newBudget(budgetCap ?? this.config.tokens.sessionCap, this.config.tokens.escalationRatio),
      fingerprints: { diff: null, issue: null },
      snapshot: null,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    this.repos.sessions.insert(session);
    this.repos.tasks.setActiveSession(task.id, session.id, now);
    this.bus.publish('session.created', { session });
    this.emitPresence(task.role);
    return { session, created: true };
  }

  getSession(id: string): Session {
    const s = this.repos.sessions.get(id);
    if (!s) throw new ServiceError(404, `session ${id} not found`);
    return s;
  }

  listSessionsForTask(taskId: string): Session[] {
    return this.repos.sessions.listByTask(taskId);
  }

  getTransitions(sessionId: string) {
    return this.repos.transitions.listBySession(sessionId);
  }

  // ── Transitions ────────────────────────────────────────────────────────────

  /** Apply a single transition through the pure state machine + persist it. */
  applyTransition(
    sessionId: string,
    event: TransitionEvent,
    actor: string,
    reason: string | null = null,
    tokensSpent = 0,
  ): Session {
    const session = this.getSession(sessionId);
    const decision = resolveTransition(session.state, event, session.priorState);
    if (!decision.ok) throw new ServiceError(409, decision.reason ?? 'invalid transition');

    const now = this.now();
    const fromState = session.state;
    const toState = decision.toState as SessionState;

    // Idempotent no-op: nothing changed, do not write a phantom transition.
    if (decision.idempotent && toState === fromState) return session;

    session.state = toState;
    if (decision.priorState !== undefined) session.priorState = decision.priorState;
    session.runtimeMode = modeForState(toState);
    session.updatedAt = now;
    if (isTerminal(toState)) {
      session.closedAt = now;
    }
    this.repos.sessions.save(session);

    if (isTerminal(toState)) {
      this.repos.tasks.setActiveSession(session.taskId, null, now);
    }

    const transition = {
      id: randomUUID(),
      sessionId: session.id,
      event,
      fromState,
      toState,
      actor,
      reason,
      tokensSpent,
      at: now,
    };
    this.repos.transitions.insert(transition);

    // Refresh the compacted snapshot (cheap, no LLM).
    session.snapshot = buildSnapshot(this.repos.transitions.listBySession(session.id));
    this.repos.sessions.save(session);

    this.bus.publish('session.transition', { session, transition });
    this.raiseStateAlert(session, fromState, toState);
    this.emitPresence(session.role);
    return session;
  }

  // ── Approvals (persisted, survive restarts) ─────────────────────────────────

  decide(
    sessionId: string,
    decision: ApprovalRecord['decision'],
    by: string,
    via: ApprovalRecord['via'],
    note: string | null = null,
  ): Session {
    const session = this.getSession(sessionId);
    if (session.state !== 'awaiting_approval') {
      throw new ServiceError(409, `session is ${session.state}, not awaiting_approval`);
    }
    const record: ApprovalRecord = { decision, by, via, note, at: this.now() };
    session.approval = record;
    this.repos.sessions.save(session);

    const event: TransitionEvent =
      decision === 'approved' ? 'approve' : decision === 'changes_requested' ? 'request_changes' : 'abandon';
    return this.applyTransition(sessionId, event, by, `decision: ${decision}`, 0);
  }

  // ── The advance loop (runs one engine step or one free transition) ──────────

  /**
   * Move a session forward by exactly one step. Free transitions are applied
   * directly; inference-bearing states call the engine adapter under budget
   * control; human-gated states return without spending anything.
   */
  async advance(sessionId: string, actor = 'workspace'): Promise<{ session: Session; result: AgentStepResult | null; note: string }> {
    let session = this.getSession(sessionId);

    if (isTerminal(session.state)) {
      return { session, result: null, note: `session is terminal (${session.state})` };
    }
    if (HUMAN_GATES.includes(session.state)) {
      return { session, result: null, note: `waiting on human/policy at '${session.state}'` };
    }

    const auto = AUTO_TRANSITION[session.state];
    if (auto) {
      session = this.applyTransition(sessionId, auto, actor, 'auto transition', 0);
      return { session, result: null, note: `auto: ${auto} -> ${session.state}` };
    }

    const step = STATE_STEP[session.state];
    if (!step) {
      return { session, result: null, note: `no engine step for state '${session.state}'` };
    }

    // Budget + cap pre-check before spending anything.
    const maxTokens = this.computeStepCeiling(session);
    if (maxTokens <= 0) {
      session = this.blockForBudget(session, actor);
      return { session, result: null, note: 'blocked: budget/cap exhausted' };
    }

    const { tier } = tierForStateStep(session.state, step);
    const task = this.getTask(session.taskId);
    const result = await this.adapter.runStep({
      taskId: task.id,
      sessionId: session.id,
      role: session.role,
      state: session.state,
      step,
      tier,
      context: {
        title: task.title,
        description: task.description,
        snapshot: session.snapshot?.summary ?? null,
        github: task.github,
      },
      maxTokens,
    });

    // Record real spend against session budget + daily/role usage.
    session.budget = recordSpend(session.budget, result.tokensSpent);
    this.repos.sessions.save(session);
    this.repos.usage.add(session.role, result.tokensSpent, this.now());

    if (session.budget.escalated) {
      this.bus.publish('session.escalation', {
        session,
        reason: `token use crossed ${Math.round(session.budget.escalationRatio * 100)}% of budget`,
      });
      this.raiseAlert('warning', `escalation:${session.id}`, 'Token budget escalation', `Session ${session.id} crossed its budget threshold (${session.budget.used}/${session.budget.cap}).`, task.id, session.id);
    }

    if (!result.ok && result.blockedReason) {
      session = this.applyTransition(sessionId, 'block', actor, result.blockedReason, result.tokensSpent);
      return { session, result, note: `blocked: ${result.blockedReason}` };
    }

    if (result.proposedEvent) {
      session = this.applyTransition(sessionId, result.proposedEvent, actor, result.summary, result.tokensSpent);
    }
    return { session, result, note: result.summary };
  }

  /**
   * Drive a session forward until it hits a human/policy gate, a terminal
   * state, or a safety iteration cap. This is the event-driven "do the next
   * affordable thing" loop — it never loops on idle work because each step
   * either advances state or stops at a gate.
   */
  async runToGate(sessionId: string, actor = 'workspace', maxSteps = 16): Promise<Session> {
    let session = this.getSession(sessionId);
    for (let i = 0; i < maxSteps; i++) {
      if (isTerminal(session.state) || HUMAN_GATES.includes(session.state)) break;
      const { session: next } = await this.advance(sessionId, actor);
      // Stop if a step made no state progress (e.g. budget block already raised).
      if (next.state === session.state && !STATE_STEP[session.state]) break;
      session = next;
    }
    return session;
  }

  // ── Presence + status ───────────────────────────────────────────────────────

  agentPresence(): AgentPresence[] {
    const now = this.now();
    const active = this.repos.sessions.listActive();
    const byRole = this.repos.usage.byRoleToday(now);
    return AGENT_ROLES.map((role) => {
      const session = active.find((s) => s.role === role) ?? null;
      const presence: AgentPresence = {
        role,
        mode: session ? session.runtimeMode : 'idle',
        state: session ? session.state : null,
        currentSessionId: session ? session.id : null,
        statusLine: session ? this.statusLine(session) : null,
        tokensToday: byRole[role] ?? 0,
        updatedAt: session ? session.updatedAt : now,
      };
      return presence;
    });
  }

  status() {
    const now = this.now();
    const tasks = this.repos.tasks.list();
    const active = this.repos.sessions.listActive();
    const counts: Record<string, number> = {};
    for (const s of active) counts[s.state] = (counts[s.state] ?? 0) + 1;
    return {
      now,
      adapter: this.adapter.describe(),
      tasks: tasks.length,
      activeSessions: active.length,
      sessionsByState: counts,
      tokens: {
        spentToday: this.repos.usage.spentToday(now),
        dailyCap: this.config.tokens.dailyCap,
        byRole: this.repos.usage.byRoleToday(now),
      },
    };
  }

  availableEventsFor(sessionId: string): TransitionEvent[] {
    const s = this.getSession(sessionId);
    return availableEvents(s.state, s.priorState);
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private computeStepCeiling(session: Session): number {
    const now = this.now();
    const sessionRemaining = checkBudget(session.budget, 0).remaining;
    const caps = checkGlobalCaps(
      { dailyCap: this.config.tokens.dailyCap, roleCap: Math.floor(this.config.tokens.dailyCap / 4) },
      { spentToday: this.repos.usage.spentToday(now), spentByRoleToday: this.repos.usage.spentByRoleToday(session.role, now) },
      0,
    );
    // Cap a single step so one step can never blow the whole budget.
    const perStepCeiling = 8000;
    return Math.max(0, Math.min(sessionRemaining, caps.remaining, perStepCeiling));
  }

  private blockForBudget(session: Session, actor: string): Session {
    this.raiseAlert('critical', `budget-block:${session.id}`, 'Session blocked: budget exhausted', `Session ${session.id} ran out of token budget and was blocked for operator review.`, session.taskId, session.id);
    return this.applyTransition(session.id, 'block', actor, 'budget/cap exhausted', 0);
  }

  private statusLine(session: Session): string {
    switch (session.state) {
      case 'awaiting_approval':
        return 'Waiting for your approval…';
      case 'blocked':
        return 'Blocked — needs input.';
      case 'ready_to_merge':
        return 'Ready to merge — your call.';
      case 'planning':
        return 'Planning the work…';
      case 'executing':
        return 'Working on it…';
      case 'reviewing':
        return 'Reviewing the changes…';
      case 'deploying':
        return 'Deploying…';
      default:
        return session.snapshot?.summary?.split('\n')[0] ?? session.state;
    }
  }

  private raiseStateAlert(session: Session, _from: SessionState, to: SessionState): void {
    switch (to) {
      case 'awaiting_approval':
        this.raiseAlert('warning', `approval:${session.id}`, 'Approval needed', `Session ${session.id} is awaiting your approval.`, session.taskId, session.id);
        break;
      case 'blocked':
        this.raiseAlert('warning', `blocked:${session.id}:${session.updatedAt}`, 'Session blocked', `Session ${session.id} is blocked.`, session.taskId, session.id);
        break;
      case 'ready_to_merge':
        this.raiseAlert('info', `ready:${session.id}`, 'Ready to merge', `Session ${session.id} passed review and is ready to merge.`, session.taskId, session.id);
        break;
      case 'failed':
        this.raiseAlert('critical', `failed:${session.id}:${session.updatedAt}`, 'Session failed', `Session ${session.id} failed.`, session.taskId, session.id);
        break;
      case 'done':
        this.raiseAlert('success', `done:${session.id}`, 'Work complete', `Session ${session.id} is done.`, session.taskId, session.id);
        break;
      default:
        break;
    }
  }

  private raiseAlert(
    level: 'info' | 'success' | 'warning' | 'critical',
    dedupeKey: string,
    title: string,
    body: string,
    taskId: string | null,
    sessionId: string | null,
  ): void {
    this.bus.publish('alert', { level, dedupeKey, title, body, taskId, sessionId }, dedupeKey);
  }

  private emitPresence(role: AgentRole): void {
    const presence = this.agentPresence().find((p) => p.role === role);
    if (presence) this.bus.publish('agent.presence', { presence });
  }
}

/**
 * Row <-> domain mapping. Keeps SQL shape (snake_case, JSON columns) out of the
 * rest of the codebase, which only ever sees the canonical `@yule/shared-types`
 * models.
 */
import type {
  AgentRole,
  ApprovalRecord,
  GithubLink,
  Session,
  SessionSnapshot,
  SessionState,
  SessionTransition,
  Task,
  TaskPriority,
  TaskSource,
} from '@yule/shared-types';
import type { RuntimeMode } from '@yule/shared-types';
import type { TransitionEvent } from '@yule/shared-types';

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const optStr = (v: unknown): string | null => (v == null ? null : String(v));
const optNum = (v: unknown): number | null => (v == null ? null : Number(v));
const num = (v: unknown): number => Number(v ?? 0);

export function rowToTask(r: Row): Task {
  const github: GithubLink | null = r.github_repo
    ? {
        repo: str(r.github_repo),
        issueNumber: optNum(r.github_issue),
        prNumber: optNum(r.github_pr),
        branch: optStr(r.github_branch),
      }
    : null;
  return {
    id: str(r.id),
    title: str(r.title),
    description: str(r.description),
    source: str(r.source) as TaskSource,
    workItemKey: optStr(r.work_item_key),
    role: str(r.role) as AgentRole,
    priority: str(r.priority) as TaskPriority,
    activeSessionId: optStr(r.active_session_id),
    github,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function rowToSession(r: Row): Session {
  const approval = r.approval_json ? (JSON.parse(str(r.approval_json)) as ApprovalRecord) : null;
  const snapshot = r.snapshot_json ? (JSON.parse(str(r.snapshot_json)) as SessionSnapshot) : null;
  return {
    id: str(r.id),
    taskId: str(r.task_id),
    role: str(r.role) as AgentRole,
    state: str(r.state) as SessionState,
    priorState: optStr(r.prior_state) as SessionState | null,
    runtimeMode: str(r.runtime_mode) as RuntimeMode,
    approval,
    budget: {
      cap: num(r.budget_cap),
      used: num(r.budget_used),
      escalationRatio: num(r.budget_escalation_ratio),
      escalated: num(r.budget_escalated) === 1,
    },
    fingerprints: { diff: optStr(r.fp_diff), issue: optStr(r.fp_issue) },
    snapshot,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    closedAt: optStr(r.closed_at),
  };
}

export function rowToTransition(r: Row): SessionTransition {
  return {
    id: str(r.id),
    sessionId: str(r.session_id),
    event: str(r.event) as TransitionEvent,
    fromState: str(r.from_state) as SessionState,
    toState: str(r.to_state) as SessionState,
    actor: str(r.actor),
    reason: optStr(r.reason),
    tokensSpent: num(r.tokens_spent),
    at: str(r.at),
  };
}

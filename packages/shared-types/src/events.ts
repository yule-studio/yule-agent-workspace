/**
 * Workspace event envelope. The backend emits these on every meaningful change;
 * the web app (SSE) and the Discord bridge subscribe. This is the event-driven
 * spine that lets us avoid polling loops.
 */
import type { AgentPresence, Session, SessionTransition, Task } from './models.js';

export type WorkspaceEventType =
  | 'task.created'
  | 'task.updated'
  | 'session.created'
  | 'session.transition'
  | 'session.escalation'
  | 'agent.presence'
  | 'alert';

export interface WorkspaceEventBase<T extends WorkspaceEventType, P> {
  id: string;
  type: T;
  at: string;
  payload: P;
}

export type WorkspaceEvent =
  | WorkspaceEventBase<'task.created', { task: Task }>
  | WorkspaceEventBase<'task.updated', { task: Task }>
  | WorkspaceEventBase<'session.created', { session: Session }>
  | WorkspaceEventBase<'session.transition', { session: Session; transition: SessionTransition }>
  | WorkspaceEventBase<'session.escalation', { session: Session; reason: string }>
  | WorkspaceEventBase<'agent.presence', { presence: AgentPresence }>
  | WorkspaceEventBase<'alert', Alert>;

/** Operator-facing alert. These are exactly what the Discord bridge forwards. */
export type AlertLevel = 'info' | 'success' | 'warning' | 'critical';

export interface Alert {
  level: AlertLevel;
  /** Stable key for deduplication (e.g. "approval:session-123"). */
  dedupeKey: string;
  title: string;
  body: string;
  taskId: string | null;
  sessionId: string | null;
}

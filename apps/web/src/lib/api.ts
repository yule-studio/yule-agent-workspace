/**
 * Thin typed client for the workspace API. The browser talks to the API over
 * REST for commands; live state arrives via SSE (see live.ts). All domain types
 * come from the shared package so the contract is single-sourced.
 */
import type {
  AgentView,
  MeetingView,
  Session,
  SessionTransition,
  Task,
  TransitionEvent,
} from '@yule/shared-types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4319';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface StatusPayload {
  now: string;
  adapter: { mode: string; engineUrl?: string };
  tasks: number;
  agents: number;
  activeAgents: number;
  activeSessions: number;
  meetings: number;
  blocked: number;
  failed: number;
  sessionsByState: Record<string, number>;
  tokens: { spentToday: number; dailyCap: number; byRole: Record<string, number> };
}

export const api = {
  status: () => request<StatusPayload>('/api/status'),
  agents: () => request<{ agents: AgentView[]; meetings: MeetingView[] }>('/api/agents'),
  agentsByRole: (role: string) =>
    request<{ role: string; agents: AgentView[]; tasks: Task[] }>(`/api/agents/by-role/${role}`),
  tasks: () => request<{ tasks: Task[] }>('/api/tasks'),
  task: (id: string) => request<{ task: Task; sessions: Session[] }>(`/api/tasks/${id}`),
  session: (id: string) =>
    request<{ session: Session; transitions: SessionTransition[]; availableEvents: TransitionEvent[] }>(
      `/api/sessions/${id}`,
    ),
  createTask: (body: Record<string, unknown>) =>
    request<{ task: Task; sessionId: string | null; created: boolean }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  openSession: (taskId: string) =>
    request<{ session: Session; created: boolean }>(`/api/tasks/${taskId}/session`, {
      method: 'POST',
    }),
  transition: (sessionId: string, event: TransitionEvent, reason?: string) =>
    request<{ session: Session; availableEvents: TransitionEvent[] }>(
      `/api/sessions/${sessionId}/transition`,
      { method: 'POST', body: JSON.stringify({ event, actor: 'operator', reason }) },
    ),
  advance: (sessionId: string) =>
    request<{ session: Session; note: string }>(`/api/sessions/${sessionId}/advance`, {
      method: 'POST',
    }),
  run: (sessionId: string) =>
    request<{ session: Session; availableEvents: TransitionEvent[] }>(
      `/api/sessions/${sessionId}/run`,
      { method: 'POST' },
    ),
  decide: (sessionId: string, decision: string, note?: string) =>
    request<{ session: Session; availableEvents: TransitionEvent[] }>(
      `/api/sessions/${sessionId}/decision`,
      { method: 'POST', body: JSON.stringify({ decision, by: 'operator', note }) },
    ),
};

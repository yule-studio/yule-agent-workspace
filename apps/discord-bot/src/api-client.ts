/**
 * Workspace API client for the bridge. The bridge holds NO state — it reads and
 * writes the workspace, which is the single source of truth. Discord is a
 * human + alerts surface only.
 */
import type { AgentPresence, Session } from '@yule/shared-types';

export interface StatusPayload {
  tasks: number;
  activeSessions: number;
  sessionsByState: Record<string, number>;
  tokens: { spentToday: number; dailyCap: number };
}

export class WorkspaceClient {
  constructor(private readonly base: string) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  status() {
    return this.req<StatusPayload>('/api/status');
  }
  agents() {
    return this.req<{ agents: AgentPresence[] }>('/api/agents');
  }
  createTask(body: Record<string, unknown>) {
    return this.req<{ task: { id: string; title: string }; sessionId: string | null }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  session(id: string) {
    return this.req<{ session: Session; availableEvents: string[] }>(`/api/sessions/${id}`);
  }
  decide(id: string, decision: string, by: string, note?: string) {
    return this.req<{ session: Session }>(`/api/sessions/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, by, note }),
    });
  }
}

/**
 * HttpAgentCoreAdapter — talks to a running `yule-studio-agent` HTTP bridge.
 *
 * The engine is expected to expose:
 *   GET  {url}/health            -> { ok: boolean }
 *   POST {url}/v1/run-step       -> AgentStepResult   (body = AgentStepRequest)
 *
 * This adapter is intentionally thin: it carries no state and trusts the
 * workspace to be the source of truth. If the engine bridge is not yet
 * implemented, `health()` reports not-ok and the API stays on the mock adapter.
 */
import type { AdapterHealth, AgentCoreAdapter, AgentStepRequest, AgentStepResult } from './contract.js';

export interface HttpAdapterOptions {
  url: string;
  token?: string;
  timeoutMs?: number;
}

export class HttpAgentCoreAdapter implements AgentCoreAdapter {
  constructor(private readonly opts: HttpAdapterOptions) {}

  describe() {
    return { mode: 'http' as const, engineUrl: this.opts.url };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.opts.token) h.authorization = `Bearer ${this.opts.token}`;
    return h;
  }

  async health(): Promise<AdapterHealth> {
    try {
      const res = await this.fetch('/health', { method: 'GET' });
      const body = (await res.json()) as { ok?: boolean };
      return {
        ok: res.ok && body.ok !== false,
        mode: 'http',
        detail: `engine ${this.opts.url} responded ${res.status}`,
      };
    } catch (err) {
      return { ok: false, mode: 'http', detail: `engine unreachable: ${(err as Error).message}` };
    }
  }

  async runStep(req: AgentStepRequest): Promise<AgentStepResult> {
    const res = await this.fetch('/v1/run-step', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      return {
        ok: false,
        tokensSpent: 0,
        proposedEvent: null,
        summary: `engine error ${res.status}`,
        blockedReason: `engine returned ${res.status}`,
      };
    }
    return (await res.json()) as AgentStepResult;
  }

  private fetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 30_000);
    return fetch(`${this.opts.url}${path}`, {
      ...init,
      headers: init.headers ?? this.headers(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  }
}

export * from './contract.js';
export { MockAgentCoreAdapter } from './mock.js';
export { HttpAgentCoreAdapter, type HttpAdapterOptions } from './http.js';

import type { AgentCoreAdapter } from './contract.js';
import { HttpAgentCoreAdapter } from './http.js';
import { MockAgentCoreAdapter } from './mock.js';

export interface AdapterConfig {
  mode: 'mock' | 'http';
  url?: string;
  token?: string;
}

/** Factory: pick the adapter from config. Defaults to the offline mock. */
export function createAdapter(cfg: AdapterConfig): AgentCoreAdapter {
  if (cfg.mode === 'http') {
    if (!cfg.url) throw new Error('AGENT_CORE_URL is required when AGENT_CORE_MODE=http');
    return new HttpAgentCoreAdapter({ url: cfg.url, token: cfg.token });
  }
  return new MockAgentCoreAdapter();
}

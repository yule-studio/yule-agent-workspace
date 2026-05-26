/**
 * Runtime configuration, read from the environment with local-dev defaults.
 * Everything here has a default so `npm run dev:api` works with no .env file.
 */
export interface ApiConfig {
  host: string;
  port: number;
  dbPath: string;
  webOrigin: string;
  adapter: { mode: 'mock' | 'http'; url?: string; token?: string };
  tokens: { dailyCap: number; sessionCap: number; escalationRatio: number };
}

function num(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): ApiConfig {
  const mode = (process.env.AGENT_CORE_MODE === 'http' ? 'http' : 'mock') as 'mock' | 'http';
  return {
    host: process.env.API_HOST ?? '127.0.0.1',
    port: num(process.env.API_PORT, 4319),
    dbPath: process.env.WORKSPACE_DB_PATH ?? './data/workspace.db',
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    adapter: {
      mode,
      ...(process.env.AGENT_CORE_URL ? { url: process.env.AGENT_CORE_URL } : {}),
      ...(process.env.AGENT_CORE_TOKEN ? { token: process.env.AGENT_CORE_TOKEN } : {}),
    },
    tokens: {
      dailyCap: num(process.env.TOKEN_DAILY_CAP, 2_000_000),
      sessionCap: num(process.env.TOKEN_SESSION_CAP, 120_000),
      escalationRatio: num(process.env.TOKEN_ESCALATION_RATIO, 0.8),
    },
  };
}

/**
 * Application assembly — wires storage, the event bus, the engine adapter, and
 * the service together and registers routes. Returned pieces are reused by the
 * entrypoint and the seed script.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { createAdapter, type AgentCoreAdapter } from '@yule/agent-core-adapter';
import type { ApiConfig } from './config.js';
import { openDb, type Db } from './db/connection.js';
import { EventBus } from './events/bus.js';
import { EventRepo } from './repositories/events.js';
import { MeetingRepo } from './repositories/meetings.js';
import { SessionRepo } from './repositories/sessions.js';
import { TaskRepo } from './repositories/tasks.js';
import { TransitionRepo } from './repositories/transitions.js';
import { UsageRepo } from './repositories/usage.js';
import { registerApiRoutes } from './routes/api.js';
import { registerSseRoutes } from './routes/sse.js';
import { WorkspaceService } from './services/workspace-service.js';

export interface Built {
  app: FastifyInstance;
  svc: WorkspaceService;
  bus: EventBus;
  adapter: AgentCoreAdapter;
  db: Db;
}

export async function buildApp(config: ApiConfig): Promise<Built> {
  const db = openDb(config.dbPath);
  const events = new EventRepo(db);
  const repos = {
    tasks: new TaskRepo(db),
    sessions: new SessionRepo(db),
    transitions: new TransitionRepo(db),
    usage: new UsageRepo(db),
    events,
    meetings: new MeetingRepo(db),
  };
  const bus = new EventBus(events);
  const adapter = createAdapter(config.adapter);
  // Load the dynamic agent registry from the engine adapter at boot.
  const registry = await adapter.listAgents();
  const svc = new WorkspaceService(repos, bus, adapter, config, registry);

  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: [config.webOrigin, 'http://localhost:3000'], credentials: true });

  app.get('/health', async () => {
    const adapterHealth = await adapter.health();
    return {
      ok: true,
      name: 'yule-agent-workspace-api',
      version: '0.1.0',
      uptime: process.uptime(),
      adapter: adapterHealth,
    };
  });

  registerApiRoutes(app, svc);
  registerSseRoutes(app, bus, events);

  return { app, svc, bus, adapter, db };
}

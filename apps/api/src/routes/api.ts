/**
 * REST surface. Commands (create/transition/advance/decide) go over REST;
 * state push goes over SSE (see sse.ts). The route layer only validates input
 * and delegates — all invariants live in WorkspaceService.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AGENT_ROLES,
  TRANSITION_EVENTS,
  type AgentRole,
  type TransitionEvent,
} from '@yule/shared-types';
import type { WorkspaceService } from '../services/workspace-service.js';
import { ServiceError } from '../services/errors.js';

const roleEnum = z.enum(AGENT_ROLES as unknown as [AgentRole, ...AgentRole[]]);
const eventEnum = z.enum(TRANSITION_EVENTS as unknown as [TransitionEvent, ...TransitionEvent[]]);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.enum(['discord', 'github', 'operator', 'agent', 'api']).default('api'),
  role: roleEnum,
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  workItemKey: z.string().nullable().optional(),
  budgetCap: z.number().int().positive().optional(),
  github: z
    .object({
      repo: z.string(),
      issueNumber: z.number().int().nullable().default(null),
      prNumber: z.number().int().nullable().default(null),
      branch: z.string().nullable().default(null),
    })
    .optional(),
  /** Open a session, submit it, and run to the first human gate. */
  autostart: z.boolean().optional(),
});

const transitionSchema = z.object({
  event: eventEnum,
  actor: z.string().optional(),
  reason: z.string().nullable().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  by: z.string().min(1),
  note: z.string().nullable().optional(),
});

export function registerApiRoutes(app: FastifyInstance, svc: WorkspaceService): void {
  // Translate ServiceError -> proper HTTP status.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ServiceError) return reply.code(err.status).send({ error: err.message });
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'validation', issues: err.issues });
    app.log.error(err);
    return reply.code(500).send({ error: 'internal error' });
  });

  app.get('/api/status', async () => svc.status());
  app.get('/api/agents', async () => ({ agents: svc.agentPresence() }));

  app.get('/api/agents/:role', async (req) => {
    const role = roleEnum.parse((req.params as { role: string }).role);
    const presence = svc.agentPresence().find((p) => p.role === role);
    const tasks = svc.listTasks().filter((t) => t.role === role);
    return { presence, tasks };
  });

  app.get('/api/tasks', async () => ({ tasks: svc.listTasks() }));

  app.post('/api/tasks', async (req, reply) => {
    const body = createTaskSchema.parse(req.body);
    const { task, created } = svc.createTask({
      title: body.title,
      description: body.description ?? '',
      source: body.source,
      role: body.role,
      priority: body.priority ?? 'normal',
      workItemKey: body.workItemKey ?? null,
      github: body.github ?? null,
      ...(body.budgetCap ? { budgetCap: body.budgetCap } : {}),
    });

    let sessionId: string | null = task.activeSessionId;
    if (body.autostart) {
      const { session } = svc.openSession(task.id, body.budgetCap);
      svc.applyTransition(session.id, 'submit', body.source, 'autostart');
      const ran = await svc.runToGate(session.id, body.source);
      sessionId = ran.id;
    }
    return reply.code(created ? 201 : 200).send({ task: svc.getTask(task.id), sessionId, created });
  });

  app.get('/api/tasks/:id', async (req) => {
    const id = (req.params as { id: string }).id;
    const task = svc.getTask(id);
    return { task, sessions: svc.listSessionsForTask(id) };
  });

  app.post('/api/tasks/:id/session', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const { session, created } = svc.openSession(id);
    return reply.code(created ? 201 : 200).send({ session, created });
  });

  app.get('/api/sessions/:id', async (req) => {
    const id = (req.params as { id: string }).id;
    const session = svc.getSession(id);
    return {
      session,
      transitions: svc.getTransitions(id),
      availableEvents: svc.availableEventsFor(id),
    };
  });

  app.post('/api/sessions/:id/transition', async (req) => {
    const id = (req.params as { id: string }).id;
    const body = transitionSchema.parse(req.body);
    const session = svc.applyTransition(id, body.event, body.actor ?? 'operator', body.reason ?? null);
    return { session, availableEvents: svc.availableEventsFor(id) };
  });

  app.post('/api/sessions/:id/advance', async (req) => {
    const id = (req.params as { id: string }).id;
    const out = await svc.advance(id, 'operator');
    return out;
  });

  app.post('/api/sessions/:id/run', async (req) => {
    const id = (req.params as { id: string }).id;
    const session = await svc.runToGate(id, 'operator');
    return { session, availableEvents: svc.availableEventsFor(id) };
  });

  app.post('/api/sessions/:id/decision', async (req) => {
    const id = (req.params as { id: string }).id;
    const body = decisionSchema.parse(req.body);
    const session = svc.decide(id, body.decision, body.by, 'workspace', body.note ?? null);
    return { session, availableEvents: svc.availableEventsFor(id) };
  });
}

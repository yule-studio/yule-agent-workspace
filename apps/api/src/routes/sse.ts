/**
 * Server-Sent Events stream. The web app and Discord bridge subscribe here for
 * live state — one direction (server -> client), which is all we need for state
 * push. Commands go over REST. Chosen over WebSocket for simplicity and proxy
 * friendliness; the browser's native EventSource handles reconnection.
 */
import type { FastifyInstance } from 'fastify';
import type { EventBus } from '../events/bus.js';
import type { EventRepo } from '../repositories/events.js';

export function registerSseRoutes(app: FastifyInstance, bus: EventBus, events: EventRepo): void {
  app.get('/api/events/recent', async () => ({ events: events.recent(50) }));

  app.get('/api/events', (req, reply) => {
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    reply.raw.write('retry: 3000\n\n');

    // Catch-up: replay events the client missed since Last-Event-ID.
    const lastId = (req.headers['last-event-id'] as string | undefined) ?? null;
    for (const e of events.since(lastId)) {
      reply.raw.write(`id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
    }

    const unsubscribe = bus.subscribe((event) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    // Heartbeat keeps intermediaries from closing an idle connection. This is a
    // fixed timer, not an LLM loop — it costs nothing in tokens.
    const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}

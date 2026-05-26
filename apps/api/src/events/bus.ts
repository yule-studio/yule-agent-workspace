/**
 * In-process event bus. The workspace is event-driven: state changes publish a
 * `WorkspaceEvent`, which is persisted (for replay/dedupe) and fanned out to
 * live subscribers (SSE clients, and in-process the Discord bridge could too).
 *
 * This is deliberately in-process for the MVP — no broker. A Redis/NATS fan-out
 * can replace `EventBus` later without changing publishers.
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { WorkspaceEvent, WorkspaceEventType } from '@yule/shared-types';
import type { EventRepo } from '../repositories/events.js';

type Listener = (event: WorkspaceEvent) => void;

export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor(private readonly repo: EventRepo) {
    this.emitter.setMaxListeners(0);
  }

  /** Build, persist, and broadcast an event. Returns it (or null if deduped). */
  publish<T extends WorkspaceEventType>(
    type: T,
    payload: Extract<WorkspaceEvent, { type: T }>['payload'],
    dedupeKey: string | null = null,
  ): WorkspaceEvent | null {
    const event = {
      id: randomUUID(),
      type,
      at: new Date().toISOString(),
      payload,
    } as WorkspaceEvent;
    const stored = this.repo.append(event, dedupeKey);
    if (!stored) return null; // deduped — do not broadcast
    this.emitter.emit('event', event);
    return event;
  }

  subscribe(listener: Listener): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }
}

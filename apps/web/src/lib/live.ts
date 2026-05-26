'use client';
/**
 * Live data via SSE. A single shared EventSource fans workspace events out to
 * React hooks. `useLive` fetches once, then refetches on relevant events — the
 * UI never polls, mirroring the backend's event-driven design.
 */
import { useEffect, useRef, useState } from 'react';
import type { AgentView, MeetingView, WorkspaceEvent, WorkspaceEventType } from '@yule/shared-types';
import { api, API_URL, type StatusPayload } from './api';

type Handler = (e: WorkspaceEvent) => void;

let source: EventSource | null = null;
const handlers = new Set<Handler>();

function ensureSource(): void {
  if (source || typeof window === 'undefined') return;
  source = new EventSource(`${API_URL}/api/events`);
  source.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as WorkspaceEvent;
      handlers.forEach((h) => h(event));
    } catch {
      /* ignore malformed frame */
    }
  };
  source.onerror = () => {
    /* EventSource auto-reconnects; backend replays via Last-Event-ID */
  };
}

export function subscribe(handler: Handler): () => void {
  ensureSource();
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** Connection status indicator for the header. */
export function useConnection(): boolean {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    ensureSource();
    if (!source) return;
    const open = () => setConnected(true);
    const err = () => setConnected(false);
    source.addEventListener('open', open);
    source.addEventListener('error', err);
    setConnected(source.readyState === EventSource.OPEN);
    return () => {
      source?.removeEventListener('open', open);
      source?.removeEventListener('error', err);
    };
  }, []);
  return connected;
}

/**
 * Fetch `loader()` once and re-run it whenever an event of one of `on` types
 * arrives. Returns the latest data, a loading flag, and the last error.
 */
export function useLive<T>(
  loader: () => Promise<T>,
  on: WorkspaceEventType[],
  deps: unknown[] = [],
): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = () => {
    loaderRef
      .current()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribe((e) => {
      if (!on.includes(e.type)) return;
      // Coalesce bursts of events into a single refetch.
      if (timer) clearTimeout(timer);
      timer = setTimeout(reload, 120);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}

/** Events that change agent presence / office layout. */
const AGENT_EVENTS: WorkspaceEventType[] = [
  'agent.presence',
  'session.created',
  'session.transition',
  'session.escalation',
];

/**
 * The single shared agent/session source. The dashboard and the pixel office
 * both call this so they can never drift onto different data.
 */
export function useAgents() {
  return useLive<{ agents: AgentView[]; meetings: MeetingView[] }>(() => api.agents(), AGENT_EVENTS);
}

export function useStatus() {
  return useLive<StatusPayload>(
    () => api.status(),
    ['session.transition', 'session.created', 'task.created', 'agent.presence'],
  );
}

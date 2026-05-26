/**
 * Minimal SSE consumer built on Node's global fetch — no extra dependency. The
 * bridge subscribes to the workspace event stream and forwards `alert` events
 * outbound. Deduplication already happened at the source (events carry a
 * dedupeKey and are stored once), so the bridge never re-sends an alert.
 */
import type { WorkspaceEvent } from '@yule/shared-types';

export async function consumeEvents(
  apiUrl: string,
  onEvent: (e: WorkspaceEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiUrl}/api/events`, {
    headers: { accept: 'text/event-stream' },
    ...(signal ? { signal } : {}),
  });
  if (!res.body) throw new Error('no event stream body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(5).trim()) as WorkspaceEvent);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

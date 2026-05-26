'use client';
/**
 * Movement engine for the visible floor. Each agent eases toward the seat its
 * state implies (desk / meeting / review / standup / lounge). A rAF loop runs
 * only while something moves, so a settled floor costs nothing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView } from '@yule/shared-types';
import { resolveFloorTargets, type XY } from './layout.js';

const SPEED = 0.16; // px/ms

export interface Positioned {
  pos: XY;
  walking: boolean;
}

export function usePositions(agents: AgentView[], deskByAgent: Map<string, XY>): Map<string, Positioned> {
  const positions = useRef(new Map<string, XY>());
  const [, tick] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  const targets = useMemo(
    () => resolveFloorTargets(agents, deskByAgent),
    // recompute when the floor's agents or their intents change
    [agents.map((a) => `${a.id}:${a.locationIntent}`).join('|'), deskByAgent],
  );

  for (const a of agents) {
    if (!positions.current.has(a.id)) positions.current.set(a.id, { ...(targets.get(a.id) ?? { x: 220, y: 240 }) });
  }

  useEffect(() => {
    const step = (t: number) => {
      const dt = Math.min(48, t - (last.current || t));
      last.current = t;
      let moving = false;
      for (const a of agents) {
        const p = positions.current.get(a.id);
        const tg = targets.get(a.id);
        if (!p || !tg) continue;
        const dx = tg.x - p.x;
        const dy = tg.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.6) {
          p.x = tg.x;
          p.y = tg.y;
          continue;
        }
        const m = Math.min(dist, SPEED * dt);
        p.x += (dx / dist) * m;
        p.y += (dy / dist) * m;
        moving = true;
      }
      tick((n) => n + 1);
      raf.current = moving ? requestAnimationFrame(step) : null;
    };
    last.current = 0;
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [targets, agents]);

  const out = new Map<string, Positioned>();
  for (const a of agents) {
    const p = positions.current.get(a.id) ?? { x: 220, y: 240 };
    const tg = targets.get(a.id);
    out.set(a.id, { pos: { x: p.x, y: p.y }, walking: !!tg && Math.hypot(tg.x - p.x, tg.y - p.y) > 2 });
  }
  return out;
}

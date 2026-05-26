'use client';
/**
 * Movement engine. Each agent has a current position that eases toward a target
 * seat derived from its state/locationIntent. A requestAnimationFrame loop runs
 * only while something is moving (it stops when everyone is seated, so idle
 * agents cost nothing). This is what makes characters *walk* between the desk
 * farm, the meeting room, the review table, the lounge, etc. — movement is tied
 * to agent state, not random decoration.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView } from '@yule/shared-types';
import { assignDesks, resolveTargets } from './stage.js';
import type { Seat } from './types.js';

const SPEED = 0.14; // px per ms (~140 px/s walking pace)

export interface Positioned {
  pos: Seat;
  walking: boolean;
}

export function usePositions(agents: AgentView[]): Map<string, Positioned> {
  const positions = useRef(new Map<string, Seat>());
  const [, tick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // Recompute targets whenever the agent set / their intents change.
  const targets = useMemo(() => {
    const deskList = assignDesks(agents);
    const desks = new Map(deskList.map((d) => [d.agentId, d.seat]));
    return resolveTargets(agents, desks);
    // Re-run when an agent appears/leaves or changes where it wants to be.
  }, [agents.map((a) => `${a.id}:${a.locationIntent}`).join('|')]);

  // Seed positions for agents we have not seen (appear at their seat).
  for (const a of agents) {
    if (!positions.current.has(a.id)) {
      positions.current.set(a.id, { ...(targets.get(a.id) ?? { x: 200, y: 240 }) });
    }
  }

  useEffect(() => {
    const step = (t: number) => {
      const dt = Math.min(48, t - (lastRef.current || t));
      lastRef.current = t;
      let moving = false;
      for (const a of agents) {
        const p = positions.current.get(a.id);
        const target = targets.get(a.id);
        if (!p || !target) continue;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.6) {
          p.x = target.x;
          p.y = target.y;
          continue;
        }
        const move = Math.min(dist, SPEED * dt);
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
        moving = true;
      }
      tick((n) => n + 1);
      rafRef.current = moving ? requestAnimationFrame(step) : null;
    };
    lastRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targets, agents]);

  const out = new Map<string, Positioned>();
  for (const a of agents) {
    const p = positions.current.get(a.id) ?? { x: 200, y: 240 };
    const target = targets.get(a.id);
    const walking = !!target && Math.hypot(target.x - p.x, target.y - p.y) > 2;
    out.set(a.id, { pos: { x: p.x, y: p.y }, walking });
  }
  return out;
}

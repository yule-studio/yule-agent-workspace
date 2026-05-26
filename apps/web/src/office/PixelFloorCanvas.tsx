'use client';
/**
 * Renders a floor as a single pixel-art canvas bitmap (the office background) and
 * overlays ONLY the interactive layer on top: agent sprites, speech bubbles,
 * nameplates and selection. No DOM furniture — desks/walls/rooms/props all live
 * in the canvas. Agent positions come from the floor map's `seats` metadata.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentView } from '@yule/shared-types';
import { Character } from './Character.js';
import { ART, buildExecMap, buildTeamMap, type FloorMap } from './floormap.js';
import { drawFloor } from './pixeldraw.js';
import type { Floor } from './org.js';

function bubbleFor(a: AgentView): { text: string; cls: string } | null {
  switch (a.activity) {
    case 'blocked':
      return { text: 'Blocked', cls: 'alert' };
    case 'waiting':
      return a.state === 'awaiting_approval' ? { text: 'Approve?', cls: 'warn' } : { text: 'Need input', cls: 'warn' };
    case 'meeting':
      return { text: '…', cls: 'meet' };
    case 'reviewing':
      return { text: 'Reviewing', cls: 'calm' };
    default:
      return null;
  }
}

function useFit(): [React.RefObject<HTMLDivElement | null>, { w: number; h: number; s: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number; s: number }>({ w: ART.w, h: ART.h, s: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(el.clientWidth / ART.w, el.clientHeight / ART.h);
      setDim({ w: ART.w * s, h: ART.h * s, s });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, dim];
}

export function PixelFloorCanvas({
  floor,
  meetings,
  onSelect,
}: {
  floor: Floor;
  meetings: { participantIds: string[]; topic: string }[];
  onSelect: (a: AgentView) => void;
}) {
  const map: FloorMap = useMemo(() => (floor.id === 'executive' ? buildExecMap(floor) : buildTeamMap(floor)), [floor]);
  const [ref, dim] = useFit();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawFloor(ctx, map);
  }, [map]);

  const byId = new Map(floor.agents.map((a) => [a.id, a]));
  const meeting = meetings.find((m) => m.participantIds.some((id) => byId.has(id)));

  return (
    <div className="pixel-floor" ref={ref}>
      <div className="pf-stage" style={{ width: dim.w, height: dim.h }}>
        <canvas
          ref={canvasRef}
          width={ART.w}
          height={ART.h}
          style={{ width: dim.w, height: dim.h, imageRendering: 'pixelated' }}
        />
        {meeting && (
          <div
            className="meeting-topic"
            style={{ left: (ART.w * 0.62 * dim.s), top: dim.h * 0.04 }}
          >
            <span className="mt-live" /> {meeting.topic}
          </div>
        )}
        {[...map.seats.values()].map((seat) => {
          const operator = seat.agentId === 'operator';
          const a = operator ? null : byId.get(seat.agentId);
          if (!operator && !a) return null;
          const left = seat.x * dim.s;
          const top = seat.y * dim.s;
          const bubble = a ? bubbleFor(a) : null;
          const working = a && (a.activity === 'coding' || a.activity === 'running');
          return (
            <div
              key={seat.agentId}
              className={`agent seated ${a && (a.activity === 'waiting' || a.activity === 'blocked') ? 'attn' : ''}`}
              style={{ left, top, transform: `translate(-50%, -100%) scale(${dim.s})`, transformOrigin: 'center bottom', zIndex: Math.round(seat.y) + 500 }}
              onClick={() => a && onSelect(a)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => a && (e.key === 'Enter' || e.key === ' ') && onSelect(a)}
              title={a ? `${a.name} · ${a.activity}` : 'You · Operator'}
            >
              {bubble && <div className={`pixel-bubble ${bubble.cls}`}>{bubble.text}</div>}
              <Character seed={operator ? 3 : a!.avatarSeed} activity={operator ? 'idle' : a!.activity} walking={false} seated />
              {working && <span className="live-dot" />}
              <div className="nameplate">
                <span className="np-dot" style={{ background: operator ? '#b59bd1' : a!.state ? `var(--s-${a!.state})` : '#5b636d' }} />
                {operator ? 'You · Operator' : a!.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

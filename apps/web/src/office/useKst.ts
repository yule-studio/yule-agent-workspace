'use client';
/**
 * KST (Asia/Seoul) clock + day-phase. The operator sees Yule HQ in Korean time:
 * the building sky and lighting shift across dawn / day / dusk / night.
 * Computed on the client only (server time is UTC) to avoid hydration drift.
 */
import { useEffect, useState } from 'react';

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Kst {
  time: string; // "HH:MM"
  hour: number;
  phase: Phase;
  shift: string;
}

function compute(): Kst {
  const t = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const hour = Number(t.slice(0, 2)) % 24;
  const phase: Phase = hour < 5 ? 'night' : hour < 8 ? 'dawn' : hour < 17 ? 'day' : hour < 20 ? 'dusk' : 'night';
  const shift =
    phase === 'night' ? 'night shift' : phase === 'dawn' ? 'early shift' : phase === 'dusk' ? 'evening' : 'day shift';
  return { time: t, hour, phase, shift };
}

export function useKst(): Kst {
  // start at a stable default for SSR, then sync on the client
  const [kst, setKst] = useState<Kst>({ time: '--:--', hour: 12, phase: 'day', shift: 'day shift' });
  useEffect(() => {
    setKst(compute());
    const id = setInterval(() => setKst(compute()), 30_000);
    return () => clearInterval(id);
  }, []);
  return kst;
}

'use client';
/**
 * KST (Asia/Seoul) clock + 6-stage time-of-day. The operator sees Yule HQ in
 * Korean time; the building scene's sky, sun/moon, clouds, steam tint and window
 * lighting all shift across dawn / morning / day / sunset / evening / night.
 * Computed client-side only (server is UTC) to avoid hydration drift.
 */
import { useEffect, useState } from 'react';

export type Phase = 'dawn' | 'morning' | 'day' | 'sunset' | 'evening' | 'night';

export interface Kst {
  time: string; // "HH:MM"
  minutes: number; // minutes since midnight KST
  phase: Phase;
  shift: string;
}

const SHIFT: Record<Phase, string> = {
  dawn: 'dawn',
  morning: 'morning',
  day: 'day shift',
  sunset: 'sunset',
  evening: 'evening',
  night: 'night shift',
};

function phaseFor(min: number): Phase {
  if (min >= 300 && min < 420) return 'dawn'; // 05:00–07:00
  if (min >= 420 && min < 600) return 'morning'; // 07:00–10:00
  if (min >= 600 && min < 990) return 'day'; // 10:00–16:30
  if (min >= 990 && min < 1140) return 'sunset'; // 16:30–19:00
  if (min >= 1140 && min < 1260) return 'evening'; // 19:00–21:00
  return 'night'; // 21:00–05:00
}

function compute(): Kst {
  const t = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const [h, m] = t.split(':').map(Number) as [number, number];
  const minutes = (h % 24) * 60 + m;
  const phase = phaseFor(minutes);
  return { time: t, minutes, phase, shift: SHIFT[phase] };
}

export function useKst(): Kst {
  const [kst, setKst] = useState<Kst>({ time: '--:--', minutes: 720, phase: 'day', shift: 'day shift' });
  useEffect(() => {
    setKst(compute());
    const id = setInterval(() => setKst(compute()), 30_000);
    return () => clearInterval(id);
  }, []);
  return kst;
}

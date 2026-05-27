'use client';
/**
 * Building view as a full-viewport living pixel scene: a KST-driven sky (dawn /
 * morning / day / sunset / evening / night), a moving sun or moon, drifting
 * pixel clouds, a distant city skyline, power lines, a street strip, and the
 * Yule HQ building at the centre with rooftop equipment + animated steam. The
 * scene fills the whole stage; the inspector floats over it as a translucent
 * overlay. Original art — references the vibe, not the pixels.
 */
import type { MeetingView } from '@yule/shared-types';
import { BuildingFacade } from './BuildingFacade.js';
import type { Building, Floor } from './org.js';
import type { Phase } from './useKst.js';

const NIGHTISH: Phase[] = ['evening', 'night', 'dawn'];

export function BuildingScene({
  building,
  selectedId,
  meetings,
  phase,
  minutes,
  onEnter,
  onHover,
}: {
  building: Building;
  selectedId: string | null;
  meetings: MeetingView[];
  phase: Phase;
  minutes: number;
  onEnter: (id: string) => void;
  onHover: (f: Floor | null) => void;
}) {
  const night = NIGHTISH.includes(phase);
  return (
    <div className={`scene phase-${phase}`}>
      <div className="scene-sky" />
      <SunMoon phase={phase} minutes={minutes} />
      {night && <Stars />}
      <Clouds />
      <Skyline night={night} />
      <PowerPole />
      {/* ground: a layered sidewalk + curb + road the HQ stands on */}
      <div className="scene-ground">
        <div className="gr-walk" />
        <div className="gr-curb" />
        <div className="gr-road">
          <span className="gr-lane" />
        </div>
      </div>
      {/* soft contact shadow grounds the building onto the sidewalk */}
      <div className="scene-shadow" />
      <div className="scene-building">
        <BuildingFacade
          building={building}
          selectedId={selectedId}
          meetings={meetings}
          phase={phase}
          onEnter={onEnter}
          onHover={onHover}
        />
      </div>
      {/* foreground street furniture on the sidewalk, in front of the HQ */}
      <div className="scene-props">
        <span className={`st-lamp ${night ? 'on' : ''}`} />
        <span className="st-planter p1" />
        <span className="st-planter p2" />
        <span className="st-hydrant" />
        <span className="st-bench" />
      </div>
    </div>
  );
}

function SunMoon({ phase, minutes }: { phase: Phase; minutes: number }) {
  const night = phase === 'evening' || phase === 'night';
  // day arc 05:00→19:00 ; night arc 19:00→05:00
  let p: number;
  if (night) {
    const nm = minutes >= 1140 ? minutes - 1140 : minutes + 300;
    p = Math.max(0, Math.min(1, nm / 600));
  } else {
    p = Math.max(0, Math.min(1, (minutes - 300) / 840));
  }
  const left = 9 + p * 78;
  const top = 64 - Math.sin(p * Math.PI) * 48;
  return (
    <div className={`celestial ${night ? 'moon' : 'sun'}`} style={{ left: `${left}%`, top: `${top}%` }}>
      {night ? (
        <svg viewBox="0 0 24 24" shapeRendering="crispEdges">
          <circle cx="12" cy="12" r="10" fill="#d6dce8" />
          <circle cx="8" cy="9" r="9" fill="transparent" />
          <circle cx="9" cy="10" r="9" fill="#c2c9d8" opacity="0.0" />
          <circle cx="15" cy="10" r="2" fill="#c2c9d8" />
          <circle cx="10" cy="15" r="1.6" fill="#c2c9d8" />
        </svg>
      ) : (
        <svg viewBox="0 0 28 28" shapeRendering="crispEdges">
          <circle cx="14" cy="14" r="11" fill={phase === 'sunset' ? '#e3a0a6' : phase === 'dawn' ? '#cbbce0' : '#f2efe6'} />
          <circle cx="14" cy="14" r="15" fill={phase === 'sunset' ? '#d98aa5' : '#cdd6e2'} opacity="0.16" />
        </svg>
      )}
    </div>
  );
}

function Stars() {
  const pts = [
    [8, 12], [20, 24], [33, 9], [46, 30], [62, 14], [74, 26], [88, 10], [16, 40],
    [40, 18], [55, 8], [68, 38], [82, 32], [12, 28], [92, 22], [28, 16],
  ];
  return (
    <div className="stars">
      {pts.map(([x, y], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}
    </div>
  );
}

function Clouds() {
  return (
    <div className="clouds">
      {[
        { top: '14%', dur: 90, delay: 0, scale: 1 },
        { top: '26%', dur: 130, delay: -40, scale: 0.7 },
        { top: '9%', dur: 160, delay: -90, scale: 1.3 },
        { top: '34%', dur: 110, delay: -20, scale: 0.85 },
      ].map((c, i) => (
        <div key={i} className="cloud" style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, transform: `scale(${c.scale})` }}>
          <svg viewBox="0 0 48 18" shapeRendering="crispEdges">
            <rect x="8" y="8" width="32" height="8" rx="4" fill="currentColor" />
            <rect x="14" y="4" width="14" height="8" rx="4" fill="currentColor" />
            <rect x="24" y="2" width="14" height="9" rx="4" fill="currentColor" />
            <rect x="6" y="10" width="36" height="4" fill="#ffffff22" />
          </svg>
        </div>
      ))}
    </div>
  );
}

function Skyline({ night }: { night: boolean }) {
  // distant building silhouettes; a handful of lit windows at night
  const blds = [
    { x: 0, w: 60, h: 110 }, { x: 56, w: 44, h: 160 }, { x: 96, w: 70, h: 90 },
    { x: 162, w: 50, h: 200 }, { x: 208, w: 64, h: 130 }, { x: 268, w: 46, h: 175 },
    { x: 310, w: 80, h: 100 }, { x: 386, w: 52, h: 150 }, { x: 432, w: 70, h: 120 },
    { x: 498, w: 48, h: 185 }, { x: 542, w: 66, h: 105 }, { x: 604, w: 56, h: 160 },
    { x: 656, w: 78, h: 95 }, { x: 730, w: 50, h: 175 }, { x: 776, w: 70, h: 125 },
    { x: 842, w: 56, h: 150 }, { x: 894, w: 66, h: 100 },
  ];
  return (
    <svg className="skyline" viewBox="0 0 960 220" preserveAspectRatio="xMidYMax slice">
      {blds.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={220 - b.h} width={b.w} height={b.h} fill="#26303f" />
          <rect x={b.x} y={220 - b.h} width={b.w} height="3" fill="#313c4e" />
          {Array.from({ length: Math.floor(b.h / 18) }).map((_, r) =>
            [0, 1, 2].map((c) => {
              const lit = night && (b.x + r + c) % 4 === 0;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={b.x + 6 + c * (b.w / 3)}
                  y={220 - b.h + 8 + r * 18}
                  width={Math.max(4, b.w / 3 - 8)}
                  height="8"
                  fill={lit ? '#cdbbe0' : '#1c2530'}
                  opacity={lit ? 0.85 : 1}
                />
              );
            }),
          )}
        </g>
      ))}
    </svg>
  );
}

function PowerPole() {
  return (
    <svg className="power-pole" viewBox="0 0 60 200" shapeRendering="crispEdges">
      <rect x="26" y="20" width="6" height="180" fill="#2c3340" />
      <rect x="26" y="20" width="2" height="180" fill="#3a4250" />
      <rect x="10" y="34" width="40" height="4" fill="#2c3340" />
      <rect x="14" y="50" width="32" height="4" fill="#2c3340" />
      <path d="M12 36 Q40 52 60 44" fill="none" stroke="#1c222c" strokeWidth="1.5" />
      <path d="M16 52 Q40 66 60 60" fill="none" stroke="#1c222c" strokeWidth="1.5" />
      <path d="M48 36 Q40 52 12 50" fill="none" stroke="#1c222c" strokeWidth="1.2" />
      <rect x="22" y="58" width="14" height="10" fill="#3a4250" />
    </svg>
  );
}

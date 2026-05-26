'use client';
/**
 * Yule HQ rendered as a pixel-art building facade (front cutaway) — NOT a card
 * list. Each floor is a band of the building with concrete walls, a row of
 * windows showing desk silhouettes + agent dots, a small etched floor sign, an
 * elevator shaft on the left (car parks at the selected floor) and a fire escape
 * on the right. Active agents light their windows; a meeting floor shows a bubble.
 * Click a floor to drop into its detailed office. The penthouse is Executive.
 */
import { useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import type { Building, Floor } from './org.js';
import type { Phase } from './useKst.js';

const W = 470;
const SKY = 26;
const ROOF = 50;
const FH = 84; // floor height
const LOBBY = 86;
const GROUND = 22;
const BX = 74; // building left
const BW = 312; // building width
const ELEV = { x: 80, w: 26 }; // elevator shaft
const WIN_X = 120; // windows start
const WIN_AREA = 250;

const C = {
  wallA: '#cdd0c7',
  wallB: '#c1c5ba',
  wallC: '#b6bbb0',
  pilaster: '#aab0a3',
  ledge: '#9aa094',
  ledgeDk: '#878d80',
  frame: '#2b323a',
  glass: '#222d36',
  glassDim: '#2b3a44',
  desk: '#161c22',
  metal: '#454d57',
  metalLt: '#5b636d',
  metalDk: '#333a43',
  door: '#222d34',
  doorGlass: '#395862',
  roof: '#a9aea2',
  hvac: '#6c736b',
  signPlate: '#1b2026',
  exec: '#b59bd1',
};

export function BuildingFacade({
  building,
  selectedId,
  meetings,
  phase,
  onEnter,
  onHover,
}: {
  building: Building;
  selectedId: string | null;
  meetings: MeetingView[];
  phase: Phase;
  onEnter: (id: string) => void;
  onHover: (f: Floor | null) => void;
}) {
  const night = phase === 'night' || phase === 'evening';
  const [hover, setHover] = useState<string | null>(null);
  const floors = building.floors;
  const H = SKY + ROOF + floors.length * FH + LOBBY + GROUND;
  const meetingFloorIds = new Set(
    floors
      .filter((f) => meetings.some((m) => m.participantIds.some((id) => f.agents.some((a) => a.id === id))))
      .map((f) => f.id),
  );
  const selIndex = floors.findIndex((f) => f.id === selectedId);

  return (
    <div className="facade-wrap">
      <svg
        className="facade"
        viewBox={`0 0 ${W} ${H}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="xMidYMax meet"
      >
        {/* (sky/sun/moon/stars are drawn by the surrounding scene) */}
        {/* building body */}
        <rect x={BX} y={SKY + ROOF} width={BW} height={floors.length * FH + LOBBY} fill={C.wallA} />
        {/* pilasters */}
        <rect x={BX} y={SKY + ROOF} width="6" height={floors.length * FH + LOBBY} fill={C.pilaster} />
        <rect x={BX + BW - 6} y={SKY + ROOF} width="6" height={floors.length * FH + LOBBY} fill={C.pilaster} />

        {/* roof */}
        <g>
          <rect x={BX - 6} y={SKY + ROOF - 12} width={BW + 12} height="12" fill={C.ledgeDk} />
          <rect x={BX - 6} y={SKY} width={BW + 12} height={ROOF - 12} fill="#222a31" />
          {/* AC unit with vents */}
          <rect x={BX + 14} y={SKY + 14} width="40" height={ROOF - 26} fill={C.hvac} />
          <rect x={BX + 14} y={SKY + 14} width="40" height="2" fill="#7d847b" />
          {[18, 26, 34, 42].map((dx) => (
            <rect key={dx} x={BX + dx} y={SKY + 18} width="2" height={ROOF - 34} fill="#4c524a" />
          ))}
          <rect x={BX + 60} y={SKY + 18} width="30" height={ROOF - 30} fill={C.hvac} />
          <rect x={BX + 64} y={SKY + 22} width="22" height="6" fill="#4c524a" />
          {/* exhaust vent pipe (steam source) */}
          <rect x={BX + 104} y={SKY + 2} width="11" height={ROOF - 4} fill="#41454c" />
          <rect x={BX + 104} y={SKY + 2} width="3" height={ROOF - 4} fill="#54595f" />
          <rect x={BX + 102} y={SKY} width="15" height="4" fill="#2c3036" />
          {/* animated pixel steam */}
          <g className="steam">
            <rect className="st s1" x={BX + 106} y={SKY - 8} width="6" height="6" fill="#e7ecf2" />
            <rect className="st s2" x={BX + 108} y={SKY - 16} width="8" height="7" fill="#dde3ec" />
            <rect className="st s3" x={BX + 110} y={SKY - 26} width="10" height="8" fill="#d2d9e4" />
            <rect className="st s4" x={BX + 113} y={SKY - 36} width="9" height="7" fill="#c8d0dd" />
          </g>
          {/* satellite mast */}
          <rect x={BX + 150} y={SKY + 6} width="3" height={ROOF - 8} fill={C.metalLt} />
          <circle cx={BX + 151} cy={SKY + 4} r="6" fill="none" stroke={C.metalLt} strokeWidth="2" />
          <rect x={BX + 149} y={SKY + 2} width="4" height="4" fill={C.exec} />
          {/* antenna + light */}
          <rect x={BX + BW - 70} y={SKY - 14} width="3" height={ROOF + 8} fill={C.metalLt} />
          <rect x={BX + BW - 75} y={SKY - 18} width="13" height="6" fill="#1b2026" />
          <rect x={BX + BW - 71} y={SKY - 17} width="5" height="4" fill={C.exec} className="roof-blink" />
          {/* YULE HQ sign */}
          <rect x={BX + BW - 150} y={SKY + 14} width="78" height="20" fill={C.signPlate} />
          <text x={BX + BW - 111} y={SKY + 28} fontSize="11" fontWeight="800" letterSpacing="2" fill="#aeb6ad" textAnchor="middle">
            YULE HQ
          </text>
        </g>

        {/* floors */}
        {floors.map((f, i) => {
          const y = SKY + ROOF + i * FH;
          const isExec = f.id === 'executive';
          const isSel = f.id === selectedId;
          const isHover = f.id === hover;
          return (
            <g
              key={f.id}
              className="facade-floor"
              onClick={() => onEnter(f.id)}
              onMouseEnter={() => {
                setHover(f.id);
                onHover(f);
              }}
              onMouseLeave={() => {
                setHover((h) => (h === f.id ? null : h));
                onHover(null);
              }}
            >
              {/* wall shade per floor */}
              <rect x={BX + 6} y={y} width={BW - 12} height={FH} fill={i % 2 ? C.wallB : C.wallC} />
              {/* ledge / floor divider */}
              <rect x={BX} y={y + FH - 5} width={BW} height="5" fill={C.ledge} />
              <rect x={BX} y={y + FH - 2} width={BW} height="2" fill={C.ledgeDk} />

              {/* elevator shaft + car */}
              <rect x={ELEV.x} y={y} width={ELEV.w} height={FH - 5} fill="#1a2027" />
              <rect x={ELEV.x} y={y} width="2" height={FH - 5} fill={C.metalDk} />
              {selIndex === i && (
                <rect x={ELEV.x + 4} y={y + 12} width={ELEV.w - 8} height={FH - 30} fill={C.metalLt} className="elev-car" />
              )}

              {/* windows row with interior */}
              <FloorWindows floor={f} y={y} exec={isExec} night={night} />

              {/* floor sign (etched plate, not a card) */}
              <rect x={BX + 12} y={y + FH - 22} width={signWidth(f.name)} height="15" fill={C.signPlate} opacity="0.9" />
              <text x={BX + 18} y={y + FH - 11} fontSize="9.5" fontWeight="700" fill={f.accent} letterSpacing="0.4">
                {f.name.toUpperCase()}
                {isExec ? ' · 사장실' : ''}
              </text>

              {/* meeting bubble */}
              {meetingFloorIds.has(f.id) && (
                <g className="meet-ind" transform={`translate(${BX + BW - 30} ${y + 8})`}>
                  <rect x="0" y="0" width="18" height="12" rx="3" fill="#e7ebe6" />
                  <rect x="3" y="3" width="4" height="2" fill={C.metal} />
                  <rect x="9" y="3" width="6" height="2" fill={C.metal} />
                  <rect x="3" y="7" width="9" height="2" fill={C.metal} />
                  <rect x="6" y="12" width="3" height="3" fill="#e7ebe6" />
                </g>
              )}

              {/* hover / selection highlight (soft, no neon) */}
              {(isHover || isSel) && (
                <rect
                  x={BX}
                  y={y}
                  width={BW}
                  height={FH}
                  fill={isSel ? `${f.accent}22` : '#ffffff10'}
                  stroke={f.accent}
                  strokeWidth={isSel ? 2 : 1}
                />
              )}
            </g>
          );
        })}

        {/* fire escape on the right edge */}
        <FireEscape count={floors.length} top={SKY + ROOF} />

        {/* lobby / entrance */}
        <Lobby y={SKY + ROOF + floors.length * FH} />
        {/* street */}
        <rect x="0" y={H - GROUND} width={W} height={GROUND} fill="#181d23" />
        <rect x="0" y={H - GROUND} width={W} height="3" fill="#10141a" />
      </svg>
    </div>
  );
}

function signWidth(name: string): number {
  return Math.min(150, 26 + name.length * 6.4);
}

/** Windows for one floor — glass, desk silhouette inside, agent dots (lit if active). */
function FloorWindows({ floor, y, exec, night }: { floor: Floor; y: number; exec: boolean; night: boolean }) {
  const count = exec ? 3 : 6;
  const slotW = WIN_AREA / count;
  const winW = slotW - 12;
  const winH = exec ? 50 : 42;
  const wy = y + 14;
  // unlit window glass: darker at night so lit ones pop; lighter (daylight) by day
  const unlit = night ? '#141923' : floor.agents.length ? '#34414e' : '#2b3641';
  // distribute agents across windows
  const perWin: AgentView[][] = Array.from({ length: count }, () => []);
  floor.agents.forEach((a, idx) => perWin[idx % count]!.push(a));

  return (
    <g>
      {Array.from({ length: count }).map((_, w) => {
        const wx = WIN_X + w * slotW + 6;
        const occupants = perWin[w]!;
        const lit = occupants.find((a) => a.activity !== 'idle');
        const glass = lit ? `var(--s-${lit.state ?? 'executing'})` : unlit;
        return (
          <g key={w}>
            {/* frame */}
            <rect x={wx - 2} y={wy - 2} width={winW + 4} height={winH + 4} fill={C.frame} />
            {/* glass */}
            <rect x={wx} y={wy} width={winW} height={winH} fill={glass} opacity={lit ? 0.5 : 1} />
            {lit && <rect x={wx} y={wy} width={winW} height={winH} fill={glass} opacity="0.28" className="win-lit" />}
            {/* mullion */}
            <rect x={wx + winW / 2 - 1} y={wy} width="2" height={winH} fill={C.frame} />
            <rect x={wx} y={wy + winH / 2 - 1} width={winW} height="2" fill={C.frame} />
            {/* desk silhouette */}
            <rect x={wx + 4} y={wy + winH - 12} width={winW - 8} height="6" fill={C.desk} opacity="0.85" />
            {/* agent dots */}
            {occupants.slice(0, 3).map((a, k) => (
              <rect
                key={a.id}
                x={wx + 6 + k * 8}
                y={wy + winH - 22}
                width="5"
                height="6"
                fill={a.activity !== 'idle' && a.state ? `var(--s-${a.state})` : '#5b636d'}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function FireEscape({ count, top }: { count: number; top: number }) {
  const x = BX + BW - 4;
  const w = 30;
  return (
    <g>
      {/* vertical rails */}
      <rect x={x} y={top} width="2" height={count * FH} fill={C.metalDk} />
      <rect x={x + w} y={top} width="2" height={count * FH} fill={C.metalDk} />
      {Array.from({ length: count }).map((_, i) => {
        const y = top + i * FH;
        return (
          <g key={i}>
            {/* platform */}
            <rect x={x} y={y + FH - 16} width={w} height="3" fill={C.metalLt} />
            <rect x={x} y={y + FH - 13} width={w} height="2" fill={C.metalDk} />
            {/* railing */}
            <rect x={x} y={y + FH - 26} width="2" height="10" fill={C.metal} />
            <rect x={x + 10} y={y + FH - 26} width="1" height="10" fill={C.metal} />
            <rect x={x + 20} y={y + FH - 26} width="1" height="10" fill={C.metal} />
            <rect x={x + w} y={y + FH - 26} width="2" height="10" fill={C.metal} />
            {/* diagonal stair to next platform */}
            <line
              x1={x + (i % 2 ? 2 : w - 2)}
              y1={y + FH - 13}
              x2={x + (i % 2 ? w - 2 : 2)}
              y2={y + FH + FH - 16}
              stroke={C.metalLt}
              strokeWidth="2"
            />
          </g>
        );
      })}
    </g>
  );
}

function Lobby({ y }: { y: number }) {
  const cx = BX + BW / 2;
  return (
    <g>
      <rect x={BX + 6} y={y} width={BW - 12} height={LOBBY} fill="#b6bbb0" />
      {/* signage band */}
      <rect x={BX + 6} y={y} width={BW - 12} height="20" fill="#1b2026" />
      <text x={cx} y={y + 14} fontSize="11" fontWeight="800" letterSpacing="3" fill="#aeb6ad" textAnchor="middle">
        YULE HQ
      </text>
      {/* glass doors */}
      <rect x={cx - 40} y={y + 28} width="80" height={LOBBY - 28} fill={C.door} />
      <rect x={cx - 36} y={y + 32} width="34" height={LOBBY - 36} fill={C.doorGlass} />
      <rect x={cx + 2} y={y + 32} width="34" height={LOBBY - 36} fill={C.doorGlass} />
      <rect x={cx - 1} y={y + 28} width="2" height={LOBBY - 28} fill="#10141a" />
      {/* planters */}
      <rect x={BX + 16} y={y + LOBBY - 26} width="16" height="22" fill="#333a43" />
      <rect x={BX + 18} y={y + LOBBY - 36} width="12" height="12" rx="6" fill="#5f8a6a" />
      <rect x={BX + BW - 32} y={y + LOBBY - 26} width="16" height="22" fill="#333a43" />
      <rect x={BX + BW - 30} y={y + LOBBY - 36} width="12" height="12" rx="6" fill="#5f8a6a" />
    </g>
  );
}

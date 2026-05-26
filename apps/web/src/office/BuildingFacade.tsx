'use client';
/**
 * Yule Studio HQ — a low, wide pixel-art studio building (not a tall tower).
 * Massing: a wide main office block + a taller right service/stair core +
 * rooftop equipment (AC, vent w/ steam, antenna, satellite) + a ground-floor
 * lobby on a sidewalk. Each org floor is a short window band (clickable to
 * enter); active agents light their windows, a meeting floor shows a bubble.
 * Floor names live in the inspector / hover — not as big facade labels.
 */
import { useState } from 'react';
import type { AgentView, MeetingView } from '@yule/shared-types';
import type { Building, Floor } from './org.js';
import type { Phase } from './useKst.js';

const W = 560;
const ROOF = 36;
const FH = 58; // short floor band
const LOBBY = 72;
const BX = 64;
const BW = 432;
const CORE = 82; // right service/stair core width
const MAINW = BW - CORE;

const C = {
  wallA: '#d4d6ce', wallB: '#c8cbc2', wallHi: '#e6e7e0', wallSh: '#a9aaa0', wallEdge: '#8c8d84',
  core: '#bfc2ba', coreSh: '#9fa299', coreHi: '#d2d4cc',
  ledge: '#9ea197', ledgeDk: '#83867d',
  frame: '#2b323a', glass: '#33414e', glassSh: '#283340', desk: '#1b232c',
  metal: '#5b636d', metalLt: '#737b85', metalDk: '#363c45', door: '#222d34', doorGlass: '#3a5a64',
  parapet: '#b3b5ad', sign: '#1b2026', exec: '#b59bd1', rail: '#6b7280', balcony: '#9aa0a8',
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
  const H = ROOF + floors.length * FH + LOBBY;
  const meetingFloorIds = new Set(
    floors.filter((f) => meetings.some((m) => m.participantIds.some((id) => f.agents.some((a) => a.id === id)))).map((f) => f.id),
  );
  const lit = (f: Floor) => (night ? f.activeCount > 0 : true);

  return (
    <div className="facade-wrap">
      <svg className="facade" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" preserveAspectRatio="xMidYMax meet">
        {/* main block + service core masses */}
        <rect x={BX} y={ROOF} width={MAINW} height={floors.length * FH + LOBBY} fill={C.wallA} />
        <rect x={BX + MAINW} y={ROOF - 14} width={CORE} height={floors.length * FH + LOBBY + 14} fill={C.core} />
        <rect x={BX + MAINW} y={ROOF - 14} width={3} height={floors.length * FH + LOBBY + 14} fill={C.coreSh} />
        <rect x={BX} y={ROOF} width={4} height={floors.length * FH + LOBBY} fill={C.wallHi} />
        <rect x={BX + BW - 3} y={ROOF - 14} width={3} height={floors.length * FH + LOBBY + 14} fill={C.coreSh} />

        {/* rooftop */}
        <g>
          {/* parapet over main block */}
          <rect x={BX - 4} y={ROOF - 10} width={MAINW + 8} height="10" fill={C.parapet} />
          <rect x={BX - 4} y={ROOF - 10} width={MAINW + 8} height="2" fill={C.wallHi} />
          {/* core roof + water tank */}
          <rect x={BX + MAINW - 4} y={ROOF - 14} width={CORE + 8} height="6" fill={C.ledgeDk} />
          <rect x={BX + MAINW + 18} y={ROOF - 30} width="20" height="16" fill={C.metalDk} />
          <rect x={BX + MAINW + 18} y={ROOF - 30} width="20" height="2" fill={C.metalLt} />
          {/* AC unit */}
          <rect x={BX + 14} y={ROOF - 26} width="34" height="16" fill={C.metal} />
          <rect x={BX + 14} y={ROOF - 26} width="34" height="2" fill={C.metalLt} />
          {[18, 26, 34, 42].map((dx) => (
            <rect key={dx} x={BX + dx} y={ROOF - 22} width="2" height="10" fill={C.metalDk} />
          ))}
          {/* vent pipe + steam */}
          <rect x={BX + 70} y={ROOF - 34} width="10" height="28" fill="#41454c" />
          <rect x={BX + 70} y={ROOF - 34} width="3" height="28" fill="#565b62" />
          <rect x={BX + 68} y={ROOF - 36} width="14" height="4" fill="#2c3036" />
          <g className="steam">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={i}
                className={`st s${(i % 4) + 1}`}
                x={BX + 72 + (i % 3)}
                y={ROOF - 42 - i * 7}
                width={5 + (i % 3) * 2}
                height={5 + (i % 2) * 2}
                fill={i % 2 ? '#dde3ec' : '#e9eef5'}
              />
            ))}
          </g>
          {/* antenna + light + satellite */}
          <rect x={BX + 110} y={ROOF - 40} width="3" height="32" fill={C.metalLt} />
          <rect x={BX + 109} y={ROOF - 42} width="5" height="4" fill={C.exec} className="roof-blink" />
          <rect x={BX + 130} y={ROOF - 26} width="3" height="18" fill={C.metalLt} />
          <circle cx={BX + 131} cy={ROOF - 28} r="6" fill="none" stroke={C.metalLt} strokeWidth="2" />
          {/* studio sign on parapet */}
          <rect x={BX + MAINW - 130} y={ROOF - 9} width="120" height="9" fill={C.sign} />
          <text x={BX + MAINW - 70} y={ROOF - 2.5} fontSize="7" fontWeight="800" letterSpacing="2" fill="#aeb6ad" textAnchor="middle">
            YULE STUDIO HQ
          </text>
        </g>

        {/* floors */}
        {floors.map((f, i) => {
          const y = ROOF + i * FH;
          const isSel = f.id === selectedId;
          const isHover = f.id === hover;
          const balcony = i === floors.length - 1; // ground-most office floor gets a balcony
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
              <rect x={BX + 4} y={y} width={MAINW - 4} height={FH} fill={i % 2 ? C.wallA : C.wallB} />
              {/* ledge */}
              <rect x={BX} y={y + FH - 4} width={MAINW} height="4" fill={C.ledge} />
              <rect x={BX} y={y + FH - 1} width={MAINW} height="1" fill={C.ledgeDk} />
              {/* big windows (main block) */}
              <MainWindows x={BX + 14} y={y + 8} w={MAINW - 28} h={FH - 18} floor={f} lit={lit(f)} />
              {/* core windows (stairwell) */}
              <rect x={BX + MAINW + 14} y={y + 10} width={CORE - 28} height={FH - 22} fill={C.frame} />
              <rect x={BX + MAINW + 16} y={y + 12} width={CORE - 32} height={FH - 26} fill={lit(f) && f.activeCount ? `var(--s-${f.agents.find((a) => a.activity !== 'idle')?.state ?? 'executing'})` : C.glassSh} opacity={night ? 0.6 : 0.85} />
              {balcony && (
                <g>
                  <rect x={BX + 8} y={y + FH - 4} width={MAINW - 16} height="3" fill={C.balcony} />
                  {Array.from({ length: Math.floor((MAINW - 16) / 7) }).map((_, k) => (
                    <rect key={k} x={BX + 10 + k * 7} y={y + FH - 11} width="1.5" height="8" fill={C.rail} />
                  ))}
                  <rect x={BX + 8} y={y + FH - 12} width={MAINW - 16} height="2" fill={C.rail} />
                </g>
              )}
              {meetingFloorIds.has(f.id) && (
                <g className="meet-ind" transform={`translate(${BX + MAINW - 26} ${y + 6})`}>
                  <rect x="0" y="0" width="16" height="11" rx="2" fill="#e7ebe6" />
                  <rect x="3" y="3" width="4" height="2" fill={C.metal} />
                  <rect x="9" y="3" width="4" height="2" fill={C.metal} />
                  <rect x="3" y="6" width="8" height="2" fill={C.metal} />
                  <rect x="5" y="11" width="3" height="3" fill="#e7ebe6" />
                </g>
              )}
              {(isHover || isSel) && (
                <rect x={BX} y={y} width={BW} height={FH} fill={isSel ? `${f.accent}1f` : '#ffffff12'} stroke={f.accent} strokeWidth={isSel ? 1.5 : 1} />
              )}
              {(isHover || isSel) && (
                <g>
                  <rect x={BX + 4} y={y + 3} width={6.2 * f.name.length + 8} height="11" rx="2" fill={C.sign} opacity="0.92" />
                  <text x={BX + 8} y={y + 11} fontSize="8" fontWeight="700" fill={f.accent}>
                    {f.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* lobby on the sidewalk */}
        <Lobby y={ROOF + floors.length * FH} />
      </svg>
    </div>
  );
}

function MainWindows({ x, y, w, h, floor, lit }: { x: number; y: number; w: number; h: number; floor: Floor; lit: boolean }) {
  const cols = 4;
  const gap = 6;
  const ww = (w - gap * (cols - 1)) / cols;
  const active = floor.agents.filter((a) => a.activity !== 'idle');
  return (
    <g>
      {Array.from({ length: cols }).map((_, c) => {
        const wx = x + c * (ww + gap);
        const a = active[c];
        const glass = a && lit ? `var(--s-${a.state ?? 'executing'})` : C.glass;
        return (
          <g key={c}>
            <rect x={wx - 2} y={y - 2} width={ww + 4} height={h + 4} fill={C.frame} />
            <rect x={wx} y={y} width={ww} height={h} fill={glass} opacity={a && lit ? 0.55 : 0.92} />
            {a && lit && <rect x={wx} y={y} width={ww} height={h} fill={glass} opacity="0.28" className="win-lit" />}
            {/* blinds / mullions */}
            <rect x={wx} y={y + h / 2 - 1} width={ww} height="1.5" fill={C.frame} />
            <rect x={wx + ww / 2 - 1} y={y} width="1.5" height={h} fill={C.frame} />
            {/* desk silhouette behind glass */}
            <rect x={wx + 3} y={y + h - 8} width={ww - 6} height="5" fill={C.desk} opacity="0.8" />
            <rect x={wx + 5} y={y + h - 14} width="5" height="6" fill={C.desk} opacity="0.7" />
          </g>
        );
      })}
    </g>
  );
}

function Lobby({ y }: { y: number }) {
  const cx = BX + MAINW / 2;
  return (
    <g>
      <rect x={BX + 4} y={y} width={BW - 8} height={LOBBY} fill="#c6c8c0" />
      {/* sign band */}
      <rect x={BX + 4} y={y} width={MAINW - 4} height="14" fill="#1b2026" />
      <text x={cx} y={y + 10} fontSize="8" fontWeight="800" letterSpacing="2" fill="#aeb6ad" textAnchor="middle">
        YULE STUDIO
      </text>
      {/* entrance with steps */}
      <rect x={cx - 34} y={y + 20} width="68" height={LOBBY - 20} fill={C.door} />
      <rect x={cx - 30} y={y + 24} width="28" height={LOBBY - 28} fill={C.doorGlass} />
      <rect x={cx + 2} y={y + 24} width="28" height={LOBBY - 28} fill={C.doorGlass} />
      <rect x={cx - 1} y={y + 20} width="2" height={LOBBY - 20} fill="#10141a" />
      <rect x={cx - 42} y={y + LOBBY - 6} width="84" height="6" fill="#aeb0a8" />
      <rect x={cx - 36} y={y + LOBBY - 11} width="72" height="5" fill="#bcbeb6" />
      {/* core door */}
      <rect x={BX + MAINW + 26} y={y + 26} width="30" height={LOBBY - 26} fill={C.door} />
      <rect x={BX + MAINW + 30} y={y + 30} width="22" height={LOBBY - 32} fill={C.doorGlass} />
      {/* planters + a small wall AC near entrance */}
      <rect x={BX + 14} y={y + LOBBY - 24} width="14" height="20" fill="#333a43" />
      <rect x={BX + 16} y={y + LOBBY - 34} width="10" height="12" rx="5" fill="#5f8a6a" />
      <rect x={BX + MAINW - 28} y={y + LOBBY - 24} width="14" height="20" fill="#333a43" />
      <rect x={BX + MAINW - 26} y={y + LOBBY - 34} width="10" height="12" rx="5" fill="#5f8a6a" />
      <rect x={BX + MAINW + 8} y={y + 22} width="10" height="8" fill={C.metal} />
    </g>
  );
}

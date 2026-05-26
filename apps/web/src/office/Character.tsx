/**
 * A single agent character — one per agent, never an emoji. Appearance is
 * derived deterministically from the agent's avatar seed (skin/hair/glasses)
 * with the department colour as the shirt, so departments read as a family
 * while every agent is individual. Animations are driven by activity.
 */
import type { AgentActivity, AgentRole } from '@yule/shared-types';
import { ROLE_TINT } from './stage.js';

const SKINS = ['#f0c9a0', '#e8b88f', '#d99e74', '#c98a5a', '#a8703f'];
const HAIRS = ['#2b2b32', '#5a3a26', '#6b4326', '#d9a23c', '#9a9a9a', '#7a4a2a', '#1f1f24', '#b5651d'];

export function Character({
  seed,
  role,
  activity,
  walking,
}: {
  seed: number;
  role: AgentRole;
  activity: AgentActivity;
  walking: boolean;
}) {
  const skin = SKINS[seed % SKINS.length]!;
  const hair = HAIRS[(seed >> 2) % HAIRS.length]!;
  const shirt = ROLE_TINT[role];
  const glasses = seed % 3 === 0;
  const cls = `char ${walking ? 'walking' : `act-${activity}`}`;

  return (
    <div className={cls}>
      <svg viewBox="0 0 24 34" shapeRendering="crispEdges" width="34" height="48">
        {/* legs */}
        <g className="legs">
          <rect className="leg l" x="7" y="26" width="4" height="7" fill="#3a3340" />
          <rect className="leg r" x="13" y="26" width="4" height="7" fill="#3a3340" />
        </g>
        {/* torso (department colour) */}
        <rect x="5" y="17" width="14" height="11" rx="3" fill={shirt} />
        <rect x="5" y="17" width="14" height="3" rx="2" fill="#ffffff22" />
        {/* arms */}
        <rect className="arm l" x="3" y="18" width="3" height="8" rx="1.5" fill={shirt} />
        <rect className="arm r" x="18" y="18" width="3" height="8" rx="1.5" fill={shirt} />
        {/* neck */}
        <rect x="10" y="15" width="4" height="3" fill={skin} />
        {/* head */}
        <rect x="7" y="7" width="10" height="9" rx="2" fill={skin} />
        {/* hair */}
        <rect x="6.5" y="5" width="11" height="4" rx="2" fill={hair} />
        <rect x="6.5" y="7" width="2" height="5" fill={hair} />
        <rect x="15.5" y="7" width="2" height="5" fill={hair} />
        {/* eyes */}
        <rect x="9.5" y="10" width="1.6" height="2" fill="#2a2018" />
        <rect x="12.9" y="10" width="1.6" height="2" fill="#2a2018" />
        {glasses && (
          <>
            <rect x="9" y="9.6" width="2.6" height="2.8" fill="none" stroke="#2a2018" strokeWidth="0.5" />
            <rect x="12.4" y="9.6" width="2.6" height="2.8" fill="none" stroke="#2a2018" strokeWidth="0.5" />
          </>
        )}
      </svg>
      <span className="char-shadow" />
    </div>
  );
}

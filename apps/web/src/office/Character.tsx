/**
 * A detailed 32x48 pixel agent character (rendered larger, crisp edges). One per
 * agent; appearance is deterministic from the avatar seed (skin/hair style/shirt/
 * accessory) so every agent is individual. Shading (lighter top-left, darker
 * bottom-right) + an outline give it real pixel-art depth, not a flat shape.
 */
import type { AgentActivity } from '@yule/shared-types';

const SKIN = ['#f0c9a0', '#e4c4a8', '#d9a878', '#c2884f', '#a8703f'];
const SKIN_DK = ['#d6a877', '#c9a484', '#bd8a5c', '#a06a38', '#82542c'];
const HAIR = ['#1f2937', '#334155', '#475569', '#5a3a26', '#0f172a', '#7a8694', '#6b4326'];
const SHIRT = ['#38bdf8', '#2dd4bf', '#a78bfa', '#818cf8', '#22d3ee', '#5b8def', '#0ea5a4', '#e879b9'];
const SHIRT_DK = ['#1f93c8', '#1aa593', '#7c5fd0', '#5566d8', '#0fa6bd', '#3f6bd0', '#0a7a79', '#bf5a96'];

export function Character({ seed, activity, walking }: { seed: number; activity: AgentActivity; walking: boolean }) {
  const i = (n: number) => Math.abs(Math.floor(seed / n));
  const skin = SKIN[seed % SKIN.length]!;
  const skinD = SKIN_DK[seed % SKIN.length]!;
  const hair = HAIR[i(3) % HAIR.length]!;
  const si = i(7) % SHIRT.length;
  const shirt = SHIRT[si]!;
  const shirtD = SHIRT_DK[si]!;
  const style = i(11) % 3; // hair style
  const glasses = seed % 4 === 0;

  return (
    <div className={`char act-${activity}${walking ? ' walking' : ''}`}>
      <svg viewBox="0 0 32 48" shapeRendering="crispEdges" width="36" height="54">
        {/* shadow */}
        <ellipse cx="16" cy="46" rx="10" ry="2.5" fill="#00000040" />
        {/* legs */}
        <g className="legs">
          <rect className="leg l" x="9" y="34" width="6" height="11" fill="#2f3a48" />
          <rect className="leg r" x="17" y="34" width="6" height="11" fill="#26303d" />
          <rect className="leg l" x="9" y="44" width="6" height="2" fill="#1a2230" />
          <rect className="leg r" x="17" y="44" width="6" height="2" fill="#1a2230" />
        </g>
        {/* torso + arms (shirt) */}
        <rect x="7" y="22" width="18" height="14" rx="2" fill={shirt} />
        <rect x="7" y="22" width="18" height="3" fill="#ffffff30" />
        <rect x="19" y="22" width="6" height="14" fill={shirtD} />
        <rect className="arm l" x="4" y="23" width="4" height="11" rx="2" fill={shirt} />
        <rect className="arm r" x="24" y="23" width="4" height="11" rx="2" fill={shirtD} />
        {/* hands */}
        <rect className="arm l" x="4" y="33" width="4" height="3" fill={skin} />
        <rect className="arm r" x="24" y="33" width="4" height="3" fill={skin} />
        {/* neck */}
        <rect x="13" y="19" width="6" height="4" fill={skinD} />
        {/* head */}
        <rect x="9" y="8" width="14" height="13" rx="3" fill={skin} />
        <rect x="20" y="9" width="3" height="11" fill={skinD} />
        {/* hair styles */}
        <rect x="8" y="5" width="16" height="6" rx="3" fill={hair} />
        {style === 0 && <rect x="8" y="8" width="3" height="7" fill={hair} />}
        {style === 0 && <rect x="21" y="8" width="3" height="7" fill={hair} />}
        {style === 1 && <rect x="8" y="8" width="16" height="2" fill={hair} />}
        {style === 2 && <rect x="8" y="5" width="16" height="3" fill={hair} />}
        {/* eyes */}
        <rect x="12" y="13" width="2" height="3" fill="#1a2230" />
        <rect x="18" y="13" width="2" height="3" fill="#1a2230" />
        {glasses && (
          <>
            <rect x="11" y="12" width="4" height="4" fill="none" stroke="#1a2230" strokeWidth="0.7" />
            <rect x="17" y="12" width="4" height="4" fill="none" stroke="#1a2230" strokeWidth="0.7" />
            <rect x="15" y="13" width="2" height="1" fill="#1a2230" />
          </>
        )}
        {/* subtle outline accents */}
        <rect x="9" y="20" width="14" height="1" fill={skinD} />
      </svg>
    </div>
  );
}

/**
 * PixelAvatar — a small top-down RPG/Gather-style human, one per agent.
 * Everything (skin, hair style + colour, shirt, pants, shoes, accessory) is
 * derived deterministically from the agent's avatar seed, so an agent keeps the
 * same look across refreshes while the office reads as a crowd of distinct
 * people. Shading + an outline give it real pixel-art depth — not a flat block.
 */
import type { AgentActivity } from '@yule/shared-types';

const SKIN = ['#f1c9a5', '#e6b58c', '#d29a6e', '#b87c4f', '#9c6238'];
const SKIN_D = ['#d8ac86', '#c99a72', '#b67e54', '#9c623a', '#7e4d2a'];
const HAIR = ['#26262b', '#43301f', '#624427', '#8a6a3a', '#101216', '#7c828a', '#a8503a', '#d9c08a'];
const SHIRT = ['#5b86a8', '#5fa394', '#8b80c9', '#c98a8a', '#6b9bb5', '#7d8a96', '#5f8a6a', '#b07f9e', '#6f7fa6'];
const SHIRT_D = ['#4a7090', '#4f8a7c', '#74699f', '#ab7373', '#5783a0', '#697680', '#4f7457', '#976a86', '#5b6a8e'];
const PANTS = ['#39414e', '#2f3a48', '#454d57', '#3a3340', '#3d3a44', '#2d3640', '#4a4750'];
const SHOE = ['#191e25', '#241c16', '#20242b'];

export function Character({ seed, activity, walking }: { seed: number; activity: AgentActivity; walking: boolean }) {
  const skin = SKIN[Math.abs(seed) % SKIN.length]!;
  const skinD = SKIN_D[SKIN.indexOf(skin)]!;
  const hair = HAIR[Math.abs(Math.floor(seed / 3)) % HAIR.length]!;
  const shirtI = Math.abs(Math.floor(seed / 7)) % SHIRT.length;
  const shirt = SHIRT[shirtI]!;
  const shirtD = SHIRT_D[shirtI]!;
  const pants = PANTS[Math.abs(Math.floor(seed / 13)) % PANTS.length]!;
  const shoe = SHOE[Math.abs(Math.floor(seed / 17)) % SHOE.length]!;
  const hairStyle = Math.abs(Math.floor(seed / 5)) % 5;
  const acc = seed % 6;

  return (
    <div className={`char act-${activity}${walking ? ' walking' : ''}`}>
      <svg viewBox="0 0 32 54" shapeRendering="crispEdges" width="40" height="68">
        <ellipse cx="16" cy="52" rx="9" ry="2.4" fill="#00000045" />

        {/* legs + shoes */}
        <g className="legs">
          <g className="leg l">
            <rect x="11" y="37" width="5" height="11" fill={pants} />
            <rect x="11" y="46" width="5" height="3" fill={shoe} />
          </g>
          <g className="leg r">
            <rect x="16" y="37" width="5" height="11" fill={pants} />
            <rect x="16" y="37" width="5" height="11" fill="#00000018" />
            <rect x="16" y="46" width="5" height="3" fill={shoe} />
          </g>
        </g>

        {/* torso + arms + hands */}
        <rect x="9" y="23" width="14" height="15" rx="2" fill={shirt} />
        <rect x="9" y="23" width="14" height="2" fill="#ffffff28" />
        <rect x="16" y="23" width="7" height="15" fill={shirtD} />
        <rect className="arm l" x="6" y="24" width="4" height="11" rx="2" fill={shirt} />
        <rect className="arm r" x="22" y="24" width="4" height="11" rx="2" fill={shirtD} />
        <rect className="arm l" x="6" y="34" width="4" height="3" fill={skin} />
        <rect className="arm r" x="22" y="34" width="4" height="3" fill={skinD} />
        {acc === 2 && <rect x="15" y="23" width="2" height="9" fill="#c46b63" />}

        {/* neck */}
        <rect x="13" y="20" width="6" height="4" fill={skinD} />

        {/* head + face */}
        <rect x="9" y="8" width="14" height="13" rx="3" fill={skin} />
        <rect x="20" y="9" width="3" height="11" fill={skinD} />
        <rect x="8" y="13" width="2" height="3" fill={skinD} />
        <rect x="22" y="13" width="2" height="3" fill={skinD} />
        <rect x="12" y="13" width="2" height="3" fill="#1b1f25" />
        <rect x="18" y="13" width="2" height="3" fill="#1b1f25" />
        <rect className="blink" x="11" y="13" width="10" height="2" fill={skin} />
        <rect x="14" y="18" width="4" height="1" fill={skinD} />

        {/* hair */}
        {hairStyle === 0 && <Hair color={hair} kind="short" />}
        {hairStyle === 1 && <Hair color={hair} kind="side" />}
        {hairStyle === 2 && <Hair color={hair} kind="bob" />}
        {hairStyle === 3 && <Hair color={hair} kind="cap" />}
        {hairStyle === 4 && <Hair color={hair} kind="pony" />}

        {/* accessories */}
        {acc === 0 && (
          <g>
            <rect x="11" y="12" width="4" height="4" fill="none" stroke="#1b1f25" strokeWidth="0.8" />
            <rect x="17" y="12" width="4" height="4" fill="none" stroke="#1b1f25" strokeWidth="0.8" />
            <rect x="15" y="13" width="2" height="1" fill="#1b1f25" />
          </g>
        )}
        {acc === 1 && (
          <g>
            <path d="M9 11 Q16 4 23 11" fill="none" stroke="#22272e" strokeWidth="1.4" />
            <rect x="7.5" y="11" width="2.5" height="4" fill="#22272e" />
            <rect x="9" y="16" width="2" height="3" fill="#22272e" />
            <rect x="9.6" y="18.5" width="3" height="1.6" fill="#22272e" />
          </g>
        )}
      </svg>
    </div>
  );
}

function Hair({ color, kind }: { color: string; kind: 'short' | 'side' | 'bob' | 'cap' | 'pony' }) {
  const dark = '#00000022';
  switch (kind) {
    case 'short':
      return (
        <g>
          <rect x="8" y="6" width="16" height="5" rx="2" fill={color} />
          <rect x="8" y="9" width="2" height="3" fill={color} />
          <rect x="22" y="9" width="2" height="3" fill={color} />
          <rect x="8" y="6" width="16" height="2" fill={dark} />
        </g>
      );
    case 'side':
      return (
        <g>
          <rect x="8" y="6" width="16" height="5" rx="2" fill={color} />
          <rect x="8" y="9" width="3" height="5" fill={color} />
          <rect x="8" y="6" width="9" height="3" fill="#ffffff14" />
        </g>
      );
    case 'bob':
      return (
        <g>
          <rect x="7" y="6" width="18" height="6" rx="3" fill={color} />
          <rect x="7" y="10" width="3" height="8" fill={color} />
          <rect x="22" y="10" width="3" height="8" fill={color} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <rect x="8" y="5" width="16" height="5" rx="2" fill="#3a5a64" />
          <rect x="8" y="9" width="18" height="2" fill="#2c474f" />
          <rect x="8" y="5" width="16" height="2" fill="#4d747f" />
        </g>
      );
    case 'pony':
      return (
        <g>
          <rect x="8" y="6" width="16" height="5" rx="2" fill={color} />
          <rect x="8" y="9" width="2" height="4" fill={color} />
          <rect x="22" y="9" width="2" height="9" fill={color} />
          <rect x="23" y="13" width="3" height="6" rx="2" fill={color} />
        </g>
      );
  }
}

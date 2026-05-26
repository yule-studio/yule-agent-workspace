/**
 * PixelAvatar — a 48x64 top-down RPG/Gather-style human, rendered crisp. Hair,
 * face, outfit, legs and shoes each carry base + shadow + highlight shades, and
 * appearance (skin / hair style+colour / outfit style+colour / pants / shoes /
 * glasses) is chosen deterministically from the agent's seed, so the office
 * reads as a crowd of distinct people — not one recoloured block.
 */
import type { ReactNode } from 'react';
import type { AgentActivity } from '@yule/shared-types';

const SKIN = ['#f2d2b3', '#e8bd99', '#d9a47e', '#c2895f', '#a06b44'];
const HAIR = ['#2a2622', '#1b1a20', '#5a3a26', '#8a6a3a', '#9a4a30', '#b6aea4', '#cca65c', '#36404e'];
const OUTFIT = ['#8c93d8', '#9fbd9f', '#d98aa5', '#6f7da0', '#b58ac4', '#7fae8a', '#a99cff', '#5f7488', '#c98a8a'];
const PANTS = ['#39414e', '#2e3540', '#454d5d', '#4a4036', '#39414e', '#5a5360', '#3a4250'];
const SHOE = ['#1c2026', '#241c18', '#2a2530'];

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
const pick = <T,>(arr: T[], seed: number, salt: number): T => arr[Math.abs(Math.floor(seed / salt)) % arr.length]!;

export function Character({ seed, activity, walking }: { seed: number; activity: AgentActivity; walking: boolean }) {
  const skin = SKIN[Math.abs(seed) % SKIN.length]!;
  const skinS = shade(skin, 0.85);
  const hair = pick(HAIR, seed, 3);
  const hairS = shade(hair, 0.7);
  const hairH = shade(hair, 1.3);
  const outfit = pick(OUTFIT, seed, 7);
  const outfitS = shade(outfit, 0.8);
  const outfitH = shade(outfit, 1.18);
  const pants = pick(PANTS, seed, 13);
  const pantsS = shade(pants, 0.78);
  const shoe = pick(SHOE, seed, 17);
  const hairStyle = Math.abs(Math.floor(seed / 5)) % 6;
  const outfitStyle = Math.abs(Math.floor(seed / 11)) % 6;
  const glasses = seed % 4 === 0;

  return (
    <div className={`char act-${activity}${walking ? ' walking' : ''}`}>
      <svg viewBox="0 0 48 64" shapeRendering="crispEdges" width="42" height="56">
        <ellipse cx="24" cy="61" rx="13" ry="3" fill="#00000045" />

        {/* legs + shoes */}
        <g className="legs">
          <g className="leg l">
            <rect x="17" y="44" width="7" height="13" fill={pants} />
            <rect x="17" y="44" width="2" height="13" fill={pantsS} />
            <rect x="16" y="56" width="8" height="5" rx="1" fill={shoe} />
            <rect x="16" y="56" width="8" height="1.4" fill={shade(shoe, 1.5)} />
          </g>
          <g className="leg r">
            <rect x="24" y="44" width="7" height="13" fill={pants} />
            <rect x="29" y="44" width="2" height="13" fill={pantsS} />
            <rect x="24" y="56" width="8" height="5" rx="1" fill={shoe} />
            <rect x="24" y="56" width="8" height="1.4" fill={shade(shoe, 1.5)} />
          </g>
        </g>
        {/* hip */}
        <rect x="15" y="40" width="18" height="6" fill={pants} />
        <rect x="15" y="40" width="18" height="1.5" fill={shade(pants, 1.15)} />

        {/* outfit + arms */}
        <Outfit style={outfitStyle} base={outfit} sh={outfitS} hi={outfitH} skin={skin} skinS={skinS} />

        {/* neck */}
        <rect x="20" y="20" width="8" height="5" fill={skinS} />

        {/* head */}
        <rect x="15" y="8" width="18" height="15" rx="3" fill={skin} />
        <rect x="29" y="9" width="4" height="13" fill={skinS} />
        <rect x="14" y="13" width="2" height="4" fill={skinS} />
        <rect x="32" y="13" width="2" height="4" fill={skinS} />
        <rect x="18" y="17" width="2" height="2" fill={shade(skin, 0.92)} opacity="0.7" />
        <rect x="28" y="17" width="2" height="2" fill={shade(skin, 0.92)} opacity="0.7" />
        <rect x="23" y="16" width="2" height="3" fill={skinS} />
        <rect x="21" y="20" width="6" height="1.4" fill={shade(skin, 0.78)} />
        {/* eyes */}
        <rect x="19" y="14" width="2.4" height="3" fill="#23262d" />
        <rect x="26" y="14" width="2.4" height="3" fill="#23262d" />
        <rect x="19" y="14" width="2.4" height="1" fill="#4a4f59" />
        <rect className="blink" x="18" y="14" width="11" height="2" fill={skin} />

        {/* hair */}
        <Hair style={hairStyle} base={hair} sh={hairS} hi={hairH} />

        {glasses && (
          <g>
            <rect x="18" y="13.5" width="4.5" height="4.5" fill="none" stroke="#23262d" strokeWidth="0.9" />
            <rect x="25.5" y="13.5" width="4.5" height="4.5" fill="none" stroke="#23262d" strokeWidth="0.9" />
            <rect x="22.5" y="15" width="3" height="1" fill="#23262d" />
          </g>
        )}
      </svg>
    </div>
  );
}

function Outfit({
  style,
  base,
  sh,
  hi,
  skin,
  skinS,
}: {
  style: number;
  base: string;
  sh: string;
  hi: string;
  skin: string;
  skinS: string;
}) {
  const arms = (
    <>
      <rect className="arm l" x="10" y="26" width="5" height="13" rx="2" fill={base} />
      <rect className="arm l" x="10" y="26" width="2" height="13" fill={sh} />
      <rect className="arm r" x="33" y="26" width="5" height="13" rx="2" fill={sh} />
      <rect className="arm l" x="10" y="37" width="5" height="3" fill={skin} />
      <rect className="arm r" x="33" y="37" width="5" height="3" fill={skinS} />
    </>
  );
  const body = (collar?: ReactNode, extra?: ReactNode) => (
    <g>
      {arms}
      <rect x="14" y="24" width="20" height="18" rx="2" fill={base} />
      <rect x="14" y="24" width="20" height="2.5" fill={hi} />
      <rect x="30" y="24" width="4" height="18" fill={sh} />
      {extra}
      {collar}
    </g>
  );
  switch (style) {
    case 0: // hoodie
      return body(
        <>
          <rect x="18" y="22" width="12" height="4" rx="2" fill={sh} />
          <rect x="23" y="26" width="2" height="12" fill={sh} />
        </>,
        <rect x="17" y="34" width="14" height="5" rx="1" fill={sh} />,
      );
    case 1: // shirt + collar
      return body(
        <>
          <rect x="20" y="23" width="3" height="4" fill={hi} transform="rotate(20 21 25)" />
          <rect x="25" y="23" width="3" height="4" fill={hi} transform="rotate(-20 27 25)" />
          <rect x="23" y="26" width="1.6" height="14" fill={sh} />
        </>,
      );
    case 2: // jacket
      return body(
        <>
          <rect x="22" y="24" width="4" height="16" fill={shade(base, 0.6)} />
          <rect x="17" y="24" width="4" height="14" fill={hi} transform="rotate(8 19 30)" />
          <rect x="27" y="24" width="4" height="14" fill={sh} transform="rotate(-8 29 30)" />
        </>,
      );
    case 3: // sweater
      return body(
        <rect x="19" y="22" width="10" height="3" rx="3" fill={sh} />,
        <>
          {[28, 33, 38].map((y) => (
            <rect key={y} x="15" y={y} width="18" height="1" fill={sh} opacity="0.5" />
          ))}
        </>,
      );
    case 4: // vest over shirt
      return body(
        <rect x="20" y="23" width="8" height="2" fill="#e7e9ef" />,
        <>
          <rect x="14" y="24" width="5" height="18" fill={sh} />
          <rect x="29" y="24" width="5" height="18" fill={shade(base, 0.7)} />
          <rect x="22" y="25" width="4" height="15" fill="#dfe2e8" />
        </>,
      );
    default: // dress
      return (
        <g>
          {arms}
          <rect x="15" y="24" width="18" height="12" rx="2" fill={base} />
          <rect x="15" y="24" width="18" height="2.5" fill={hi} />
          <path d="M14 36 L34 36 L37 46 L11 46 Z" fill={base} />
          <path d="M24 36 L24 46" stroke={sh} strokeWidth="1" />
          <rect x="30" y="24" width="3" height="12" fill={sh} />
        </g>
      );
  }
}

function Hair({ style, base, sh, hi }: { style: number; base: string; sh: string; hi: string }) {
  switch (style) {
    case 0: // short
      return (
        <g>
          <rect x="14" y="5" width="20" height="7" rx="3" fill={base} />
          <rect x="14" y="9" width="2" height="6" fill={base} />
          <rect x="32" y="9" width="2" height="6" fill={base} />
          <rect x="15" y="5" width="18" height="2" fill={hi} />
          <rect x="14" y="10" width="20" height="2" fill={sh} />
        </g>
      );
    case 1: // bob
      return (
        <g>
          <rect x="13" y="5" width="22" height="7" rx="3" fill={base} />
          <rect x="13" y="9" width="3" height="11" fill={base} />
          <rect x="32" y="9" width="3" height="11" fill={base} />
          <rect x="14" y="5" width="20" height="2" fill={hi} />
          <rect x="13" y="17" width="3" height="3" fill={sh} />
          <rect x="32" y="17" width="3" height="3" fill={sh} />
        </g>
      );
    case 2: // wavy
      return (
        <g>
          <rect x="13" y="4" width="22" height="8" rx="4" fill={base} />
          <rect x="13" y="10" width="3" height="9" fill={base} />
          <rect x="32" y="10" width="3" height="9" fill={base} />
          <rect x="15" y="4" width="6" height="2" fill={hi} />
          <rect x="24" y="5" width="7" height="2" fill={hi} />
          <rect x="14" y="16" width="3" height="3" fill={sh} />
          <rect x="31" y="16" width="3" height="3" fill={sh} />
        </g>
      );
    case 3: // tied / bun
      return (
        <g>
          <rect x="14" y="5" width="20" height="6" rx="3" fill={base} />
          <rect x="14" y="9" width="2" height="5" fill={base} />
          <rect x="32" y="9" width="2" height="5" fill={base} />
          <rect x="20" y="2" width="8" height="5" rx="3" fill={base} />
          <rect x="21" y="2" width="6" height="2" fill={hi} />
          <rect x="15" y="9" width="18" height="2" fill={sh} />
        </g>
      );
    case 4: // side part
      return (
        <g>
          <rect x="14" y="5" width="20" height="7" rx="3" fill={base} />
          <rect x="14" y="9" width="2" height="6" fill={base} />
          <rect x="32" y="9" width="3" height="7" fill={base} />
          <rect x="15" y="5" width="11" height="3" fill={hi} />
          <rect x="14" y="10" width="20" height="2" fill={sh} />
        </g>
      );
    default: // curly
      return (
        <g>
          {[15, 20, 25, 30].map((x) => (
            <circle key={x} cx={x} cy="6" r="4" fill={base} />
          ))}
          {[16, 22, 28].map((x) => (
            <circle key={x} cx={x} cy="4.5" r="3" fill={hi} />
          ))}
          <rect x="13" y="8" width="3" height="9" fill={base} />
          <rect x="32" y="8" width="3" height="9" fill={base} />
          <rect x="14" y="14" width="3" height="3" fill={sh} />
        </g>
      );
  }
}

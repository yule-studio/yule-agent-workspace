/**
 * PixelAvatar — a 64x96 top-down pixel human with real character. Skin, hair
 * (10 styles w/ strand highlights + 3 shades), face (eye/brow/mouth + glasses/
 * beard/headset), and a full outfit PALETTE (14 combos of top + bottom + shoes +
 * accent, each base/shadow/highlight) are all chosen deterministically from the
 * agent seed — so every agent is a distinct little person, not a recoloured
 * office worker. Rendered crisp; scaled by the floor overlay.
 */
import type { ReactNode } from 'react';
import type { AgentActivity } from '@yule/shared-types';

const SKIN = ['#f4d6b8', '#ecc6a2', '#dcab82', '#c79064', '#a87248', '#8a5a38'];
const HAIR = ['#211d1a', '#15161c', '#3a2a1e', '#5a3a26', '#8a6a3a', '#8a3a26', '#c9a45e', '#cabfb0', '#9a9690', '#2a2e3e'];

interface Fit { top: string; ts: string; th: string; bot: string; bs: string; shoe: string; acc: string }
const FITS: Fit[] = [
  { top: '#e07a6e', ts: '#b85f55', th: '#ef9d92', bot: '#2f333b', bs: '#23262d', shoe: '#1a1d22', acc: '#f6c0b6' },
  { top: '#a99cff', ts: '#8074cc', th: '#c4baff', bot: '#2a2f4a', bs: '#1e2238', shoe: '#181b2a', acc: '#d8d2ff' },
  { top: '#9fbd9f', ts: '#7d9c7d', th: '#c0d6c0', bot: '#d8d2c0', bs: '#b3ad9a', shoe: '#6b6557', acc: '#e9efe2' },
  { top: '#d98aa5', ts: '#b06882', th: '#ecadc2', bot: '#5a2a3a', bs: '#401e2a', shoe: '#2a1820', acc: '#f0c2d2' },
  { top: '#4f7fd0', ts: '#3c63a8', th: '#79a3e6', bot: '#555c66', bs: '#3e444c', shoe: '#2a2e34', acc: '#a9c4ef' },
  { top: '#8a3a4a', ts: '#6a2c39', th: '#aa5566', bot: '#44505e', bs: '#323b46', shoe: '#232a32', acc: '#c98494' },
  { top: '#8fd4b0', ts: '#6cae8c', th: '#b3e8cf', bot: '#2c4a3a', bs: '#1f372a', shoe: '#18241c', acc: '#d4f3e4' },
  { top: '#f0b89a', ts: '#cf957a', th: '#ffd4ba', bot: '#44587a', bs: '#33445e', shoe: '#2a3344', acc: '#ffe0cc' },
  { top: '#c8a8e0', ts: '#a384bf', th: '#ddc6ee', bot: '#1c1e24', bs: '#131419', shoe: '#0e0f13', acc: '#e7d6f4' },
  { top: '#e8e4d4', ts: '#c5c1b0', th: '#f6f3e8', bot: '#5c5a36', bs: '#444229', shoe: '#2c2b1c', acc: '#fffdf2' },
  { top: '#c25548', ts: '#9c4339', th: '#d97a6e', bot: '#3e2f26', bs: '#2c211a', shoe: '#1f1812', acc: '#e08a7e' },
  { top: '#c9a44e', ts: '#a4842f', th: '#dcc070', bot: '#2f333b', bs: '#23262d', shoe: '#1a1d22', acc: '#e6cf90' },
  { top: '#4fa3a0', ts: '#3c7d7b', th: '#79c4c1', bot: '#b7a98a', bs: '#97896c', shoe: '#5a5240', acc: '#9fd6d3' },
  { top: '#7a5a86', ts: '#5e4468', th: '#9a78a8', bot: '#50555e', bs: '#3a3e46', shoe: '#26292f', acc: '#b89ec4' },
];

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
const idx = (seed: number, salt: number, len: number) => Math.abs(Math.floor(seed / salt)) % len;

export function Character({
  seed,
  activity,
  walking,
  seated,
}: {
  seed: number;
  activity: AgentActivity;
  walking: boolean;
  seated?: boolean;
}) {
  const skin = SKIN[Math.abs(seed) % SKIN.length]!;
  const skinS = shade(skin, 0.84);
  const skinH = shade(skin, 1.08);
  const hair = HAIR[idx(seed, 3, HAIR.length)]!;
  const hairS = shade(hair, 0.66);
  const hairH = shade(hair, 1.4);
  const fit = FITS[idx(seed, 7, FITS.length)]!;
  const hairStyle = idx(seed, 5, 10);
  const fitStyle = idx(seed, 11, 10);
  const eyeV = idx(seed, 23, 3);
  const glasses = seed % 5 === 0;
  const beard = seed % 7 === 0;
  const headset = seed % 9 === 0;

  if (seated)
    return (
      <div className={`char seated act-${activity}`}>
        <svg viewBox="0 0 40 42" shapeRendering="crispEdges" width="30" height="32">
          <ellipse cx="20" cy="39" rx="13" ry="3" fill="#00000040" />
          <rect className="arm l" x="6" y="14" width="6" height="14" rx="2" fill={fit.ts} />
          <rect className="arm r" x="28" y="14" width="6" height="14" rx="2" fill={fit.ts} />
          <rect className="arm l" x="6" y="13" width="6" height="3" fill={skin} />
          <rect className="arm r" x="28" y="13" width="6" height="3" fill={skin} />
          <rect x="7" y="22" width="26" height="16" rx="4" fill={fit.top} />
          <rect x="7" y="22" width="26" height="3" fill={fit.th} />
          <rect x="28" y="22" width="5" height="16" fill={fit.ts} />
          <rect x="16" y="19" width="8" height="3" fill={skinS} />
          <rect x="11" y="4" width="18" height="16" rx="6" fill={hair} />
          <rect x="12" y="4" width="16" height="3" fill={hairH} />
          <rect x="11" y="15" width="18" height="3" fill={hairS} />
          <rect x="14" y="6" width="2" height="9" fill={hairH} opacity="0.6" />
          <rect x="20" y="6" width="2" height="9" fill={hairH} opacity="0.45" />
          {hairStyle === 3 && <rect x="27" y="14" width="5" height="12" rx="2" fill={hair} />}
          {hairStyle === 4 && <rect x="15" y="1" width="10" height="6" rx="3" fill={hair} />}
          {(hairStyle === 2 || hairStyle === 5) && <rect x="9" y="16" width="22" height="4" rx="2" fill={hair} />}
          {headset && <rect x="9" y="9" width="3" height="6" fill="#23262d" />}
        </svg>
      </div>
    );

  return (
    <div className={`char act-${activity}${walking ? ' walking' : ''}`}>
      <svg viewBox="0 0 64 96" shapeRendering="crispEdges" width="44" height="66">
        <ellipse cx="32" cy="92" rx="18" ry="4" fill="#00000045" />

        {/* legs + shoes */}
        <g className="legs">
          <g className="leg l">
            <rect x="23" y="66" width="8" height="18" fill={fit.bot} />
            <rect x="23" y="66" width="2.5" height="18" fill={fit.bs} />
            <rect x="21" y="83" width="11" height="6" rx="1" fill={fit.shoe} />
            <rect x="21" y="83" width="11" height="1.6" fill={shade(fit.shoe, 1.7)} />
          </g>
          <g className="leg r">
            <rect x="33" y="66" width="8" height="18" fill={fit.bot} />
            <rect x="38" y="66" width="3" height="18" fill={fit.bs} />
            <rect x="32" y="83" width="11" height="6" rx="1" fill={fit.shoe} />
            <rect x="32" y="83" width="11" height="1.6" fill={shade(fit.shoe, 1.7)} />
          </g>
        </g>
        {/* hip */}
        <rect x="21" y="60" width="22" height="8" fill={fit.bot} />
        <rect x="21" y="60" width="22" height="2" fill={shade(fit.bot, 1.2)} />

        <Outfit style={fitStyle} fit={fit} skin={skin} skinS={skinS} />

        {/* neck */}
        <rect x="27" y="28" width="10" height="6" fill={skinS} />

        {/* head */}
        <rect x="20" y="11" width="24" height="20" rx="4" fill={skin} />
        <rect x="38" y="13" width="6" height="17" fill={skinS} />
        <rect x="20" y="12" width="6" height="6" fill={skinH} />
        <rect x="18" y="18" width="3" height="6" fill={skinS} />
        <rect x="43" y="18" width="3" height="6" fill={skinS} />
        <Face seed={seed} eyeV={eyeV} skin={skin} skinS={skinS} glasses={glasses} beard={beard} />

        <Hair style={hairStyle} base={hair} sh={hairS} hi={hairH} />

        {headset && (
          <g>
            <path d="M20 14 Q32 2 44 14" fill="none" stroke="#23262d" strokeWidth="2" />
            <rect x="17" y="14" width="4" height="6" fill="#23262d" />
            <rect x="43" y="14" width="4" height="6" fill="#23262d" />
            <rect x="19" y="22" width="3" height="5" fill="#23262d" />
            <rect x="20" y="26" width="6" height="2" fill="#2a313d" />
          </g>
        )}
      </svg>
    </div>
  );
}

function Face({ seed, eyeV, skin, skinS, glasses, beard }: { seed: number; eyeV: number; skin: string; skinS: string; glasses: boolean; beard: boolean }) {
  return (
    <g>
      {/* brows */}
      <rect x="25" y="18" width="5" height="1.4" fill={shade(skin, 0.6)} />
      <rect x="34" y="18" width="5" height="1.4" fill={shade(skin, 0.6)} />
      {/* eyes (variants) */}
      {eyeV === 0 && (
        <>
          <rect x="26" y="20" width="3" height="4" fill="#23262d" />
          <rect x="35" y="20" width="3" height="4" fill="#23262d" />
          <rect x="27" y="20" width="1" height="1" fill="#cdd1da" />
          <rect x="36" y="20" width="1" height="1" fill="#cdd1da" />
        </>
      )}
      {eyeV === 1 && (
        <>
          <rect x="26" y="21" width="4" height="2.4" fill="#23262d" />
          <rect x="34" y="21" width="4" height="2.4" fill="#23262d" />
        </>
      )}
      {eyeV === 2 && (
        <>
          <rect x="26" y="20" width="3" height="3" fill="#3a3026" />
          <rect x="35" y="20" width="3" height="3" fill="#3a3026" />
          <rect x="26" y="23" width="3" height="1" fill={skinS} />
          <rect x="35" y="23" width="3" height="1" fill={skinS} />
        </>
      )}
      {/* nose + cheeks + mouth */}
      <rect x="31" y="23" width="2" height="3" fill={skinS} />
      <rect x="24" y="24" width="2" height="2" fill={shade(skin, 0.93)} opacity="0.6" />
      <rect x="38" y="24" width="2" height="2" fill={shade(skin, 0.93)} opacity="0.6" />
      <rect x="28" y="27" width="8" height="1.4" fill={shade(skin, 0.7)} />
      {beard && (
        <>
          <rect x="23" y="26" width="18" height="5" fill="#3a2e22" opacity="0.85" />
          <rect x="28" y="27" width="8" height="2" fill={shade(skin, 0.7)} />
        </>
      )}
      {glasses && (
        <g>
          <rect x="24" y="19.5" width="6" height="5" fill="none" stroke="#23262d" strokeWidth="1" />
          <rect x="34" y="19.5" width="6" height="5" fill="none" stroke="#23262d" strokeWidth="1" />
          <rect x="30" y="21" width="4" height="1" fill="#23262d" />
        </g>
      )}
    </g>
  );
}

function Outfit({ style, fit, skin, skinS }: { style: number; fit: Fit; skin: string; skinS: string }) {
  const { top, ts, th, acc } = fit;
  const arms = (
    <>
      <rect className="arm l" x="13" y="35" width="6" height="17" rx="2.5" fill={top} />
      <rect className="arm l" x="13" y="35" width="2.5" height="17" fill={ts} />
      <rect className="arm r" x="45" y="35" width="6" height="17" rx="2.5" fill={ts} />
      <rect className="arm l" x="13" y="49" width="6" height="4" fill={skin} />
      <rect className="arm r" x="45" y="49" width="6" height="4" fill={skinS} />
    </>
  );
  const torso = (collar?: ReactNode, extra?: ReactNode) => (
    <g>
      {arms}
      <rect x="19" y="33" width="26" height="27" rx="2" fill={top} />
      <rect x="19" y="33" width="26" height="3" fill={th} />
      <rect x="40" y="33" width="5" height="27" fill={ts} />
      {extra}
      {collar}
    </g>
  );
  switch (style) {
    case 0: // hoodie + drawstrings + pocket
      return torso(
        <>
          <rect x="24" y="31" width="16" height="5" rx="2.5" fill={ts} />
          <rect x="30" y="34" width="1.6" height="6" fill={acc} />
          <rect x="33" y="34" width="1.6" height="6" fill={acc} />
        </>,
        <rect x="23" y="48" width="18" height="7" rx="1" fill={ts} />,
      );
    case 1: // shirt + tie
      return torso(
        <>
          <rect x="26" y="32" width="4" height="5" fill={th} transform="rotate(18 27 34)" />
          <rect x="34" y="32" width="4" height="5" fill={th} transform="rotate(-18 36 34)" />
          <rect x="31" y="34" width="2.5" height="18" fill={acc} />
          <rect x="31" y="50" width="3.5" height="3" fill={acc} />
        </>,
      );
    case 2: // jacket open over tee
      return torso(
        <>
          <rect x="28" y="33" width="8" height="26" fill={shade(top, 0.55)} />
          <rect x="22" y="33" width="6" height="24" fill={th} transform="rotate(7 24 44)" />
          <rect x="36" y="33" width="6" height="24" fill={ts} transform="rotate(-7 39 44)" />
        </>,
      );
    case 3: // sweater (ribbed hem/cuffs)
      return torso(
        <rect x="25" y="31" width="14" height="4" rx="3" fill={ts} />,
        <>
          {[36, 41, 46, 51, 56].map((y) => (
            <rect key={y} x="19" y={y} width="26" height="1" fill={ts} opacity="0.5" />
          ))}
          <rect x="19" y="56" width="26" height="4" fill={ts} />
        </>,
      );
    case 4: // vest over shirt
      return torso(
        <rect x="27" y="32" width="10" height="3" fill="#e8eaef" />,
        <>
          <rect x="19" y="33" width="6" height="27" fill={ts} />
          <rect x="39" y="33" width="6" height="27" fill={shade(top, 0.7)} />
          <rect x="29" y="34" width="6" height="24" fill="#dfe2e8" />
          <rect x="31" y="36" width="2" height="20" fill={acc} />
        </>,
      );
    case 5: // cardigan (buttons)
      return torso(
        <rect x="25" y="32" width="14" height="3" rx="2" fill={ts} />,
        <>
          <rect x="30" y="33" width="4" height="27" fill={shade(top, 1.1)} />
          {[37, 43, 49, 55].map((y) => (
            <rect key={y} x="31.4" y={y} width="1.4" height="1.4" fill={acc} />
          ))}
        </>,
      );
    case 6: // dress
      return (
        <g>
          {arms}
          <rect x="20" y="33" width="24" height="14" rx="2" fill={top} />
          <rect x="20" y="33" width="24" height="3" fill={th} />
          <path d="M19 47 L45 47 L49 60 L15 60 Z" fill={top} />
          <path d="M32 47 L32 60" stroke={ts} strokeWidth="1.2" />
          <path d="M24 47 L22 60 M40 47 L42 60" stroke={ts} strokeWidth="0.8" />
        </g>
      );
    case 7: // layered shirt (under-tee collar)
      return torso(
        <rect x="27" y="31" width="10" height="4" rx="2" fill="#e0e3e9" />,
        <rect x="29" y="33" width="6" height="14" fill="#e0e3e9" opacity="0.8" />,
      );
    case 8: // lab / ops jacket (long, collar, badge)
      return torso(
        <rect x="25" y="31" width="14" height="4" rx="1" fill={th} />,
        <>
          <rect x="29" y="33" width="6" height="27" fill={shade(top, 1.12)} />
          <rect x="22" y="40" width="5" height="6" fill={th} />
          <rect x="37" y="40" width="5" height="6" fill={ts} />
          <rect x="36" y="36" width="4" height="2" fill={acc} />
        </>,
      );
    default: // oversized sweatshirt
      return torso(
        <rect x="24" y="31" width="16" height="4" rx="3" fill={ts} />,
        <>
          <rect x="19" y="55" width="26" height="5" fill={ts} />
          <rect x="26" y="40" width="12" height="8" fill={shade(top, 1.08)} opacity="0.6" />
        </>,
      );
  }
}

function Hair({ style, base, sh, hi }: { style: number; base: string; sh: string; hi: string }) {
  const strand = (xs: number[], y: number) => xs.map((x) => <rect key={x} x={x} y={y} width="1.4" height="3" fill={hi} />);
  switch (style) {
    case 0: // short crop
      return (
        <g>
          <rect x="19" y="7" width="26" height="9" rx="3" fill={base} />
          <rect x="19" y="11" width="3" height="8" fill={base} />
          <rect x="42" y="11" width="3" height="8" fill={base} />
          <rect x="20" y="7" width="24" height="2" fill={hi} />
          <rect x="19" y="14" width="26" height="2" fill={sh} />
          {strand([23, 28, 33, 38], 8)}
        </g>
      );
    case 1: // bob
      return (
        <g>
          <rect x="17" y="7" width="30" height="9" rx="4" fill={base} />
          <rect x="17" y="12" width="4" height="14" fill={base} />
          <rect x="43" y="12" width="4" height="14" fill={base} />
          <rect x="18" y="7" width="28" height="2" fill={hi} />
          <rect x="17" y="23" width="4" height="3" fill={sh} />
          <rect x="43" y="23" width="4" height="3" fill={sh} />
        </g>
      );
    case 2: // long
      return (
        <g>
          <rect x="17" y="6" width="30" height="10" rx="4" fill={base} />
          <rect x="16" y="12" width="5" height="30" fill={base} />
          <rect x="43" y="12" width="5" height="30" fill={base} />
          <rect x="18" y="6" width="10" height="2" fill={hi} />
          <rect x="16" y="36" width="5" height="6" fill={sh} />
          <rect x="43" y="36" width="5" height="6" fill={sh} />
        </g>
      );
    case 3: // tied ponytail
      return (
        <g>
          <rect x="19" y="7" width="26" height="8" rx="3" fill={base} />
          <rect x="19" y="11" width="3" height="6" fill={base} />
          <rect x="43" y="11" width="4" height="20" fill={base} />
          <rect x="44" y="26" width="5" height="10" rx="2" fill={base} />
          <rect x="20" y="7" width="22" height="2" fill={hi} />
        </g>
      );
    case 4: // bun
      return (
        <g>
          <rect x="19" y="8" width="26" height="7" rx="3" fill={base} />
          <rect x="19" y="11" width="3" height="5" fill={base} />
          <rect x="42" y="11" width="3" height="5" fill={base} />
          <rect x="27" y="2" width="10" height="7" rx="3.5" fill={base} />
          <rect x="28" y="2" width="8" height="2" fill={hi} />
          <rect x="20" y="13" width="24" height="2" fill={sh} />
        </g>
      );
    case 5: // wavy
      return (
        <g>
          <rect x="17" y="6" width="30" height="10" rx="5" fill={base} />
          <rect x="17" y="12" width="4" height="13" fill={base} />
          <rect x="43" y="12" width="4" height="13" fill={base} />
          <rect x="20" y="6" width="8" height="2" fill={hi} />
          <rect x="33" y="7" width="9" height="2" fill={hi} />
          <rect x="18" y="22" width="4" height="3" fill={sh} />
          <rect x="42" y="22" width="4" height="3" fill={sh} />
        </g>
      );
    case 6: // curly
      return (
        <g>
          {[20, 26, 32, 38, 44].map((x) => (
            <circle key={x} cx={x} cy="8" r="5" fill={base} />
          ))}
          {[22, 30, 38].map((x) => (
            <circle key={x} cx={x} cy="6" r="3.5" fill={hi} />
          ))}
          <rect x="17" y="11" width="4" height="12" fill={base} />
          <rect x="43" y="11" width="4" height="12" fill={base} />
          <rect x="18" y="20" width="4" height="3" fill={sh} />
        </g>
      );
    case 7: // side part
      return (
        <g>
          <rect x="19" y="7" width="26" height="9" rx="3" fill={base} />
          <rect x="19" y="11" width="3" height="8" fill={base} />
          <rect x="43" y="11" width="4" height="9" fill={base} />
          <rect x="20" y="7" width="15" height="3" fill={hi} />
          <rect x="19" y="14" width="26" height="2" fill={sh} />
        </g>
      );
    case 8: // bangs / fringe
      return (
        <g>
          <rect x="18" y="6" width="28" height="11" rx="4" fill={base} />
          <rect x="18" y="12" width="3" height="10" fill={base} />
          <rect x="43" y="12" width="3" height="10" fill={base} />
          {strand([21, 25, 29, 33, 37, 41], 13)}
          <rect x="19" y="6" width="26" height="2" fill={hi} />
        </g>
      );
    default: // undercut
      return (
        <g>
          <rect x="20" y="6" width="24" height="8" rx="2" fill={base} />
          <rect x="20" y="13" width="2" height="6" fill={sh} />
          <rect x="42" y="13" width="2" height="6" fill={sh} />
          <rect x="22" y="6" width="20" height="3" fill={hi} />
          <rect x="20" y="12" width="24" height="2" fill={sh} />
        </g>
      );
  }
}

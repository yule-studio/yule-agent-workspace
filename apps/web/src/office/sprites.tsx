/**
 * High-density pixel-art office sprites. Every object carries 2–4 shade levels
 * (base / shadow / highlight), small detail props, and seed-driven variation so
 * repeated desks/plants/chairs differ. Authored at a generous viewBox so the
 * crisp pixels read as a detailed sprite, not a flat shape. Palette: graphite /
 * slate / off-white with lavender-periwinkle-sage-coral accents (no cyan).
 */
import type { ReactNode } from 'react';

export type PropKind =
  | 'cubicle'
  | 'chair'
  | 'plant'
  | 'printer'
  | 'file-cabinet'
  | 'bookshelf'
  | 'document-stack'
  | 'cardboard-box'
  | 'water-cooler'
  | 'server-rack'
  | 'whiteboard'
  | 'wall-board'
  | 'sofa'
  | 'coffee-bar'
  | 'round-table'
  | 'long-table'
  | 'rug'
  | 'small-rug'
  | 'trash'
  | 'postits'
  | 'shelf'
  | 'window';

const svg = { shapeRendering: 'crispEdges' as const, style: { width: '100%', height: '100%', display: 'block' as const } };

// shared material shades (base / highlight / shadow / edge)
const M = {
  partB: '#49515f', partH: '#5c6573', partS: '#373e49', partE: '#2b313b',
  deskB: '#7a818c', deskH: '#8d94a0', deskS: '#5f656f', deskE: '#4b505a', grain: '#727983',
  bezel: '#1b202a', bezelH: '#2a3140', stand: '#10141c',
  key: '#c6cbd4', keyG: '#9aa0ac', keyB: '#aab0bb',
  paper: '#e7e9ef', paperL: '#aab0bb', paperS: '#c6cad2',
  metalB: '#586273', metalH: '#6c7686', metalS: '#3c434e', metalE: '#2c323b',
  panelB: '#3a4250', panelH: '#4c5466', panelS: '#2c323b',
};

// screen content palettes
const SCREENS = [
  { bg: '#1e2336', a: '#8c93d8', b: '#a99cff', c: '#b58ac4' }, // code
  { bg: '#1c2630', a: '#9fbd9f', b: '#7fae8a', c: '#cdd1da' }, // terminal
  { bg: '#241f33', a: '#d98aa5', b: '#e0a3b8', c: '#8c93d8' }, // design
  { bg: '#1d2236', a: '#8c93d8', b: '#9fbd9f', c: '#e47b89' }, // dashboard
  { bg: '#222a38', a: '#a99cff', b: '#cdd1da', c: '#8c93d8' }, // docs
];
type Pal = (typeof SCREENS)[number];

function Screen({ x, y, w, h, kind, pal }: { x: number; y: number; w: number; h: number; kind: number; pal: Pal }) {
  const r: ReactNode[] = [<rect key="bg" x={x} y={y} width={w} height={h} fill={pal.bg} />];
  if (kind === 0 || kind === 4) {
    for (let i = 0; i < 4; i++)
      r.push(<rect key={i} x={x + 2} y={y + 2 + i * 3} width={[w - 6, w - 10, w - 4, w - 12][i]} height={1.4} fill={[pal.a, pal.b, pal.c, pal.a][i]} />);
  } else if (kind === 1) {
    r.push(<rect key="p" x={x + 2} y={y + 2} width={3} height={1.4} fill={pal.a} />);
    for (let i = 1; i < 4; i++) r.push(<rect key={i} x={x + 2} y={y + 2 + i * 3} width={[w - 8, w - 5, w - 11][i - 1]} height={1.4} fill={pal.a} opacity={0.8} />);
  } else if (kind === 2) {
    r.push(<rect key="c" x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="none" stroke={pal.c} strokeWidth="0.8" />);
    r.push(<rect key="s" x={x + w / 2 - 3} y={y + h / 2 - 3} width={6} height={6} fill={pal.b} />);
  } else {
    for (let i = 0; i < 6; i++)
      r.push(<rect key={i} x={x + 2 + (i % 3) * ((w - 4) / 3)} y={y + 2 + Math.floor(i / 3) * ((h - 4) / 2)} width={(w - 6) / 3} height={(h - 6) / 2} fill={[pal.a, pal.b, pal.c][i % 3]} opacity="0.7" />);
  }
  return <g>{r}</g>;
}

function Monitor({ x, y, scr, pal }: { x: number; y: number; scr: number; pal: Pal }) {
  return (
    <g>
      <rect x={x + 8} y={y + 14} width="4" height="3" fill={M.stand} />
      <rect x={x + 5} y={y + 16} width="10" height="2" fill={M.bezel} />
      <rect x={x} y={y} width="20" height="15" fill={M.bezel} />
      <rect x={x} y={y} width="20" height="2" fill={M.bezelH} />
      <Screen x={x + 2} y={y + 2} w={16} h={11} kind={scr} pal={pal} />
    </g>
  );
}

/** Detailed workstation: shaded partition + pinboard, desk with edge light/
 *  shadow + grain, 1–2 monitors w/ varied screens, keyboard, mouse, papers,
 *  mug, cables, + seed extras. */
function Cubicle({ seed = 0 }: { seed?: number }) {
  const dual = seed % 3 !== 0;
  const scrA = SCREENS[seed % SCREENS.length]!;
  const scrB = SCREENS[(seed + 2) % SCREENS.length]!;
  const mug = ['#9fbd9f', '#d98aa5', '#8c93d8', '#e47b89'][seed % 4]!;
  const postit = ['#e47b89', '#a99cff', '#9fbd9f', '#cdd1da'];
  const hasPlant = seed % 4 === 1;
  const hasPhone = seed % 3 === 2;
  return (
    <svg viewBox="0 0 100 74" {...svg}>
      {/* partition + pinboard */}
      <rect x="0" y="0" width="100" height="15" fill={M.partB} />
      <rect x="0" y="0" width="100" height="2" fill={M.partH} />
      <rect x="0" y="13" width="100" height="2" fill={M.partS} />
      <rect x="0" y="0" width="2" height="15" fill={M.partE} />
      <rect x="98" y="0" width="2" height="15" fill={M.partE} />
      <rect x="6" y="3" width="20" height="9" fill={M.panelB} />
      <rect x="6" y="3" width="20" height="1" fill={M.partH} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={8 + i * 6} y={5} width="4" height="4" fill={postit[(seed + i) % postit.length]} />
      ))}
      {/* desk */}
      <rect x="4" y="30" width="92" height="34" fill={M.deskB} />
      <rect x="4" y="30" width="92" height="2" fill={M.deskH} />
      <rect x="4" y="60" width="92" height="4" fill={M.deskS} />
      <rect x="4" y="64" width="92" height="2" fill={M.deskE} />
      {[20, 44, 68].map((gx) => (
        <rect key={gx} x={gx} y="33" width="1" height="26" fill={M.grain} opacity="0.4" />
      ))}
      {/* monitors */}
      <Monitor x={dual ? 26 : 40} y={14} scr={seed % 5} pal={scrA} />
      {dual && <Monitor x={54} y={14} scr={(seed + 2) % 5} pal={scrB} />}
      <rect x="44" y="29" width="1" height="3" fill={M.stand} opacity="0.6" />
      <rect x="60" y="29" width="1" height="3" fill={M.stand} opacity="0.6" />
      {/* keyboard + mouse */}
      <rect x="34" y="46" width="30" height="9" fill={M.keyB} />
      <rect x="34" y="46" width="30" height="2" fill={M.key} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) => (
          <rect key={`${r}-${c}`} x={36 + c * 3.8} y={48.5 + r * 2} width="2.6" height="1.4" fill={M.key} />
        )),
      )}
      <rect x="68" y="49" width="5" height="7" rx="2" fill={M.key} />
      {/* papers */}
      <rect x="8" y="40" width="14" height="18" fill={M.paperS} />
      <rect x="7" y="38" width="14" height="18" fill={M.paper} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={9} y={41 + i * 3.5} width={[10, 8, 11, 7][i]} height="1.4" fill={M.paperL} />
      ))}
      {/* mug */}
      <rect x="80" y="42" width="8" height="9" rx="1" fill={mug} />
      <rect x="80" y="42" width="8" height="2" fill="#ffffff44" />
      <rect x="88" y="44" width="2" height="4" fill={mug} />
      {hasPlant && (
        <g>
          <rect x="84" y="31" width="9" height="6" fill={M.panelB} />
          <circle cx="88" cy="30" r="5" fill="#6fa07a" />
          <circle cx="85" cy="29" r="3" fill="#8fb58f" />
        </g>
      )}
      {hasPhone && <rect x="24" y="50" width="6" height="9" rx="1.5" fill="#2a313d" />}
    </svg>
  );
}

function Chair({ seed = 0 }: { seed?: number }) {
  const fabric = ['#3f4757', '#454d5d', '#3a4250'][seed % 3]!;
  const fabricH = ['#525c6e', '#586278', '#4c5466'][seed % 3]!;
  return (
    <svg viewBox="0 0 30 32" {...svg}>
      <ellipse cx="15" cy="27" rx="11" ry="3" fill="#00000038" />
      <rect x="7" y="2" width="16" height="9" rx="3" fill={fabric} />
      <rect x="7" y="2" width="16" height="2" rx="2" fill={fabricH} />
      <rect x="4" y="11" width="3" height="8" rx="1.5" fill={M.metalS} />
      <rect x="23" y="11" width="3" height="8" rx="1.5" fill={M.metalS} />
      <rect x="7" y="10" width="16" height="12" rx="3" fill={fabric} />
      <rect x="9" y="12" width="12" height="8" rx="2" fill={fabricH} />
      <rect x="14" y="22" width="2" height="3" fill={M.metalE} />
      {[-9, -4, 0, 5, 9].map((dx, i) => (
        <rect key={i} x={15 + dx} y={25} width="3" height="2" fill={M.metalB} />
      ))}
    </svg>
  );
}

function Plant({ seed = 0 }: { seed?: number }) {
  const v = seed % 5;
  const pot = ['#3a4250', '#4a4036', '#43485a', '#3c434d', '#4a3f48'][v]!;
  const potH = ['#4c5466', '#5b4f42', '#545a6c', '#4c5460', '#5a4d56'][v]!;
  const g = ['#6fa07a', '#8fb58f', '#558464', '#7aa886', '#6b9778'][v]!;
  const g2 = ['#8fb58f', '#6fa07a', '#7aa886', '#a8c9a8', '#86b090'][v]!;
  return (
    <svg viewBox="0 0 24 28" {...svg}>
      <ellipse cx="12" cy="25" rx="8" ry="2.2" fill="#00000033" />
      <rect x="6" y="18" width="12" height="8" fill={pot} />
      <rect x="6" y="18" width="12" height="2" fill={potH} />
      <rect x="6" y="24" width="12" height="2" fill="#00000033" />
      {v === 0 && (
        <>
          <rect x="11" y="3" width="2" height="15" fill="#4f7a52" />
          <path d="M12 2 L6 9 L12 8 Z" fill={g} />
          <path d="M12 4 L18 10 L12 9 Z" fill={g2} />
          <path d="M12 9 L5 13 L12 12 Z" fill="#558464" />
          <path d="M12 10 L19 14 L12 13 Z" fill={g} />
        </>
      )}
      {v === 1 && (
        <>
          <circle cx="12" cy="11" r="8" fill={g} />
          <circle cx="8" cy="10" r="4" fill={g2} />
          <circle cx="16" cy="12" r="4" fill="#558464" />
          <circle cx="12" cy="7" r="3.5" fill={g2} />
        </>
      )}
      {v === 2 && (
        <>
          <path d="M12 18 L4 6 L9 9 L12 3 L15 9 L20 6 Z" fill={g} />
          <path d="M12 18 L9 9 L12 7 L15 9 Z" fill={g2} />
        </>
      )}
      {v === 3 && (
        <>
          <rect x="8" y="6" width="3" height="12" fill="#4f7a52" />
          <rect x="13" y="4" width="3" height="14" fill="#4f7a52" />
          <circle cx="9" cy="5" r="4" fill={g} />
          <circle cx="15" cy="3" r="4" fill={g2} />
          <circle cx="12" cy="8" r="3" fill={g} />
        </>
      )}
      {v === 4 && (
        <>
          <circle cx="9" cy="9" r="5" fill={g} />
          <circle cx="15" cy="9" r="5" fill={g2} />
          <circle cx="12" cy="6" r="4" fill="#558464" />
          <circle cx="12" cy="11" r="4" fill={g} />
        </>
      )}
    </svg>
  );
}

function FileCabinet() {
  return (
    <svg viewBox="0 0 24 34" {...svg}>
      <rect x="2" y="2" width="20" height="30" fill={M.metalB} />
      <rect x="2" y="2" width="20" height="2" fill={M.metalH} />
      <rect x="2" y="2" width="2" height="30" fill={M.metalE} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="4" y={5 + i * 9} width="16" height="8" fill={M.metalS} />
          <rect x="4" y={5 + i * 9} width="16" height="1" fill={M.metalH} />
          <rect x="10" y={8 + i * 9} width="4" height="2" fill={M.metalE} />
        </g>
      ))}
    </svg>
  );
}

function Bookshelf() {
  const spines = ['#8c93d8', '#a99cff', '#9fbd9f', '#e47b89', '#b58ac4', '#cdd1da', '#7fae8a'];
  return (
    <svg viewBox="0 0 14 64" {...svg}>
      <rect x="0" y="0" width="14" height="64" fill="#3c434d" />
      <rect x="1" y="1" width="12" height="62" fill="#2c323b" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r} transform={`translate(2 ${4 + r * 15})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={i * 2} y={(i + r) % 2 ? 0 : 1} width="1.7" height={11} fill={spines[(i + r) % spines.length]} />
          ))}
          <rect x="0" y="13" width="10" height="1.5" fill="#4c5466" />
        </g>
      ))}
    </svg>
  );
}

function DocumentStack() {
  return (
    <svg viewBox="0 0 22 16" {...svg}>
      <rect x="1" y="9" width="20" height="6" fill="#c6cad2" />
      <rect x="2" y="6" width="18" height="6" fill="#e7e9ef" />
      <rect x="3" y="3" width="16" height="6" fill="#f0f2f5" />
      <rect x="5" y="5" width="10" height="1.2" fill="#aab0bb" />
      <rect x="5" y="7" width="8" height="1.2" fill="#aab0bb" />
    </svg>
  );
}

function CardboardBox() {
  return (
    <svg viewBox="0 0 22 20" {...svg}>
      <rect x="2" y="4" width="18" height="15" fill="#8f8676" />
      <rect x="2" y="4" width="18" height="2" fill="#a89e8a" />
      <rect x="9" y="3" width="4" height="3" fill="#c9bfa6" />
      <rect x="2" y="11" width="18" height="1.5" fill="#6f6657" />
    </svg>
  );
}

function Printer() {
  return (
    <svg viewBox="0 0 28 26" {...svg}>
      <rect x="3" y="8" width="22" height="14" fill={M.metalB} />
      <rect x="3" y="8" width="22" height="2" fill={M.metalH} />
      <rect x="3" y="20" width="22" height="2" fill={M.metalE} />
      <rect x="6" y="3" width="16" height="6" fill={M.metalS} />
      <rect x="8" y="18" width="12" height="5" fill={M.paper} />
      <rect x="6" y="11" width="5" height="2" fill="#8c93d8" />
      <rect x="20" y="11" width="2" height="2" fill="#9fbd9f" />
    </svg>
  );
}

function WaterCooler() {
  return (
    <svg viewBox="0 0 16 30" {...svg}>
      <rect x="2" y="10" width="12" height="18" fill="#cbd1da" />
      <rect x="2" y="10" width="12" height="2" fill="#e2e5eb" />
      <rect x="2" y="10" width="2" height="18" fill="#a5acb7" />
      <rect x="4" y="0" width="8" height="11" rx="2" fill="#aeb4e0" />
      <rect x="5" y="2" width="6" height="7" rx="2" fill="#cdd1ef" />
      <rect x="6" y="20" width="4" height="2" fill="#8c93d8" />
    </svg>
  );
}

function ServerRack() {
  return (
    <svg viewBox="0 0 48 40" {...svg}>
      <rect x="0" y="0" width="48" height="40" rx="1" fill="#0c1118" />
      <rect x="1" y="1" width="46" height="38" fill="#181d27" />
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r} transform={`translate(3 ${3 + r * 7})`}>
          <rect x="0" y="0" width="42" height="5" fill="#10151e" />
          <rect x="0" y="0" width="42" height="1" fill="#283040" />
          <rect x="34" y="1" width="2" height="2" fill={['#9fbd9f', '#8c93d8', '#e47b89', '#9fbd9f', '#8c93d8'][r]} />
          <rect x="37" y="1" width="2" height="2" fill="#9fbd9f" />
          <rect x="3" y="1.5" width="14" height="2" fill="#22293a" />
        </g>
      ))}
    </svg>
  );
}

function Whiteboard() {
  return (
    <svg viewBox="0 0 64 22" {...svg}>
      <rect x="0" y="0" width="64" height="20" fill="#aab0bb" />
      <rect x="2" y="2" width="60" height="15" fill="#eef0f4" />
      <rect x="2" y="2" width="60" height="2" fill="#fafbfc" />
      <rect x="5" y="5" width="26" height="2" fill="#8c93d8" />
      <rect x="5" y="9" width="38" height="2" fill="#b58ac4" />
      <rect x="5" y="13" width="18" height="2" fill="#9fbd9f" />
      <rect x="46" y="5" width="14" height="9" fill="none" stroke="#9aa0ac" strokeWidth="1" />
      <rect x="2" y="17" width="60" height="2" fill="#9aa0ac" />
    </svg>
  );
}

function WallBoard() {
  return (
    <svg viewBox="0 0 48 28" {...svg}>
      <rect x="0" y="0" width="48" height="26" fill="#3a4250" />
      <rect x="1" y="1" width="46" height="24" fill="#2c323b" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={4 + (i % 3) * 14} y={4 + Math.floor(i / 3) * 11} width="11" height="8" fill={['#e47b89', '#a99cff', '#9fbd9f', '#8c93d8', '#cdd1da', '#b58ac4'][i]} opacity="0.85" />
      ))}
    </svg>
  );
}

function Sofa() {
  return (
    <svg viewBox="0 0 64 24" {...svg}>
      <rect x="0" y="0" width="64" height="24" rx="4" fill="#3a4250" />
      <rect x="0" y="0" width="64" height="5" rx="3" fill="#4c5466" />
      {[3, 23, 43].map((x) => (
        <g key={x}>
          <rect x={x} y="8" width="18" height="13" rx="3" fill="#586278" />
          <rect x={x} y="8" width="18" height="3" rx="2" fill="#66718a" />
        </g>
      ))}
    </svg>
  );
}

function CoffeeBar() {
  return (
    <svg viewBox="0 0 60 24" {...svg}>
      <rect x="0" y="8" width="60" height="16" fill="#3c434d" />
      <rect x="0" y="6" width="60" height="3" fill="#586273" />
      <rect x="0" y="6" width="60" height="1" fill="#6c7686" />
      <rect x="6" y="-2" width="12" height="10" fill="#2c323b" />
      <rect x="8" y="0" width="8" height="3" fill="#8c93d8" />
      <rect x="10" y="4" width="4" height="3" fill="#9fbd9f" />
      <rect x="30" y="0" width="5" height="6" fill="#9fbd9f" />
      <rect x="40" y="0" width="5" height="6" fill="#d98aa5" />
      <rect x="48" y="0" width="5" height="6" fill="#a99cff" />
    </svg>
  );
}

function RoundTable() {
  return (
    <svg viewBox="0 0 80 70" {...svg}>
      <ellipse cx="40" cy="40" rx="34" ry="28" fill="#00000033" />
      <ellipse cx="40" cy="36" rx="34" ry="28" fill="#3a4250" />
      <ellipse cx="40" cy="35" rx="31" ry="25" fill="#586273" />
      <ellipse cx="40" cy="33" rx="31" ry="22" fill="#5f6a7c" />
      <ellipse cx="40" cy="34" rx="13" ry="9" fill="#4c5466" />
      <rect x="30" y="20" width="10" height="6" fill={M.bezel} />
      <rect x="31" y="21" width="8" height="4" fill="#8c93d8" />
      <rect x="48" y="40" width="9" height="5" fill={M.bezel} />
      <rect x="49" y="41" width="7" height="3" fill="#9fbd9f" />
      <rect x="24" y="44" width="4" height="4" fill="#d98aa5" />
      <rect x="56" y="24" width="4" height="4" fill="#cdd1da" />
    </svg>
  );
}

function LongTable() {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" {...svg}>
      <rect x="2" y="8" width="116" height="30" rx="6" fill="#00000033" />
      <rect x="2" y="4" width="116" height="30" rx="6" fill="#3a4250" />
      <rect x="5" y="6" width="110" height="24" rx="4" fill="#5f6a7c" />
      <rect x="5" y="6" width="110" height="3" rx="2" fill="#6c7686" />
      <rect x="36" y="12" width="14" height="10" fill={M.bezel} />
      <rect x="37" y="13" width="12" height="8" fill="#8c93d8" />
      <rect x="70" y="13" width="10" height="8" fill={M.bezel} />
      <rect x="71" y="14" width="8" height="6" fill="#9fbd9f" />
      <rect x="92" y="14" width="4" height="5" fill="#d98aa5" />
    </svg>
  );
}

function Rug({ tone, small }: { tone?: string; small?: boolean }) {
  const c = tone === 'violet' ? ['#332c4a', '#4c4270', '#a99cff'] : tone === 'rose' ? ['#3a2c34', '#5a4350', '#d98aa5'] : ['#2b3142', '#3c455c', '#8c93d8'];
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" {...svg}>
      <rect x="0" y="0" width="100" height="60" rx={small ? 8 : 5} fill={c[0]} />
      <rect x="5" y="5" width="90" height="50" rx="4" fill="none" stroke={c[1]} strokeWidth="3" />
      {!small && <rect x="14" y="14" width="72" height="32" rx="3" fill="none" stroke={c[2]} strokeWidth="2" />}
      {small && <rect x="40" y="24" width="20" height="12" rx="2" fill={c[1]} />}
    </svg>
  );
}

function Trash() {
  return (
    <svg viewBox="0 0 14 18" {...svg}>
      <rect x="2" y="4" width="10" height="13" rx="1" fill={M.metalB} />
      <rect x="2" y="4" width="10" height="2" fill={M.metalH} />
      <rect x="1" y="2" width="12" height="2" fill={M.metalS} />
      <rect x="4" y="6" width="1.5" height="9" fill={M.metalE} />
      <rect x="8" y="6" width="1.5" height="9" fill={M.metalE} />
      <rect x="5" y="3" width="4" height="2" fill="#e7e9ef" opacity="0.6" />
    </svg>
  );
}

function PostIts() {
  return (
    <svg viewBox="0 0 22 20" {...svg}>
      <rect x="1" y="2" width="9" height="9" fill="#e47b89" />
      <rect x="1" y="2" width="9" height="2" fill="#f0a3ab" />
      <rect x="11" y="1" width="9" height="9" fill="#a99cff" />
      <rect x="11" y="1" width="9" height="2" fill="#c4bbff" />
      <rect x="5" y="10" width="9" height="9" fill="#9fbd9f" />
      <rect x="5" y="10" width="9" height="2" fill="#b8d4b8" />
    </svg>
  );
}

function Shelf() {
  return (
    <svg viewBox="0 0 40 16" {...svg}>
      <rect x="0" y="12" width="40" height="3" fill="#3c434d" />
      <rect x="0" y="12" width="40" height="1" fill="#586273" />
      <rect x="3" y="3" width="5" height="9" fill="#8c93d8" />
      <rect x="9" y="5" width="4" height="7" fill="#9fbd9f" />
      <rect x="15" y="2" width="6" height="10" fill="#d98aa5" />
      <rect x="23" y="4" width="5" height="8" fill="#b58ac4" />
      <circle cx="33" cy="8" r="4" fill="#6fa07a" />
    </svg>
  );
}

function WindowSprite() {
  return (
    <svg viewBox="0 0 80 14" preserveAspectRatio="none" {...svg}>
      <rect x="0" y="0" width="80" height="14" fill="#3c434d" />
      <rect x="2" y="2" width="76" height="10" fill="#2a3140" />
      <rect x="2" y="2" width="76" height="3" fill="#39414f" />
      <rect x="39" y="2" width="2" height="10" fill="#3c434d" />
    </svg>
  );
}

const DEFAULT: Record<PropKind, { w: number; h: number }> = {
  cubicle: { w: 150, h: 111 },
  chair: { w: 32, h: 34 },
  plant: { w: 40, h: 46 },
  printer: { w: 46, h: 42 },
  'file-cabinet': { w: 40, h: 56 },
  bookshelf: { w: 26, h: 120 },
  'document-stack': { w: 34, h: 24 },
  'cardboard-box': { w: 36, h: 32 },
  'water-cooler': { w: 28, h: 54 },
  'server-rack': { w: 84, h: 70 },
  whiteboard: { w: 130, h: 44 },
  'wall-board': { w: 92, h: 54 },
  sofa: { w: 130, h: 48 },
  'coffee-bar': { w: 130, h: 52 },
  'round-table': { w: 150, h: 130 },
  'long-table': { w: 230, h: 76 },
  rug: { w: 200, h: 120 },
  'small-rug': { w: 110, h: 70 },
  trash: { w: 22, h: 28 },
  postits: { w: 30, h: 26 },
  shelf: { w: 64, h: 26 },
  window: { w: 150, h: 24 },
};

function render(kind: PropKind, seed: number, tone?: string) {
  switch (kind) {
    case 'cubicle': return <Cubicle seed={seed} />;
    case 'chair': return <Chair seed={seed} />;
    case 'plant': return <Plant seed={seed} />;
    case 'printer': return <Printer />;
    case 'file-cabinet': return <FileCabinet />;
    case 'bookshelf': return <Bookshelf />;
    case 'document-stack': return <DocumentStack />;
    case 'cardboard-box': return <CardboardBox />;
    case 'water-cooler': return <WaterCooler />;
    case 'server-rack': return <ServerRack />;
    case 'whiteboard': return <Whiteboard />;
    case 'wall-board': return <WallBoard />;
    case 'sofa': return <Sofa />;
    case 'coffee-bar': return <CoffeeBar />;
    case 'round-table': return <RoundTable />;
    case 'long-table': return <LongTable />;
    case 'rug': return <Rug tone={tone} />;
    case 'small-rug': return <Rug tone={tone} small />;
    case 'trash': return <Trash />;
    case 'postits': return <PostIts />;
    case 'shelf': return <Shelf />;
    case 'window': return <WindowSprite />;
    default: return null;
  }
}

export function Prop({
  kind,
  x,
  y,
  w,
  h,
  tone,
  seed = 0,
}: {
  kind: PropKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: string;
  seed?: number;
}) {
  const d = DEFAULT[kind];
  return (
    <div className="obj" style={{ left: x, top: y, width: w ?? d.w, height: h ?? d.h, zIndex: Math.round(y) }}>
      {render(kind, seed, tone)}
    </div>
  );
}

/**
 * Pixel-art office furniture as small inline SVGs. Self-contained: place one
 * with <Furniture kind x y [w h tone] />. Original art, warm flat palette.
 */
export type FurnitureKind =
  | 'plant'
  | 'plant-tall'
  | 'bookshelf'
  | 'whiteboard'
  | 'sofa'
  | 'sofa-v'
  | 'coffee-table'
  | 'cafe-counter'
  | 'stool'
  | 'round-table'
  | 'long-table'
  | 'standup-board'
  | 'rug'
  | 'water'
  | 'window';

const DEFAULT_SIZE: Record<FurnitureKind, { w: number; h: number }> = {
  plant: { w: 44, h: 52 },
  'plant-tall': { w: 48, h: 86 },
  bookshelf: { w: 26, h: 150 },
  whiteboard: { w: 150, h: 46 },
  sofa: { w: 196, h: 58 },
  'sofa-v': { w: 58, h: 92 },
  'coffee-table': { w: 92, h: 44 },
  'cafe-counter': { w: 236, h: 46 },
  stool: { w: 32, h: 32 },
  'round-table': { w: 150, h: 130 },
  'long-table': { w: 230, h: 70 },
  'standup-board': { w: 120, h: 40 },
  rug: { w: 200, h: 120 },
  water: { w: 28, h: 48 },
  window: { w: 150, h: 24 },
};

const svgFill = { shapeRendering: 'crispEdges' as const, style: { width: '100%', height: '100%', display: 'block' as const } };

function Plant({ tall }: { tall?: boolean }) {
  return (
    <svg viewBox="0 0 24 28" {...svgFill}>
      <ellipse cx="12" cy="25" rx="9" ry="2.4" fill="#00000033" />
      <rect x="7" y="18" width="10" height="8" fill="#b5651d" />
      <rect x="7" y="18" width="10" height="2" fill="#cf7a2c" />
      {tall ? (
        <>
          <rect x="11" y="4" width="2" height="14" fill="#5b7d3a" />
          <path d="M12 3 L7 9 L12 8 Z" fill="#4e9b53" />
          <path d="M12 5 L17 11 L12 9 Z" fill="#67b06a" />
          <path d="M12 9 L6 13 L12 12 Z" fill="#3c7d44" />
          <path d="M12 10 L18 14 L12 13 Z" fill="#56a85c" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="7" fill="#4e9b53" />
          <circle cx="8" cy="11" r="4" fill="#67b06a" />
          <circle cx="16" cy="13" r="4" fill="#3c7d44" />
          <circle cx="12" cy="8" r="3.4" fill="#76bd78" />
        </>
      )}
    </svg>
  );
}

function Bookshelf() {
  const books = ['#c0563f', '#3f7d8a', '#d9a23c', '#5b6f9e', '#7a9e54', '#b46a8e'];
  return (
    <svg viewBox="0 0 12 70" {...svgFill}>
      <rect x="0" y="0" width="12" height="70" fill="#8a5a34" />
      <rect x="1" y="1" width="10" height="68" fill="#6f4527" />
      {[0, 1, 2, 3].map((s) => (
        <g key={s} transform={`translate(1.5 ${3 + s * 17})`}>
          {books.map((b, i) => (
            <rect key={i} x={i * 1.5} y={(i + s) % 2 ? 1 : 2} width="1.3" height={13} fill={b} />
          ))}
          <rect x="0" y="15" width="9" height="1.5" fill="#5a371f" />
        </g>
      ))}
    </svg>
  );
}

function Whiteboard() {
  return (
    <svg viewBox="0 0 80 24" {...svgFill}>
      <rect x="0" y="0" width="80" height="22" fill="#cfc4ad" />
      <rect x="2" y="2" width="76" height="16" fill="#f4efe4" />
      <rect x="6" y="6" width="30" height="2" fill="#5b8ad1" />
      <rect x="6" y="10" width="44" height="2" fill="#cf6b4a" />
      <rect x="6" y="14" width="22" height="2" fill="#6aa86a" />
      <rect x="56" y="6" width="18" height="9" fill="none" stroke="#8a9bbf" strokeWidth="1.2" />
    </svg>
  );
}

function StandupBoard() {
  return (
    <svg viewBox="0 0 60 20" {...svgFill}>
      <rect x="0" y="0" width="60" height="20" rx="2" fill="#3a4a3f" />
      <rect x="2" y="2" width="56" height="16" fill="#dfe8df" />
      <rect x="5" y="5" width="14" height="10" fill="#f0c24b" />
      <rect x="22" y="5" width="14" height="10" fill="#7ab0e0" />
      <rect x="39" y="5" width="14" height="10" fill="#e08aa0" />
    </svg>
  );
}

function Sofa({ vertical }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <svg viewBox="0 0 24 40" {...svgFill}>
        <rect x="0" y="2" width="24" height="38" rx="4" fill="#b85f33" />
        <rect x="0" y="2" width="7" height="38" rx="3" fill="#a0512a" />
        <rect x="8" y="5" width="14" height="15" rx="3" fill="#d98a55" />
        <rect x="8" y="22" width="14" height="15" rx="3" fill="#d98a55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 22" {...svgFill}>
      <rect x="0" y="0" width="60" height="22" rx="4" fill="#b85f33" />
      <rect x="0" y="0" width="60" height="7" rx="3" fill="#a0512a" />
      <rect x="3" y="8" width="17" height="12" rx="3" fill="#d98a55" />
      <rect x="22" y="8" width="16" height="12" rx="3" fill="#d98a55" />
      <rect x="40" y="8" width="17" height="12" rx="3" fill="#d98a55" />
    </svg>
  );
}

function CoffeeTable() {
  return (
    <svg viewBox="0 0 48 22" {...svgFill}>
      <ellipse cx="24" cy="19" rx="20" ry="3" fill="#00000026" />
      <rect x="2" y="2" width="44" height="14" rx="4" fill="#8a5a34" />
      <rect x="4" y="4" width="40" height="8" rx="3" fill="#a06b3f" />
      <rect x="16" y="6" width="16" height="4" rx="2" fill="#d9c9a8" />
    </svg>
  );
}

function CafeCounter() {
  return (
    <svg viewBox="0 0 120 24" {...svgFill}>
      <rect x="0" y="6" width="120" height="18" fill="#6f4a2e" />
      <rect x="0" y="2" width="120" height="6" fill="#8a5e38" />
      <rect x="8" y="-6" width="16" height="12" fill="#3a3f4a" />
      <rect x="13" y="0" width="6" height="4" fill="#c9742f" />
      <rect x="40" y="-2" width="6" height="6" fill="#d9c9a8" />
      <rect x="52" y="-2" width="6" height="6" fill="#c0563f" />
      <rect x="64" y="-2" width="6" height="6" fill="#3f7d8a" />
    </svg>
  );
}

function Stool() {
  return (
    <svg viewBox="0 0 20 20" {...svgFill}>
      <circle cx="10" cy="11" r="8" fill="#00000022" />
      <circle cx="10" cy="9" r="7.5" fill="#c9742f" />
      <circle cx="10" cy="9" r="5" fill="#e0985a" />
    </svg>
  );
}

function RoundTable() {
  return (
    <svg viewBox="0 0 80 70" {...svgFill}>
      <ellipse cx="40" cy="38" rx="34" ry="28" fill="#00000022" />
      <ellipse cx="40" cy="35" rx="34" ry="28" fill="#9c6b3f" />
      <ellipse cx="40" cy="35" rx="29" ry="23" fill="#b5824e" />
      <ellipse cx="40" cy="35" rx="13" ry="10" fill="#a06b3f" />
      <rect x="30" y="30" width="8" height="6" fill="#3a3f4a" />
      <rect x="44" y="35" width="7" height="5" fill="#3a3f4a" />
    </svg>
  );
}

function LongTable() {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" {...svgFill}>
      <rect x="2" y="6" width="116" height="30" rx="8" fill="#00000022" />
      <rect x="2" y="3" width="116" height="30" rx="8" fill="#9c6b3f" />
      <rect x="6" y="6" width="108" height="24" rx="6" fill="#b5824e" />
      <rect x="40" y="12" width="14" height="10" fill="#3a3f4a" />
      <rect x="70" y="13" width="10" height="8" fill="#cf6b4a" />
    </svg>
  );
}

function Rug({ tone }: { tone?: string }) {
  const c = tone === 'teal' ? { a: '#2f8f87', b: '#247068', c: '#48b3a8' } : { a: '#c1623f', b: '#9c4a30', c: '#d98a55' };
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" {...svgFill}>
      <rect x="0" y="0" width="100" height="60" rx="6" fill={c.a} />
      <rect x="5" y="5" width="90" height="50" rx="4" fill="none" stroke={c.b} strokeWidth="3" />
      <rect x="14" y="14" width="72" height="32" rx="3" fill="none" stroke={c.c} strokeWidth="2" />
    </svg>
  );
}

function Water() {
  return (
    <svg viewBox="0 0 16 26" {...svgFill}>
      <rect x="3" y="10" width="10" height="16" fill="#dfe7ea" />
      <rect x="4" y="0" width="8" height="11" rx="2" fill="#8fd0e6" />
      <rect x="5" y="2" width="6" height="7" rx="2" fill="#bfe6f2" />
    </svg>
  );
}

function WindowSprite() {
  return (
    <svg viewBox="0 0 80 14" preserveAspectRatio="none" {...svgFill}>
      <rect x="0" y="0" width="80" height="14" fill="#cdbfa3" />
      <rect x="2" y="2" width="76" height="10" fill="#a9def0" />
      <rect x="2" y="2" width="76" height="4" fill="#c4ecf7" />
      <rect x="39" y="2" width="2" height="10" fill="#cdbfa3" />
    </svg>
  );
}

function render(kind: FurnitureKind, tone?: string) {
  switch (kind) {
    case 'plant':
      return <Plant />;
    case 'plant-tall':
      return <Plant tall />;
    case 'bookshelf':
      return <Bookshelf />;
    case 'whiteboard':
      return <Whiteboard />;
    case 'standup-board':
      return <StandupBoard />;
    case 'sofa':
      return <Sofa />;
    case 'sofa-v':
      return <Sofa vertical />;
    case 'coffee-table':
      return <CoffeeTable />;
    case 'cafe-counter':
      return <CafeCounter />;
    case 'stool':
      return <Stool />;
    case 'round-table':
      return <RoundTable />;
    case 'long-table':
      return <LongTable />;
    case 'rug':
      return <Rug tone={tone} />;
    case 'water':
      return <Water />;
    case 'window':
      return <WindowSprite />;
    default:
      return null;
  }
}

export function Furniture({
  kind,
  x,
  y,
  w,
  h,
  tone,
}: {
  kind: FurnitureKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: string;
}) {
  const def = DEFAULT_SIZE[kind];
  return (
    <div className="obj" style={{ left: x, top: y, width: w ?? def.w, height: h ?? def.h, zIndex: Math.round(y) }}>
      {render(kind, tone)}
    </div>
  );
}

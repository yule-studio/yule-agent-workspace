/**
 * Detailed cool-toned pixel-art office sprites (crispEdges SVG). Authored at a
 * higher pixel density than icon-grade art: cubicle pods with partitions + dual
 * monitors + keyboard + papers + mug + postit, office chairs, plants, printer,
 * whiteboard, cabinet, sofa, water cooler, a server/ops rack, etc. Palette is
 * graphite / slate / concrete with cyan-teal-violet accents — no warm wood.
 *
 * Place one with <Prop kind x y [w h dir]/>. New objects: add a case + size.
 */
export type PropKind =
  | 'cubicle'
  | 'chair'
  | 'plant'
  | 'plant-tall'
  | 'printer'
  | 'whiteboard'
  | 'cabinet'
  | 'sofa'
  | 'coffee-bar'
  | 'water-cooler'
  | 'server-rack'
  | 'round-table'
  | 'long-table'
  | 'rug'
  | 'trash'
  | 'postits'
  | 'window';

const S = {
  outline: '#0e141d',
  partition: '#3a4656',
  partitionTop: '#4c5a6e',
  glass: '#54707f',
  desk: '#566173',
  deskTop: '#6b768c',
  deskEdge: '#3c4452',
  bezel: '#141b26',
  screenA: '#0f2a3a',
  screenB: '#10322f',
  codeC: '#38bdf8',
  codeT: '#2dd4bf',
  codeV: '#a78bfa',
  key: '#cbd5e1',
  keyDk: '#94a3b8',
  paper: '#e5edf5',
  mug: '#2dd4bf',
  postit: '#fb7185',
  metal: '#475569',
  metalLt: '#64748b',
  metalDk: '#334155',
  green1: '#34d399',
  green2: '#10b981',
  green3: '#059669',
  pot: '#334155',
  led1: '#34d399',
  led2: '#38bdf8',
  led3: '#fb7185',
};

const fill = { shapeRendering: 'crispEdges' as const, style: { width: '100%', height: '100%', display: 'block' as const } };

/** Cubicle desk pod — partitions, dual monitors, keyboard, papers, mug, postit. */
function Cubicle() {
  return (
    <svg viewBox="0 0 64 54" {...fill}>
      {/* partition back + sides */}
      <rect x="2" y="2" width="60" height="12" fill={S.partition} />
      <rect x="2" y="2" width="60" height="2" fill={S.partitionTop} />
      <rect x="7" y="4" width="50" height="4" fill={S.glass} />
      <rect x="2" y="2" width="4" height="44" fill={S.partition} />
      <rect x="58" y="2" width="4" height="44" fill={S.partition} />
      <rect x="2" y="2" width="2" height="44" fill={S.partitionTop} />
      {/* postit on partition */}
      <rect x="50" y="4" width="5" height="5" fill={S.postit} />
      {/* desk surface */}
      <rect x="6" y="30" width="52" height="15" fill={S.desk} />
      <rect x="6" y="30" width="52" height="2" fill={S.deskTop} />
      <rect x="6" y="43" width="52" height="2" fill={S.deskEdge} />
      {/* monitor 1 */}
      <rect x="11" y="15" width="19" height="14" fill={S.bezel} />
      <rect x="13" y="17" width="15" height="10" fill={S.screenA} />
      <rect x="14" y="18" width="9" height="1" fill={S.codeC} />
      <rect x="14" y="20" width="12" height="1" fill={S.codeT} />
      <rect x="14" y="22" width="7" height="1" fill={S.codeV} />
      <rect x="14" y="24" width="10" height="1" fill={S.codeC} />
      <rect x="19" y="29" width="3" height="2" fill={S.bezel} />
      {/* monitor 2 */}
      <rect x="34" y="15" width="19" height="14" fill={S.bezel} />
      <rect x="36" y="17" width="15" height="10" fill={S.screenB} />
      <rect x="37" y="18" width="11" height="1" fill={S.codeT} />
      <rect x="37" y="20" width="8" height="1" fill={S.codeC} />
      <rect x="37" y="22" width="12" height="1" fill={S.green1} />
      <rect x="42" y="29" width="3" height="2" fill={S.bezel} />
      {/* keyboard + mouse */}
      <rect x="20" y="38" width="22" height="5" fill={S.key} />
      <rect x="20" y="38" width="22" height="1" fill={S.keyDk} />
      <rect x="45" y="39" width="4" height="4" fill={S.key} />
      {/* papers + mug */}
      <rect x="8" y="35" width="9" height="8" fill={S.paper} />
      <rect x="9" y="37" width="7" height="1" fill={S.keyDk} />
      <rect x="9" y="39" width="6" height="1" fill={S.keyDk} />
      <rect x="51" y="33" width="5" height="6" fill={S.mug} />
      <rect x="51" y="33" width="5" height="1" fill="#7af0df" />
    </svg>
  );
}

function Chair() {
  return (
    <svg viewBox="0 0 26 26" {...fill}>
      <ellipse cx="13" cy="20" rx="9" ry="3" fill="#00000033" />
      <rect x="6" y="3" width="14" height="6" rx="2" fill={S.metalDk} />
      <rect x="7" y="8" width="12" height="11" rx="3" fill={S.metal} />
      <rect x="9" y="10" width="8" height="7" rx="2" fill={S.metalLt} />
      <rect x="12" y="19" width="2" height="3" fill={S.metalDk} />
    </svg>
  );
}

function Plant({ tall }: { tall?: boolean }) {
  return (
    <svg viewBox="0 0 24 28" {...fill}>
      <ellipse cx="12" cy="25" rx="8" ry="2.4" fill="#00000033" />
      <rect x="7" y="18" width="10" height="8" fill={S.pot} />
      <rect x="7" y="18" width="10" height="2" fill={S.metalLt} />
      {tall ? (
        <>
          <rect x="11" y="3" width="2" height="15" fill={S.green3} />
          <path d="M12 2 L7 9 L12 8 Z" fill={S.green1} />
          <path d="M12 4 L17 10 L12 9 Z" fill={S.green2} />
          <path d="M12 9 L6 13 L12 12 Z" fill={S.green3} />
          <path d="M12 10 L18 14 L12 13 Z" fill={S.green1} />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="7" fill={S.green2} />
          <circle cx="8" cy="11" r="4" fill={S.green1} />
          <circle cx="16" cy="13" r="4" fill={S.green3} />
          <circle cx="12" cy="8" r="3.4" fill={S.green1} />
        </>
      )}
    </svg>
  );
}

function Printer() {
  return (
    <svg viewBox="0 0 28 26" {...fill}>
      <rect x="3" y="8" width="22" height="14" rx="1" fill={S.metal} />
      <rect x="3" y="8" width="22" height="2" fill={S.metalLt} />
      <rect x="6" y="3" width="16" height="6" fill={S.metalDk} />
      <rect x="8" y="18" width="12" height="5" fill={S.paper} />
      <rect x="6" y="11" width="4" height="2" fill={S.led2} />
      <rect x="20" y="11" width="2" height="2" fill={S.led1} />
    </svg>
  );
}

function Whiteboard() {
  return (
    <svg viewBox="0 0 64 22" {...fill}>
      <rect x="0" y="0" width="64" height="20" fill={S.metalLt} />
      <rect x="2" y="2" width="60" height="15" fill="#eef3f8" />
      <rect x="5" y="5" width="26" height="2" fill={S.codeC} />
      <rect x="5" y="9" width="38" height="2" fill={S.codeV} />
      <rect x="5" y="13" width="18" height="2" fill={S.green1} />
      <rect x="46" y="5" width="14" height="9" fill="none" stroke="#7c8aa0" strokeWidth="1" />
    </svg>
  );
}

function Cabinet() {
  const binders = ['#38bdf8', '#a78bfa', '#2dd4bf', '#fb7185', '#7dd3fc'];
  return (
    <svg viewBox="0 0 14 64" {...fill}>
      <rect x="0" y="0" width="14" height="64" fill={S.metalDk} />
      <rect x="1" y="1" width="12" height="62" fill="#283242" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r} transform={`translate(2 ${4 + r * 15})`}>
          {binders.map((b, i) => (
            <rect key={i} x={i * 2} y={(i + r) % 2 ? 0 : 1} width="1.7" height={11} fill={b} />
          ))}
          <rect x="0" y="13" width="10" height="1.5" fill={S.metal} />
        </g>
      ))}
    </svg>
  );
}

function Sofa() {
  return (
    <svg viewBox="0 0 64 24" {...fill}>
      <rect x="0" y="0" width="64" height="24" rx="4" fill={S.metalDk} />
      <rect x="0" y="0" width="64" height="6" rx="3" fill={S.metal} />
      <rect x="3" y="8" width="18" height="13" rx="3" fill="#3f6f78" />
      <rect x="23" y="8" width="18" height="13" rx="3" fill="#3f6f78" />
      <rect x="43" y="8" width="18" height="13" rx="3" fill="#3f6f78" />
    </svg>
  );
}

function CoffeeBar() {
  return (
    <svg viewBox="0 0 60 24" {...fill}>
      <rect x="0" y="8" width="60" height="16" fill={S.metalDk} />
      <rect x="0" y="6" width="60" height="3" fill={S.metalLt} />
      <rect x="6" y="-2" width="12" height="10" fill="#283242" />
      <rect x="9" y="1" width="6" height="3" fill={S.led2} />
      <rect x="10" y="4" width="4" height="3" fill={S.codeT} />
      <rect x="30" y="0" width="5" height="6" fill={S.mug} />
      <rect x="40" y="0" width="5" height="6" fill={S.postit} />
    </svg>
  );
}

function WaterCooler() {
  return (
    <svg viewBox="0 0 16 30" {...fill}>
      <rect x="2" y="10" width="12" height="18" fill="#cbd5e1" />
      <rect x="2" y="10" width="12" height="3" fill="#94a3b8" />
      <rect x="4" y="0" width="8" height="11" rx="2" fill="#7dd3fc" />
      <rect x="5" y="2" width="6" height="7" rx="2" fill="#bfe9fb" />
      <rect x="6" y="20" width="4" height="2" fill={S.led2} />
    </svg>
  );
}

function ServerRack() {
  return (
    <svg viewBox="0 0 48 40" {...fill}>
      <rect x="0" y="0" width="48" height="40" rx="1" fill="#0c1118" />
      <rect x="1" y="1" width="46" height="38" fill="#161d27" />
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r} transform={`translate(3 ${3 + r * 7})`}>
          <rect x="0" y="0" width="42" height="5" fill="#0e151e" />
          <rect x="1" y="1" width="42" height="1" fill="#243040" />
          <rect x="34" y="1" width="2" height="2" fill={[S.led1, S.led2, S.led3, S.led1, S.led2][r]} />
          <rect x="37" y="1" width="2" height="2" fill={S.led2} />
        </g>
      ))}
    </svg>
  );
}

function RoundTable() {
  return (
    <svg viewBox="0 0 80 70" {...fill}>
      <ellipse cx="40" cy="38" rx="34" ry="28" fill="#00000033" />
      <ellipse cx="40" cy="35" rx="34" ry="28" fill={S.metalDk} />
      <ellipse cx="40" cy="35" rx="29" ry="23" fill="#34404f" />
      <ellipse cx="40" cy="35" rx="12" ry="9" fill="#283242" />
      <rect x="31" y="31" width="9" height="6" fill={S.bezel} />
      <rect x="44" y="35" width="7" height="5" fill={S.codeC} opacity="0.5" />
    </svg>
  );
}

function LongTable() {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" {...fill}>
      <rect x="2" y="6" width="116" height="30" rx="6" fill="#00000033" />
      <rect x="2" y="3" width="116" height="30" rx="6" fill={S.metalDk} />
      <rect x="6" y="6" width="108" height="24" rx="4" fill="#34404f" />
      <rect x="40" y="11" width="16" height="11" fill={S.bezel} />
      <rect x="70" y="12" width="12" height="9" fill={S.codeT} opacity="0.5" />
    </svg>
  );
}

function Rug({ tone }: { tone?: string }) {
  const c = tone === 'violet' ? ['#3b2f5e', '#5b4b8a', '#a78bfa'] : ['#0f3a44', '#13525e', '#2dd4bf'];
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" {...fill}>
      <rect x="0" y="0" width="100" height="60" rx="6" fill={c[0]} />
      <rect x="5" y="5" width="90" height="50" rx="4" fill="none" stroke={c[1]} strokeWidth="3" />
      <rect x="14" y="14" width="72" height="32" rx="3" fill="none" stroke={c[2]} strokeWidth="2" />
    </svg>
  );
}

function Trash() {
  return (
    <svg viewBox="0 0 14 18" {...fill}>
      <rect x="2" y="4" width="10" height="13" rx="1" fill={S.metal} />
      <rect x="1" y="2" width="12" height="2" fill={S.metalLt} />
      <rect x="4" y="6" width="1.5" height="9" fill={S.metalDk} />
      <rect x="8" y="6" width="1.5" height="9" fill={S.metalDk} />
    </svg>
  );
}

function PostIts() {
  return (
    <svg viewBox="0 0 20 18" {...fill}>
      <rect x="1" y="2" width="8" height="8" fill={S.postit} />
      <rect x="10" y="1" width="8" height="8" fill={S.codeT} />
      <rect x="5" y="9" width="8" height="8" fill={S.codeV} />
    </svg>
  );
}

function WindowSprite() {
  return (
    <svg viewBox="0 0 80 14" preserveAspectRatio="none" {...fill}>
      <rect x="0" y="0" width="80" height="14" fill={S.metalDk} />
      <rect x="2" y="2" width="76" height="10" fill="#1b3a4a" />
      <rect x="2" y="2" width="76" height="3" fill="#2b5566" />
      <rect x="39" y="2" width="2" height="10" fill={S.metalDk} />
    </svg>
  );
}

const DEFAULT: Record<PropKind, { w: number; h: number }> = {
  cubicle: { w: 92, h: 78 },
  chair: { w: 30, h: 30 },
  plant: { w: 38, h: 44 },
  'plant-tall': { w: 42, h: 76 },
  printer: { w: 46, h: 42 },
  whiteboard: { w: 130, h: 44 },
  cabinet: { w: 26, h: 120 },
  sofa: { w: 130, h: 48 },
  'coffee-bar': { w: 130, h: 52 },
  'water-cooler': { w: 28, h: 54 },
  'server-rack': { w: 84, h: 70 },
  'round-table': { w: 150, h: 130 },
  'long-table': { w: 230, h: 76 },
  rug: { w: 200, h: 120 },
  trash: { w: 22, h: 28 },
  postits: { w: 30, h: 26 },
  window: { w: 150, h: 24 },
};

function render(kind: PropKind, tone?: string) {
  switch (kind) {
    case 'cubicle':
      return <Cubicle />;
    case 'chair':
      return <Chair />;
    case 'plant':
      return <Plant />;
    case 'plant-tall':
      return <Plant tall />;
    case 'printer':
      return <Printer />;
    case 'whiteboard':
      return <Whiteboard />;
    case 'cabinet':
      return <Cabinet />;
    case 'sofa':
      return <Sofa />;
    case 'coffee-bar':
      return <CoffeeBar />;
    case 'water-cooler':
      return <WaterCooler />;
    case 'server-rack':
      return <ServerRack />;
    case 'round-table':
      return <RoundTable />;
    case 'long-table':
      return <LongTable />;
    case 'rug':
      return <Rug tone={tone} />;
    case 'trash':
      return <Trash />;
    case 'postits':
      return <PostIts />;
    case 'window':
      return <WindowSprite />;
    default:
      return null;
  }
}

export function Prop({
  kind,
  x,
  y,
  w,
  h,
  dir,
  tone,
}: {
  kind: PropKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  dir?: 'down' | 'up';
  tone?: string;
}) {
  const d = DEFAULT[kind];
  return (
    <div
      className="obj"
      style={{
        left: x,
        top: y,
        width: w ?? d.w,
        height: h ?? d.h,
        zIndex: Math.round(y),
        transform: dir === 'up' ? 'scaleY(-1)' : undefined,
      }}
    >
      {render(kind, tone)}
    </div>
  );
}

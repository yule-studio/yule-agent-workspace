/**
 * Generate the Yule Agent Lab single-floor map: a small floor/wall tileset
 * (tiles.png) + a Tiled map (yule-agent-lab.tmj).
 *
 *   node scripts/gen-lab-map.mjs
 *
 * Layout — a plus-shaped common corridor connecting four zoned rooms:
 *   UL  Engineering / AI pods (face-to-face desk pods, back+front desks)
 *   UR  Planning / Design / Library (planning table, shelves, boards, globe)
 *   LL  Tech Lead / Human Approval office (lead desk, visitor chairs, board)
 *   LR  Ops / Review (review table, server racks, CI monitors, printer)
 *
 * Walls are derived from region boundaries (with carved doors); furniture and
 * seats are object layers carrying metadata the runtime resolves against the
 * baked texture atlas by sprite name — Tiled never needs the big sprites.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blankImage, setPx, writePNG } from './lib/png.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const OUT = path.join(ROOT, 'apps/web/public/vendor/yule-office');

const TS = 32;             // tile size
const W = 56, H = 40;      // map size in tiles
const PXW = W * TS, PXH = H * TS;

// ----- tileset -------------------------------------------------------------
const PAL = {
  floorA: '#d7d9de', floorAg: '#c7cad1',
  ind: '#9aa1ad', indg: '#878e9b',
  carpetW: '#c9a98a', carpetWd: '#b9977a', carpetWn: '#d2b496',
  carpetB: '#8ba0bd', carpetBd: '#7b90ad', carpetBn: '#9aaecb',
  corr: '#c2c4cb', corrEdge: '#aeb1b9',
  wall: '#5a616d', wallHi: '#6c7480', wallLo: '#444b55',
  wallTop: '#7a828f', wallTopHi: '#8b94a1',
  glass: '#9fc6d8', glassHi: '#c4e2ee', frame: '#42474f',
  rug: '#9d6b6b', rugTrim: '#caa0a0',
  mat: '#8a8f98',
};
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

// each tile is drawn by a function into a 32x32 region of the tileset image
const TILES = [];
const tile = (name, fn) => { TILES.push({ name, fn }); return TILES.length; }; // returns gid

function flat(base, grout) {
  const [br, bg, bb] = hex(base);
  const [gr, gg, gb] = hex(grout);
  return (img, ox, oy) => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const edge = x === 0 || y === 0;
      const [r, g, b] = edge ? [gr, gg, gb] : [br, bg, bb];
      setPx(img, ox + x, oy + y, r, g, b, 255);
    }
  };
}
function noisy(base, dark, light) {
  const [br, bg, bb] = hex(base), [dr, dg, db] = hex(dark), [lr, lg, lb] = hex(light);
  return (img, ox, oy) => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = ((x * 7 + y * 13 + x * y) % 11);
      let c = [br, bg, bb];
      if (n === 0) c = [dr, dg, db];
      else if (n === 5) c = [lr, lg, lb];
      if (x === 0 || y === 0) c = [dr, dg, db];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  };
}

const GID = {
  floorA: tile('floorA', flat(PAL.floorA, PAL.floorAg)),
  ind: tile('ind', noisy(PAL.ind, PAL.indg, '#a8afba')),
  carpetW: tile('carpetW', noisy(PAL.carpetW, PAL.carpetWd, PAL.carpetWn)),
  carpetB: tile('carpetB', noisy(PAL.carpetB, PAL.carpetBd, PAL.carpetBn)),
  corr: tile('corr', flat(PAL.corr, PAL.corrEdge)),
  wall: tile('wall', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wall), [hr, hg, hb] = hex(PAL.wallHi), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 3) c = [hr, hg, hb];
      else if (y > 28) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  wallTop: tile('wallTop', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wallTop), [hr, hg, hb] = hex(PAL.wallTopHi), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 6) c = [hr, hg, hb];
      else if (y > 24) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  window: tile('window', (img, ox, oy) => {
    const [fr, fg, fb] = hex(PAL.frame), [gr, gg, gb] = hex(PAL.glass), [hr, hg, hb] = hex(PAL.glassHi);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [fr, fg, fb];
      const inFrame = x > 2 && x < 29 && y > 4 && y < 27;
      if (inFrame) c = (x + y) % 9 < 4 ? [hr, hg, hb] : [gr, gg, gb];
      if (inFrame && (x === 15 || x === 16 || y === 15 || y === 16)) c = [fr, fg, fb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  rug: tile('rug', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.rug), [tr, tg, tb] = hex(PAL.rugTrim);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const border = x < 3 || y < 3 || x > 28 || y > 28;
      const c = border ? [tr, tg, tb] : [r, g, b];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  mat: tile('mat', flat(PAL.mat, '#797e87')),
};

const COLS = TILES.length;
const tileset = blankImage(COLS * TS, TS);
TILES.forEach((t, i) => t.fn(tileset, i * TS, 0));
writePNG(path.join(OUT, 'tiles.png'), tileset);

// ----- region model --------------------------------------------------------
// interior building rect
const IX0 = 2, IY0 = 2, IX1 = W - 3, IY1 = H - 3; // inclusive interior bounds
const VCORR = [26, 29];   // vertical corridor columns
const HCORR = [18, 21];   // horizontal corridor rows

function region(x, y) {
  if (x < IX0 || y < IY0 || x > IX1 || y > IY1) return 'void';
  const inV = x >= VCORR[0] && x <= VCORR[1];
  const inH = y >= HCORR[0] && y <= HCORR[1];
  if (inV || inH) return 'corr';
  if (x < VCORR[0] && y < HCORR[0]) return 'eng';
  if (x > VCORR[1] && y < HCORR[0]) return 'plan';
  if (x < VCORR[0] && y > HCORR[1]) return 'lead';
  return 'ops';
}
const FLOOR_GID = { eng: GID.floorA, plan: GID.carpetW, lead: GID.carpetB, ops: GID.ind, corr: GID.corr };

// doors carved through the room↔corridor walls (cells forced to floor)
const doors = new Set([
  '25,10', '25,11',   // eng → corridor
  '30,10', '30,11',   // plan → corridor
  '25,29', '25,30',   // lead → corridor
  '30,29', '30,30',   // ops → corridor
  '13,18', '14,18',   // eng → horizontal corridor
  '42,18', '43,18',   // plan → horizontal corridor
  '13,21', '14,21',   // lead → horizontal corridor
  '42,21', '43,21',   // ops → horizontal corridor
]);

const isInterior = (x, y) => region(x, y) !== 'void';
// a wall cell: an interior region boundary, or the perimeter ring just outside interior
function classify(x, y) {
  const r = region(x, y);
  if (r === 'void') {
    // perimeter wall ring hugging the interior
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
      if (isInterior(x + dx, y + dy)) return 'wall';
    return 'void';
  }
  if (doors.has(`${x},${y}`)) return 'floor';
  // interior wall where a 4-neighbour is a different non-void region
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nr = region(x + dx, y + dy);
    if (nr !== 'void' && nr !== r) return 'wall';
  }
  return 'floor';
}

const floorLayer = new Array(W * H).fill(0);
const wallLayer = new Array(W * H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = classify(x, y);
  const i = y * W + x;
  if (k === 'floor') {
    floorLayer[i] = doors.has(`${x},${y}`) ? GID.mat : FLOOR_GID[region(x, y)];
  } else if (k === 'wall') {
    floorLayer[i] = FLOOR_GID[region(x, y)] || GID.corr; // floor under wall for clean edges
    const aboveVoidOrWall = classify(x, y - 1) !== 'floor';
    wallLayer[i] = aboveVoidOrWall ? GID.wallTop : GID.wall;
  }
}
// north windows on the top perimeter wall
for (let x = 6; x <= IX1 - 2; x += 6) {
  const i = (IY0 - 1) * W + x;
  if (wallLayer[i]) { wallLayer[i] = GID.window; wallLayer[i + 1] = GID.window; }
}

// ----- objects -------------------------------------------------------------
let oid = 1;
const T = (n) => n * TS;
const furniture = [], seats = [], pois = [], spawns = [], collisions = [];
const prop = (o) => Object.entries(o).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value }));

/** Place a furniture sprite anchored at its base (bottom-centre), in tile coords. */
function furn(sprite, tx, ty, { scale = 0.4, z = 0 } = {}) {
  furniture.push({ id: oid++, name: sprite, type: 'furniture', x: T(tx), y: T(ty), point: true, properties: prop({ sprite, scale, z }) });
}
function seat(tx, ty, { role = 'member', facing = 'down', zone = 'desk', desk = '' } = {}) {
  seats.push({ id: oid++, name: `seat-${oid}`, type: 'seat', x: T(tx), y: T(ty), point: true, properties: prop({ role, facing, zone, desk }) });
}
function poi(name, tx, ty, tw, th, kind) {
  pois.push({ id: oid++, name, type: 'poi', x: T(tx), y: T(ty), width: T(tw), height: T(th), properties: prop({ kind }) });
}
function spawn(tx, ty) { spawns.push({ id: oid++, name: 'spawn', type: 'spawn', x: T(tx), y: T(ty), point: true, properties: [] }); }
function wallCollisionsFromLayer() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wallLayer[y * W + x]) {
    collisions.push({ id: oid++, name: 'wall', type: 'collision', x: T(x), y: T(y), width: TS, height: TS, properties: [] });
  }
}

/**
 * A face-to-face desk pod centred at (cx,cy): a BACK desk on top with an agent
 * above it (screens face away), a FRONT desk below with an agent below it
 * (screen visible). No rotation — each row uses the correct sprite.
 */
function pod(cx, cy, deskRole, { topRole = 'member', botRole = 'member', zone = 'desk' } = {}) {
  furn(`desk_${deskRole}_back`, cx, cy - 1, { scale: 0.4, z: 1 });
  seat(cx, cy - 2.6, { role: topRole, facing: 'down', zone, desk: `desk_${deskRole}_back` });
  furn(`chair_mesh_black`, cx, cy - 2.4, { scale: 0.34, z: 0 });
  furn(`desk_${deskRole}_front`, cx, cy + 2.2, { scale: 0.4, z: 3 });
  seat(cx, cy + 3.4, { role: botRole, facing: 'up', zone, desk: `desk_${deskRole}_front` });
  furn(`chair_mesh_dark`, cx, cy + 3.6, { scale: 0.34, z: 4 });
}

// UL — Engineering / AI pods
const ENG_PODS = [
  [9, 7, 'ai'], [18, 7, 'backend'], [9, 15, 'backend'], [18, 15, 'ai'],
];
ENG_PODS.forEach(([x, y, role]) => pod(x, y, role, { zone: 'desk' }));
furn('whiteboard_chart', 5, 4, { scale: 0.32 });
furn('plant_small', 23, 4, { scale: 0.4 });
furn('bookshelf_narrow', 4, 16, { scale: 0.38 });
poi('eng-zone', 3, 3, 22, 15, 'desk');

// UR — Planning / Design / Library
furn('desk_analyst_front', 41, 8, { scale: 0.42 });
seat(41, 9.4, { role: 'product', facing: 'up', zone: 'planning-area', desk: 'desk_analyst_front' });
furn('chair_blue', 41, 9.6, { scale: 0.32 });
furn('desk_designer_front', 48, 8, { scale: 0.42 });
seat(48, 9.4, { role: 'product', facing: 'up', zone: 'planning-area', desk: 'desk_designer_front' });
furn('chair_green', 48, 9.6, { scale: 0.32 });
furn('bookshelf_wide', 44, 4, { scale: 0.42 });
furn('whiteboard_blank', 33, 4, { scale: 0.34 });
furn('globe', 52, 15, { scale: 0.4 });
furn('plant_small', 32, 16, { scale: 0.4 });
poi('planning-zone', 31, 3, 22, 15, 'planning-area');
poi('planning-area', 38, 11, 14, 5, 'planning-area');

// LL — Tech Lead / Human Approval office
for (let x = 8; x <= 19; x++) for (let y = 27; y <= 33; y++) floorLayer[y * W + x] = GID.rug;
furn('desk_analyst_back', 13, 26, { scale: 0.46, z: 1 });
seat(13, 24.6, { role: 'lead', facing: 'down', zone: 'desk', desk: 'desk_analyst_back' });
furn('chair_exec_black', 13, 24.8, { scale: 0.4 });
furn('chair_blue', 9, 31, { scale: 0.34 });
seat(9, 31, { role: 'visitor', facing: 'up', zone: 'approval' });
furn('chair_green', 17, 31, { scale: 0.34 });
seat(17, 31, { role: 'visitor', facing: 'up', zone: 'approval' });
furn('whiteboard_blank', 6, 24, { scale: 0.34 });
furn('bookshelf_narrow', 22, 26, { scale: 0.38 });
furn('plant_small', 22, 35, { scale: 0.4 });
furn('framed_picture', 6, 27, { scale: 0.3 });
furn('side_table', 19, 35, { scale: 0.36 });
furn('file_cabinet', 4, 34, { scale: 0.38 });
poi('lead-zone', 3, 23, 22, 14, 'desk');
poi('approval', 7, 29, 12, 5, 'approval');

// LR — Ops / Review
furn('desk_backend_front', 40, 27, { scale: 0.42, z: 3 });
seat(40, 28.4, { role: 'devops', facing: 'up', zone: 'review-table', desk: 'desk_backend_front' });
furn('chair_mesh_dark', 40, 28.6, { scale: 0.34 });
furn('desk_backend_back', 47, 26, { scale: 0.42, z: 1 });
seat(47, 24.6, { role: 'devops', facing: 'down', zone: 'review-table', desk: 'desk_backend_back' });
furn('chair_mesh_black', 47, 24.8, { scale: 0.34 });
furn('server_rack', 51, 25, { scale: 0.42 });
furn('equipment_rack', 33, 25, { scale: 0.4 });
furn('monitor_flow_1', 36, 24, { scale: 0.32 });
furn('monitor_dashboard', 44, 24, { scale: 0.3 });
furn('printer', 33, 35, { scale: 0.38 });
furn('watercooler', 51, 35, { scale: 0.4 });
furn('cabinet_tall', 47, 35, { scale: 0.4 });
furn('stool_red', 37, 32, { scale: 0.32 });
poi('ops-zone', 31, 23, 22, 14, 'review-table');
poi('review-table', 38, 30, 12, 5, 'review-table');

// Corridor — common / standup / lounge
furn('plant_small', 27, 6, { scale: 0.4 });
furn('plant_small', 28, 34, { scale: 0.4 });
furn('watercooler', 27, 24, { scale: 0.4 });
furn('side_table', 14, 20, { scale: 0.4 });
poi('standup', 24, 18, 8, 4, 'meeting-room');
poi('lounge', 26, 23, 4, 6, 'lounge');
spawn(27, 37); spawn(28, 37);

wallCollisionsFromLayer();

// ----- emit .tmj ------------------------------------------------------------
const layer = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
const group = (id, name, objects) => ({ id, name, type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, objects, draworder: 'topdown' });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TS, tileheight: TS, infinite: false,
  backgroundcolor: '#15171c',
  nextlayerid: 8, nextobjectid: oid,
  tilesets: [{ firstgid: 1, name: 'lab', image: 'tiles.png', imagewidth: COLS * TS, imageheight: TS, tilewidth: TS, tileheight: TS, tilecount: COLS, columns: COLS, margin: 0, spacing: 0 }],
  layers: [
    layer(1, 'floor', floorLayer),
    layer(2, 'walls', wallLayer),
    group(3, 'furniture', furniture),
    group(4, 'seats', seats),
    group(5, 'pois', pois),
    group(6, 'spawns', spawns),
    group(7, 'collisions', collisions),
  ],
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'yule-agent-lab.tmj'), JSON.stringify(map));
console.log(`tiles.png ${COLS} tiles (${COLS * TS}x${TS})`);
console.log(`yule-agent-lab.tmj ${W}x${H} (${PXW}x${PXH}px)  furniture=${furniture.length} seats=${seats.length} pois=${pois.length} collisions=${collisions.length}`);

/**
 * Generate the Yule Agent Lab single-floor map: a small floor/wall tileset
 * (tiles.png) + a Tiled map (yule-agent-lab.tmj).
 *
 *   node scripts/gen-lab-map.mjs
 *
 * Layout follows office-shell-floorplan-v2: an organic, stepped silhouette
 * (not a clean rectangle) with windows all around and a right-of-centre
 * vertical corridor connecting five zoned rooms:
 *   ENG   (top-left, large open)  Engineering / AI pods — face-to-face desks
 *   LEAD  (bottom-left)           Tech Lead / Human Approval office
 *   PLAN  (top-right, green)      Planning / Design / Library
 *   OPS   (mid/bottom-right blue) Review / Ops — review pod, racks, CI monitors
 *   FOCUS (bottom-right, mauve)   Lounge / standup / focus room
 *
 * Walls are derived from the region boundaries (with carved doors); furniture
 * and seats are object layers carrying metadata the runtime resolves against
 * the baked texture atlas by sprite name — Tiled never needs the big sprites.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blankImage, setPx, writePNG } from './lib/png.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const OUT = path.join(ROOT, 'apps/web/public/vendor/yule-office');

const TS = 32;             // tile size
const W = 58, H = 40;      // map size in tiles
const PXW = W * TS, PXH = H * TS;

// ----- tileset -------------------------------------------------------------
const PAL = {
  floorA: '#d7d9de', floorAg: '#c7cad1',
  ind: '#9aa1ad', indg: '#878e9b',
  carpetW: '#c9a98a', carpetWd: '#b9977a', carpetWn: '#d2b496',
  carpetB: '#8ba0bd', carpetBd: '#7b90ad', carpetBn: '#9aaecb',
  carpetG: '#8fb592', carpetGd: '#7da480', carpetGn: '#a3c6a6',
  carpetP: '#a892bd', carpetPd: '#9781ad', carpetPn: '#bba4cf',
  corr: '#c2c4cb', corrEdge: '#aeb1b9',
  wall: '#5a616d', wallHi: '#6c7480', wallLo: '#444b55',
  wallTop: '#7a828f', wallTopHi: '#8b94a1',
  glass: '#9fc6d8', glassHi: '#c4e2ee', frame: '#42474f',
  rug: '#9d6b6b', rugTrim: '#caa0a0',
  mat: '#8a8f98',
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const TILES = [];
const tile = (name, fn) => { TILES.push({ name, fn }); return TILES.length; };

function flat(base, grout) {
  const [br, bg, bb] = hex(base), [gr, gg, gb] = hex(grout);
  return (img, ox, oy) => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const edge = x === 0 || y === 0;
      const c = edge ? [gr, gg, gb] : [br, bg, bb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
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
  carpetG: tile('carpetG', noisy(PAL.carpetG, PAL.carpetGd, PAL.carpetGn)),
  carpetP: tile('carpetP', noisy(PAL.carpetP, PAL.carpetPd, PAL.carpetPn)),
  corr: tile('corr', flat(PAL.corr, PAL.corrEdge)),
  wall: tile('wall', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wall), [hr, hg, hb] = hex(PAL.wallHi), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 3) c = [hr, hg, hb]; else if (y > 28) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  wallTop: tile('wallTop', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wallTop), [hr, hg, hb] = hex(PAL.wallTopHi), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 6) c = [hr, hg, hb]; else if (y > 24) c = [lr, lg, lb];
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

// ----- region model (stepped footprint, v2) --------------------------------
const VCORR = [30, 33]; // right-of-centre vertical corridor columns

/** Stepped building footprint — a notch on the left mid-height breaks the box. */
function inside(x, y) {
  if (y < 2 || y > 37 || x > 55) return false;
  let left = 2;
  if (y >= 12 && y <= 20) left = 7;          // left notch (organic silhouette)
  if (x < left) return false;
  // top-right corner is clipped a touch for shape
  if (y < 4 && x > 50) return false;
  return true;
}
function region(x, y) {
  if (!inside(x, y)) return 'void';
  if (x >= VCORR[0] && x <= VCORR[1]) return 'corr';
  if (x < VCORR[0]) return y < 24 ? 'eng' : 'lead';
  return y < 15 ? 'plan' : (x < 45 ? 'ops' : 'focus');
}
const FLOOR_GID = { eng: GID.floorA, lead: GID.carpetW, plan: GID.carpetG, ops: GID.carpetB, focus: GID.carpetP, corr: GID.corr };

const doors = new Set([
  '29,12', '29,13',  // eng → corridor
  '34,12', '34,13',  // plan → corridor
  '29,30', '29,31',  // lead → corridor
  '34,26', '34,27',  // ops → corridor
  '44,30', '44,31',  // ops → focus (internal)
  '34,20', '34,21',  // focus → corridor
]);

function classify(x, y) {
  const r = region(x, y);
  if (r === 'void') {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
      if (inside(x + dx, y + dy)) return 'wall';
    return 'void';
  }
  if (doors.has(`${x},${y}`)) return 'floor';
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nr = region(x + dx, y + dy);
    if (nr !== 'void' && nr !== r) return 'wall';
  }
  return 'floor';
}

const floorLayer = new Array(W * H).fill(0);
const wallLayer = new Array(W * H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = classify(x, y), i = y * W + x;
  if (k === 'floor') {
    floorLayer[i] = doors.has(`${x},${y}`) ? GID.mat : FLOOR_GID[region(x, y)];
  } else if (k === 'wall') {
    floorLayer[i] = FLOOR_GID[region(x, y)] || GID.corr;
    wallLayer[i] = classify(x, y - 1) !== 'floor' ? GID.wallTop : GID.wall;
  }
}
// windows on perimeter walls (every ~6 cells along exterior-facing wall runs)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (!wallLayer[i]) continue;
  const exterior = !inside(x, y - 1) || !inside(x, y + 1) || !inside(x - 1, y) || !inside(x + 1, y);
  if (exterior && (x + y) % 6 === 0) wallLayer[i] = GID.window;
}

// ----- objects -------------------------------------------------------------
let oid = 1;
const T = (n) => n * TS;
const furniture = [], seats = [], pois = [], spawns = [], collisions = [];
const prop = (o) => Object.entries(o).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value }));

function furn(sprite, tx, ty, { scale = 0.3, z = 0 } = {}) {
  furniture.push({ id: oid++, name: sprite, type: 'furniture', x: T(tx), y: T(ty), point: true, properties: prop({ sprite, scale, z }) });
}
function seat(tx, ty, { role = 'member', facing = 'down', zone = 'desk' } = {}) {
  seats.push({ id: oid++, name: `seat-${oid}`, type: 'seat', x: T(tx), y: T(ty), point: true, properties: prop({ role, facing, zone }) });
}
function poi(name, tx, ty, tw, th, kind) {
  pois.push({ id: oid++, name, type: 'poi', x: T(tx), y: T(ty), width: T(tw), height: T(th), properties: prop({ kind }) });
}
function spawn(tx, ty) { spawns.push({ id: oid++, name: 'spawn', type: 'spawn', x: T(tx), y: T(ty), point: true, properties: [] }); }

const DESK = 0.3, CHAIR = 0.28;
/** Face-to-face pod: BACK desk on top (agent above, screens away) + FRONT desk
 *  below (agent below, screen visible). Generous gap so seated agents read. */
function pod(cx, cy, role, { topRole = 'member', botRole = 'member', zone = 'desk' } = {}) {
  furn(`desk_${role}_back`, cx, cy - 1.1, { scale: DESK, z: 1 });
  furn('chair_mesh_black', cx, cy - 2.7, { scale: CHAIR, z: 0 });
  seat(cx, cy - 2.7, { role: topRole, facing: 'down', zone });
  furn(`desk_${role}_front`, cx, cy + 2.0, { scale: DESK, z: 3 });
  furn('chair_mesh_dark', cx, cy + 3.6, { scale: CHAIR, z: 4 });
  seat(cx, cy + 3.6, { role: botRole, facing: 'up', zone });
}

// ENG — engineering / AI pods (top-left, large open)
[[12, 7, 'ai'], [20, 7, 'backend'], [26, 7, 'ai'], [13, 18, 'backend'], [21, 18, 'ai'], [27, 18, 'backend']]
  .forEach(([x, y, role]) => pod(x, y, role));
furn('whiteboard_chart', 9, 3.4, { scale: 0.26 });
furn('plant_small', 28, 3.6, { scale: 0.32 });
furn('bookshelf_narrow', 8, 22.5, { scale: 0.3 });
furn('plant_small', 3, 9, { scale: 0.32 });
poi('eng-zone', 2, 2, 27, 22, 'desk');

// LEAD — tech lead / human approval (bottom-left)
for (let x = 4; x <= 14; x++) for (let y = 28; y <= 35; y++) floorLayer[y * W + x] = GID.rug;
furn('desk_analyst_back', 9, 27.4, { scale: 0.34, z: 1 });
furn('chair_exec_black', 9, 26, { scale: 0.32 });
seat(9, 26, { role: 'lead', facing: 'down', zone: 'desk' });
furn('chair_blue', 5, 32, { scale: CHAIR }); seat(5, 32, { role: 'visitor', facing: 'up', zone: 'approval' });
furn('chair_green', 13, 32, { scale: CHAIR }); seat(13, 32, { role: 'visitor', facing: 'up', zone: 'approval' });
furn('whiteboard_blank', 4, 25.4, { scale: 0.28 });
furn('bookshelf_narrow', 26, 28, { scale: 0.3 });
furn('framed_picture', 20, 25.4, { scale: 0.24 });
furn('plant_small', 27, 36, { scale: 0.32 });
furn('file_cabinet', 3, 36, { scale: 0.3 });
furn('side_table', 19, 35, { scale: 0.3 });
poi('lead-zone', 2, 24, 27, 13, 'desk');
poi('approval', 4, 30, 11, 5, 'approval');

// PLAN — planning / design / library (top-right, green)
furn('desk_analyst_front', 40, 9, { scale: 0.32, z: 3 });
furn('chair_blue', 40, 10.4, { scale: CHAIR }); seat(40, 10.4, { role: 'product', facing: 'up', zone: 'planning-area' });
furn('desk_designer_front', 49, 9, { scale: 0.32, z: 3 });
furn('chair_green', 49, 10.4, { scale: CHAIR }); seat(49, 10.4, { role: 'product', facing: 'up', zone: 'planning-area' });
furn('bookshelf_wide', 44, 3.6, { scale: 0.34 });
furn('whiteboard_blank', 36, 3.4, { scale: 0.28 });
furn('globe', 54, 13, { scale: 0.32 });
furn('plant_small', 35, 13, { scale: 0.32 });
poi('plan-zone', 34, 2, 22, 13, 'planning-area');
poi('planning-area', 38, 6, 16, 5, 'planning-area');

// OPS — review / ops (mid-right, blue)
furn('desk_backend_back', 39, 19.4, { scale: 0.32, z: 1 });
furn('chair_mesh_black', 39, 18, { scale: CHAIR }); seat(39, 18, { role: 'devops', facing: 'down', zone: 'review-table' });
furn('desk_backend_front', 39, 26, { scale: 0.32, z: 3 });
furn('chair_mesh_dark', 39, 27.6, { scale: CHAIR }); seat(39, 27.6, { role: 'devops', facing: 'up', zone: 'review-table' });
furn('server_rack', 43, 17, { scale: 0.34 });
furn('equipment_rack', 35, 17, { scale: 0.32 });
furn('monitor_flow_1', 36, 31, { scale: 0.26 });
furn('monitor_dashboard', 42, 31, { scale: 0.24 });
furn('printer', 35, 36, { scale: 0.3 });
furn('cabinet_tall', 43, 36, { scale: 0.32 });
poi('ops-zone', 34, 15, 11, 22, 'review-table');
poi('review-table', 36, 22, 8, 4, 'review-table');

// FOCUS — lounge / standup / focus (bottom-right, mauve)
furn('side_table', 50, 22, { scale: 0.32 });
furn('chair_blue', 47, 21, { scale: CHAIR });
furn('chair_green', 53, 21, { scale: CHAIR });
furn('plant_small', 54, 17, { scale: 0.32 });
furn('watercooler', 46, 17, { scale: 0.32 });
furn('stool_red', 50, 33, { scale: 0.28 });
furn('framed_picture', 54, 30, { scale: 0.24 });
poi('standup', 46, 18, 9, 7, 'meeting-room');
poi('lounge', 47, 28, 8, 7, 'lounge');

// Corridor — circulation + plants
furn('plant_small', 31, 4, { scale: 0.3 });
furn('watercooler', 31, 36, { scale: 0.3 });
furn('plant_small', 32, 22, { scale: 0.3 });
spawn(31, 37); spawn(32, 37);

// wall collisions
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wallLayer[y * W + x])
  collisions.push({ id: oid++, name: 'wall', type: 'collision', x: T(x), y: T(y), width: TS, height: TS, properties: [] });

// ----- emit .tmj ------------------------------------------------------------
const layer = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
const grp = (id, name, objects) => ({ id, name, type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, objects, draworder: 'topdown' });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TS, tileheight: TS, infinite: false, backgroundcolor: '#15171c',
  nextlayerid: 8, nextobjectid: oid,
  tilesets: [{ firstgid: 1, name: 'lab', image: 'tiles.png', imagewidth: COLS * TS, imageheight: TS, tilewidth: TS, tileheight: TS, tilecount: COLS, columns: COLS, margin: 0, spacing: 0 }],
  layers: [
    layer(1, 'floor', floorLayer),
    layer(2, 'walls', wallLayer),
    grp(3, 'furniture', furniture),
    grp(4, 'seats', seats),
    grp(5, 'pois', pois),
    grp(6, 'spawns', spawns),
    grp(7, 'collisions', collisions),
  ],
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'yule-agent-lab.tmj'), JSON.stringify(map));
console.log(`tiles.png ${COLS} tiles (${COLS * TS}x${TS})`);
console.log(`yule-agent-lab.tmj ${W}x${H} (${PXW}x${PXH}px)  furniture=${furniture.length} seats=${seats.length} pois=${pois.length} collisions=${collisions.length}`);

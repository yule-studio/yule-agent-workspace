/**
 * Generate the Yule Agent Lab metadata map (yule-agent-lab.tmj) and publish the
 * floor base image.
 *
 *   node scripts/gen-lab-map.mjs
 *
 * The Floor View's ONLY visual background is office-shell-floorplan-v2.png — the
 * walls, floor, rooms, windows and corridor all live in that image. This script
 * therefore:
 *   • copies office-shell-floorplan-v2.png → public so the runtime loads it as
 *     the single base layer (stretched to the world so coordinates align);
 *   • emits an OBJECT-ONLY Tiled map (seats / pois / spawns / doors / wall
 *     collisions) — NO floor/wall tile layers, NO tileset. Tiled is metadata
 *     only; it never draws the floor or walls.
 *
 * Zones (matching the image): ENG (top-left) / LEAD (bottom-left) / PLAN
 * (top-right) / STAND (mid-right) / OPS (bottom-right) / FOCUS (bottom-right).
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const VENDOR = path.join(ROOT, 'apps/web/public/vendor/yule-office');
const PUBASSETS = path.join(ROOT, 'apps/web/public/assets/yule-office');

const TS = 32;
const W = 58, H = 42;       // world grid (matches the analyze-floorplan trace of v2)
const PXW = W * TS, PXH = H * TS;

// publish the v2 floorplan as the runtime base image
fs.mkdirSync(PUBASSETS, { recursive: true });
fs.copyFileSync(path.join(REF, 'office-shell-floorplan-v2.png'), path.join(PUBASSETS, 'office-shell-floorplan-v2.png'));

// ----- region model (traced from v2) — used for wall collisions + zone sense --
const CORR = [31, 34];      // vertical corridor columns
const MIDV = 25;            // eng|lead and plan/stand | ops/focus split rows
const PLAN_BOT = 16, STAND_TOP = 18, STAND_BOT = 24;
const PURP_X = 45;          // ops | focus split column

/** Stepped building footprint with two left-wall window bays. */
function inside(x, y) {
  if (y < 3 || y > 38 || x > 56) return false;
  let left = 5;
  if ((y >= 6 && y <= 9) || (y >= 13 && y <= 16)) left = 3;
  if (x < left) return false;
  if (y < 4 && x > 52) return false;
  return true;
}
function region(x, y) {
  if (!inside(x, y)) return 'void';
  if (x >= CORR[0] && x <= CORR[1]) return 'corr';
  if (x < CORR[0]) return y < MIDV ? 'eng' : 'lead';
  if (y <= PLAN_BOT) return 'plan';
  if (y >= STAND_TOP && y <= STAND_BOT) return 'stand';
  if (y > STAND_BOT) return x < PURP_X ? 'ops' : 'focus';
  return 'corr';
}

const doors = new Set([
  '30,11', '30,12', '30,30', '30,31', '35,10', '35,11',
  '35,21', '35,22', '35,29', '35,30', '44,32', '44,33',
]);
const DOOR_META = [
  { x: 30, y: 11, dir: 'v', zone: 'eng' }, { x: 30, y: 30, dir: 'v', zone: 'lead' },
  { x: 35, y: 10, dir: 'v', zone: 'plan' }, { x: 35, y: 21, dir: 'v', zone: 'stand' },
  { x: 35, y: 29, dir: 'v', zone: 'ops' }, { x: 44, y: 32, dir: 'v', zone: 'focus' },
];

/** A wall cell = an interior region boundary (doorways excluded). */
function isWall(x, y) {
  const r = region(x, y);
  if (r === 'void') {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
      if (inside(x + dx, y + dy)) return true;
    return false;
  }
  if (doors.has(`${x},${y}`)) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nr = region(x + dx, y + dy);
    if (nr !== 'void' && nr !== r) return true;
  }
  return false;
}

// ----- objects --------------------------------------------------------------
let oid = 1;
const T = (n) => n * TS;
const furniture = [], seats = [], pois = [], spawns = [], doorsObj = [], collisions = [];
const prop = (o) => Object.entries(o).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value }));

function furn(sprite, tx, ty, { scale = 0.3, z = 0 } = {}) {
  furniture.push({ id: oid++, name: sprite, type: 'furniture', x: T(tx), y: T(ty), point: true, properties: prop({ sprite, scale, z }) });
}
function seat(tx, ty, { role = 'member', facing = 'down', zone = 'desk', desk = '' } = {}) {
  const d = desk || (facing === 'down' ? 'desk_ai_back' : 'desk_ai_front');
  seats.push({ id: oid++, name: `seat-${oid}`, type: 'seat', x: T(tx), y: T(ty), point: true, properties: prop({ role, facing, zone, desk: d }) });
}
function poi(name, tx, ty, tw, th, kind) {
  pois.push({ id: oid++, name, type: 'poi', x: T(tx), y: T(ty), width: T(tw), height: T(th), properties: prop({ kind }) });
}
function spawn(tx, ty) { spawns.push({ id: oid++, name: 'spawn', type: 'spawn', x: T(tx), y: T(ty), point: true, properties: [] }); }

const CHAIR = 0.26;
const COLW = 4.0, ROWSPAN = 5;

/** Cubicle cluster: cols × two rows. Runtime renders occupied seats as seated
 *  composites and empty seats as a plain desk; seats only here. */
function cluster(x0, y0, cols, role, zone = 'desk') {
  for (let c = 0; c < cols; c++) {
    const cx = x0 + c * COLW;
    seat(cx, y0, { role, facing: 'down', zone, desk: `desk_${role}_back` });
    seat(cx, y0 + ROWSPAN, { role, facing: 'up', zone, desk: `desk_${role}_front` });
  }
}

// ENG — Main Engineering Pod
cluster(9, 8, 3, 'ai', 'desk');
cluster(22, 8, 2, 'backend', 'desk');
cluster(9, 18, 3, 'backend', 'desk');
cluster(22, 18, 2, 'ai', 'desk');
furn('whiteboard_chart', 8, 5.2, { scale: 0.26 });
furn('plant_small', 6, 7, { scale: 0.3 });
furn('plant_small', 6, 14, { scale: 0.3 });
poi('eng-zone', 5, 4, 25, 20, 'desk');

// LEAD — Tech Lead / Human Approval
seat(13, 28, { role: 'lead', facing: 'down', zone: 'desk', desk: 'desk_analyst_back' });
furn('chair_blue', 9, 33, { scale: CHAIR });
furn('chair_green', 17, 33, { scale: CHAIR });
furn('whiteboard_blank', 6, 26.5, { scale: 0.3 });
furn('plant_small', 7, 36.5, { scale: 0.3 });
poi('lead-zone', 5, 25, 25, 13, 'desk');
poi('approval', 7, 31, 13, 5, 'approval');

// PLAN — Product / Planning / Library
furn('bookshelf_wide', 44, 5.2, { scale: 0.32 });
furn('bookshelf_narrow', 54, 6, { scale: 0.3 });
furn('whiteboard_chart', 38, 5.2, { scale: 0.26 });
seat(41, 12, { role: 'product', facing: 'down', zone: 'planning-area', desk: 'desk_analyst_front' });
seat(49, 12, { role: 'product', facing: 'down', zone: 'planning-area', desk: 'desk_designer_front' });
furn('globe', 55, 14, { scale: 0.3 });
poi('plan-zone', 35, 4, 21, 12, 'planning-area');
poi('planning-area', 39, 9, 14, 5, 'planning-area');

// STAND — Standup / Chat zone
furn('side_table', 44, 21, { scale: 0.34 });
furn('chair_blue', 41, 20.5, { scale: CHAIR });
furn('chair_green', 47, 20.5, { scale: CHAIR });
furn('plant_small', 54, 19, { scale: 0.3 });
poi('standup', 38, 18.5, 16, 5, 'meeting-room');

// OPS — Review / Ops
furn('server_rack', 36, 27, { scale: 0.32 });
furn('monitor_flow_1', 39, 26.6, { scale: 0.24 });
furn('monitor_dashboard', 42, 26.6, { scale: 0.22 });
seat(39, 30, { role: 'devops', facing: 'down', zone: 'review-table', desk: 'desk_backend_back' });
seat(39, 35, { role: 'devops', facing: 'up', zone: 'review-table', desk: 'desk_backend_front' });
poi('ops-zone', 35, 25, 9, 13, 'review-table');
poi('review-table', 36, 31, 8, 4, 'review-table');

// FOCUS — Focus / Utility wall
furn('printer', 53, 27, { scale: 0.3 });
furn('cabinet_tall', 47, 26.5, { scale: 0.3 });
furn('watercooler', 50, 27, { scale: 0.3 });
furn('bookshelf_narrow', 55, 31, { scale: 0.3 });
seat(48, 33, { role: 'member', facing: 'down', zone: 'focus', desk: 'desk_designer_back' });
furn('plant_small', 55, 36, { scale: 0.3 });
poi('focus-zone', 45, 25, 11, 13, 'lounge');
poi('lounge', 50, 33, 6, 4, 'lounge');

// CORRIDOR — circulation spine
furn('plant_small', 32, 5, { scale: 0.3 });
furn('watercooler', 32, 20, { scale: 0.3 });
furn('plant_small', 32, 36.5, { scale: 0.3 });
spawn(32, 37); spawn(33, 37);

for (const d of DOOR_META) doorsObj.push({ id: oid++, name: 'door', type: 'door', x: T(d.x) + TS / 2, y: T(d.y) + TS, point: true, properties: prop({ dir: d.dir, zone: d.zone }) });

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWall(x, y))
  collisions.push({ id: oid++, name: 'wall', type: 'collision', x: T(x), y: T(y), width: TS, height: TS, properties: [] });

// ----- emit object-only .tmj (NO tile layers, NO tileset) -------------------
const grp = (id, name, objects) => ({ id, name, type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, objects, draworder: 'topdown' });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TS, tileheight: TS, infinite: false, backgroundcolor: '#15171c',
  nextlayerid: 7, nextobjectid: oid, tilesets: [],
  layers: [
    grp(1, 'furniture', furniture),
    grp(2, 'seats', seats),
    grp(3, 'pois', pois),
    grp(4, 'spawns', spawns),
    grp(5, 'doors', doorsObj),
    grp(6, 'collisions', collisions),
  ],
};
fs.mkdirSync(VENDOR, { recursive: true });
fs.writeFileSync(path.join(VENDOR, 'yule-agent-lab.tmj'), JSON.stringify(map));
console.log(`base image → public/assets/yule-office/office-shell-floorplan-v2.png`);
console.log(`yule-agent-lab.tmj ${W}x${H} (${PXW}x${PXH}px, object-only)  furniture=${furniture.length} seats=${seats.length} pois=${pois.length} doors=${doorsObj.length} collisions=${collisions.length}`);

/**
 * Generate the Yule Agent Lab map: a clean floor/wall tileset (tiles.png) + the
 * Tiled map (yule-agent-lab.tmj), traced from office-shell-floorplan-v2.png.
 *
 *   node scripts/gen-lab-map.mjs
 *
 * Layout is the single source of truth from office-shell-floorplan-v2 (see
 * scripts/analyze-floorplan.mjs): a stepped silhouette with a right-of-centre
 * vertical corridor and six zones —
 *   ENG    (large gray, top-left)      Main Engineering / AI pods
 *   LEAD   (orange, bottom-left)       Tech Lead / Human Approval office
 *   PLAN   (green, top-right)          Product / Planning / Library
 *   STAND  (tan strip, mid-right)      Standup / Chat zone
 *   OPS    (blue, bottom-right-left)   Review / Ops
 *   FOCUS  (mauve, bottom-right-right) Focus / Utility wall
 *
 * Floor colours are sampled from the reference. Walls are flat (no stripes) with
 * a thin lit cap. Desks are placed as *attached* clusters (back+front rows
 * touching, side-by-side), and every prop has a purpose-driven home.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blankImage, setPx, writePNG } from './lib/png.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const OUT = path.join(ROOT, 'apps/web/public/vendor/yule-office');

const TS = 32;
const W = 58, H = 42;
const PXW = W * TS, PXH = H * TS;

// floor palette sampled from office-shell-floorplan-v2 (slightly punched)
const PAL = {
  eng: '#bab5b0', engN: '#b0aba6',
  corr: '#c7c2bc', corrN: '#bdb8b2',
  lead: '#c49e82', leadN: '#b78f73', leadL: '#cfae93',
  plan: '#9fb589', planN: '#90a87a', planL: '#aec199',
  stand: '#b5907c', standN: '#a8836f', standL: '#c29d89',
  ops: '#9aa3b4', opsN: '#8b94a6', opsL: '#a9b1c0',
  focus: '#ad9fab', focusN: '#9f909d', focusL: '#bbadb8',
  wall: '#928d86', wallCap: '#aaa49b', wallLo: '#6d685f',
  glass: '#a9d2e0', glassHi: '#cdeaf2', frame: '#3f4651',
  rug: '#8f5f5f', rugTrim: '#b88f8f',
  mat: '#8d8881',
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const TILES = [];
const tile = (name, fn) => { TILES.push({ name, fn }); return TILES.length; };

/** Flat floor with very faint per-tile shading — no heavy grout lines. */
function floor(base, near, light) {
  const [br, bg, bb] = hex(base), [nr, ng, nb] = hex(near), [lr, lg, lb] = light ? hex(light) : hex(base);
  return (img, ox, oy) => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = (x * 5 + y * 11 + ((x * y) >> 2)) % 17;
      let c = [br, bg, bb];
      if (n === 0) c = [nr, ng, nb];
      else if (n === 9 && light) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  };
}
function solid(base) { const [r, g, b] = hex(base); return (img, ox, oy) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) setPx(img, ox + x, oy + y, r, g, b, 255); }; }

const GID = {
  eng: tile('eng', floor(PAL.eng, PAL.engN)),
  corr: tile('corr', floor(PAL.corr, PAL.corrN)),
  lead: tile('lead', floor(PAL.lead, PAL.leadN, PAL.leadL)),
  plan: tile('plan', floor(PAL.plan, PAL.planN, PAL.planL)),
  stand: tile('stand', floor(PAL.stand, PAL.standN, PAL.standL)),
  ops: tile('ops', floor(PAL.ops, PAL.opsN, PAL.opsL)),
  focus: tile('focus', floor(PAL.focus, PAL.focusN, PAL.focusL)),
  // clean wall: flat body + thin lit cap on top + thin shadow at base (no stripes)
  wall: tile('wall', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wall), [cr, cg, cb] = hex(PAL.wallCap), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 2) c = [cr, cg, cb]; else if (y > 29) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  // north-facing wall cap: lit top band (reads as wall thickness seen from front)
  wallTop: tile('wallTop', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.wall), [cr, cg, cb] = hex(PAL.wallCap), [lr, lg, lb] = hex(PAL.wallLo);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [r, g, b];
      if (y < 9) c = [cr, cg, cb]; else if (y > 27) c = [lr, lg, lb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  window: tile('window', (img, ox, oy) => {
    const [fr, fg, fb] = hex(PAL.frame), [gr, gg, gb] = hex(PAL.glass), [hr, hg, hb] = hex(PAL.glassHi), [cr, cg, cb] = hex(PAL.wallCap);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = [fr, fg, fb];
      if (y < 3) c = [cr, cg, cb];
      else if (x > 3 && x < 28 && y > 6 && y < 26) c = (x + y) % 7 < 3 ? [hr, hg, hb] : [gr, gg, gb];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  rug: tile('rug', (img, ox, oy) => {
    const [r, g, b] = hex(PAL.rug), [tr, tg, tb] = hex(PAL.rugTrim);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const border = x < 2 || y < 2 || x > 29 || y > 29;
      const c = border ? [tr, tg, tb] : [r, g, b];
      setPx(img, ox + x, oy + y, c[0], c[1], c[2], 255);
    }
  }),
  mat: tile('mat', solid(PAL.mat)),
};

const COLS = TILES.length;
const tileset = blankImage(COLS * TS, TS);
TILES.forEach((t, i) => t.fn(tileset, i * TS, 0));
writePNG(path.join(OUT, 'tiles.png'), tileset);

// ----- footprint + regions (traced from v2) --------------------------------
const CORR = [31, 34];   // vertical corridor columns
const MIDV = 25;          // eng|lead and plan/stand | ops/focus split rows
const PLAN_BOT = 16, STAND_TOP = 18, STAND_BOT = 24; // right-column row bands
const PURP_X = 45;        // ops | focus split column

/** Stepped building footprint with two left-wall window bays. */
function inside(x, y) {
  if (y < 3 || y > 38 || x > 56) return false;
  let left = 5;
  if ((y >= 6 && y <= 9) || (y >= 13 && y <= 16)) left = 3; // bays jut outward
  if (x < left) return false;
  if (y < 4 && x > 52) return false; // small top-right clip
  return true;
}
function region(x, y) {
  if (!inside(x, y)) return 'void';
  if (x >= CORR[0] && x <= CORR[1]) return 'corr';
  if (x < CORR[0]) return y < MIDV ? 'eng' : 'lead';
  if (y <= PLAN_BOT) return 'plan';
  if (y >= STAND_TOP && y <= STAND_BOT) return 'stand';
  if (y > STAND_BOT) return x < PURP_X ? 'ops' : 'focus';
  return 'corr'; // thin transition rows fold into corridor feel
}
const FLOOR_GID = { eng: GID.eng, lead: GID.lead, plan: GID.plan, stand: GID.stand, ops: GID.ops, focus: GID.focus, corr: GID.corr };

const doors = new Set([
  '30,11', '30,12',   // eng → corridor
  '30,30', '30,31',   // lead → corridor
  '35,10', '35,11',   // corridor → plan
  '35,21', '35,22',   // corridor → stand
  '35,29', '35,30',   // corridor → ops
  '44,32', '44,33',   // ops → focus (internal)
]);
const DOOR_META = [
  { x: 30, y: 11, dir: 'v', zone: 'eng' }, { x: 30, y: 30, dir: 'v', zone: 'lead' },
  { x: 35, y: 10, dir: 'v', zone: 'plan' }, { x: 35, y: 21, dir: 'v', zone: 'stand' },
  { x: 35, y: 29, dir: 'v', zone: 'ops' }, { x: 44, y: 32, dir: 'v', zone: 'focus' },
];

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
  if (k === 'floor') floorLayer[i] = doors.has(`${x},${y}`) ? GID.mat : FLOOR_GID[region(x, y)];
  else if (k === 'wall') {
    floorLayer[i] = FLOOR_GID[region(x, y)] || GID.corr;
    wallLayer[i] = classify(x, y - 1) !== 'floor' ? GID.wallTop : GID.wall;
  }
}
// windows on exterior-facing perimeter walls
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (!wallLayer[i]) continue;
  const exterior = !inside(x, y - 1) || !inside(x, y + 1) || !inside(x - 1, y) || !inside(x + 1, y);
  if (exterior && (x + y * 3) % 6 === 0) wallLayer[i] = GID.window;
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
const COLW = 4.0;    // column pitch so neighbouring workstations touch
const ROWSPAN = 5;   // vertical pitch between the two cubicle rows

/**
 * A cubicle cluster: `cols` columns × two rows of workstations. The runtime
 * renders each occupied seat as the artist's seated-at-desk composite (top row
 * = wsfront/face, bottom row = wsback/back), and an empty desk when the agent
 * is away. Seats only — no separate desk/chair furniture (the scene owns them).
 */
function cluster(x0, y0, cols, role, zone = 'desk') {
  for (let c = 0; c < cols; c++) {
    const cx = x0 + c * COLW;
    seat(cx, y0, { role, facing: 'down', zone, desk: `desk_${role}_back` });
    seat(cx, y0 + ROWSPAN, { role, facing: 'up', zone, desk: `desk_${role}_front` });
  }
}

// ENG — Main Engineering Pod (two attached clusters of 3 columns)
cluster(9, 8, 3, 'ai', 'desk');
cluster(22, 8, 2, 'backend', 'desk');
cluster(9, 18, 3, 'backend', 'desk');
cluster(22, 18, 2, 'ai', 'desk');
furn('whiteboard_chart', 8, 5.2, { scale: 0.26 });   // wall board
furn('plant_small', 6, 7, { scale: 0.3 });            // window bay corner
furn('plant_small', 6, 14, { scale: 0.3 });           // window bay corner
poi('eng-zone', 5, 4, 25, 20, 'desk');

// LEAD — Tech Lead / Human Approval (orange, bottom-left): lead desk on rug,
// visitor chairs facing it, approval board on wall, plant by door.
for (let x = 8; x <= 20; x++) for (let y = 29; y <= 36; y++) floorLayer[y * W + x] = GID.rug;
seat(13, 28, { role: 'lead', facing: 'down', zone: 'desk', desk: 'desk_analyst_back' });
furn('chair_blue', 9, 33, { scale: CHAIR });          // visitor chairs (decor)
furn('chair_green', 17, 33, { scale: CHAIR });
furn('whiteboard_blank', 6, 26.5, { scale: 0.3 });    // approval board (wall)
furn('plant_small', 7, 36.5, { scale: 0.3 });          // door-side plant
poi('lead-zone', 5, 25, 25, 13, 'desk');
poi('approval', 7, 31, 13, 5, 'approval');

// PLAN — Product / Planning / Library (green, top-right): planning desks facing
// down toward a board wall, bookshelves + globe on the walls.
furn('bookshelf_wide', 44, 5.2, { scale: 0.32 });      // back wall library
furn('bookshelf_narrow', 54, 6, { scale: 0.3 });
furn('whiteboard_chart', 38, 5.2, { scale: 0.26 });    // roadmap board on wall
seat(41, 12, { role: 'product', facing: 'down', zone: 'planning-area', desk: 'desk_analyst_front' });
seat(49, 12, { role: 'product', facing: 'down', zone: 'planning-area', desk: 'desk_designer_front' });
furn('globe', 55, 14, { scale: 0.3 });                 // corner globe
poi('plan-zone', 35, 4, 21, 12, 'planning-area');
poi('planning-area', 39, 9, 14, 5, 'planning-area');

// STAND — Standup / Chat zone (tan strip, mid-right): a small table, lounge chairs.
furn('side_table', 44, 21, { scale: 0.34 });
furn('chair_blue', 41, 20.5, { scale: CHAIR });
furn('chair_green', 47, 20.5, { scale: CHAIR });
furn('plant_small', 54, 19, { scale: 0.3 });
poi('standup', 38, 18.5, 16, 5, 'meeting-room');

// OPS — Review / Ops (blue, bottom-right-left): a review pod facing a CI wall,
// server rack + monitors on the equipment wall.
furn('server_rack', 36, 27, { scale: 0.32 });          // equipment wall
furn('monitor_flow_1', 39, 26.6, { scale: 0.24 });     // CI monitor (wall)
furn('monitor_dashboard', 42, 26.6, { scale: 0.22 });  // deploy board (wall)
seat(39, 30, { role: 'devops', facing: 'down', zone: 'review-table', desk: 'desk_backend_back' });
seat(39, 35, { role: 'devops', facing: 'up', zone: 'review-table', desk: 'desk_backend_front' });
poi('ops-zone', 35, 25, 9, 13, 'review-table');
poi('review-table', 36, 31, 8, 4, 'review-table');

// FOCUS — Focus / Utility wall (mauve, bottom-right-right): utility wall
// (printer, water cooler, cabinet, shelf) + a quiet focus seat.
furn('printer', 53, 27, { scale: 0.3 });               // utility wall
furn('cabinet_tall', 47, 26.5, { scale: 0.3 });
furn('watercooler', 50, 27, { scale: 0.3 });
furn('bookshelf_narrow', 55, 31, { scale: 0.3 });
seat(48, 33, { role: 'member', facing: 'down', zone: 'focus', desk: 'desk_designer_back' });
furn('plant_small', 55, 36, { scale: 0.3 });
poi('focus-zone', 45, 25, 11, 13, 'lounge');
poi('lounge', 50, 33, 6, 4, 'lounge');

// CORRIDOR — circulation spine: a plant at each end, water cooler mid (rest stop).
furn('plant_small', 32, 5, { scale: 0.3 });
furn('watercooler', 32, 20, { scale: 0.3 });           // corridor rest point
furn('plant_small', 32, 36.5, { scale: 0.3 });
spawn(32, 37); spawn(33, 37);

// doors object layer (animated by the runtime). Each opening is 2 cells tall;
// anchor the door at the opening centre so it reads as flush in the wall.
for (const d of DOOR_META) doorsObj.push({ id: oid++, name: 'door', type: 'door', x: T(d.x) + TS / 2, y: T(d.y) + TS, point: true, properties: prop({ dir: d.dir, zone: d.zone }) });

// wall collisions (doorways excluded)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wallLayer[y * W + x])
  collisions.push({ id: oid++, name: 'wall', type: 'collision', x: T(x), y: T(y), width: TS, height: TS, properties: [] });

// ----- emit .tmj ------------------------------------------------------------
const layer = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
const grp = (id, name, objects) => ({ id, name, type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, objects, draworder: 'topdown' });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TS, tileheight: TS, infinite: false, backgroundcolor: '#15171c',
  nextlayerid: 10, nextobjectid: oid,
  tilesets: [{ firstgid: 1, name: 'lab', image: 'tiles.png', imagewidth: COLS * TS, imageheight: TS, tilewidth: TS, tileheight: TS, tilecount: COLS, columns: COLS, margin: 0, spacing: 0 }],
  layers: [
    layer(1, 'floor', floorLayer),
    layer(2, 'walls', wallLayer),
    grp(3, 'furniture', furniture),
    grp(4, 'seats', seats),
    grp(5, 'pois', pois),
    grp(6, 'spawns', spawns),
    grp(7, 'doors', doorsObj),
    grp(8, 'collisions', collisions),
  ],
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'yule-agent-lab.tmj'), JSON.stringify(map));
console.log(`tiles.png ${COLS} tiles (${COLS * TS}x${TS})`);
console.log(`yule-agent-lab.tmj ${W}x${H} (${PXW}x${PXH}px)  furniture=${furniture.length} seats=${seats.length} pois=${pois.length} doors=${doorsObj.length} collisions=${collisions.length}`);

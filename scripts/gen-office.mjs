/**
 * Office asset generator — bakes a license-clean pixel-art TILESET (PNG atlas)
 * and a Tiled-format MAP (.tmj) that composes a top-down office from those
 * tiles. No third-party art is used; everything here is our own pixel work, so
 * it is safe to commit to a public repo. The structure (tile layers + object
 * layers for seats/collisions/pois/spawns) mirrors a standard Tiled/Phaser
 * setup, so a Phaser renderer is a drop-in later. Run: `node scripts/gen-office.mjs`.
 *
 * Output (apps/web/public/vendor/office/):
 *   tileset.png   — the tile atlas (TS px tiles, ATLAS_COLS wide)
 *   office.tmj    — the Tiled JSON map (tile layers + object layers)
 *   tiles.json    — name -> gid index (used by the renderer + seat logic)
 *
 * NOTE: large by design (a generated asset / declarative tile registry).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const TS = 64; // output tile size (px) — higher res so sprites carry more detail
const DS = 32; // design grid unit; simple tiles are authored in DS and scaled to TS
const S = TS / DS; // scale factor (2)
const ATLAS_COLS = 12;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web/public/vendor/office');

// ── cool-palette (graphite + lavender / sage / rose / coral, no yellow/brown) ──
const PAL = {
  carpetA: '#8b9099', carpetB: '#82878f', carpetC: '#90959d', seam: '#71767e',
  tileA: '#c4c8c2', tileB: '#bbbfb9', tileSeam: '#a9ada7',
  corridor: '#9ba1a9', corridorSeam: '#8b9099',
  wall: '#d4d5ce', wallHi: '#e7e8e1', wallSh: '#a7a89f', wallFace: '#b7b8af', wallFaceSh: '#999a91',
  desk: '#aab0b8', deskHi: '#c2c7ce', deskSh: '#7c828b', deskEdge: '#666c75', grain: '#9aa0a8',
  // material-separated workstation tones: laminate top / dark front / blue-gray
  // fabric partition / dark slate posts / graphite legs (so structure reads).
  deskTop: '#d6d0c1', deskTopHi: '#e8e3d5', deskTopGrain: '#c0baab', // pale cream laminate (ref)
  deskFront: '#5f656f', deskSide: '#8b9099', deskLip: '#4b505a',
  partPanel: '#6f7a8f', partPanelHi: '#828ea3', partPanelSh: '#566072',
  partPost: '#2c333d', leg: '#33383f',
  bezel: '#14181f', bezelHi: '#283040',
  key: '#c9ced7', keyDk: '#9aa0ab',
  chair: '#39414f', chairHi: '#566073', chairSeat: '#4b5466', wheel: '#23272f',
  metal: '#586273', metalHi: '#6c7686', metalSh: '#3a414c',
  pot: '#3a4250', leaf1: '#6fa07a', leaf2: '#8fb58f', leaf3: '#54836a',
  lav: '#a99cff', lav2: '#8c93d8', sage: '#9fbd9f', rose: '#d98aa5', coral: '#e47b89', plum: '#b58ac4',
  paper: '#e8eaef', paperLn: '#a9afba', box: '#8f8676', boxHi: '#a89e8a',
  ink: '#2c323b', white: '#ffffff',
};
// screen palettes [bg, ink1, ink2] — code / terminal / design / dashboard / CRM / diff
const SCREENS = [
  ['#1e2740', '#8c93d8', '#a99cff'],
  ['#16241a', '#9fbd9f', '#7fae8a'],
  ['#2a1d33', '#d98aa5', '#e0a3b8'],
  ['#1d2742', '#8c93d8', '#9fbd9f'],
  ['#231b2e', '#b58ac4', '#d98aa5'],
  ['#152030', '#7fae8a', '#8c93d8'],
];

// ── tiny pixel buffer over the whole atlas ─────────────────────────────────
function hex(h) {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
class Atlas {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.w = cols * TS; this.h = rows * TS;
    this.buf = new Uint8Array(this.w * this.h * 4); // RGBA, transparent
  }
  px(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; this.buf[i + 3] = 255; return; }
    const ba = this.buf[i + 3] / 255, sa = a / 255, oa = sa + ba * (1 - sa);
    if (oa <= 0) return;
    this.buf[i] = (r * sa + this.buf[i] * ba * (1 - sa)) / oa;
    this.buf[i + 1] = (g * sa + this.buf[i + 1] * ba * (1 - sa)) / oa;
    this.buf[i + 2] = (b * sa + this.buf[i + 2] * ba * (1 - sa)) / oa;
    this.buf[i + 3] = oa * 255;
  }
}

// A per-tile drawing context (origin at the tile's top-left within the atlas).
// r() draws in the 32-unit DESIGN space (scaled ×S to the output cell) — used by
// simple tiles. raw() draws in OUTPUT px (0..TS) — used by detailed workstation
// sprites that author at full resolution.
class Tile {
  constructor(atlas, ox, oy) { this.a = atlas; this.ox = ox; this.oy = oy; }
  raw(x, y, w, h, col, alpha = 255) {
    const [R, G, B] = hex(col);
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.a.px(this.ox + x + xx, this.oy + y + yy, R, G, B, alpha);
  }
  r(x, y, w, h, col, alpha = 255) { this.raw(x * S, y * S, w * S, h * S, col, alpha); }
  fill(col) { this.raw(0, 0, TS, TS, col); }
}

// shared sub-draws (top-down) ------------------------------------------------
function deskTop(t, x, y, w, h) {
  t.r(x, y, w, h, PAL.desk);
  t.r(x, y, w, 2, PAL.deskHi); // back highlight
  t.r(x, y + h - 4, w, 4, PAL.deskSh); // FRONT edge (thickness)
  t.r(x, y + h - 1, w, 1, PAL.deskEdge);
}
// A single workstation desk tile, oriented "front face at the bottom" (the
// agent sits below). Built with real cubicle structure: back partition + posts,
// top surface, distinct front face, side divider panels, legs, contact shadow.
// part = which atlas column (l/m/r) → side detail / seam. 4+ shade levels.
// Workstation desk at FULL output resolution (64px cell). x,w are OUTPUT px.
// Front face at bottom (agent sits below); V-flip in the map for the up-row.
// Reference-style workstation: a CREAM laminate desk with a low dark BACK SHELF
// holding papers + a name plate, thin visible legs, and a clutter-friendly top.
// x,w OUTPUT px. Agent sits below (front at bottom); V-flip in map for up-row.
function wsDesk(t, x, w, part, top = PAL.deskTop, topHi = PAL.deskTopHi) {
  const mid = Math.round(w / 2);
  // front floor contact shadow
  t.raw(x + 1, 61, w - 1, 3, '#1b2230', 42);
  // thin legs (front) — centre + ends, clearly visible against the floor
  t.raw(x + mid - 1, 54, 3, 10, '#2f343b');
  if (part === 'l') t.raw(x + 5, 54, 3, 10, '#2f343b');
  if (part === 'r') t.raw(x + w - 8, 54, 3, 10, '#2f343b');
  // BACK SHELF — low dark ledge (wall shelf) + top highlight + front shadow
  t.raw(x, 0, w, 9, '#3b424c');
  t.raw(x, 0, w, 2, '#525a66');
  t.raw(x, 9, w, 2, '#1b2230', 38); // shelf shadow onto interior
  t.raw(x, 0, 3, 11, '#262c34'); // end post
  if (part === 'r') t.raw(x + w - 3, 0, 3, 11, '#262c34');
  // shelf contents vary per tile: name plate (centre) / papers / box
  if (part === 'm') { t.raw(x + mid - 10, 2, 20, 5, '#21262d'); t.raw(x + mid - 8, 3, 16, 2, '#9fb0c4'); } // name plate
  else if (part === 'l') { t.raw(x + 6, 2, 11, 6, PAL.paper); for (let i = 0; i < 2; i++) t.raw(x + 8, 4 + i * 2, 7, 1, PAL.paperLn); t.raw(x + 20, 3, 7, 5, '#c9cdd4'); }
  else { t.raw(x + w - 17, 3, 9, 5, PAL.box); t.raw(x + w - 17, 3, 9, 1, PAL.boxHi); t.raw(x + w - 28, 2, 10, 6, PAL.paper); }
  // cubicle-interior strip (shadowed floor between shelf and desk = depth)
  t.raw(x, 11, w, 4, '#5f6772');
  t.raw(x, 11, w, 1, '#454c57');
  // desk CREAM laminate top + highlight + grain
  t.raw(x, 15, w, 31, top);
  t.raw(x, 15, w, 4, topHi);
  for (const gy of [23, 30, 37, 43]) t.raw(x + 4, gy, w - 8, 1, PAL.deskTopGrain);
  // thin side edges
  if (part === 'l') t.raw(x, 15, 2, 31, PAL.deskSide);
  if (part === 'r') t.raw(x + w - 2, 15, 2, 31, PAL.deskFront);
  if (part === 'm') t.raw(x + mid, 17, 1, 27, PAL.deskTopGrain); // per-seat seam
  // front face (dark cool) + lip
  t.raw(x, 46, w, 8, PAL.deskFront);
  t.raw(x, 46, w, 1, '#7a818c');
  t.raw(x, 53, w, 1, PAL.deskLip);
}
// monitor at full 64px res: arm/stand/base + bezel + screen UI + highlight.
function monitor(t, cx, cy, scr) {
  const s = SCREENS[scr % SCREENS.length];
  t.raw(cx + 6, cy + 30, 22, 3, '#000000', 38); // contact shadow
  t.raw(cx + 8, cy + 27, 18, 3, PAL.bezel); // base
  t.raw(cx + 15, cy + 22, 6, 6, PAL.bezel); // stand neck
  t.raw(cx + 2, cy, 30, 24, PAL.bezel); // bezel
  t.raw(cx + 2, cy, 30, 3, PAL.bezelHi);
  screenUI(t, cx + 4, cy + 3, 26, 18, s, scr % 4);
  t.raw(cx + 4, cy + 3, 26, 2, '#ffffff', 16); // highlight
}
// varied screen UI inside a region (output px): code / terminal / dashboard / chat
function screenUI(t, x, y, w, h, s, ui) {
  t.raw(x, y, w, h, s[0]);
  if (ui === 0) {
    const lens = [w - 4, w - 10, w - 6, w - 14, w - 8];
    for (let i = 0; i < Math.min(5, (h - 2) / 3 | 0); i++) t.raw(x + 2, y + 3 + i * 3, lens[i % 5], 2, s[1 + (i % 2)]);
  } else if (ui === 1) {
    for (let i = 0; i < 4 && 3 + i * 3 < h; i++) t.raw(x + 2, y + 3 + i * 3, [w - 6, w - 12, 8, w - 9][i], 2, s[2]);
    t.raw(x + 2, y + h - 4, 4, 3, s[1]); // cursor block
  } else if (ui === 2) {
    for (let i = 0; i < 4; i++) t.raw(x + 2 + (i % 2) * (w / 2), y + 2 + ((i / 2) | 0) * (h / 2), (w / 2 - 4) | 0, (h / 2 - 4) | 0, s[1 + (i % 2)]);
  } else {
    for (let i = 0; i < 4; i++) { const xx = i % 2 ? x + w - 11 : x + 2; t.raw(xx, y + 2 + i * 4, 9, 3, s[1 + (i % 2)]); }
  }
}
// top-down office chair. style: task | exec | mesh | visitor. faceUp => backrest
// at bottom (person faces north). 2-3 shade levels; base/wheels/seat/back/arms.
function chairTD(t, faceUp, style = 'task') {
  const seat = style === 'exec' ? '#3a4358' : style === 'mesh' ? '#46524e' : PAL.chairSeat;
  const base = style === 'exec' ? '#41496a' : style === 'mesh' ? '#475a52' : PAL.chair;
  const hi = style === 'exec' ? '#5b6690' : style === 'mesh' ? '#5e766a' : PAL.chairHi;
  const backH = style === 'exec' ? 7 : 5; // executive = high back
  t.r(8, 22, 16, 4, '#000000', 28); // floor contact shadow
  if (style === 'visitor') {
    // visitor chair: 4 legs, no wheels
    for (const dx of [8, 21]) { t.r(dx, 18, 2, 6, PAL.metalSh); t.r(dx, 23, 2, 1, '#23272f'); }
  } else {
    for (const dx of [6, 11, 16, 21]) { t.r(dx, 19, 3, 2, PAL.metalSh); t.r(dx, 21, 2, 2, '#23272f'); }
    t.r(14, 14, 4, 6, PAL.metalSh); // gas lift
  }
  t.r(8, 7, 16, 11, seat);
  t.r(8, 7, 16, 2, hi); // seat highlight
  t.r(8, 16, 16, 2, base); // seat front edge
  if (style === 'mesh') for (let i = 0; i < 4; i++) t.r(10 + i * 4, 10, 1, 6, hi); // mesh ribs
  const by = faceUp ? (style === 'exec' ? 14 : 16) : 3;
  t.r(9, by, 14, backH, base);
  t.r(9, by, 14, 2, hi);
  t.r(6, 9, 3, 8, base); t.r(23, 9, 3, 8, base); // armrests
}
function plantTD(t, big) {
  t.r(10, 26, 12, 3, '#000000', 30);
  t.r(8, 20, 16, 9, PAL.pot);
  t.r(8, 20, 16, 2, PAL.metalHi);
  if (big) {
    t.r(15, 4, 2, 16, PAL.leaf3);
    t.r(8, 2, 8, 6, PAL.leaf1); t.r(16, 4, 8, 6, PAL.leaf2);
    t.r(10, 9, 7, 6, PAL.leaf3); t.r(15, 11, 8, 6, PAL.leaf1);
  } else {
    t.r(7, 9, 18, 12, PAL.leaf2);
    t.r(10, 6, 12, 7, PAL.leaf1);
    t.r(6, 13, 7, 7, PAL.leaf3); t.r(19, 14, 7, 6, PAL.leaf3);
  }
}

// ── TILE REGISTRY — order defines the gid (index 0 -> gid 1) ────────────────
const TILES = [
  // floors (fully opaque)
  ['floor_carpet_a', (t) => floorGrain(t, PAL.carpetA, PAL.seam)],
  ['floor_carpet_b', (t) => floorGrain(t, PAL.carpetB, PAL.seam)],
  ['floor_carpet_c', (t) => floorGrain(t, PAL.carpetC, PAL.seam)],
  ['floor_tile_a', (t) => floorTile(t, PAL.tileA, PAL.tileSeam)],
  ['floor_tile_b', (t) => floorTile(t, PAL.tileB, PAL.tileSeam)],
  ['floor_corridor', (t) => floorTile(t, PAL.corridor, PAL.corridorSeam)],
  // walls (top-down) ; flips handle orientation
  ['wall', (t) => { t.fill(PAL.wall); t.r(0, 0, DS, 3, PAL.wallHi); t.r(0, DS - 3, DS, 3, PAL.wallSh); t.r(0, 0, 3, DS, PAL.wallHi); t.r(DS - 3, 0, 3, DS, PAL.wallSh); }],
  ['wall_face', (t) => { t.fill(PAL.wallFace); t.r(0, 0, DS, 4, PAL.wall); t.r(0, 0, DS, 2, PAL.wallHi); t.r(0, DS - 2, DS, 2, PAL.wallFaceSh); for (let x = 2; x < DS; x += 8) t.r(x, 5, 1, DS - 7, PAL.wallFaceSh); }],
  ['wall_inner', (t) => { t.fill('#8a8f98'); t.r(0, 0, DS, 3, '#a8adb4'); t.r(0, DS - 3, DS, 3, '#5f656e'); t.r(0, 0, 3, DS, '#9aa0a8'); t.r(DS - 3, 0, 3, DS, '#646a73'); }],
  // partitions (cubicle dividers)
  ['part_h', (t) => { t.r(0, 11, DS, 8, PAL.metal); t.r(0, 11, DS, 2, PAL.metalHi); t.r(0, 17, DS, 2, PAL.metalSh); t.r(0, 19, DS, 2, '#000000', 26); }],
  ['part_v', (t) => { t.r(12, 0, 8, DS, PAL.metal); t.r(12, 0, 2, DS, PAL.metalHi); t.r(18, 0, 2, DS, PAL.metalSh); t.r(20, 0, 2, DS, '#000000', 26); }],
  // desks (3-wide cluster; flips reuse for the opposite side)
  // workstation desks: back partition panel (top) + surface + thick front edge
  // (bottom). V-flip in the map for the opposite-facing row → shared partition.
  ['desk_l', (t) => wsDesk(t, 12, 52, 'l')],
  ['desk_m', (t) => wsDesk(t, 0, TS, 'm')],
  ['desk_r', (t) => wsDesk(t, 0, 52, 'r')],
  ['desk_single', (t) => { deskTop(t, 3, 6, 26, 20); }],
  // desk variant 2 — cooler grey laminate top (seeded per pod for variety)
  ['desk2_l', (t) => wsDesk(t, 12, 52, 'l', '#c9c7bf', '#dedcd1')],
  ['desk2_m', (t) => wsDesk(t, 0, TS, 'm', '#c9c7bf', '#dedcd1')],
  ['desk2_r', (t) => wsDesk(t, 0, 52, 'r', '#c9c7bf', '#dedcd1')],
  // desk gear (objects layer; full 64px raw detail) — monitor variants
  ['monitor_a', (t) => monitor(t, 16, 11, 0)],
  ['monitor_b', (t) => monitor(t, 16, 11, 1)],
  ['monitor_c', (t) => monitor(t, 16, 11, 2)],
  ['monitor_d', (t) => monitor(t, 16, 11, 5)],
  ['monitor_dual', (t) => { t.raw(6, 34, 52, 3, '#000000', 32); t.raw(26, 30, 12, 4, PAL.bezel); t.raw(18, 34, 28, 3, PAL.bezel); t.raw(2, 4, 28, 24, PAL.bezel); t.raw(2, 4, 28, 3, PAL.bezelHi); screenUI(t, 4, 7, 24, 18, SCREENS[0], 0); t.raw(34, 4, 28, 24, PAL.bezel); t.raw(34, 4, 28, 3, PAL.bezelHi); screenUI(t, 36, 7, 24, 18, SCREENS[3], 2); }],
  ['monitor_vert', (t) => { t.raw(20, 44, 24, 3, '#000000', 32); t.raw(28, 38, 8, 6, PAL.bezel); t.raw(22, 44, 20, 3, PAL.bezel); t.raw(18, 2, 28, 38, PAL.bezel); t.raw(18, 2, 28, 3, PAL.bezelHi); screenUI(t, 20, 5, 24, 32, SCREENS[1], 1); }],
  ['monitor_large', (t) => { t.raw(4, 32, 56, 3, '#000000', 34); t.raw(28, 28, 8, 5, PAL.bezel); t.raw(16, 32, 32, 3, PAL.bezel); t.raw(2, 2, 60, 26, PAL.bezel); t.raw(2, 2, 60, 3, PAL.bezelHi); screenUI(t, 5, 5, 54, 20, SCREENS[3], 2); }],
  ['monitor_combo', (t) => { t.raw(2, 4, 30, 22, PAL.bezel); t.raw(2, 4, 30, 3, PAL.bezelHi); screenUI(t, 4, 7, 26, 16, SCREENS[0], 0); t.raw(34, 40, 28, 4, PAL.keyDk); t.raw(36, 18, 24, 20, PAL.bezel); t.raw(36, 18, 24, 3, PAL.bezelHi); screenUI(t, 38, 21, 20, 14, SCREENS[2], 3); }],
  ['tablet', (t) => { t.raw(18, 42, 28, 3, '#000000', 28); t.raw(18, 8, 28, 34, PAL.bezel); t.raw(18, 8, 28, 3, PAL.bezelHi); screenUI(t, 20, 11, 24, 28, SCREENS[2], 3); }],
  ['keyboard', (t) => { t.raw(14, 40, 42, 4, '#000000', 22); t.raw(12, 18, 40, 18, PAL.key); t.raw(12, 18, 40, 3, PAL.keyDk); for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) t.raw(15 + c * 4, 23 + r * 4, 3, 3, PAL.keyDk); t.raw(54, 26, 8, 10, PAL.key); t.raw(54, 26, 8, 2, PAL.keyDk); }],
  ['laptop', (t) => { t.raw(12, 46, 42, 4, '#000000', 22); t.raw(14, 12, 36, 24, PAL.bezel); t.raw(14, 12, 36, 3, PAL.bezelHi); screenUI(t, 16, 15, 32, 18, SCREENS[1], 1); t.raw(12, 36, 40, 12, PAL.keyDk); for (let c = 0; c < 11; c++) t.raw(16 + c * 3, 40, 2, 5, '#7a818c'); }],
  ['deskprops', (t) => { t.raw(8, 38, 26, 4, '#000000', 20); t.raw(8, 12, 24, 26, PAL.paper); for (let i = 0; i < 5; i++) t.raw(12, 17 + i * 4, [16, 12, 18, 10, 14][i], 2, PAL.paperLn); t.raw(42, 34, 16, 4, '#000000', 22); t.raw(42, 14, 14, 20, PAL.lav); t.raw(42, 14, 14, 4, '#ffffff', 55); t.raw(42, 30, 14, 2, PAL.lav2); }],
  // desk clutter combos (overhead layer) — seeded per desk, 2-3 small items each
  ['clutter_a', (t) => { t.raw(10, 36, 16, 4, '#000000', 18); t.raw(10, 12, 16, 18, PAL.lav); t.raw(10, 12, 16, 4, '#ffffff', 55); t.raw(36, 10, 12, 12, PAL.coral); t.raw(36, 10, 12, 3, '#ffffff', 40); t.raw(48, 26, 12, 14, '#cfd3da'); }], // mug + sticky + paper
  ['clutter_b', (t) => { t.raw(8, 38, 20, 4, '#000000', 18); t.raw(8, 14, 20, 22, '#2c323b'); for (let i = 0; i < 4; i++) t.raw(12, 18 + i * 4, 12, 2, PAL.sage); t.raw(40, 18, 18, 18, PAL.paper); t.raw(43, 22, 12, 2, PAL.paperLn); t.raw(43, 26, 9, 2, PAL.paperLn); }], // notebook + papers
  ['clutter_c', (t) => { t.raw(12, 36, 14, 4, '#000000', 18); t.raw(14, 12, 12, 22, PAL.ink); t.raw(16, 14, 8, 4, PAL.lav2); t.raw(40, 16, 10, 20, '#3a4250'); for (let i = 0; i < 4; i++) t.raw(42, 18 + i * 4, 3, 2, PAL.sage); }], // phone + pen cup
  ['clutter_d', (t) => { t.raw(10, 16, 26, 10, PAL.ink); t.raw(10, 16, 26, 3, '#3a414c'); t.raw(14, 12, 18, 4, PAL.ink); t.raw(44, 22, 14, 16, PAL.box); t.raw(44, 22, 14, 3, PAL.boxHi); }], // headphones + box
  ['clutter_e', (t) => { t.raw(10, 32, 22, 4, '#000000', 16); t.raw(14, 10, 18, 22, PAL.sage); t.raw(16, 28, 14, 10, PAL.pot); t.raw(44, 20, 14, 16, PAL.rose); t.raw(44, 20, 14, 4, '#ffffff', 45); }], // plant + cup
  // chairs (task default) + variants
  ['chair_up', (t) => chairTD(t, true)],
  ['chair_down', (t) => chairTD(t, false)],
  ['chair_exec_up', (t) => chairTD(t, true, 'exec')],
  ['chair_mesh_up', (t) => chairTD(t, true, 'mesh')],
  ['chair_visitor', (t) => chairTD(t, false, 'visitor')],
  // rug 9-slice (lavender + rose) — flips cover mirrored corners/edges
  ...rugSlices('rug_l', '#332c4a', '#4c4270', PAL.lav),
  ...rugSlices('rug_r', '#3a2c34', '#5a4350', PAL.rose),
  // furniture (objects)
  ['bookshelf_t', (t) => { t.r(2, 0, 28, DS, '#222831'); t.r(3, 1, 26, DS - 1, '#2c323b'); shelfRow(t, 4); shelfRow(t, 17); }],
  ['bookshelf_b', (t) => { t.r(2, 0, 28, DS - 2, '#222831'); t.r(3, 0, 26, DS - 3, '#2c323b'); shelfRow(t, 2); shelfRow(t, 15); t.r(2, DS - 4, 28, 4, '#000000', 26); }],
  ['cabinet', (t) => { t.r(4, 28, 24, 3, '#000000', 26); t.r(4, 2, 24, 27, PAL.metal); t.r(4, 2, 24, 2, PAL.metalHi); t.r(4, 2, 2, 27, PAL.metalHi); t.r(26, 2, 2, 27, PAL.metalSh); for (let i = 0; i < 2; i++) { t.r(7, 5 + i * 12, 18, 9, PAL.metalSh); t.r(13, 8 + i * 12, 6, 2, PAL.metalHi); } }],
  ['printer', (t) => { t.r(4, 26, 24, 3, '#000000', 26); t.r(5, 8, 22, 18, PAL.metal); t.r(5, 8, 22, 2, PAL.metalHi); t.r(8, 4, 16, 5, PAL.metalSh); t.r(9, 24, 14, 5, PAL.paper); t.r(8, 13, 6, 2, PAL.sage); }],
  ['plant_s', (t) => plantTD(t, false)],
  ['plant_b', (t) => plantTD(t, true)],
  ['water', (t) => { t.r(9, 28, 14, 2, '#000000', 26); t.r(8, 12, 16, 17, '#cbd1da'); t.r(9, 2, 14, 12, PAL.lav2); t.r(11, 4, 10, 8, '#cdd1ef'); }],
  ['sofa_l', (t) => { t.r(4, 6, 24, 22, PAL.chair); t.r(4, 6, 8, 22, PAL.metalSh); t.r(12, 9, 16, 14, PAL.chairHi); t.r(4, 26, 24, 3, '#000000', 24); }],
  ['sofa_m', (t) => { t.r(0, 6, DS, 22, PAL.chair); t.r(0, 6, DS, 4, PAL.chairHi); t.r(2, 12, DS - 4, 12, PAL.chairSeat); t.r(0, 26, DS, 3, '#000000', 24); }],
  ['sofa_r', (t) => { t.r(4, 6, 24, 22, PAL.chair); t.r(20, 6, 8, 22, PAL.metalSh); t.r(4, 9, 16, 14, PAL.chairHi); t.r(4, 26, 24, 3, '#000000', 24); }],
  ['table_tl', (t) => { t.r(10, 10, 22, 22, PAL.desk); t.r(10, 10, 22, 2, PAL.deskHi); t.r(10, 10, 2, 22, PAL.grain); t.r(20, 18, 12, 10, PAL.deskSh, 50); }],
  ['table_tr', (t) => { t.r(0, 10, 22, 22, PAL.desk); t.r(0, 10, 22, 2, PAL.deskHi); t.r(20, 10, 2, 22, PAL.deskSh); t.r(0, 18, 12, 10, PAL.deskSh, 50); }],
  ['table_bl', (t) => { t.r(10, 0, 22, 20, PAL.desk); t.r(10, 16, 22, 4, PAL.deskSh); t.r(10, 0, 2, 20, PAL.grain); t.r(20, 0, 12, 8, PAL.deskSh, 50); }],
  ['table_br', (t) => { t.r(0, 0, 22, 20, PAL.desk); t.r(0, 16, 22, 4, PAL.deskSh); t.r(20, 0, 2, 20, PAL.deskSh); t.r(0, 0, 12, 8, PAL.deskSh, 50); }],
  // wall-mounted (drawn on objects layer against top wall)
  ['whiteboard_l', (t) => { t.r(2, 4, 30, 22, '#aab0bb'); t.r(4, 6, 28, 18, '#eef0f4'); t.r(7, 9, 18, 2, PAL.lav2); t.r(7, 13, 22, 2, PAL.lav); t.r(7, 17, 14, 2, PAL.sage); }],
  ['whiteboard_r', (t) => { t.r(0, 4, 30, 22, '#aab0bb'); t.r(2, 6, 26, 18, '#eef0f4'); t.r(5, 9, 16, 2, PAL.coral); t.r(5, 13, 20, 2, PAL.lav2); }],
  ['board_kanban', (t) => { t.r(2, 4, 30, 22, '#aab0bb'); t.r(4, 6, 28, 18, '#eef0f4'); for (let c = 0; c < 3; c++) { const x = 6 + c * 9; if (c) t.r(x - 1, 7, 1, 16, '#c6cad2'); for (let r = 0; r < 3; r++) t.r(x, 8 + r * 5, 7, 3, [PAL.lav, PAL.sage, PAL.coral][(c + r) % 3]); } }],
  ['poster', (t) => { t.r(8, 3, 16, 24, PAL.ink); t.r(10, 5, 12, 20, PAL.paper); t.r(12, 7, 8, 9, PAL.plum); for (let i = 0; i < 3; i++) t.r(12, 18 + i * 2, 8 - i, 1, PAL.paperLn); }],
  ['statuslight', (t) => { t.r(7, 12, 18, 8, PAL.ink); t.r(7, 12, 18, 2, '#3a414c'); t.r(10, 15, 3, 3, PAL.sage); t.r(15, 15, 3, 3, PAL.lav); t.r(20, 15, 3, 3, PAL.coral); }],
  ['lamp', (t) => { t.r(11, 22, 12, 3, '#000000', 22); t.r(12, 8, 9, 7, '#cdd1ef', 34); t.r(12, 20, 8, 4, PAL.metal); t.r(15, 12, 2, 9, PAL.metalSh); t.r(13, 9, 6, 4, PAL.metal); t.r(14, 12, 4, 2, '#cdd1ef'); }],
  ['door_mat', (t) => { t.fill(PAL.corridor); t.r(0, 0, DS, 2, PAL.tileB); t.r(0, 0, 2, DS, PAL.wallSh); t.r(DS - 2, 0, 2, DS, PAL.wallSh); }],
  ['box', (t) => { t.r(4, 7, 24, 21, PAL.box); t.r(4, 7, 24, 3, PAL.boxHi); t.r(14, 5, 6, 3, '#c9bfa6'); t.r(4, 17, 24, 1, '#6f6657'); }],
  ['server', (t) => { t.r(5, 2, 22, 28, '#11151d'); for (let r = 0; r < 4; r++) { t.r(8, 4 + r * 7, 16, 5, '#1b2230'); t.r(21, 5 + r * 7, 2, 2, [PAL.sage, PAL.lav, PAL.coral, PAL.sage][r]); } }],
  // ── decorative props (object layer) — to fill the office densely ──
  ['trash', (t) => { t.r(10, 27, 12, 3, '#000000', 24); t.r(10, 10, 12, 18, PAL.metal); t.r(9, 8, 14, 3, PAL.metalSh); t.r(13, 13, 1, 12, PAL.metalSh); t.r(18, 13, 1, 12, PAL.metalSh); }],
  ['postits', (t) => { t.r(7, 9, 9, 9, PAL.coral); t.r(17, 7, 9, 9, PAL.lav); t.r(11, 17, 9, 9, PAL.sage); t.r(7, 9, 9, 2, '#ffffff', 40); }],
  ['docs', (t) => { t.r(6, 13, 22, 12, '#00000018'); t.r(5, 8, 14, 13, PAL.paper); for (let i = 0; i < 4; i++) t.r(7, 10 + i * 3, [10, 7, 11, 8][i], 1, PAL.paperLn); t.r(16, 11, 12, 11, PAL.paper); t.r(16, 11, 12, 2, '#cfd3da'); }],
  ['corkboard', (t) => { t.r(2, 4, 28, 22, '#7d828b'); t.r(4, 6, 24, 18, '#9aa0a8'); for (let i = 0; i < 5; i++) t.r(6 + (i % 3) * 8, 9 + ((i / 3) | 0) * 8, 6, 6, [PAL.lav, PAL.sage, PAL.coral, PAL.paper, PAL.plum][i]); }],
  ['sidetable', (t) => { t.r(8, 24, 16, 3, '#000000', 22); t.r(7, 8, 18, 16, PAL.desk); t.r(7, 8, 18, 2, PAL.deskHi); t.r(7, 22, 18, 3, PAL.deskSh); t.r(13, 10, 7, 8, PAL.accent ? PAL.lav : PAL.lav); t.r(13, 10, 7, 2, '#ffffff', 50); }],
  ['rack', (t) => { t.r(3, 1, 26, 30, '#2c323b'); t.r(4, 2, 24, 29, '#384049'); for (let r = 0; r < 3; r++) { t.r(5, 4 + r * 9, 22, 7, '#262c34'); t.r(6, 5 + r * 9, 7, 5, PAL.box); t.r(14, 5 + r * 9, 6, 5, PAL.metal); t.r(21, 5 + r * 9, 5, 5, PAL.boxHi); } }],
  ['clutter', (t) => { t.r(4, 18, 12, 10, PAL.box); t.r(4, 18, 12, 3, PAL.boxHi); t.r(17, 21, 9, 7, PAL.metal); t.r(6, 16, 8, 2, '#6f6657'); t.r(2, 26, 24, 2, '#000000', 16); }],
  ['coffee', (t) => { t.r(6, 25, 20, 3, '#000000', 22); t.r(7, 6, 18, 19, PAL.metal); t.r(7, 6, 18, 3, PAL.metalHi); t.r(10, 10, 12, 7, PAL.bezel); t.r(11, 11, 10, 4, PAL.sage); t.r(9, 19, 5, 5, PAL.paper); t.r(18, 19, 5, 5, PAL.lav); }],
];

function floorGrain(t, base, seam) {
  t.fill(base);
  // subtle speckle
  for (let i = 0; i < 14; i++) { const x = (i * 7 + 3) % DS, y = (i * 11 + 5) % DS; t.r(x, y, 1, 1, seam, 40); }
  t.r(0, 0, DS, 1, seam, 60); t.r(0, 0, 1, DS, seam, 60);
}
function floorTile(t, base, seam) {
  t.fill(base);
  t.r(0, 0, DS, 1, seam); t.r(0, 0, 1, DS, seam);
  t.r(0, 0, DS, 1, PAL.white, 18);
}
function shelfRow(t, y) {
  const sp = [PAL.lav, PAL.sage, PAL.rose, PAL.lav2, PAL.coral];
  for (let i = 0; i < 7; i++) t.r(5 + i * 3, y + (i % 2), 2, 11, sp[i % sp.length]);
}
// rug 9-slice: returns 4 named tiles (center, edge, corner, fill-inner) used with flips
function rugSlices(prefix, dark, mid, bright) {
  return [
    [`${prefix}_c`, (t) => { t.fill(dark); }], // center
    [`${prefix}_e`, (t) => { t.fill(dark); t.r(0, 0, DS, 3, mid); }], // top edge
    [`${prefix}_k`, (t) => { t.fill(dark); t.r(0, 0, DS, 3, mid); t.r(0, 0, 3, DS, mid); t.r(0, 0, 5, 5, bright); }], // top-left corner
    [`${prefix}_i`, (t) => { t.fill(dark); t.r(2, 2, DS - 4, DS - 4, mid, 40); }], // inner accent
  ];
}

// ── render atlas ────────────────────────────────────────────────────────────
const rows = Math.ceil(TILES.length / ATLAS_COLS);
const atlas = new Atlas(ATLAS_COLS, rows);
const nameToGid = {};
TILES.forEach(([name, draw], i) => {
  const col = i % ATLAS_COLS, row = (i / ATLAS_COLS) | 0;
  draw(new Tile(atlas, col * TS, row * TS));
  nameToGid[name] = i + 1; // gid: 0 = empty
});

// ── PNG encoder (RGBA, no deps) ──────────────────────────────────────────────
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(a) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(a.w, 0); ihdr.writeUInt32BE(a.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc(a.h * (a.w * 4 + 1));
  for (let y = 0; y < a.h; y++) {
    raw[y * (a.w * 4 + 1)] = 0; // filter none
    a.buf.subarray(y * a.w * 4, (y + 1) * a.w * 4).forEach((v, x) => { raw[y * (a.w * 4 + 1) + 1 + x] = v; });
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'tileset.png'), encodePng(atlas));
writeFileSync(resolve(OUT, 'tiles.json'), JSON.stringify({ tile: TS, cols: ATLAS_COLS, image: 'tileset.png', imageW: atlas.w, imageH: atlas.h, names: nameToGid }, null, 2));

// ── compose the map (separate module keeps this file declarative) ────────────
import { buildMap } from './office-map.mjs';
const tmj = buildMap({ TS, nameToGid, atlasW: atlas.w, atlasH: atlas.h, count: TILES.length });
writeFileSync(resolve(OUT, 'office.tmj'), JSON.stringify(tmj));

console.log(`tileset: ${atlas.w}x${atlas.h} (${TILES.length} tiles), map ${tmj.width}x${tmj.height} -> ${OUT}`);

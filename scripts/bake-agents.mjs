/**
 * Bake the agent atlases.
 *
 *   node scripts/bake-agents.mjs           # agents.png + workstations.png (+json)
 *
 * Two outputs from the same roster (rows align across sheets):
 *   agents.{png,json}        18 skins × {idle,walk1,walk2,sit} — feet-anchored
 *                            cells for walking / standing (front-3/4 facing).
 *   workstations.{png,json}  18 skins × {wsfront,wsback} — the artist's seated-
 *                            at-desk composites (col2 face / col4 back) with the
 *                            desk, monitor, chair, agent and partition correctly
 *                            aligned per orientation. Used for working agents so
 *                            direction/depth are right by construction.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, blankImage, detectBg, cutout, softenHalo, alphaBBox, subImage, blit } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');

const WALK_SHEETS = ['agent-motion-01.png', 'agent-motion-02.png', 'agent-motion-03.png'];
const SEAT_SHEETS = ['seated-desk-motion-01.png', 'seated-desk-motion-02.png', 'seated-desk-motion-03.png'];
const DET = { thresh: 70, minArea: 700, minW: 24, minH: 56, mergeGap: 2, rowTol: 64 };
const MAX_SKINS = 18;
const CELL_W = 88, CELL_H = 140;

/** Detect boxes, group into rows (sorted L→R), keeping boxes that pass `keep`. */
function rowsOf(file, keep) {
  const img = readPNG(path.join(REF, file));
  const bg = detectBg(img);
  const ok = detectObjects(img, bg, DET).filter((b) => keep(b.x1 - b.x0, b.y1 - b.y0));
  const rows = [];
  for (const b of ok.sort((a, c) => a.y0 - c.y0)) {
    const row = rows.find((r) => Math.abs(r.y - b.y0) < 52);
    if (row) row.items.push(b);
    else rows.push({ y: b.y0, items: [b] });
  }
  rows.forEach((r) => r.items.sort((a, c) => a.x0 - c.x0));
  return { img, bg, rows };
}

const narrow = (w, h) => w >= 30 && w <= 100 && h >= 70 && h <= 155;
const wide = (w, h) => w >= 108 && w <= 240 && h >= 88 && h <= 180;

function feetCell(img, box, bg) {
  let c = cutout(img, box, bg, DET.thresh);
  const bb = alphaBBox(c); if (!bb) return null;
  c = subImage(c, bb);
  const cell = blankImage(CELL_W, CELL_H);
  blit(cell, c, Math.round((CELL_W - c.w) / 2), Math.max(0, CELL_H - c.h - 2));
  return cell;
}
function trimmed(img, box, bg) {
  let c = cutout(img, box, bg, DET.thresh);
  softenHalo(c, bg, DET.thresh);
  const bb = alphaBBox(c); if (!bb) return null;
  return subImage(c, bb);
}

// ---- agents atlas (walk/idle/sit) -----------------------------------------
const aSprites = [];
let skin = 0;
const skinMap = []; // remember (sheetIdx,row) per skin for the workstation pass
for (let k = 0; k < WALK_SHEETS.length && skin < MAX_SKINS; k++) {
  const walk = rowsOf(WALK_SHEETS[k], narrow);
  const seat = SEAT_SHEETS[k] ? rowsOf(SEAT_SHEETS[k], narrow) : { rows: [] };
  for (let r = 0; r < walk.rows.length && skin < MAX_SKINS; r++) {
    const wRow = walk.rows[r];
    if (wRow.items.length < 3) continue;
    const n = wRow.items.length;
    const made = {
      idle: feetCell(walk.img, wRow.items[0], walk.bg),
      walk1: feetCell(walk.img, wRow.items[Math.floor(n / 2)], walk.bg),
      walk2: feetCell(walk.img, wRow.items[n - 1], walk.bg),
    };
    if (!made.idle || !made.walk1 || !made.walk2) continue;
    const sRow = seat.rows[r];
    made.sit = (sRow && sRow.items[1] && feetCell(seat.img, sRow.items[1], seat.bg)) || made.idle;
    const id = `skin${String(skin).padStart(2, '0')}`;
    for (const [pose, cell] of Object.entries(made)) aSprites.push({ name: `${id}_${pose}`, img: cell });
    skinMap.push({ k, r });
    skin++;
  }
}
{
  const cols = 12, rows = Math.ceil(aSprites.length / cols);
  const atlas = blankImage(cols * CELL_W, rows * CELL_H);
  const frames = {};
  aSprites.forEach((s, i) => {
    const x = (i % cols) * CELL_W, y = Math.floor(i / cols) * CELL_H;
    blit(atlas, s.img, x, y); frames[s.name] = { frame: { x, y, w: CELL_W, h: CELL_H } };
  });
  writePNG(path.join(OUT, 'agents.png'), atlas);
  fs.writeFileSync(path.join(OUT, 'agents.json'), JSON.stringify({ frames, meta: { app: 'yule-agent-lab', image: 'agents.png', cell: { w: CELL_W, h: CELL_H }, skins: skin, format: 'RGBA8888', size: { w: atlas.w, h: atlas.h }, scale: '1' } }, null, 1));
  console.log(`agents.png ${atlas.w}x${atlas.h} — ${skin} skins × 4`);
}

// ---- workstations atlas (seated-at-desk composites) -----------------------
// Per seated sheet row: narrow [stand, sit] then wide composites [front, front2, back, back2].
const wSprites = [];
const seatRows = SEAT_SHEETS.map((f) => rowsOf(f, wide));
for (let i = 0; i < skinMap.length; i++) {
  const { k, r } = skinMap[i];
  const row = seatRows[k]?.rows[r];
  if (!row || row.items.length < 3) continue;
  const id = `skin${String(i).padStart(2, '0')}`;
  const wsf = trimmed(seatRows[k].img, row.items[0], seatRows[k].bg);           // col2 front (face)
  const wsb = trimmed(seatRows[k].img, row.items[Math.min(2, row.items.length - 1)], seatRows[k].bg); // col4 back
  if (wsf) wSprites.push({ name: `${id}_wsfront`, img: wsf });
  if (wsb) wSprites.push({ name: `${id}_wsback`, img: wsb });
}
// shelf-pack variable-size composites
wSprites.sort((a, b) => b.img.h - a.img.h);
const PAD = 2;
const total = wSprites.reduce((s, x) => s + (x.img.w + PAD) * (x.img.h + PAD), 0);
const WW = Math.max(512, 1 << Math.ceil(Math.log2(Math.sqrt(total) * 1.25)));
let cx = PAD, cy = PAD, rowH = 0;
const wframes = {};
for (const s of wSprites) {
  if (cx + s.img.w + PAD > WW) { cx = PAD; cy += rowH + PAD; rowH = 0; }
  s._x = cx; s._y = cy; rowH = Math.max(rowH, s.img.h); cx += s.img.w + PAD;
}
const WH = 1 << Math.ceil(Math.log2(cy + rowH + PAD));
const wAtlas = blankImage(WW, WH);
for (const s of wSprites) { blit(wAtlas, s.img, s._x, s._y); wframes[s.name] = { frame: { x: s._x, y: s._y, w: s.img.w, h: s.img.h } }; }
writePNG(path.join(OUT, 'workstations.png'), wAtlas);
fs.writeFileSync(path.join(OUT, 'workstations.json'), JSON.stringify({ frames: wframes, meta: { app: 'yule-agent-lab', image: 'workstations.png', format: 'RGBA8888', size: { w: WW, h: WH }, scale: '1' } }, null, 1));
console.log(`workstations.png ${WW}x${WH} — ${wSprites.length} composites (${Object.keys(wframes).length} frames)`);

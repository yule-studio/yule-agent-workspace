/**
 * Bake the agent character atlas.
 *
 *   node scripts/bake-agents.mjs --debug   # sample cutouts
 *   node scripts/bake-agents.mjs           # write agents.png + agents.json
 *
 * Walk poses come from agent-motion-*.png (rows = skins, cols = idle/phone/walk
 * frames, front-3/4 facing — the agent-town / Gather convention). Seated poses
 * come from seated-desk-motion-*.png, whose col1 is the same character seated in
 * a chair; the two sheets share a roster, so we pair them by (sheet, row) to get
 * idle + two walk frames + a seated frame per skin. Every frame is feet-anchored
 * on a common cell for jitter-free animation and swap.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, blankImage, detectBg, cutout, alphaBBox, subImage, blit } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');
const DBG = path.join(ROOT, 'tmp-atlas-debug');

const DEBUG = process.argv.slice(2).includes('--debug');
const WALK_SHEETS = ['agent-motion-01.png', 'agent-motion-02.png', 'agent-motion-03.png'];
const SEAT_SHEETS = ['seated-desk-motion-01.png', 'seated-desk-motion-02.png', 'seated-desk-motion-03.png'];
const DET = { thresh: 70, minArea: 700, minW: 24, minH: 56, mergeGap: 2, rowTol: 64 };
const MAX_SKINS = 18;
const CELL_W = 88, CELL_H = 140;

/** Detect character boxes grouped into rows (drops merge artefacts + wide composites). */
function charRows(file) {
  const img = readPNG(path.join(REF, file));
  const bg = detectBg(img);
  const ok = detectObjects(img, bg, DET).filter((b) => {
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    return w >= 30 && w <= 100 && h >= 70 && h <= 155;
  });
  const rows = [];
  for (const b of ok.sort((a, c) => a.y0 - c.y0)) {
    const row = rows.find((r) => Math.abs(r.y - b.y0) < 52);
    if (row) row.items.push(b);
    else rows.push({ y: b.y0, items: [b] });
  }
  rows.forEach((r) => r.items.sort((a, c) => a.x0 - c.x0));
  return { img, bg, rows: rows.filter((r) => r.items.length >= 2) };
}

/** Cut a box, trim, paste bottom-centred onto the common cell. */
function frameCell(img, box, bg) {
  let c = cutout(img, box, bg, DET.thresh);
  const bb = alphaBBox(c);
  if (!bb) return null;
  c = subImage(c, bb);
  const cell = blankImage(CELL_W, CELL_H);
  blit(cell, c, Math.round((CELL_W - c.w) / 2), Math.max(0, CELL_H - c.h - 2));
  return cell;
}

const sprites = [];
let skin = 0;
for (let k = 0; k < WALK_SHEETS.length && skin < MAX_SKINS; k++) {
  const walk = charRows(WALK_SHEETS[k]);
  const seat = SEAT_SHEETS[k] ? charRows(SEAT_SHEETS[k]) : { rows: [] };
  for (let r = 0; r < walk.rows.length && skin < MAX_SKINS; r++) {
    const wRow = walk.rows[r];
    if (wRow.items.length < 3) continue;
    const n = wRow.items.length;
    const made = {
      idle: frameCell(walk.img, wRow.items[0], walk.bg),
      walk1: frameCell(walk.img, wRow.items[Math.floor(n / 2)], walk.bg),
      walk2: frameCell(walk.img, wRow.items[n - 1], walk.bg),
    };
    if (!made.idle || !made.walk1 || !made.walk2) continue;
    // seated pose = col1 of the matching seated-sheet row (else fall back to idle)
    const sRow = seat.rows[r];
    made.sit = (sRow && sRow.items[1] && frameCell(seat.img, sRow.items[1], seat.bg)) || made.idle;
    const id = `skin${String(skin).padStart(2, '0')}`;
    for (const [pose, cell] of Object.entries(made)) sprites.push({ name: `${id}_${pose}`, img: cell });
    skin++;
  }
}
console.log(`Extracted ${skin} skins → ${sprites.length} frames (idle/walk1/walk2/sit)`);

if (DEBUG) sprites.slice(0, 12).forEach((s) => writePNG(path.join(DBG, `af-${s.name}.png`), s.img));

const cols = 12;
const rows = Math.ceil(sprites.length / cols);
const atlas = blankImage(cols * CELL_W, rows * CELL_H);
const frames = {};
sprites.forEach((s, i) => {
  const x = (i % cols) * CELL_W, y = Math.floor(i / cols) * CELL_H;
  blit(atlas, s.img, x, y);
  frames[s.name] = { frame: { x, y, w: CELL_W, h: CELL_H } };
});
writePNG(path.join(OUT, 'agents.png'), atlas);
fs.writeFileSync(path.join(OUT, 'agents.json'), JSON.stringify({
  frames,
  meta: { app: 'yule-agent-lab', image: 'agents.png', cell: { w: CELL_W, h: CELL_H }, skins: skin, format: 'RGBA8888', size: { w: atlas.w, h: atlas.h }, scale: '1' },
}, null, 1));
console.log(`Wrote agents.png (${atlas.w}x${atlas.h}) + .json with ${Object.keys(frames).length} frames, ${skin} skins`);

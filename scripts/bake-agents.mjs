/**
 * Bake the agent character atlas from agent-motion-*.png.
 *
 *   node scripts/bake-agents.mjs --debug   # overlay + sample cutouts
 *   node scripts/bake-agents.mjs           # write agents.png + agents.json
 *
 * Each sheet is a grid of small pixel characters (rows = distinct character
 * skins, columns = idle / phone / walk poses) drawn front-3/4 facing — the
 * agent-town / Gather convention where characters always face the camera, so
 * seat orientation is carried by the desk sprite, not by rotating the agent.
 *
 * Per skin we keep three feet-anchored frames — idle + two walk poses — packed
 * onto a common cell so the runtime can play a jitter-free walk bob and flip
 * horizontally for left/right travel.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, blankImage, detectBg, cutout, alphaBBox, subImage, blit } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');
const DBG = path.join(ROOT, 'tmp-atlas-debug');

const DEBUG = process.argv.slice(2).includes('--debug');
const SHEETS = ['agent-motion-01.png', 'agent-motion-02.png', 'agent-motion-03.png'];
const DET = { thresh: 70, minArea: 700, minW: 24, minH: 56, mergeGap: 2, rowTol: 64 };
const MAX_SKINS = 18;
const CELL_W = 88, CELL_H = 140; // common feet-anchored cell

/** Group detected boxes into rows, drop merge artefacts, keep sane character boxes. */
function rowsOf(boxes) {
  const ok = boxes.filter((b) => {
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    return w >= 30 && w <= 96 && h >= 70 && h <= 150;
  });
  const rows = [];
  for (const b of ok.sort((a, c) => a.y0 - c.y0)) {
    const row = rows.find((r) => Math.abs(r.y - b.y0) < 48);
    if (row) row.items.push(b);
    else rows.push({ y: b.y0, items: [b] });
  }
  rows.forEach((r) => r.items.sort((a, c) => a.x0 - c.x0));
  return rows.filter((r) => r.items.length >= 3);
}

/** Cut a box, trim to content, and paste bottom-centred onto the common cell. */
function frameCell(img, box, bg) {
  let c = cutout(img, box, bg, DET.thresh);
  const bb = alphaBBox(c);
  if (!bb) return null;
  c = subImage(c, bb);
  const cell = blankImage(CELL_W, CELL_H);
  const dx = Math.round((CELL_W - c.w) / 2);
  const dy = CELL_H - c.h - 2; // feet near the bottom
  blit(cell, c, dx, Math.max(0, dy));
  return cell;
}

const sprites = [];
let skin = 0;
for (const file of SHEETS) {
  if (skin >= MAX_SKINS) break;
  const img = readPNG(path.join(REF, file));
  const bg = detectBg(img);
  const rows = rowsOf(detectObjects(img, bg, DET));
  for (const row of rows) {
    if (skin >= MAX_SKINS) break;
    const n = row.items.length;
    const pick = { idle: row.items[0], walk1: row.items[Math.floor(n / 2)], walk2: row.items[n - 1] };
    let okFrames = 0;
    const made = {};
    for (const [pose, box] of Object.entries(pick)) {
      const cell = frameCell(img, box, bg);
      if (cell) { made[pose] = cell; okFrames++; }
    }
    if (okFrames < 3) continue;
    const id = `skin${String(skin).padStart(2, '0')}`;
    for (const [pose, cell] of Object.entries(made)) sprites.push({ name: `${id}_${pose}`, img: cell });
    skin++;
  }
}
console.log(`Extracted ${skin} skins → ${sprites.length} frames`);

if (DEBUG) {
  sprites.slice(0, 9).forEach((s) => writePNG(path.join(DBG, `agentframe-${s.name}.png`), s.img));
}

// pack: uniform cells laid out in a grid (every frame is CELL_W x CELL_H)
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
const meta = {
  frames,
  meta: { app: 'yule-agent-lab', image: 'agents.png', cell: { w: CELL_W, h: CELL_H }, skins: skin, format: 'RGBA8888', size: { w: atlas.w, h: atlas.h }, scale: '1' },
};
const fs = await import('node:fs');
fs.writeFileSync(path.join(OUT, 'agents.json'), JSON.stringify(meta, null, 1));
console.log(`Wrote agents.png (${atlas.w}x${atlas.h}) + .json with ${Object.keys(frames).length} frames, ${skin} skins`);

/**
 * Trace office-shell-floorplan-v2.png into a tile grid so the runtime map can
 * be authored from the real reference, not a guess. Classifies each grid cell
 * (void / wall / window / room-by-colour), prints a char map, and writes a
 * recoloured preview to eyeball against the source. Dev tooling only.
 *   node scripts/analyze-floorplan.mjs [cols] [rows]
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, blankImage, setPx } from './lib/png.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SRC = path.join(ROOT, 'assets-src/yule-workspace-motion/references/office-shell-floorplan-v2.png');
const img = readPNG(SRC);

const COLS = Number(process.argv[2]) || 58;
const ROWS = Number(process.argv[3]) || 42;
const cw = img.w / COLS, ch = img.h / ROWS;

const px = (x, y) => { const i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };

// reference palette sampled from the source (room floors, walls, corridor)
const REF = {
  void: [25, 22, 30], wall: [150, 146, 141], eng: [186, 181, 176], corr: [197, 192, 187],
  green: [138, 139, 123], orange: [196, 158, 130], tan: [181, 144, 124],
  blue: [157, 163, 178], purple: [174, 159, 169],
};
/** Nearest-reference-colour classification (palette is too desaturated for heuristics). */
function classify(r, g, b) {
  if ((r + g + b) / 3 < 52) return 'void';
  let best = 'wall', bd = 1e9;
  for (const [k, [cr, cg, cb]] of Object.entries(REF)) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

const CHAR = { void: '.', wall: '#', eng: ' ', corr: ':', green: 'g', orange: 'o', tan: 't', blue: 'b', purple: 'p' };
const PREVIEW = {
  void: [18, 20, 25], wall: [88, 92, 100], eng: [205, 200, 194], corr: [223, 219, 214],
  green: [150, 178, 130], orange: [206, 168, 132], tan: [188, 150, 124], blue: [150, 165, 192], purple: [180, 158, 186],
};

const grid = [];
for (let ry = 0; ry < ROWS; ry++) {
  const row = [];
  for (let rx = 0; rx < COLS; rx++) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let sy = 0; sy < 5; sy++) for (let sx = 0; sx < 5; sx++) {
      const x = Math.min(img.w - 1, Math.floor((rx + (sx + 0.5) / 5) * cw));
      const y = Math.min(img.h - 1, Math.floor((ry + (sy + 0.5) / 5) * ch));
      const [r, g, b] = px(x, y); R += r; G += g; B += b; n++;
    }
    row.push(classify(R / n, G / n, B / n));
  }
  grid.push(row);
}

const ruler = Array.from({ length: COLS }, (_, i) => (i % 10 === 0 ? String((i / 10) | 0) : i % 5 === 0 ? '+' : ' ')).join('');
console.log('    ' + ruler);
grid.forEach((row, i) => console.log(String(i).padStart(3) + ' ' + row.map((c) => CHAR[c]).join('')));

const S = 8;
const out = blankImage(COLS * S, ROWS * S);
for (let ry = 0; ry < ROWS; ry++) for (let rx = 0; rx < COLS; rx++) {
  const c = PREVIEW[grid[ry][rx]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) setPx(out, rx * S + x, ry * S + y, c[0], c[1], c[2], 255);
}
const { PNG } = await import('pngjs');
fs.writeFileSync(path.join(ROOT, 'tmp-floorplan-trace.png'), PNG.sync.write(Object.assign(new PNG({ width: out.w, height: out.h }), { data: out.data })));
console.log(`\ngrid ${COLS}x${ROWS} → tmp-floorplan-trace.png`);

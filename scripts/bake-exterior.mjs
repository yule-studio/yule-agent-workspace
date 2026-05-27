/**
 * Bake the exterior / time-of-day / weather atlas for the Building view from the
 * reference sheets — these are real sprites, not tints or generated primitives.
 *
 *   node scripts/bake-exterior.mjs --debug   # overlays + box report
 *   node scripts/bake-exterior.mjs           # write exterior.{png,json}
 *
 * Sources:
 *   time-of-day-building.png      → bld_0..4  (Yule Studio facade per time of day)
 *   time-of-day-backgrounds.png   → sky_0..4  (full-width sky + skyline per time)
 *   weather-rain-snow-cloud-*.png → cloud / raindrop / snowflake / puddle / sparkle
 *   exterior-street-props.png     → lamp / bench / planter / vending / etc.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, blankImage, detectBg, cutout, softenHalo, alphaBBox, subImage, blit, rect, dist2 } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');
const DBG = path.join(ROOT, 'tmp-atlas-debug');
const DEBUG = process.argv.slice(2).includes('--debug');

const sprites = [];
const add = (name, img) => sprites.push({ name, img });

// ---- buildings: 5 facades in a row (transparent cutout) -------------------
{
  const img = readPNG(path.join(REF, 'time-of-day-building.png'));
  const bg = detectBg(img);
  const boxes = detectObjects(img, bg, { thresh: 60, minArea: 9000, minW: 80, minH: 120, mergeGap: 12, rowTol: 200 });
  console.log(`buildings: ${boxes.length} boxes`);
  boxes.slice(0, 5).forEach((b, i) => {
    let c = cutout(img, b, bg, 60); softenHalo(c, bg, 60);
    const bb = alphaBBox(c); if (bb) c = subImage(c, bb);
    add(`bld_${i}`, c);
  });
  if (DEBUG) { const o = blankImage(img.w, img.h); img.data.copy(o.data); boxes.forEach((b) => rect(o, b.x0, b.y0, b.x1, b.y1)); writePNG(path.join(DBG, 'ext-buildings.boxes.png'), o); }
}

// ---- skies: 5 full-width strips (opaque) ----------------------------------
{
  const img = readPNG(path.join(REF, 'time-of-day-backgrounds.png'));
  const bg = detectBg(img);
  const t2 = 60 * 60;
  const contentRows = [];
  for (let y = 0; y < img.h; y++) {
    let c = 0;
    for (let x = 0; x < img.w; x += 3) if (dist2(img.data, (y * img.w + x) * 4, bg[0], bg[1], bg[2]) > t2) c++;
    contentRows.push(c > (img.w / 3) * 0.25);
  }
  const bands = [];
  let start = -1;
  for (let y = 0; y <= img.h; y++) {
    if (y < img.h && contentRows[y]) { if (start < 0) start = y; }
    else if (start >= 0) { if (y - start > 30) bands.push([start, y]); start = -1; }
  }
  console.log(`skies: ${bands.length} bands`, bands.map(([a, b]) => `${a}-${b}`).join(' '));
  bands.slice(0, 5).forEach(([y0, y1], i) => {
    // trim left/right margins to the content
    let x0 = img.w, x1 = 0;
    for (let y = y0; y < y1; y += 2) for (let x = 0; x < img.w; x++) if (dist2(img.data, (y * img.w + x) * 4, bg[0], bg[1], bg[2]) > t2) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    add(`sky_${i}`, subImage(img, { x0: Math.max(0, x0 - 1), y0, x1: Math.min(img.w, x1 + 2), y1 }));
  });
}

// ---- weather + street: CC detect (names assigned by reading order) --------
function sheet(file, det, names, transparent = true) {
  const img = readPNG(path.join(REF, file));
  const bg = detectBg(img);
  const boxes = detectObjects(img, bg, det);
  console.log(`\n${file}: ${boxes.length} boxes`);
  boxes.forEach((b, i) => console.log(`  [${String(i).padStart(2)}] ${String(b.x1 - b.x0).padStart(3)}x${String(b.y1 - b.y0).padStart(3)} @(${b.x0},${b.y0}) -> ${names?.[i] ?? '?'}`));
  if (DEBUG) { const o = blankImage(img.w, img.h); img.data.copy(o.data); boxes.forEach((b) => rect(o, b.x0, b.y0, b.x1, b.y1)); writePNG(path.join(DBG, file.replace('.png', '.boxes.png')), o); }
  boxes.forEach((b, i) => {
    const name = names?.[i]; if (!name) return;
    let c = cutout(img, b, bg, det.thresh); if (transparent) softenHalo(c, bg, det.thresh);
    const bb = alphaBBox(c); if (!bb) return;
    add(name, subImage(c, bb));
  });
}

const named = (n, map) => { const a = Array(n).fill(null); for (const [i, v] of Object.entries(map)) a[i] = v; return a; };
// reading-order indices identified from the --debug overlay
const WEATHER_NAMES = named(45, { 0: 'rain_panel', 2: 'snow_panel', 4: 'cloud_panel', 26: 'cloud_a', 27: 'cloud_b', 28: 'cloud_c', 30: 'cloud_d', 42: 'puddle' });
const STREET_NAMES = named(31, { 0: 'st_pole', 3: 'st_lamp', 6: 'st_traffic', 12: 'st_bike', 16: 'st_plant', 17: 'st_planter', 18: 'st_bench', 20: 'st_vending', 23: 'st_sign', 24: 'st_fence', 28: 'st_mailbox' });
sheet('weather-rain-snow-cloud-elements.png', { thresh: 38, minArea: 200, minW: 12, minH: 12, mergeGap: 5, rowTol: 46 }, WEATHER_NAMES);
sheet('exterior-street-props.png', { thresh: 56, minArea: 1500, minW: 24, minH: 24, mergeGap: 8, rowTol: 60 }, STREET_NAMES);
// clear-weather elements: sun (day) / moon (night) / fair-weather cloud
const CLEAR_NAMES = named(15, { 3: 'wcloud', 9: 'sun', 13: 'moon' });
sheet('weather-clear-elements.png', { thresh: 40, minArea: 700, minW: 18, minH: 18, mergeGap: 6, rowTol: 50 }, CLEAR_NAMES);

// ---- pack (shelf) ----------------------------------------------------------
if (!DEBUG || process.env.WRITE) {
  sprites.sort((a, b) => b.img.h - a.img.h);
  const PAD = 2;
  const totalArea = sprites.reduce((s, x) => s + (x.img.w + PAD) * (x.img.h + PAD), 0);
  const W = Math.max(512, 1 << Math.ceil(Math.log2(Math.sqrt(totalArea) * 1.3)));
  let x = PAD, y = PAD, rowH = 0;
  const frames = {};
  for (const s of sprites) {
    if (x + s.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
    s._x = x; s._y = y; rowH = Math.max(rowH, s.img.h); x += s.img.w + PAD;
  }
  const H = 1 << Math.ceil(Math.log2(y + rowH + PAD));
  const atlas = blankImage(W, H);
  for (const s of sprites) { blit(atlas, s.img, s._x, s._y); frames[s.name] = { frame: { x: s._x, y: s._y, w: s.img.w, h: s.img.h } }; }
  writePNG(path.join(OUT, 'exterior.png'), atlas);
  fs.writeFileSync(path.join(OUT, 'exterior.json'), JSON.stringify({ frames, meta: { app: 'yule-agent-lab', image: 'exterior.png', format: 'RGBA8888', size: { w: W, h: H }, scale: '1' } }, null, 1));
  console.log(`\nexterior.png ${W}x${H} — ${Object.keys(frames).length} frames: ${Object.keys(frames).join(', ')}`);
}

/**
 * Publish the new-motion Building View assets + extract weather sprites.
 *
 *   node scripts/bake-newmotion.mjs [--debug]
 *
 * Sources (assets-src/yule-workspace-motion/references/new-motion):
 *   backgrounds/background-*.png  → full city backdrops (per time-of-day/weather)
 *   buildings/building-*.png      → the Yule Studio facade (per time-of-day)
 *   weather/*.png                 → rain/snow/cloud sheets (opaque, light-grey bg)
 *
 * Backgrounds + buildings are copied to public as-is (lazy-loaded per phase —
 * they are large). Weather sheets are background-keyed and cropped into small
 * transparent sprites (clouds + a rain streak + snow flake/dot) for the overlay.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, subImage, detectBg, cutout, cutoutChecker, softenHalo, alphaBBox } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const NM = path.join(ROOT, 'assets-src/yule-workspace-motion/references/new-motion');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/new-motion');

// 1a) backdrops: verbatim (opaque full scenes — no transparency needed)
{
  const dst = path.join(OUT, 'backgrounds');
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(path.join(NM, 'backgrounds')).filter((f) => f.endsWith('.png')))
    fs.copyFileSync(path.join(NM, 'backgrounds', f), path.join(dst, f));
}
// 1b) buildings: opaque with a baked checker background → flood-key it to
// transparent (from the edges) so the facade can overlay the backdrop, trim.
{
  const dst = path.join(OUT, 'buildings');
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(path.join(NM, 'buildings')).filter((f) => f.endsWith('.png'))) {
    let c = cutoutChecker(readPNG(path.join(NM, 'buildings', f)), { satTol: 12, brightMin: 222 });
    const bb = alphaBBox(c);
    if (bb) c = subImage(c, bb);
    writePNG(path.join(dst, f), c);
  }
}
console.log('backdrops copied + buildings checker-keyed → public/assets/yule-office/new-motion');

// 2) extract weather sprites (background-keyed; sheets are opaque light grey)
const WX = path.join(OUT, 'weather');
fs.mkdirSync(WX, { recursive: true });
function sheet(file) { const img = readPNG(path.join(NM, 'weather', file)); return { img, bg: detectBg(img) }; }
function cut(img, bg, box, thresh) {
  let c = cutout(img, box, bg, thresh); softenHalo(c, bg, thresh);
  const bb = alphaBBox(c); return bb ? subImage(c, bb) : null;
}

// clouds: white clouds keyed off the blue sky in a backdrop top strip
// (the weather snow-cloud sheet's clouds are white-on-light-checker, unkeyable)
{
  const full = readPNG(path.join(NM, 'backgrounds/background-clear-day-bright.png'));
  const img = subImage(full, { x0: 0, y0: 0, x1: full.w, y1: 250 });
  const bg = detectBg(img); // blue sky
  const det = { thresh: 55, minArea: 700, minW: 48, minH: 22, mergeGap: 6, rowTol: 120 };
  const boxes = detectObjects(img, bg, det).sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  let n = 0;
  for (const b of boxes.slice(0, 4)) { const c = cut(img, bg, b, det.thresh); if (c) writePNG(path.join(WX, `cloud-${n++}.png`), c); }
  console.log(`clouds: ${n} extracted (of ${boxes.length} candidates)`);
}
// rain streak: a long thin diagonal from the rain-streaks sheet
{
  const { img, bg } = sheet('weather-rain-streaks-sheet.png');
  const det = { thresh: 26, minArea: 220, minW: 3, minH: 50, mergeGap: 3, rowTol: 50 };
  const boxes = detectObjects(img, bg, det)
    .filter((b) => { const w = b.x1 - b.x0, h = b.y1 - b.y0; return h >= 55 && h <= 320 && w <= 130 && h / w > 1.6; })
    .sort((a, b) => (b.y1 - b.y0) - (a.y1 - a.y0));
  const c = boxes[0] && cut(img, bg, boxes[0], det.thresh);
  if (c) writePNG(path.join(WX, 'rain-streak.png'), c);
  console.log(`rain streak: ${c ? 'ok' : 'MISSING'} (${boxes.length} candidates)`);
}
// snow flake (top crystals) + dot (small) from the snowflakes sheet
{
  const { img, bg } = sheet('weather-snowflakes-sheet.png');
  const det = { thresh: 30, minArea: 200, minW: 6, minH: 6, mergeGap: 1, rowTol: 46 };
  const all = detectObjects(img, bg, det);
  const flake = all.filter((b) => { const w = b.x1 - b.x0, h = b.y1 - b.y0; return w >= 24 && w <= 92 && h >= 24 && h <= 92; })
    .sort((a, b) => a.y0 - b.y0)[0]; // topmost = a crystal
  const dot = all.filter((b) => { const w = b.x1 - b.x0, h = b.y1 - b.y0; return w >= 5 && w <= 26 && h >= 5 && h <= 26; })
    .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0))[0];
  const cf = flake && cut(img, bg, flake, det.thresh); if (cf) writePNG(path.join(WX, 'snow-flake.png'), cf);
  const cd = dot && cut(img, bg, dot, det.thresh); if (cd) writePNG(path.join(WX, 'snow-dot.png'), cd);
  console.log(`snow: flake=${cf ? 'ok' : 'MISSING'} dot=${cd ? 'ok' : 'MISSING'}`);
}
console.log('weather sprites → public/assets/yule-office/new-motion/weather');

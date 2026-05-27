/**
 * Bake the Yule Agent Lab runtime atlases from the AI reference sheets.
 *
 *   node scripts/bake-office-atlas.mjs --debug   # overlay detected boxes
 *   node scripts/bake-office-atlas.mjs           # write atlas PNG + JSON
 *
 * The references in assets-src/ are hand-laid pixel-art sheets on a flat
 * (cream / dark) background with FRONT/BACK/title labels. We never ship them
 * whole: we detect each object (background flood + connected components),
 * cut it out to a transparent sprite, and pack the named sprites into a
 * Phaser-compatible texture atlas. Sprite names are assigned by reading order
 * (the layout of each sheet is fixed), so labels in the source never leak.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPNG, writePNG, blankImage, detectBg, cutout, softenHalo, alphaBBox, subImage, blit, rect } from './lib/png.mjs';
import { detectObjects } from './lib/detect.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const REF = path.join(ROOT, 'assets-src/yule-workspace-motion/references');
const OUT = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');
const DBG = path.join(ROOT, 'tmp-atlas-debug');

/**
 * Per-sheet recipe. `names` lists the sprite name for each detected box in
 * reading order; a null skips that box (e.g. a stray label that survived the
 * filters). Detection knobs are tuned per sheet.
 */
const SHEETS = [
  {
    file: 'desk-ai-engineer-backend-devops.png',
    det: { thresh: 60, minArea: 3000, minW: 70, minH: 70, mergeGap: 10, rowTol: 80 },
    names: ['desk_ai_front', 'desk_ai_back', 'chair_mesh_black',
            'desk_backend_front', 'desk_backend_back', 'chair_mesh_dark'],
  },
  {
    file: 'desk-analyst-product-designer.png',
    det: { thresh: 60, minArea: 3000, minW: 70, minH: 70, mergeGap: 10, rowTol: 80 },
    names: ['desk_analyst_front', 'desk_analyst_back', 'chair_exec_black',
            'desk_designer_front', 'desk_designer_back', 'chair_exec_dark',
            'chair_blue', 'chair_green', 'chair_exec_brown'],
  },
  {
    file: 'interior-props-boards-plants-watercooler-01.png',
    det: { thresh: 55, minArea: 1500, minW: 30, minH: 30, mergeGap: 8, rowTol: 60 },
    names: ['whiteboard_blank', 'clipboard', 'whiteboard_chart',
            'bookshelf_narrow', 'bookshelf_wide', 'chalkboard',
            'framed_picture', 'plant_small', 'watercooler', 'globe'],
  },
  {
    file: 'interior-props-boards-plants-watercooler-02.png',
    det: { thresh: 55, minArea: 1500, minW: 30, minH: 30, mergeGap: 8, rowTol: 60 },
    names: ['equipment_rack', 'stool_red', 'cabinet_tall', null,
            'file_cabinet', null, 'server_rack', null, 'printer', 'side_table'],
  },
  {
    file: 'monitor-motion.png',
    det: { thresh: 42, minArea: 2000, minW: 50, minH: 40, mergeGap: 8, rowTol: 60 },
    names: ['monitor_flow_1', 'monitor_flow_2', 'monitor_flow_3', 'monitor_flow_4',
            'monitor_dashboard', 'monitor_code', 'monitor_design',
            'monitor_term_1', 'monitor_term_2', 'monitor_term_3', 'monitor_term_4'],
  },
  {
    // top row = one door opening (closed → open); bottom row ignored
    file: 'door-motion.png',
    det: { thresh: 64, minArea: 9000, minW: 110, minH: 110, mergeGap: 14, rowTol: 140 },
    names: ['door_0', 'door_1', 'door_2', 'door_3', 'door_4', null, null, null, null, null],
  },
];

const args = process.argv.slice(2);
const DEBUG = args.includes('--debug');

function processSheet(sheet) {
  const img = readPNG(path.join(REF, sheet.file));
  const bg = detectBg(img);
  const boxes = detectObjects(img, bg, sheet.det);
  console.log(`\n${sheet.file}  bg=${bg.join(',')}  boxes=${boxes.length}`);
  boxes.forEach((b, i) =>
    console.log(`  [${String(i).padStart(2)}] ${String(b.x1 - b.x0).padStart(4)}x${String(b.y1 - b.y0).padStart(4)} @ (${b.x0},${b.y0}) area=${b.area}  -> ${sheet.names?.[i] ?? '?'}`));

  if (DEBUG) {
    const overlay = blankImage(img.w, img.h);
    img.data.copy(overlay.data);
    boxes.forEach((b) => rect(overlay, b.x0, b.y0, b.x1, b.y1));
    writePNG(path.join(DBG, sheet.file.replace('.png', '.boxes.png')), overlay);
  }

  const sprites = [];
  boxes.forEach((b, i) => {
    const name = sheet.names?.[i];
    if (!name) return;
    let cut = cutout(img, b, bg, sheet.det.thresh);
    softenHalo(cut, bg, sheet.det.thresh);
    const bbox = alphaBBox(cut);
    if (!bbox) return;
    cut = subImage(cut, bbox);
    sprites.push({ name, img: cut });
    if (DEBUG) writePNG(path.join(DBG, `sprite-${name}.png`), cut);
  });
  return sprites;
}

/** Shelf-pack sprites into a square-ish atlas; returns {atlas, frames}. */
function packAtlas(sprites, pad = 2) {
  sprites.sort((a, b) => b.img.h - a.img.h);
  const total = sprites.reduce((s, x) => s + (x.img.w + pad) * (x.img.h + pad), 0);
  const W = Math.max(256, 1 << Math.ceil(Math.log2(Math.sqrt(total) * 1.3)));
  let x = pad, y = pad, rowH = 0, maxX = 0;
  const frames = {};
  for (const s of sprites) {
    if (x + s.img.w + pad > W) { x = pad; y += rowH + pad; rowH = 0; }
    s._x = x; s._y = y;
    rowH = Math.max(rowH, s.img.h);
    x += s.img.w + pad;
    maxX = Math.max(maxX, x);
  }
  const H = 1 << Math.ceil(Math.log2(y + rowH + pad));
  const atlas = blankImage(W, H);
  for (const s of sprites) {
    blit(atlas, s.img, s._x, s._y);
    frames[s.name] = { frame: { x: s._x, y: s._y, w: s.img.w, h: s.img.h } };
  }
  return { atlas, frames, W, H };
}

const allSprites = SHEETS.flatMap(processSheet);
console.log(`\nTotal named sprites: ${allSprites.length}`);

if (!DEBUG) {
  const { atlas, frames, W, H } = packAtlas(allSprites);
  writePNG(path.join(OUT, 'office-objects.png'), atlas);
  const meta = {
    frames,
    meta: { app: 'yule-agent-lab', image: 'office-objects.png', format: 'RGBA8888', size: { w: W, h: H }, scale: '1' },
  };
  const fs = await import('node:fs');
  fs.writeFileSync(path.join(OUT, 'office-objects.json'), JSON.stringify(meta, null, 1));
  console.log(`\nWrote office-objects.png (${W}x${H}) + .json with ${Object.keys(frames).length} frames`);
}

/**
 * Render a flat PNG preview of yule-agent-lab.tmj (floor + walls tile layers +
 * depth-sorted furniture from the atlas + seat markers) so the layout can be
 * verified without the browser. Dev tooling — not shipped.
 *   node scripts/preview-lab.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPNG, blankImage, blit, subImage, scaleNearest, fillRect, rect } from './lib/png.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const V = path.join(ROOT, 'apps/web/public/vendor/yule-office');
const A = path.join(ROOT, 'apps/web/public/assets/yule-office/atlas');

const map = JSON.parse(fs.readFileSync(path.join(V, 'yule-agent-lab.tmj'), 'utf8'));
const tiles = readPNG(path.join(V, 'tiles.png'));
const objImg = readPNG(path.join(A, 'office-objects.png'));
const objMeta = JSON.parse(fs.readFileSync(path.join(A, 'office-objects.json'), 'utf8'));

const TS = map.tilewidth, W = map.width, H = map.height;
const out = blankImage(W * TS, H * TS);
fillRect(out, 0, 0, out.w, out.h, [21, 23, 28]);

const tilesCols = map.tilesets[0].columns;
function drawTileLayer(layer) {
  for (let i = 0; i < layer.data.length; i++) {
    const gid = layer.data[i];
    if (!gid) continue;
    const t = gid - 1;
    const sx = (t % tilesCols) * TS, sy = Math.floor(t / tilesCols) * TS;
    const cell = subImage(tiles, { x0: sx, y0: sy, x1: sx + TS, y1: sy + TS });
    blit(out, cell, (i % W) * TS, Math.floor(i / W) * TS);
  }
}
const get = (l) => map.layers.find((x) => x.name === l);
drawTileLayer(get('floor'));
drawTileLayer(get('walls'));

const propOf = (o, n) => o.properties?.find((p) => p.name === n)?.value;
// depth-sort furniture by base-y (+ z bias)
const furn = [...get('furniture').objects].sort((a, b) => (a.y + (propOf(a, 'z') || 0) * 4) - (b.y + (propOf(b, 'z') || 0) * 4));
for (const o of furn) {
  const name = propOf(o, 'sprite');
  const fr = objMeta.frames[name];
  if (!fr) { console.warn('missing sprite', name); continue; }
  let s = subImage(objImg, { x0: fr.frame.x, y0: fr.frame.y, x1: fr.frame.x + fr.frame.w, y1: fr.frame.y + fr.frame.h });
  const scale = propOf(o, 'scale') || 0.4;
  s = scaleNearest(s, scale);
  blit(out, s, Math.round(o.x - s.w / 2), Math.round(o.y - s.h)); // origin bottom-centre
}

// seat markers
for (const o of get('seats').objects) {
  const facing = propOf(o, 'facing');
  const col = facing === 'down' ? [80, 200, 120] : [80, 150, 230];
  fillRect(out, Math.round(o.x) - 4, Math.round(o.y) - 4, 8, 8, col);
}
// poi outlines
for (const o of get('pois').objects) rect(out, o.x, o.y, o.x + o.width, o.y + o.height, [230, 180, 60]);

fs.writeFileSync(path.join(ROOT, 'tmp-lab-preview.png'),
  (await import('pngjs')).PNG.sync.write(Object.assign(new (await import('pngjs')).PNG({ width: out.w, height: out.h }), { data: out.data })));
console.log(`wrote tmp-lab-preview.png ${out.w}x${out.h}`);

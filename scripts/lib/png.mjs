/**
 * Tiny RGBA image helpers over pngjs for the office asset-baking pipeline.
 * Dev-time tooling only (not shipped); pngjs is a pure-JS decode/encode lib so
 * there is no native build step. The runtime app ships only the baked PNG/JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** Decoded RGBA image: { w, h, data: Buffer of w*h*4 bytes }. */
export function readPNG(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { w: png.width, h: png.height, data: png.data };
}

export function writePNG(file, img) {
  const png = new PNG({ width: img.w, height: img.h });
  img.data.copy(png.data);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

export function blankImage(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4, 0) };
}

export const idx = (img, x, y) => (y * img.w + x) * 4;

export function getPx(img, x, y) {
  const i = idx(img, x, y);
  const d = img.data;
  return [d[i], d[i + 1], d[i + 2], d[i + 3]];
}

export function setPx(img, x, y, r, g, b, a = 255) {
  const i = idx(img, x, y);
  const d = img.data;
  d[i] = r;
  d[i + 1] = g;
  d[i + 2] = b;
  d[i + 3] = a;
}

/** Squared RGB distance, ignoring alpha. */
export function dist2(d, i, r, g, b) {
  const dr = d[i] - r;
  const dg = d[i + 1] - g;
  const db = d[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

/** Median background colour sampled from the four corners + edge midpoints. */
export function detectBg(img) {
  const { w, h } = img;
  const pts = [
    [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
    [(w >> 1), 2], [(w >> 1), h - 3], [2, h >> 1], [w - 3, h >> 1],
  ];
  const rs = [], gs = [], bs = [];
  for (const [x, y] of pts) {
    const [r, g, b] = getPx(img, x, y);
    rs.push(r); gs.push(g); bs.push(b);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

/**
 * Copy a sub-rect [x0,y0,x1,y1) into a new image and flood-fill the background
 * colour to transparent starting from the border, so only background contiguous
 * with the edge is removed (interior highlights of the same colour survive).
 */
export function cutout(img, box, bg, thresh) {
  const { x0, y0, x1, y1 } = box;
  const w = x1 - x0, h = y1 - y0;
  const out = blankImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = idx(img, x0 + x, y0 + y);
      const di = idx(out, x, y);
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  const t2 = thresh * thresh;
  const seen = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    if (dist2(out.data, p * 4, bg[0], bg[1], bg[2]) > t2) return;
    seen[p] = 1;
    q.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (q.length) {
    const p = q.pop();
    out.data[p * 4 + 3] = 0; // transparent
    const x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  return out;
}

/** Soften residual cream-vs-shadow halo: near-bg opaque pixels next to alpha. */
export function softenHalo(img, bg, thresh) {
  const { w, h, data } = img;
  const t2 = (thresh * 0.7) ** 2;
  const copy = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (copy[i + 3] === 0) continue;
      if (dist2(copy, i, bg[0], bg[1], bg[2]) > t2) continue;
      // close to bg colour and touching transparency → fade it out
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || copy[(ny * w + nx) * 4 + 3] === 0) { edge = true; break; }
      }
      if (edge) data[i + 3] = 60;
    }
  }
  return img;
}

/** Tightest bounding box of non-transparent pixels (or null if fully empty). */
export function alphaBBox(img) {
  const { w, h, data } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

export function subImage(img, box) {
  const w = box.x1 - box.x0, h = box.y1 - box.y0;
  const out = blankImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((box.y0 + y) * img.w + (box.x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

/** Blit src onto dst at (dx,dy), respecting src alpha (simple over). */
export function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const a = src.data[(y * src.w + x) * 4 + 3];
      if (a === 0) continue;
      const X = dx + x, Y = dy + y;
      if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
      const si = (y * src.w + x) * 4;
      const di = (Y * dst.w + X) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = a;
    }
  }
}

/** Draw a 1px rectangle outline (debug overlays). */
export function rect(img, x0, y0, x1, y1, col = [255, 40, 40]) {
  const line = (x, y) => { if (x >= 0 && y >= 0 && x < img.w && y < img.h) setPx(img, x, y, col[0], col[1], col[2], 255); };
  for (let x = x0; x < x1; x++) { line(x, y0); line(x, y1 - 1); }
  for (let y = y0; y < y1; y++) { line(x0, y); line(x1 - 1, y); }
}

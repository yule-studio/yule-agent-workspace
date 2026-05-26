/**
 * Generate the workspace brand icon set — a pixel-art "agent HQ" badge, NOT a
 * house. Two hand-drawn grids are authored for quality: a bold 16px silhouette
 * and a detailed 32px office complex (two buildings, lit windows, an agent at
 * the door, a live status light, an amber workspace frame). Larger icons are
 * crisp integer upscales of the 32px grid; tiny ones use the 16px grid.
 *
 * Dependency-free: PNGs are encoded by hand with zlib, the .ico embeds 16/32/48.
 * Run:  node scripts/gen-icons.mjs   (writes to apps/web/public/)
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public');
mkdirSync(OUT, { recursive: true });

// ── palette (rgb) ──────────────────────────────────────────────────────────
const C = {
  bg: [13, 17, 23], // #0d1117 deep graphite
  bgEdge: [9, 12, 17],
  frame: [56, 189, 248], // cyan #38bdf8
  frameDim: [37, 120, 160],
  wallA: [203, 213, 225], // cool concrete #cbd5e1
  wallB: [148, 163, 184], // slate #94a3b8
  roof: [71, 85, 105], // #475569
  roofDk: [51, 65, 85], // #334155
  winOff: [51, 65, 85],
  winBlue: [125, 211, 252], // sky #7dd3fc
  winLit: [45, 212, 191], // teal #2dd4bf (lit)
  door: [30, 41, 59], // #1e293b
  screen: [56, 189, 248],
  skin: [228, 196, 168],
  hair: [51, 65, 85],
  body: [45, 212, 191], // teal
  green: [52, 211, 153], // #34d399 live
  greenDk: [16, 150, 110],
  shadow: [7, 11, 17],
};

// ── tiny pixel canvas ──────────────────────────────────────────────────────
function makeCanvas(n) {
  const buf = new Uint8Array(n * n * 4);
  const px = (x, y, c) => {
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    const i = (y * n + x) * 4;
    if (!c) {
      buf[i + 3] = 0;
      return;
    }
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  const rect = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
  };
  return { n, buf, px, rect };
}

/** Rounded dark badge background + amber workspace frame. */
function badge(cv) {
  const n = cv.n;
  cv.rect(0, 0, n, n, C.bg);
  // vignette edge
  cv.rect(0, 0, n, 1, C.bgEdge);
  cv.rect(0, n - 1, n, 1, C.bgEdge);
  cv.rect(0, 0, 1, n, C.bgEdge);
  cv.rect(n - 1, 0, 1, n, C.bgEdge);
  // round the 4 corners
  for (const [cx, cy, sx, sy] of [
    [0, 0, 1, 1],
    [n - 1, 0, -1, 1],
    [0, n - 1, 1, -1],
    [n - 1, n - 1, -1, -1],
  ]) {
    cv.px(cx, cy, null);
    cv.px(cx + sx, cy, null);
    cv.px(cx, cy + sy, null);
  }
  // amber frame inset by 1
  cv.rect(1, 1, n - 2, 1, C.frame);
  cv.rect(1, n - 2, n - 2, 1, C.frame);
  cv.rect(1, 1, 1, n - 2, C.frame);
  cv.rect(n - 2, 1, 1, n - 2, C.frame);
}

// ── 32px detailed office HQ ──────────────────────────────────────────────────
function draw32() {
  const cv = makeCanvas(32);
  badge(cv);

  // floor line
  cv.rect(3, 27, 26, 1, C.roofDk);
  cv.rect(3, 28, 26, 1, C.shadow);

  // secondary (right, shorter) building — gives an "office complex" silhouette
  cv.rect(18, 15, 8, 12, C.wallB);
  cv.rect(17, 13, 10, 2, C.roof);
  cv.rect(17, 14, 10, 1, C.roofDk);
  cv.rect(20, 17, 2, 2, C.winBlue);
  cv.rect(23, 17, 2, 2, C.winLit);
  cv.rect(20, 21, 2, 2, C.winBlue);
  cv.rect(23, 21, 2, 2, C.winBlue);

  // main tower
  cv.rect(6, 9, 12, 18, C.wallA);
  cv.rect(5, 7, 14, 2, C.roof);
  cv.rect(5, 8, 14, 1, C.roofDk);
  // antenna + live tip
  cv.rect(11, 4, 1, 3, C.frameDim);
  cv.rect(10, 3, 3, 2, C.green);
  cv.px(11, 2, C.greenDk);
  // windows 3 rows x 2 cols
  for (let r = 0; r < 3; r++) {
    const wy = 11 + r * 4;
    cv.rect(8, wy, 3, 3, r === 0 ? C.winLit : C.winBlue);
    cv.rect(13, wy, 3, 3, r === 1 ? C.winLit : C.winBlue);
  }
  // entrance + screen glow (control room)
  cv.rect(10, 22, 6, 5, C.door);
  cv.rect(11, 23, 4, 1, C.screen);
  // agent standing in the doorway
  cv.rect(12, 21, 2, 2, C.skin);
  cv.rect(11, 20, 4, 1, C.hair);
  cv.rect(11, 23, 4, 3, C.body);

  // live status light (top-right inside frame)
  cv.rect(26, 4, 3, 3, C.green);
  cv.px(28, 4, C.greenDk);
  cv.px(26, 6, C.greenDk);
  return cv;
}

// ── 16px bold silhouette ──────────────────────────────────────────────────
function draw16() {
  const cv = makeCanvas(16);
  badge(cv);
  cv.rect(3, 12, 11, 1, C.roofDk); // floor
  // secondary block
  cv.rect(10, 7, 4, 6, C.wallB);
  cv.rect(10, 6, 4, 1, C.roof);
  cv.rect(11, 8, 2, 2, C.winBlue);
  // main tower
  cv.rect(3, 5, 7, 8, C.wallA);
  cv.rect(2, 4, 9, 1, C.roof);
  cv.rect(4, 6, 2, 2, C.winLit);
  cv.rect(7, 6, 2, 2, C.winBlue);
  cv.rect(4, 9, 2, 2, C.winBlue);
  cv.rect(6, 11, 3, 2, C.door); // entrance
  cv.px(7, 11, C.screen);
  // live dot
  cv.rect(12, 3, 2, 2, C.green);
  return cv;
}

// ── PNG encoder ───────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** nearest-neighbour scale srcN×srcN RGBA -> dstN×dstN. */
function scale(src, srcN, dstN) {
  if (srcN === dstN) return src;
  const out = new Uint8Array(dstN * dstN * 4);
  for (let y = 0; y < dstN; y++) {
    const sy = Math.floor((y * srcN) / dstN);
    for (let x = 0; x < dstN; x++) {
      const sx = Math.floor((x * srcN) / dstN);
      const si = (sy * srcN + sx) * 4;
      const di = (y * dstN + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/** Multi-image .ico from [{size, png}]. */
function encodeICO(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const dir = [];
  const data = [];
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    data.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...dir, ...data]);
}

function svg(cv) {
  let rects = '';
  for (let y = 0; y < cv.n; y++)
    for (let x = 0; x < cv.n; x++) {
      const i = (y * cv.n + x) * 4;
      if (cv.buf[i + 3] === 0) continue;
      const fill = `rgb(${cv.buf[i]},${cv.buf[i + 1]},${cv.buf[i + 2]})`;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cv.n} ${cv.n}" shape-rendering="crispEdges">${rects}</svg>\n`;
}

// ── emit ────────────────────────────────────────────────────────────────
const g16 = draw16();
const g32 = draw32();
const png16 = encodePNG(g16.buf, 16);
const png32 = encodePNG(g32.buf, 32);
const png48 = encodePNG(scale(g32.buf, 32, 48), 48);

writeFileSync(join(OUT, 'favicon.ico'), encodeICO([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
  { size: 48, png: png48 },
]));
writeFileSync(join(OUT, 'icon-16.png'), png16);
writeFileSync(join(OUT, 'icon-32.png'), png32);
writeFileSync(join(OUT, 'icon-48.png'), png48);
writeFileSync(join(OUT, 'apple-icon.png'), encodePNG(scale(g32.buf, 32, 180), 180));
writeFileSync(join(OUT, 'icon-192.png'), encodePNG(scale(g32.buf, 32, 192), 192));
writeFileSync(join(OUT, 'icon-512.png'), encodePNG(scale(g32.buf, 32, 512), 512));
writeFileSync(join(OUT, 'icon.svg'), svg(g32));
writeFileSync(
  join(OUT, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'yule-agent-workspace',
      short_name: 'yule workspace',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon.svg', type: 'image/svg+xml', purpose: 'any' },
      ],
      theme_color: '#16110d',
      background_color: '#16110d',
      display: 'standalone',
    },
    null,
    2,
  ),
);
console.log('brand icons written to', OUT);

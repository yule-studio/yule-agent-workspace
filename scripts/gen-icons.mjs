/**
 * Generate the workspace favicon / app-icon set from a single pixel-art grid —
 * a cozy little office building. Dependency-free: PNGs are encoded by hand with
 * the built-in zlib, the .ico wraps a 32px PNG, and an SVG is emitted from the
 * same grid so every size stays in sync.
 *
 * Run:  node scripts/gen-icons.mjs   (writes to apps/web/public/)
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public');
mkdirSync(OUT, { recursive: true });

// ── palette + grid (16 x 16) ────────────────────────────────────────────
const PAL = {
  '.': null, // transparent
  R: '#f0a942', // roof
  r: '#d4862c', // roof shade
  w: '#f3e8d2', // wall
  s: '#e0d2b4', // wall shade
  b: '#6cc4e0', // window
  d: '#9c6b3f', // door
  g: '#57a85f', // plant
  p: '#b5651d', // pot
};
// 16 rows x 16 cols
const GRID = [
  '................',
  '.......RR.......',
  '......RRRR......',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '..rrrrrrrrrrrr..',
  '..wbbwsswwbbww..',
  '..wbbwsswwbbww..',
  '..wwwwsswwwwww..',
  '..wwwwddwwwwww..',
  '..wwwwddwwwwww..',
  '..wsswddwsswww..',
  '.pgwwwddwwwwgp..',
  '.ggwwwwwwwwwgg..',
];

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/** Build a 16x16 RGBA source buffer from the grid. */
function srcRGBA() {
  const buf = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = GRID[y][x];
      const col = PAL[ch];
      const i = (y * 16 + x) * 4;
      if (!col) {
        buf[i + 3] = 0;
      } else {
        const [r, g, b] = hex(col);
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
      }
    }
  }
  return buf;
}

/** Nearest-neighbour upscale 16x16 RGBA -> size x size RGBA. */
function scale(src, size) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.floor((y * 16) / size);
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x * 16) / size);
      const si = (sy * 16 + sx) * 4;
      const di = (y * size + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
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
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // raw scanlines with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function encodeICO(png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = 32; // width
  entry[1] = 32; // height
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(22, 12); // offset = 6 + 16
  return Buffer.concat([header, entry, png32]);
}

function svg() {
  let rects = '';
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const col = PAL[GRID[y][x]];
      if (col) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" rx="3" fill="#241b13"/>${rects}</svg>\n`;
}

// ── emit ────────────────────────────────────────────────────────────────
const src = srcRGBA();
const png = (n) => encodePNG(scale(src, n), n);

writeFileSync(join(OUT, 'favicon.ico'), encodeICO(png(32)));
writeFileSync(join(OUT, 'icon-32.png'), png(32));
writeFileSync(join(OUT, 'apple-icon.png'), png(180));
writeFileSync(join(OUT, 'icon-192.png'), png(192));
writeFileSync(join(OUT, 'icon-512.png'), png(512));
writeFileSync(join(OUT, 'icon.svg'), svg());
writeFileSync(
  join(OUT, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'yule-agent-workspace',
      short_name: 'yule workspace',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#16110d',
      background_color: '#16110d',
      display: 'standalone',
    },
    null,
    2,
  ),
);

console.log('icons written to', OUT);

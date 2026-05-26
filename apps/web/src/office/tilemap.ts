/**
 * Tiled (.tmj) tilemap loader + canvas renderer. The office background is a real
 * Tiled map (apps/web/public/vendor/office/) painted from a tileset PNG atlas —
 * NOT hand-drawn per-feature primitives. Tile layers (floor → walls → furniture
 * → objects → overhead) are blitted with flip-bit support; object layers
 * (seats / pois / spawns / collisions) drive the agent overlay. Assets are
 * standard Tiled + tileset, so a Phaser renderer is a drop-in later.
 */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const GID_MASK = 0x1fffffff;

export interface TileLayer {
  name: string;
  type: 'tilelayer';
  data: number[];
}
export interface MapObject {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { name: string; value: string }[];
}
export interface ObjectGroup {
  name: string;
  type: 'objectgroup';
  objects: MapObject[];
}
export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  tilesets: { firstgid: number; columns: number; image: string; imagewidth: number; imageheight: number }[];
  layers: (TileLayer | ObjectGroup)[];
}

export interface SeatSlot {
  x: number; // centre px in native map space
  y: number;
  role: string; // member | tech-lead | assistant | visitor | review
  facing: string;
}
export interface Poi {
  x: number;
  y: number;
  name: string;
}

const BASE = '/vendor/office';
let cache: Promise<{ map: TiledMap; image: HTMLImageElement }> | null = null;

/** Load the map JSON + tileset image once (module-cached). */
export function loadOffice(): Promise<{ map: TiledMap; image: HTMLImageElement }> {
  if (cache) return cache;
  cache = (async () => {
    const map: TiledMap = await fetch(`${BASE}/office.tmj`).then((r) => r.json());
    const image = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = `${BASE}/${map.tilesets[0]!.image}`;
    });
    return { map, image };
  })();
  return cache;
}

export function mapPixelSize(map: TiledMap) {
  return { w: map.width * map.tilewidth, h: map.height * map.tileheight };
}

const prop = (o: MapObject, name: string) => o.properties?.find((p) => p.name === name)?.value ?? '';

export function readSeats(map: TiledMap): SeatSlot[] {
  const g = map.layers.find((l): l is ObjectGroup => l.type === 'objectgroup' && l.name === 'seats');
  return (g?.objects ?? []).map((o) => ({ x: o.x, y: o.y, role: prop(o, 'role') || o.name, facing: prop(o, 'facing') || 'up' }));
}

export function readPois(map: TiledMap): Poi[] {
  const g = map.layers.find((l): l is ObjectGroup => l.type === 'objectgroup' && l.name === 'pois');
  return (g?.objects ?? []).map((o) => ({ x: o.x, y: o.y, name: o.name }));
}

/** Paint every tile layer onto a canvas sized to the map's native pixel size. */
export function drawTilemap(ctx: CanvasRenderingContext2D, map: TiledMap, image: HTMLImageElement) {
  const T = map.tilewidth;
  const { firstgid, columns } = map.tilesets[0]!;
  const { w, h } = mapPixelSize(map);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  for (const layer of map.layers) {
    if (layer.type !== 'tilelayer') continue;
    const data = layer.data;
    for (let i = 0; i < data.length; i++) {
      const raw = data[i]! >>> 0;
      if (!raw) continue;
      const id = (raw & GID_MASK) - firstgid;
      if (id < 0) continue;
      const sx = (id % columns) * T;
      const sy = ((id / columns) | 0) * T;
      const dx = (i % map.width) * T;
      const dy = ((i / map.width) | 0) * T;
      const fh = !!(raw & FLIP_H);
      const fv = !!(raw & FLIP_V);
      const fd = !!(raw & FLIP_D);
      if (!fh && !fv && !fd) {
        ctx.drawImage(image, sx, sy, T, T, dx, dy, T, T);
        continue;
      }
      ctx.save();
      ctx.translate(dx + T / 2, dy + T / 2);
      if (fd) ctx.rotate(Math.PI / 2);
      ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
      ctx.drawImage(image, sx, sy, T, T, -T / 2, -T / 2, T, T);
      ctx.restore();
    }
  }
}

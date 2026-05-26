/**
 * Canvas pixel-art renderer for a floor. Draws the ENTIRE office (carpet,
 * walls, rooms, cubicle workstations, chairs, props) as one crisp bitmap from a
 * FloorMap — no DOM furniture. Everything is integer-pixel fillRect with 3-shade
 * blocks + small details, so it reads like a pixel-office screenshot. Agents are
 * layered on top by the React overlay (see PixelFloorCanvas).
 */
import { ART, type FloorMap, type PropKind } from './floormap.js';

const C = {
  void: '#0c0e12',
  carpet: ['#8b9099', '#83888f', '#90959d', '#7d828a'],
  seam: '#6b7079',
  tile: ['#c5c9c3', '#bdc1bb'],
  wall: '#d3d4cd',
  wallHi: '#e4e5de',
  wallSh: '#a8a99f',
  wallEdge: '#8d8e85',
  part: '#6b7280',
  partHi: '#838a97',
  partSh: '#4c525d',
  desk: '#abb1b9',
  deskHi: '#c2c7ce',
  deskSh: '#7d838c',
  deskEdge: '#686e77',
  grain: '#9aa0a8',
  bezel: '#161a22',
  bezelHi: '#262c38',
  key: '#cbd0d9',
  keyDk: '#9aa0ab',
  paper: '#e8eaef',
  paperLn: '#a9afba',
  chair: '#39414f',
  chairSeat: '#4c5566',
  chairHi: '#5b6678',
  wheel: '#272d36',
  metal: '#586273',
  metalHi: '#6c7686',
  metalSh: '#3a414c',
  green1: '#6fa07a',
  green2: '#8fb58f',
  green3: '#558464',
  pot: '#3a4250',
  box: '#8f8676',
  boxHi: '#a89e8a',
  accent: ['#a99cff', '#8c93d8', '#9fbd9f', '#e47b89', '#b58ac4'],
};

const SCREENS = [
  ['#1e2336', '#8c93d8', '#a99cff', '#b58ac4'],
  ['#1c2630', '#9fbd9f', '#7fae8a', '#cdd1da'],
  ['#241f33', '#d98aa5', '#e0a3b8', '#8c93d8'],
  ['#1d2236', '#8c93d8', '#9fbd9f', '#e47b89'],
];

const P = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function drawScreen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: number) {
  const s = SCREENS[kind % SCREENS.length]!;
  P(ctx, x, y, w, h, s[0]!);
  if (kind % 4 === 3) {
    for (let i = 0; i < 4; i++) P(ctx, x + 1 + (i % 2) * (w / 2), y + 1 + Math.floor(i / 2) * (h / 2), w / 2 - 1, h / 2 - 1, s[1 + (i % 3)]!);
  } else {
    const lens = [w - 3, w - 6, w - 2, w - 7];
    for (let i = 0; i < 4; i++) P(ctx, x + 1, y + 1 + i * 2, lens[i]!, 1, s[1 + (i % 3)]!);
  }
}

function workstation(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  const dual = seed % 3 !== 0;
  // cast shadow on the floor (depth)
  P(ctx, x + 4, y + 56, 92, 8, '#00000026');
  P(ctx, x + 96, y + 8, 4, 50, '#00000018');
  // cubicle side partitions (thin, shaded — enclose the desk)
  P(ctx, x, y + 2, 5, 54, C.part);
  P(ctx, x, y + 2, 5, 2, C.partHi);
  P(ctx, x + 3, y + 2, 2, 54, C.partSh);
  P(ctx, x + 91, y + 2, 5, 54, C.part);
  P(ctx, x + 91, y + 2, 5, 2, C.partHi);
  P(ctx, x + 91, y + 2, 2, 54, C.partSh);
  // back partition (taller) + pinboard + postits
  P(ctx, x, y, 96, 10, C.part);
  P(ctx, x, y, 96, 2, C.partHi);
  P(ctx, x, y + 8, 96, 2, C.partSh);
  P(ctx, x + 5, y + 10, 86, 3, '#00000026'); // partition casts onto desk → depth
  P(ctx, x + 60, y + 2, 16, 6, '#2c323b'); // small pinboard
  P(ctx, x + 8, y + 2, 5, 5, C.accent[seed % C.accent.length]!);
  P(ctx, x + 15, y + 2, 5, 5, C.accent[(seed + 2) % C.accent.length]!);
  // desk surface (inset between walls) + back lip riser (pseudo-3D)
  P(ctx, x + 5, y + 26, 86, 27, C.desk);
  P(ctx, x + 5, y + 24, 86, 2, C.deskHi); // back lip catches light
  P(ctx, x + 5, y + 26, 86, 2, C.deskHi);
  P(ctx, x + 5, y + 50, 86, 3, C.deskSh);
  P(ctx, x + 5, y + 53, 86, 1, C.deskEdge);
  P(ctx, x + 30, y + 28, 1, 22, C.grain); // seam
  P(ctx, x + 58, y + 28, 1, 22, C.grain);
  // monitors (with cast shadow on desk)
  const m1 = dual ? x + 22 : x + 38;
  P(ctx, m1 + 1, y + 26, 18, 3, '#00000022');
  P(ctx, m1 + 7, y + 25, 4, 3, C.bezel);
  P(ctx, m1, y + 13, 20, 14, C.bezel);
  P(ctx, m1, y + 13, 20, 2, C.bezelHi);
  drawScreen(ctx, m1 + 2, y + 15, 16, 10, seed);
  if (dual) {
    const m2 = x + 50;
    P(ctx, m2 + 1, y + 26, 18, 3, '#00000022');
    P(ctx, m2 + 7, y + 25, 4, 3, C.bezel);
    P(ctx, m2, y + 13, 20, 14, C.bezel);
    P(ctx, m2, y + 13, 20, 2, C.bezelHi);
    drawScreen(ctx, m2 + 2, y + 15, 16, 10, seed + 2);
  }
  // keyboard + mouse
  P(ctx, x + 34, y + 42, 26, 7, C.key);
  P(ctx, x + 34, y + 42, 26, 1, C.keyDk);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) P(ctx, x + 36 + c * 3, y + 44 + r * 2, 2, 1, C.keyDk);
  P(ctx, x + 63, y + 44, 4, 5, C.key);
  // papers (stacked w/ shadow) + mug + cable
  P(ctx, x + 9, y + 35, 13, 16, '#00000018');
  P(ctx, x + 8, y + 33, 13, 16, C.paper);
  for (let i = 0; i < 4; i++) P(ctx, x + 10, y + 36 + i * 3, [9, 7, 10, 6][i]!, 1, C.paperLn);
  P(ctx, x + 75, y + 37, 8, 9, C.accent[(seed + 1) % C.accent.length]!);
  P(ctx, x + 75, y + 37, 8, 2, '#ffffff55');
  P(ctx, x + 83, y + 39, 2, 4, C.accent[(seed + 1) % C.accent.length]!);
  P(ctx, x + 44, y + 27, 1, 4, '#2a2f38'); // cable to monitor
  // sticky note + optional desk plant / small box
  P(ctx, x + 28, y + 30, 4, 4, '#e0d96a');
  if (seed % 4 === 1) {
    P(ctx, x + 84, y + 28, 8, 7, C.pot);
    P(ctx, x + 83, y + 24, 10, 6, C.green2);
  } else if (seed % 4 === 3) {
    P(ctx, x + 84, y + 30, 8, 6, C.box);
    P(ctx, x + 84, y + 30, 8, 2, C.boxHi);
  }
}

function chair(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  P(ctx, cx - 11, cy + 8, 22, 3, '#00000033'); // shadow
  P(ctx, cx - 8, cy - 8, 16, 6, C.chair); // back
  P(ctx, cx - 8, cy - 8, 16, 2, C.chairHi);
  P(ctx, cx - 9, cy - 2, 3, 8, C.metalSh); // armrests
  P(ctx, cx + 6, cy - 2, 3, 8, C.metalSh);
  P(ctx, cx - 8, cy - 2, 16, 11, C.chairSeat);
  P(ctx, cx - 5, cy, 10, 7, C.chairHi);
  P(ctx, cx - 1, cy + 9, 2, 3, C.wheel);
}

function plant(ctx: CanvasRenderingContext2D, x: number, y: number, tall: boolean, seed = 0) {
  P(ctx, x + 2, y + 22, 4, 2, '#00000033');
  P(ctx, x, y + 16, 14, 9, C.pot);
  P(ctx, x, y + 16, 14, 2, C.metalHi);
  if (tall) {
    P(ctx, x + 6, y + 2, 2, 14, C.green3);
    P(ctx, x + 1, y, 6, 4, C.green1);
    P(ctx, x + 7, y + 2, 6, 4, C.green2);
    P(ctx, x + 2, y + 6, 5, 4, C.green3);
    P(ctx, x + 8, y + 7, 5, 4, C.green1);
  } else {
    P(ctx, x + 1, y + 6, 12, 11, seed % 2 ? C.green1 : C.green2);
    P(ctx, x + 3, y + 4, 8, 5, C.green2);
    P(ctx, x, y + 9, 5, 6, C.green3);
    P(ctx, x + 9, y + 10, 5, 5, C.green3);
  }
}

function prop(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, w = 0, h = 0, tone = '', seed = 0) {
  switch (kind) {
    case 'plant':
      return plant(ctx, x, y, false, seed);
    case 'plant2':
      return plant(ctx, x, y, true, seed);
    case 'cabinet':
      P(ctx, x, y, 26, 40, C.metal);
      P(ctx, x, y, 26, 2, C.metalHi);
      P(ctx, x, y, 2, 40, C.metalSh);
      for (let i = 0; i < 3; i++) {
        P(ctx, x + 3, y + 4 + i * 12, 20, 10, C.metalSh);
        P(ctx, x + 11, y + 8 + i * 12, 5, 2, C.metalHi);
      }
      return;
    case 'bookshelf': {
      P(ctx, x, y, 16, 84, '#2c323b');
      P(ctx, x + 1, y + 1, 14, 82, '#222831');
      const sp = C.accent;
      for (let r = 0; r < 5; r++) for (let i = 0; i < 5; i++) P(ctx, x + 2 + i * 2.4, y + 4 + r * 16 + (i % 2), 2, 13, sp[(i + r) % sp.length]!);
      return;
    }
    case 'printer':
      P(ctx, x, y, 30, 18, C.metal);
      P(ctx, x, y, 30, 2, C.metalHi);
      P(ctx, x + 4, y - 5, 22, 6, C.metalSh);
      P(ctx, x + 8, y + 14, 16, 6, C.paper);
      P(ctx, x + 4, y + 6, 6, 2, C.accent[1]!);
      return;
    case 'box':
      P(ctx, x, y, 28, 24, C.box);
      P(ctx, x, y, 28, 3, C.boxHi);
      P(ctx, x + 11, y - 2, 6, 3, '#c9bfa6');
      P(ctx, x, y + 11, 28, 1, '#6f6657');
      return;
    case 'docs':
      P(ctx, x, y + 6, 24, 8, '#c6cad2');
      P(ctx, x + 2, y + 2, 22, 8, C.paper);
      P(ctx, x + 4, y + 5, 14, 1, C.paperLn);
      return;
    case 'water':
      P(ctx, x + 2, y + 10, 12, 18, '#cbd1da');
      P(ctx, x + 3, y, 10, 11, '#aeb4e0');
      P(ctx, x + 4, y + 2, 8, 7, '#cdd1ef');
      return;
    case 'server':
      P(ctx, x, y, 40, 36, '#11151d');
      for (let r = 0; r < 4; r++) {
        P(ctx, x + 3, y + 3 + r * 8, 34, 6, '#1b2230');
        P(ctx, x + 30, y + 4 + r * 8, 2, 2, C.accent[r % C.accent.length]!);
        P(ctx, x + 34, y + 4 + r * 8, 2, 2, C.green2);
      }
      return;
    case 'whiteboard':
      P(ctx, x, y, w || 70, 22, '#aab0bb');
      P(ctx, x + 2, y + 2, (w || 70) - 4, 16, '#eef0f4');
      P(ctx, x + 5, y + 5, (w || 70) - 30, 2, C.accent[1]!);
      P(ctx, x + 5, y + 9, (w || 70) - 16, 2, C.accent[0]!);
      P(ctx, x + 5, y + 13, (w || 70) - 40, 2, C.green1);
      return;
    case 'sofa':
      P(ctx, x, y, 70, 26, '#3a4250');
      P(ctx, x, y, 70, 5, '#4c5466');
      for (const dx of [3, 25, 47]) {
        P(ctx, x + dx, y + 7, 20, 16, '#586278');
        P(ctx, x + dx, y + 7, 20, 3, '#66718a');
      }
      return;
    case 'coffee':
      P(ctx, x, y + 4, 50, 16, '#3c434d');
      P(ctx, x, y + 2, 50, 3, '#586273');
      P(ctx, x + 4, y - 6, 12, 9, '#2c323b');
      P(ctx, x + 6, y - 4, 8, 3, C.accent[1]!);
      P(ctx, x + 24, y - 3, 5, 6, C.green2);
      P(ctx, x + 34, y - 3, 5, 6, C.accent[3]!);
      return;
    case 'trash':
      P(ctx, x, y + 2, 12, 16, C.metal);
      P(ctx, x - 1, y, 14, 2, C.metalSh);
      P(ctx, x + 3, y + 4, 1, 11, C.metalSh);
      P(ctx, x + 7, y + 4, 1, 11, C.metalSh);
      return;
    case 'postits':
      P(ctx, x, y + 2, 9, 9, '#e47b89');
      P(ctx, x + 10, y, 9, 9, '#a99cff');
      P(ctx, x + 4, y + 10, 9, 9, '#9fbd9f');
      return;
    case 'desk-small':
      P(ctx, x, y, w || 60, h || 40, C.desk);
      P(ctx, x, y, w || 60, 2, C.deskHi);
      P(ctx, x, y + (h || 40) - 3, w || 60, 3, C.deskSh);
      P(ctx, x + (w || 60) / 2 - 9, y + 6, 18, 12, C.bezel);
      drawScreen(ctx, x + (w || 60) / 2 - 7, y + 8, 14, 8, tone === 'violet' ? 0 : 1);
      P(ctx, x + (w || 60) / 2 - 9, y + 22, 18, 5, C.key);
      return;
    case 'rug': {
      const cols = tone === 'violet' ? ['#332c4a', '#4c4270', '#a99cff'] : tone === 'rose' ? ['#3a2c34', '#5a4350', '#d98aa5'] : ['#2b3142', '#3c455c', '#8c93d8'];
      const W = w || 120;
      const H = h || 90;
      P(ctx, x, y, W, H, cols[0]!);
      ctx.strokeStyle = cols[1]!;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, W - 8, H - 8);
      ctx.strokeStyle = cols[2]!;
      ctx.strokeRect(x + 12, y + 12, W - 24, H - 24);
      return;
    }
  }
}

function floorTiles(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const t = 16;
  for (let ty = y0; ty < y1; ty += t)
    for (let tx = x0; tx < x1; tx += t) {
      const n = (Math.floor(tx / t) * 7 + Math.floor(ty / t) * 13) % 4;
      P(ctx, tx, ty, t, t, C.carpet[n]!);
      P(ctx, tx, ty, t, 1, C.seam);
      P(ctx, tx, ty, 1, t, C.seam);
    }
}

export function drawFloor(ctx: CanvasRenderingContext2D, map: FloorMap) {
  ctx.clearRect(0, 0, ART.w, ART.h);
  P(ctx, 0, 0, ART.w, ART.h, C.void);
  const inX = ART.wall;
  const inY = ART.wall;
  const inW = ART.w - ART.wall * 2;
  const inH = ART.h - ART.wall * 2;

  // carpet
  floorTiles(ctx, inX, inY, inX + inW, inY + inH);
  // room floors
  for (const r of map.rooms) {
    if (r.floor === 'tile') {
      const t = 14;
      for (let ty = r.y; ty < r.y + r.h; ty += t)
        for (let tx = r.x; tx < r.x + r.w; tx += t) P(ctx, tx, ty, t, t, ((tx / t + ty / t) | 0) % 2 ? C.tile[0]! : C.tile[1]!);
    } else if (r.floor === 'rug-violet') prop(ctx, 'rug', r.x + 6, r.y + 6, r.w - 12, r.h - 12, 'violet');
    else if (r.floor === 'rug-rose') prop(ctx, 'rug', r.x + 6, r.y + 6, r.w - 12, r.h - 12, 'rose');
  }

  // perimeter walls (light concrete, shaded)
  P(ctx, 0, 0, ART.w, ART.wall, C.wall);
  P(ctx, 0, ART.h - ART.wall, ART.w, ART.wall, C.wall);
  P(ctx, 0, 0, ART.wall, ART.h, C.wall);
  P(ctx, ART.w - ART.wall, 0, ART.wall, ART.h, C.wall);
  P(ctx, 0, ART.wall - 2, ART.w, 2, C.wallSh);
  P(ctx, 0, 0, ART.w, 1, C.wallHi);
  // interior walls
  for (const w of map.walls) {
    P(ctx, w.x, w.y, w.w, w.h, C.wall);
    P(ctx, w.x, w.y, w.w, 1, C.wallHi);
    P(ctx, w.x, w.y + w.h - 1, w.w, 1, C.wallSh);
  }

  // desks + chairs
  for (const d of map.desks) {
    workstation(ctx, d.x, d.y, d.seed);
    chair(ctx, d.x + 49, d.y + 66);
  }
  // props (sorted by y for overlap)
  for (const p of [...map.props].sort((a, b) => a.y - b.y)) prop(ctx, p.kind, p.x, p.y, p.w, p.h, p.tone, p.seed);
}

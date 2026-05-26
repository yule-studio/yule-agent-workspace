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

/**
 * One workstation drawn top-down with real layering/thickness:
 * back partition (top face + front face + cast shadow) → desk slab (top surface
 * + back highlight + thick FRONT edge + side edges) → monitor (screen + stand +
 * contact shadow) → desk props. The chair + agent are drawn in FRONT (below).
 */
function workstation(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  const dual = seed % 3 !== 0;
  const ix = x + 6;
  const iw = 84;
  // floor contact shadow (blocky) under the desk + chair zone
  P(ctx, x + 8, y + 47, 82, 8, '#00000022');
  // ── side dividers (cubicle walls w/ top + front face) ──
  for (const sx of [x, x + 91]) {
    P(ctx, sx, y + 2, 5, 42, C.part);
    P(ctx, sx, y + 2, 5, 2, C.partHi);
    P(ctx, sx + 3, y + 2, 2, 42, C.partSh);
  }
  // ── back partition: top face + highlight + FRONT face (thickness) + cast shadow ──
  P(ctx, x + 4, y, 88, 6, C.part);
  P(ctx, x + 4, y, 88, 2, C.partHi);
  P(ctx, x + 4, y + 6, 88, 3, C.partSh);
  P(ctx, ix, y + 9, iw, 2, '#00000028');
  P(ctx, x + 58, y + 1, 16, 4, '#2c323b'); // pinboard
  P(ctx, x + 9, y + 1, 4, 4, C.accent[seed % C.accent.length]!);
  P(ctx, x + 15, y + 1, 4, 4, C.accent[(seed + 2) % C.accent.length]!);
  // ── desk slab: top surface + back highlight + FRONT edge + side edges ──
  P(ctx, ix, y + 11, iw, 33, C.desk);
  P(ctx, ix, y + 11, iw, 2, C.deskHi);
  P(ctx, ix, y + 13, 2, 31, '#9aa0a8'); // left side (lit)
  P(ctx, ix + iw - 2, y + 13, 2, 31, C.deskSh); // right side (shadow)
  P(ctx, ix, y + 44, iw, 6, C.deskSh); // FRONT edge (vertical face) — thickness
  P(ctx, ix, y + 50, iw, 1, C.deskEdge);
  P(ctx, ix + 26, y + 14, 1, 28, C.grain);
  P(ctx, ix + 54, y + 14, 1, 28, C.grain);
  // ── monitors (screen + stand + contact shadow on desk) ──
  const mon = (mx: number, scr: number) => {
    P(ctx, mx, y + 30, 20, 2, '#00000026'); // contact shadow
    P(ctx, mx + 8, y + 28, 4, 3, C.bezel); // stand neck
    P(ctx, mx + 4, y + 30, 12, 2, C.bezel); // base
    P(ctx, mx, y + 15, 20, 14, C.bezel);
    P(ctx, mx, y + 15, 20, 2, C.bezelHi);
    drawScreen(ctx, mx + 2, y + 17, 16, 10, scr);
  };
  if (dual) {
    mon(ix + 12, seed);
    mon(ix + 44, seed + 2);
  } else {
    mon(ix + 32, seed);
  }
  P(ctx, ix + 42, y + 31, 1, 3, '#2a2f38'); // cable
  // ── desk props (on the top surface, front area) ──
  P(ctx, ix + 26, y + 37, 26, 6, C.key);
  P(ctx, ix + 26, y + 37, 26, 1, C.keyDk);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) P(ctx, ix + 28 + c * 3, y + 39 + r * 2, 2, 1, C.keyDk);
  P(ctx, ix + 56, y + 39, 4, 4, C.key); // mouse
  P(ctx, ix + 3, y + 31, 12, 12, '#00000018'); // paper shadow
  P(ctx, ix + 2, y + 29, 12, 12, C.paper);
  for (let i = 0; i < 3; i++) P(ctx, ix + 4, y + 32 + i * 3, [8, 6, 9][i]!, 1, C.paperLn);
  P(ctx, ix + 66, y + 33, 7, 8, C.accent[(seed + 1) % C.accent.length]!); // mug
  P(ctx, ix + 66, y + 33, 7, 2, '#ffffff55');
  P(ctx, ix + 20, y + 22, 4, 4, '#e0d96a'); // sticky note on partition base
  if (seed % 4 === 1) {
    P(ctx, ix + 74, y + 28, 8, 6, C.pot);
    P(ctx, ix + 73, y + 25, 10, 5, C.green2);
  } else if (seed % 4 === 3) {
    P(ctx, ix + 74, y + 30, 8, 6, C.box);
    P(ctx, ix + 74, y + 30, 8, 2, C.boxHi);
  }
}

/** Top-down office chair facing the desk (person sits facing away/up). */
function chair(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  P(ctx, cx - 12, cy + 9, 24, 4, '#00000028'); // floor contact shadow
  for (const dx of [-9, -4, 1, 6]) P(ctx, cx + dx, cy + 6, 3, 2, C.metalSh); // base spokes
  P(ctx, cx - 2, cy + 1, 4, 6, C.metalSh); // gas lift
  P(ctx, cx - 9, cy - 4, 18, 11, C.chairSeat); // seat top
  P(ctx, cx - 9, cy - 4, 18, 2, C.chairHi); // seat highlight
  P(ctx, cx - 9, cy + 5, 18, 2, C.chair); // seat front edge
  P(ctx, cx - 11, cy - 2, 3, 9, C.chair); // armrests
  P(ctx, cx + 8, cy - 2, 3, 9, C.chair);
  P(ctx, cx - 8, cy + 7, 16, 6, C.chair); // backrest (toward viewer)
  P(ctx, cx - 8, cy + 7, 16, 2, C.chairHi);
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
      P(ctx, x + 1, y + 40, 26, 4, '#00000022'); // floor contact shadow
      P(ctx, x, y, 26, 40, C.metal); // top/body
      P(ctx, x, y, 26, 2, C.metalHi); // top highlight
      P(ctx, x, y, 2, 40, C.metalHi); // left lit edge
      P(ctx, x + 24, y, 2, 40, C.metalSh); // right shadow edge
      P(ctx, x, y + 38, 26, 2, C.metalSh); // front edge
      for (let i = 0; i < 3; i++) {
        P(ctx, x + 3, y + 4 + i * 12, 20, 9, C.metalSh);
        P(ctx, x + 3, y + 4 + i * 12, 20, 1, '#465062');
        P(ctx, x + 11, y + 7 + i * 12, 5, 2, C.metalHi);
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
      P(ctx, x + 2, y + 26, 68, 4, '#00000022'); // contact shadow
      P(ctx, x, y, 70, 26, '#3a4250'); // frame
      P(ctx, x, y, 70, 4, '#525c70'); // backrest top highlight
      P(ctx, x, y + 23, 70, 3, '#2a313d'); // front edge (thickness)
      P(ctx, x, y + 4, 4, 22, '#2f3744'); // left arm side
      P(ctx, x + 66, y + 4, 4, 22, '#2f3744'); // right arm side
      for (const dx of [4, 26, 48]) {
        P(ctx, x + dx, y + 7, 20, 15, '#586278'); // cushion top
        P(ctx, x + dx, y + 7, 20, 3, '#66718a'); // cushion highlight
        P(ctx, x + dx, y + 20, 20, 2, '#46506180'); // cushion front
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
    case 'desk-small': {
      const dw = w || 60;
      const dh = h || 40;
      P(ctx, x + 2, y + dh - 1, dw, 5, '#00000022'); // contact shadow
      P(ctx, x, y, dw, dh - 6, C.desk); // top surface
      P(ctx, x, y, dw, 2, C.deskHi); // back highlight
      P(ctx, x, y + dh - 6, dw, 5, C.deskSh); // FRONT edge (thickness)
      P(ctx, x, y + dh - 1, dw, 1, C.deskEdge);
      P(ctx, x, y + 2, 2, dh - 8, '#9aa0a8'); // left side
      P(ctx, x + dw - 2, y + 2, 2, dh - 8, C.deskSh); // right side
      P(ctx, x + dw / 2 - 8, y + 12, 16, 2, '#00000022'); // monitor contact shadow
      P(ctx, x + dw / 2 - 1, y + 11, 2, 2, C.bezel);
      P(ctx, x + dw / 2 - 9, y + 4, 18, 9, C.bezel);
      drawScreen(ctx, x + dw / 2 - 7, y + 5, 14, 7, tone === 'violet' ? 0 : 1);
      P(ctx, x + dw / 2 - 9, y + 16, 18, 4, C.key); // keyboard
      P(ctx, x + 4, y + 16, 8, 6, C.paper); // papers
      return;
    }
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
    case 'chair':
      return chair(ctx, x, y);
    case 'exec-desk': {
      const dw = w || 132;
      const dh = h || 62;
      P(ctx, x + 4, y + dh - 1, dw, 7, '#00000026'); // floor contact shadow
      // low credenza panel behind the desk (depth backdrop)
      P(ctx, x + 10, y - 7, dw - 20, 7, C.part);
      P(ctx, x + 10, y - 7, dw - 20, 2, C.partHi);
      P(ctx, x + 10, y, dw - 20, 2, '#00000026');
      // desk top surface + edges
      P(ctx, x, y + 2, dw, dh - 12, C.desk);
      P(ctx, x, y + 2, dw, 2, C.deskHi); // back highlight
      P(ctx, x, y + 4, 2, dh - 14, '#9aa0a8'); // left lit side
      P(ctx, x + dw - 2, y + 4, 2, dh - 14, C.deskSh); // right shadow side
      P(ctx, x, y + dh - 10, dw, 9, C.deskSh); // thick FRONT edge (vertical face)
      P(ctx, x, y + dh - 1, dw, 1, C.deskEdge);
      P(ctx, x + Math.round(dw * 0.32), y + 5, 1, dh - 18, C.grain);
      P(ctx, x + Math.round(dw * 0.66), y + 5, 1, dh - 18, C.grain);
      // dual monitors (with stand + contact shadow)
      const monE = (mx: number, scr: number) => {
        P(ctx, mx, y + 18, 22, 2, '#00000026');
        P(ctx, mx + 9, y + 16, 4, 3, C.bezel);
        P(ctx, mx + 4, y + 18, 14, 2, C.bezel);
        P(ctx, mx, y + 3, 22, 15, C.bezel);
        P(ctx, mx, y + 3, 22, 2, C.bezelHi);
        drawScreen(ctx, mx + 2, y + 5, 18, 11, scr);
      };
      monE(x + dw / 2 - 27, 0);
      monE(x + dw / 2 + 5, 3);
      // papers + cup on the right
      P(ctx, x + dw - 30, y + dh - 26, 14, 13, '#00000018');
      P(ctx, x + dw - 31, y + dh - 28, 14, 13, C.paper);
      for (let i = 0; i < 3; i++) P(ctx, x + dw - 29, y + dh - 25 + i * 3, [9, 7, 10][i]!, 1, C.paperLn);
      P(ctx, x + dw - 15, y + dh - 22, 7, 8, C.accent[0]!);
      P(ctx, x + dw - 15, y + dh - 22, 7, 2, '#ffffff55');
      // keyboard + mouse centred at the front
      P(ctx, x + dw / 2 - 13, y + dh - 16, 26, 5, C.key);
      P(ctx, x + dw / 2 - 13, y + dh - 16, 26, 1, C.keyDk);
      P(ctx, x + dw / 2 + 16, y + dh - 15, 4, 4, C.key);
      return;
    }
    case 'meeting-table': {
      const dw = w || 108;
      const dh = h || 58;
      P(ctx, x + 4, y + dh - 1, dw - 6, 6, '#00000022'); // contact shadow
      // top-down oval-ish table top (stepped corners) + thickness
      P(ctx, x + 6, y, dw - 12, 3, C.desk);
      P(ctx, x, y + 6, dw, dh - 16, C.desk);
      P(ctx, x + 6, y + dh - 12, dw - 12, 3, C.desk);
      P(ctx, x + 6, y, dw - 12, 2, C.deskHi);
      P(ctx, x, y + 6, 2, dh - 16, '#9aa0a8'); // left lit side
      P(ctx, x + dw - 2, y + 6, 2, dh - 16, C.deskSh); // right shadow side
      P(ctx, x, y + dh - 12, dw, 4, C.deskSh); // front edge
      P(ctx, x + 6, y + dh - 8, dw - 12, 1, C.deskEdge);
      // laptop + papers + cups on the table
      P(ctx, x + dw / 2 - 12, y + dh / 2 - 7, 24, 12, '#23272f');
      drawScreen(ctx, x + dw / 2 - 10, y + dh / 2 - 5, 20, 8, 1);
      P(ctx, x + 16, y + 12, 12, 9, C.paper);
      P(ctx, x + dw - 30, y + 14, 7, 8, C.accent[2]!);
      P(ctx, x + dw - 20, y + dh - 22, 6, 7, C.accent[0]!);
      return;
    }
    case 'lamp':
      P(ctx, x - 2, y + 14, 13, 3, '#00000022'); // contact shadow
      P(ctx, x + 1, y + 1, 11, 7, '#cdd1ef22'); // soft glow pool
      P(ctx, x, y + 12, 8, 3, C.metal); // base
      P(ctx, x, y + 12, 8, 1, C.metalHi);
      P(ctx, x + 3, y + 4, 2, 9, C.metalSh); // arm
      P(ctx, x + 4, y + 1, 6, 4, C.metal); // head
      P(ctx, x + 5, y + 4, 4, 2, '#cdd1ef'); // light
      return;
    case 'status-light':
      P(ctx, x, y, 18, 8, '#2c323b'); // housing
      P(ctx, x, y, 18, 2, '#3a414c');
      P(ctx, x + 3, y + 3, 3, 3, C.green2);
      P(ctx, x + 8, y + 3, 3, 3, C.accent[0]!);
      P(ctx, x + 13, y + 3, 3, 3, C.accent[3]!);
      return;
    case 'wall-note': {
      const pw = w || 22;
      const ph = h || 28;
      P(ctx, x, y, pw, ph, '#2c323b'); // frame
      P(ctx, x + 2, y + 2, pw - 4, ph - 4, C.paper);
      P(ctx, x + 4, y + 4, pw - 8, ph - 14, C.accent[seed % C.accent.length]!); // image
      for (let i = 0; i < 3; i++) P(ctx, x + 4, y + ph - 9 + i * 2, pw - 8 - i * 2, 1, C.paperLn);
      return;
    }
    case 'roadmap': {
      const bw = w || 132;
      const bh = 26;
      const pal: Record<string, string[]> = {
        review: ['#8c93d8', '#9fbd9f', '#e47b89'],
        planning: ['#a99cff', '#8c93d8', '#9fbd9f'],
        campaign: ['#d98aa5', '#e47b89', '#b58ac4'],
        secure: ['#9fbd9f', '#8c93d8', '#a99cff'],
      };
      const cols = pal[tone] ?? ['#a99cff', '#9fbd9f', '#d98aa5'];
      P(ctx, x, y, bw, bh, '#aab0bb'); // frame
      P(ctx, x + 2, y + 2, bw - 4, bh - 4, '#eef0f4'); // board
      const colw = (bw - 8) / 3;
      for (let c = 0; c < 3; c++) {
        const cxp = x + 4 + c * colw;
        if (c > 0) P(ctx, cxp, y + 4, 1, bh - 8, '#c6cad2'); // column divider
        for (let r = 0; r < 3; r++) P(ctx, cxp + 3, y + 5 + r * 5, colw - 8, 3, cols[(c + r) % 3]!); // cards
      }
      return;
    }
    case 'door':
      P(ctx, x, y, 6, 40, '#00000018'); // shadow lip into the corridor
      P(ctx, x + 6, y + 6, 12, 28, C.tile[0]!); // threshold mat
      P(ctx, x + 6, y + 6, 12, 2, C.tile[1]!);
      P(ctx, x + 4, y, 3, 40, C.wallSh); // frame posts
      P(ctx, x + 17, y, 3, 40, C.wallSh);
      return;
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
    chair(ctx, d.x + 49, d.y + 60);
  }
  // props (sorted by y for overlap)
  for (const p of [...map.props].sort((a, b) => a.y - b.y)) prop(ctx, p.kind, p.x, p.y, p.w, p.h, p.tone, p.seed);
}

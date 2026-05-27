/**
 * Object detection for hand-laid reference sheets: background mask →
 * connected components → filtered, merged bounding boxes in reading order.
 */
import { dist2 } from './png.mjs';

/** Foreground mask: 1 where the pixel differs from bg beyond `thresh`. */
export function fgMask(img, bg, thresh) {
  const { w, h, data } = img;
  const t2 = thresh * thresh;
  const m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (dist2(data, p * 4, bg[0], bg[1], bg[2]) > t2) m[p] = 1;
  }
  return m;
}

/** Connected components (8-connectivity) → [{x0,y0,x1,y1,area}]. */
export function components(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x >= x1) x1 = x + 1;
      if (y >= y1) y1 = y + 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = ny * w + nx;
          if (mask[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
        }
      }
    }
    boxes.push({ x0, y0, x1, y1, area });
  }
  return boxes;
}

const overlapOrNear = (a, b, gap) =>
  a.x0 - gap < b.x1 && b.x0 - gap < a.x1 && a.y0 - gap < b.y1 && b.y0 - gap < a.y1;

/** Merge boxes that overlap or sit within `gap` px of each other. */
export function mergeBoxes(boxes, gap) {
  const out = boxes.map((b) => ({ ...b }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (overlapOrNear(out[i], out[j], gap)) {
          out[i] = {
            x0: Math.min(out[i].x0, out[j].x0),
            y0: Math.min(out[i].y0, out[j].y0),
            x1: Math.max(out[i].x1, out[j].x1),
            y1: Math.max(out[i].y1, out[j].y1),
            area: out[i].area + out[j].area,
          };
          out.splice(j, 1);
          changed = true;
          j--;
        }
      }
    }
  }
  return out;
}

/** Sort boxes top-to-bottom in row bands, then left-to-right. */
export function readingOrder(boxes, rowTol = 40) {
  const sorted = [...boxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows = [];
  for (const b of sorted) {
    const row = rows.find((r) => Math.abs(r.y - b.y0) < rowTol);
    if (row) row.items.push(b);
    else rows.push({ y: b.y0, items: [b] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
}

/**
 * Full pipeline: detect boxes for a sheet, applying area/size filters + merge.
 * opts: { thresh, minArea, minW, minH, mergeGap, rowTol }
 */
export function detectObjects(img, bg, opts) {
  const { thresh, minArea = 400, minW = 20, minH = 20, mergeGap = 6, rowTol = 40 } = opts;
  const mask = fgMask(img, bg, thresh);
  let boxes = components(mask, img.w, img.h)
    .filter((b) => b.area >= minArea && b.x1 - b.x0 >= minW && b.y1 - b.y0 >= minH);
  boxes = mergeBoxes(boxes, mergeGap)
    .filter((b) => b.x1 - b.x0 >= minW && b.y1 - b.y0 >= minH);
  return readingOrder(boxes, rowTol);
}

/**
 * Composes a Tiled-format (.tmj) office map from the generated tileset. Pure
 * data: writes tile GIDs into layer arrays (floor / walls / furniture / objects
 * / overhead) and object layers (seats / collisions / pois / spawns). Flip bits
 * (standard Tiled high bits) reuse corner/edge tiles. Consumed by the canvas
 * tilemap renderer and the seat-allocation overlay. Layout is deliberately
 * COMPACT — packed pods + adjacent rooms, no large empty floor.
 */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;

export function buildMap({ TS, nameToGid, atlasW, atlasH, count }) {
  const W = 27, H = 16;
  const g = (n) => {
    if (nameToGid[n] == null) throw new Error(`unknown tile ${n}`);
    return nameToGid[n];
  };
  const N = W * H;
  const floor = new Array(N).fill(0);
  const walls = new Array(N).fill(0);
  const furniture = new Array(N).fill(0);
  const objects = new Array(N).fill(0);
  const overhead = new Array(N).fill(0);
  const idx = (c, r) => r * W + c;
  const set = (layer, c, r, gid) => { if (c >= 0 && c < W && r >= 0 && r < H) layer[idx(c, r)] = gid >>> 0; };

  const seats = [], collisions = [], pois = [], spawns = [];
  let oid = 1;
  const px = (c) => c * TS;
  const seat = (c, r, role, facing) => seats.push({ id: oid++, name: role, x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'role', type: 'string', value: role }, { name: 'facing', type: 'string', value: facing }] });
  const poi = (c, r, name, facing = 'down') => pois.push({ id: oid++, name, x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'facing', type: 'string', value: facing }] });
  const spawn = (c, r, facing) => spawns.push({ id: oid++, name: '', x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'facing', type: 'string', value: facing }] });
  const collide = (c, r, wc = 1, hr = 1) => collisions.push({ id: oid++, name: '', x: px(c), y: px(r), width: wc * TS, height: hr * TS });

  // ── floor: carpet everywhere, deterministic variation ──
  const carpet = [g('floor_carpet_a'), g('floor_carpet_b'), g('floor_carpet_c')];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) floor[idx(c, r)] = carpet[(c * 7 + r * 13) % 3];
  const tileRoom = (c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) floor[idx(c, r)] = ((c + r) % 2 ? g('floor_tile_b') : g('floor_tile_a')); };
  const corridorRow = (r, c0, c1) => { for (let c = c0; c <= c1; c++) floor[idx(c, r)] = g('floor_corridor'); };
  const corridorCol = (c, r0, r1) => { for (let r = r0; r <= r1; r++) floor[idx(c, r)] = g('floor_corridor'); };

  // ── perimeter walls + a south-face strip under the top wall ──
  for (let c = 0; c < W; c++) { set(walls, c, 0, g('wall')); set(walls, c, H - 1, g('wall')); }
  for (let r = 0; r < H; r++) { set(walls, 0, r, g('wall')); set(walls, W - 1, r, g('wall')); }
  for (let c = 1; c < W - 1; c++) set(walls, c, 1, g('wall_face'));
  for (let c = 0; c < W; c++) { collide(c, 0); collide(c, H - 1); }
  for (let r = 1; r < H - 1; r++) { collide(0, r); collide(W - 1, r); }

  const wallRect = (c0, r0, c1, r1, doors = []) => {
    const isDoor = (c, r) => doors.some((d) => c >= d.c0 && c <= d.c1 && r >= d.r0 && r <= d.r1);
    for (let c = c0; c <= c1; c++) { if (!isDoor(c, r0)) { set(walls, c, r0, g('wall_inner')); collide(c, r0); } if (!isDoor(c, r1)) { set(walls, c, r1, g('wall_inner')); collide(c, r1); } }
    for (let r = r0 + 1; r < r1; r++) { if (!isDoor(c0, r)) { set(walls, c0, r, g('wall_inner')); collide(c0, r); } if (!isDoor(c1, r)) { set(walls, c1, r, g('wall_inner')); collide(c1, r); } }
  };

  const screens = ['monitor_a', 'monitor_b', 'monitor_c'];
  const deskTriple = (pc, r) => {
    set(furniture, pc, r, g('desk_l')); set(furniture, pc + 1, r, g('desk_m')); set(furniture, pc + 2, r, g('desk_r'));
    collide(pc, r, 3, 1);
  };

  // =====================================================================
  // MAIN BULLPEN — packed back-to-back pods (cols 1..18, rows 2..9)
  // =====================================================================
  const podCols = [2, 6, 10, 14];
  const podBlocks = [3, 7]; // top-desk row of each back-to-back block
  let s = 0;
  for (const pr of podBlocks) {
    for (const pc of podCols) {
      deskTriple(pc, pr); deskTriple(pc, pr + 1);
      set(objects, pc + 1, pr, g(screens[s % 3])); set(objects, pc, pr, g('keyboard')); set(objects, pc + 2, pr, g('deskprops'));
      set(objects, pc + 1, pr + 1, g(screens[(s + 1) % 3])); set(objects, pc + 2, pr + 1, g('keyboard')); set(objects, pc, pr + 1, g('deskprops'));
      set(furniture, pc + 1, pr - 1, g('chair_down')); seat(pc + 1, pr - 1, 'member', 'down');
      set(furniture, pc + 1, pr + 2, g('chair_up')); seat(pc + 1, pr + 2, 'member', 'up');
      s++;
    }
  }
  corridorRow(10, 1, 25);
  corridorCol(19, 2, 9);
  // utility column (cols 17..18) + left shelves
  set(objects, 17, 2, g('bookshelf_t')); set(furniture, 17, 4, g('plant_b'));
  set(furniture, 17, 6, g('water')); set(furniture, 17, 8, g('plant_b'));
  set(objects, 1, 2, g('bookshelf_t')); set(furniture, 1, 9, g('plant_b'));

  // =====================================================================
  // MEETING ROOM — right side, walled (cols 19..26, rows 1..9)
  // =====================================================================
  tileRoom(20, 2, 25, 8);
  wallRect(19, 1, 26, 9, [{ c0: 19, c1: 19, r0: 5, r1: 6 }]); // door to the corridor
  set(objects, 21, 2, g('whiteboard_l')); set(objects, 22, 2, g('whiteboard_r')); set(objects, 24, 2, g('board_kanban'));
  set(furniture, 22, 4, g('table_tl')); set(furniture, 23, 4, g('table_tr'));
  set(furniture, 22, 5, g('table_bl')); set(furniture, 23, 5, g('table_br'));
  collide(22, 4, 2, 2);
  set(objects, 22, 4, g('laptop')); set(objects, 23, 5, g('deskprops'));
  set(furniture, 22, 3, g('chair_down')); set(furniture, 23, 3, g('chair_down'));
  set(furniture, 22, 6, g('chair_up')); set(furniture, 23, 6, g('chair_up'));
  seat(22, 3, 'review', 'down'); seat(23, 3, 'review', 'down');
  seat(22, 6, 'review', 'up'); seat(23, 6, 'review', 'up');
  set(furniture, 25, 2, g('plant_b')); set(furniture, 20, 7, g('plant_b'));
  set(furniture, 24, 7, g('water'));
  poi(22, 5, 'meeting', 'down');

  // =====================================================================
  // TECH LEAD OFFICE — bottom-left, walled (cols 1..9, rows 10..15)
  // =====================================================================
  tileRoom(2, 11, 8, 14);
  wallRect(1, 10, 9, 15, [{ c0: 9, c1: 9, r0: 12, r1: 13 }]); // door to the corridor
  rug(furniture, set, g, FLIP_H, FLIP_V, 'rug_l', 3, 11, 7, 14);
  deskTriple(3, 12);
  set(objects, 3, 12, g('monitor_a')); set(objects, 4, 12, g('monitor_b')); set(objects, 5, 12, g('deskprops'));
  set(objects, 5, 11, g('lamp'));
  set(furniture, 4, 13, g('chair_up')); seat(4, 13, 'tech-lead', 'up');
  set(furniture, 3, 14, g('chair_down')); set(furniture, 6, 14, g('chair_down'));
  seat(3, 14, 'visitor', 'up'); seat(6, 14, 'visitor', 'up');
  set(objects, 2, 11, g('board_kanban')); set(objects, 7, 11, g('poster')); set(objects, 8, 11, g('statuslight'));
  set(furniture, 8, 13, g('bookshelf_t')); set(furniture, 2, 14, g('plant_b'));
  poi(4, 13, 'lead-office', 'up');

  // =====================================================================
  // SUPPORT / STORAGE — bottom-centre (cols 10..18, rows 11..14)
  // =====================================================================
  set(furniture, 10, 12, g('desk_l')); set(furniture, 11, 12, g('desk_r'));
  collide(10, 12, 2, 1);
  set(objects, 10, 12, g('monitor_c')); set(objects, 11, 12, g('keyboard'));
  set(furniture, 10, 13, g('chair_up')); seat(10, 13, 'assistant', 'up');
  set(furniture, 13, 11, g('cabinet')); set(furniture, 14, 11, g('cabinet'));
  set(furniture, 13, 13, g('printer')); set(furniture, 15, 13, g('box'));
  set(furniture, 17, 11, g('server')); set(furniture, 17, 13, g('plant_b'));
  set(furniture, 15, 11, g('plant_s'));
  poi(13, 13, 'printer', 'down');

  // =====================================================================
  // LOUNGE / BREAKOUT — bottom-right open corner (cols 20..25, rows 11..14)
  // =====================================================================
  set(furniture, 20, 11, g('sofa_l')); set(furniture, 21, 11, g('sofa_m')); set(furniture, 22, 11, g('sofa_r'));
  collide(20, 11, 3, 1);
  set(furniture, 21, 12, g('table_bl')); set(furniture, 22, 12, g('table_br'));
  set(furniture, 21, 13, g('chair_up'));
  set(furniture, 24, 11, g('plant_b')); set(furniture, 20, 14, g('plant_b'));
  set(furniture, 24, 13, g('water'));
  set(objects, 24, 13, g('bookshelf_t'));
  set(furniture, 25, 12, g('cabinet'));
  poi(21, 13, 'lounge', 'up');

  // entries
  spawn(9, 10, 'left'); spawn(19, 10, 'up'); spawn(1, 10, 'right');

  // ── assemble Tiled JSON ──
  let lid = 1;
  const tl = (name, data) => ({ id: lid++, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
  const og = (name, objs) => ({ id: lid++, name, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: objs });

  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    infinite: false, width: W, height: H, tilewidth: TS, tileheight: TS, nextlayerid: 99, nextobjectid: oid,
    tilesets: [{ firstgid: 1, name: 'office', image: 'tileset.png', imagewidth: atlasW, imageheight: atlasH, tilewidth: TS, tileheight: TS, tilecount: count, columns: Math.floor(atlasW / TS), margin: 0, spacing: 0 }],
    layers: [
      tl('floor', floor), tl('walls', walls), tl('furniture', furniture), tl('objects', objects), tl('overhead', overhead),
      og('seats', seats), og('pois', pois), og('spawns', spawns), og('collisions', collisions),
    ],
  };
}

// place a lavender rug across a rect using the rug tiles + H/V flips (no diagonal)
function rug(layer, set, g, FH, FV, prefix, c0, r0, c1, r1) {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const top = r === r0, bot = r === r1, left = c === c0, right = c === c1;
    let gid;
    if ((top || bot) && (left || right)) { gid = g(`${prefix}_k`); if (right) gid |= FH; if (bot) gid |= FV; }
    else if (top || bot) { gid = g(`${prefix}_e`); if (bot) gid |= FV; }
    else gid = g(`${prefix}_i`);
    set(layer, c, r, gid >>> 0);
  }
}

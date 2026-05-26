/**
 * Composes a Tiled-format (.tmj) office map from the generated tileset. The
 * office is an IRREGULAR (L / Γ) building silhouette sitting in black void —
 * NOT a filled rectangle. An auto wall-ring outlines the footprint with thick
 * exterior walls; interior partitions (wall_inner) + door gaps carve small
 * rooms (meeting, tech-lead office, storage, lounge); corridors connect them.
 * Desks are facing 2-row pods. Rooms / walls / furniture / seats are all baked
 * here, like a real game tilemap. Consumed by the canvas renderer + overlay.
 */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;

export function buildMap({ TS, nameToGid, atlasW, atlasH, count }) {
  const W = 32, H = 22;
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

  const seats = [], collisions = [], pois = [], spawns = [], accents = [];
  let oid = 1;
  const px = (c) => c * TS;
  const seat = (c, r, role, facing) => seats.push({ id: oid++, name: role, x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'role', type: 'string', value: role }, { name: 'facing', type: 'string', value: facing }] });
  const poi = (c, r, name, facing = 'down') => pois.push({ id: oid++, name, x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'facing', type: 'string', value: facing }] });
  const spawn = (c, r, facing) => spawns.push({ id: oid++, name: '', x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true, properties: [{ name: 'facing', type: 'string', value: facing }] });
  const accentSlot = (c, r) => accents.push({ id: oid++, name: '', x: px(c) + TS / 2, y: px(r) + TS / 2, width: 0, height: 0, point: true });
  const collide = (c, r, wc = 1, hr = 1) => collisions.push({ id: oid++, name: '', x: px(c), y: px(r), width: wc * TS, height: hr * TS });

  // ── footprint: L / Γ silhouette (tall left block + top-right wing) ──
  const inside = (c, r) => (c >= 2 && c <= 20 && r >= 2 && r <= 20) || (c >= 21 && c <= 30 && r >= 2 && r <= 9);
  const edge = (c, r) => !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1);
  const carpet = [g('floor_carpet_a'), g('floor_carpet_b'), g('floor_carpet_c')];
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      if (!inside(c, r)) continue; // void → transparent (black)
      if (edge(c, r)) { set(walls, c, r, g('wall')); collide(c, r); }
      else floor[idx(c, r)] = carpet[(c * 7 + r * 13) % 3];
    }

  const tileRoom = (c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inside(c, r)) floor[idx(c, r)] = ((c + r) % 2 ? g('floor_tile_b') : g('floor_tile_a')); };
  const corridor = (c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inside(c, r) && !walls[idx(c, r)]) floor[idx(c, r)] = g('floor_corridor'); };
  // straight interior wall with door gaps (cells listed in doors are skipped)
  const wallLine = (cells, doors = []) => {
    for (const [c, r] of cells) {
      if (doors.some(([dc, dr]) => dc === c && dr === r)) continue;
      set(walls, c, r, g('wall_inner'));
      collide(c, r);
    }
  };
  const hLine = (c0, c1, r) => Array.from({ length: c1 - c0 + 1 }, (_, i) => [c0 + i, r]);
  const vLine = (r0, r1, c) => Array.from({ length: r1 - r0 + 1 }, (_, i) => [c, r0 + i]);

  // variant pools — chosen deterministically per pod index so no two pods are
  // copy-paste, but the same seat always gets the same setup.
  const MONS = ['monitor_a', 'monitor_b', 'monitor_c', 'monitor_d', 'monitor_dual', 'monitor_vert', 'monitor_large', 'monitor_combo'];
  const UPCH = ['chair_up', 'chair_exec_up', 'chair_mesh_up'];
  const CLUT = ['clutter_a', 'clutter_b', 'clutter_c', 'clutter_d', 'clutter_e'];
  const deskTriple = (pc, r, flipV = false, v = '') => {
    const f = flipV ? FLIP_V : 0;
    set(furniture, pc, r, g(`desk${v}_l`) | f); set(furniture, pc + 1, r, g(`desk${v}_m`) | f); set(furniture, pc + 2, r, g(`desk${v}_r`) | f);
    collide(pc, r, 3, 1);
  };

  // =====================================================================
  // MAIN BULLPEN — facing 2-row pods (cols 3..17, rows 3..12)
  // =====================================================================
  const podCols = [3, 7, 12, 16]; // non-uniform gaps (1 / 2 / 1 tile) → less grid-like
  const podBlocks = [4, 9]; // top-desk row of each back-to-back block
  let s = 0;
  for (const pr of podBlocks) {
    for (const pc of podCols) {
      const v = s % 2 ? '2' : ''; // alternate partition material
      deskTriple(pc, pr, true, v); // down-desk (front edge up, partition down)
      deskTriple(pc, pr + 1, false, v); // up-desk
      // down-desk row (agent above): monitor centre + keyboard + clutter combo
      set(objects, pc + 1, pr, g(MONS[s % MONS.length]));
      set(objects, pc, pr, g('keyboard'));
      set(objects, pc + 2, pr, g(CLUT[s % CLUT.length]));
      // up-desk row (agent below): monitor (V-flip → screen faces down) + clutter + keyboard
      set(objects, pc + 1, pr + 1, g(MONS[(s + 3) % MONS.length]) | FLIP_V);
      set(objects, pc, pr + 1, g(CLUT[(s + 2) % CLUT.length]));
      set(objects, pc + 2, pr + 1, g('keyboard'));
      // chairs — up-seat varies (task/exec/mesh), down-seat task
      set(furniture, pc + 1, pr - 1, g('chair_down')); seat(pc + 1, pr - 1, 'member', 'down');
      set(furniture, pc + 1, pr + 2, g(UPCH[s % UPCH.length])); seat(pc + 1, pr + 2, 'member', 'up');
      s++;
    }
  }
  // bullpen wall decor (row 2 = top wall) above each pod
  set(objects, 3, 2, g('whiteboard_l')); set(objects, 4, 2, g('whiteboard_r')); set(objects, 8, 2, g('corkboard')); set(objects, 13, 2, g('poster')); set(objects, 17, 2, g('board_kanban'));
  // separators in the WIDE inter-pod gap (cols 10-11) — break the repeat grid
  set(furniture, 10, 4, g('plant_b')); set(furniture, 10, 8, g('cabinet')); set(furniture, 11, 11, g('plant_b'));
  // narrow-gap fillers (cols 6 / 15) + right aisle (col 19)
  set(furniture, 6, 7, g('plant_s')); set(furniture, 15, 7, g('plant_s'));
  set(furniture, 19, 4, g('plant_b')); set(furniture, 19, 8, g('water')); set(furniture, 19, 11, g('plant_b'));
  corridor(2, 13, 19, 14);
  poi(10, 13, 'corridor', 'down');

  // =====================================================================
  // TOP-RIGHT WING — meeting room + lounge/library (cols 21..30, rows 2..9)
  // =====================================================================
  // partition separating bullpen aisle (col 20) from the wing (door rows 5..6)
  wallLine(vLine(3, 8, 21), [[21, 5], [21, 6]]);
  corridor(20, 4, 20, 7);
  // meeting room (cols 22..25)
  tileRoom(22, 3, 25, 8);
  wallLine(vLine(3, 8, 26)); // right wall of meeting (vs lounge)
  set(objects, 22, 2, g('whiteboard_l')); set(objects, 23, 2, g('whiteboard_r')); set(objects, 24, 2, g('board_kanban'));
  set(furniture, 23, 5, g('table_tl')); set(furniture, 24, 5, g('table_tr'));
  set(furniture, 23, 6, g('table_bl')); set(furniture, 24, 6, g('table_br'));
  collide(23, 5, 2, 2);
  set(objects, 23, 5, g('laptop')); set(objects, 24, 6, g('deskprops'));
  set(furniture, 23, 4, g('chair_down')); set(furniture, 24, 4, g('chair_down'));
  set(furniture, 23, 7, g('chair_up')); set(furniture, 24, 7, g('chair_up'));
  seat(23, 4, 'review', 'down'); seat(24, 4, 'review', 'down');
  seat(23, 7, 'review', 'up'); seat(24, 7, 'review', 'up');
  set(furniture, 22, 8, g('plant_b'));
  poi(23, 6, 'meeting', 'down');
  // lounge / library (cols 27..30) — reading + shelves, side-facing seats
  set(objects, 27, 2, g('corkboard')); set(objects, 29, 2, g('poster'));
  set(furniture, 27, 4, g('sofa_l')); set(furniture, 28, 4, g('sofa_m')); set(furniture, 29, 4, g('sofa_r'));
  collide(27, 4, 3, 1);
  set(furniture, 28, 5, g('table_bl')); set(furniture, 29, 5, g('table_br'));
  set(furniture, 27, 7, g('bookshelf_t')); set(furniture, 30, 6, g('plant_b'));
  set(furniture, 29, 7, g('chair_up')); seat(29, 7, 'member', 'up');
  set(furniture, 27, 6, g('chair_visitor')); // reading chair faces shelf
  seat(27, 6, 'member', 'left');
  set(furniture, 30, 3, g('water'));
  poi(28, 5, 'lounge', 'up');

  // =====================================================================
  // TECH LEAD OFFICE — bottom-left, walled (cols 2..11, rows 14..20)
  // =====================================================================
  tileRoom(3, 16, 10, 19);
  wallLine(hLine(3, 11, 15), [[6, 15], [7, 15]]); // top wall, door to corridor
  wallLine(vLine(16, 19, 11)); // right wall vs storage
  rug(furniture, set, g, FLIP_H, FLIP_V, 'rug_l', 4, 16, 9, 19);
  deskTriple(4, 16, false);
  set(objects, 4, 16, g('monitor_large')); set(objects, 5, 16, g('clutter_a')); set(objects, 6, 16, g('laptop'));
  set(objects, 6, 15, g('lamp'));
  set(furniture, 5, 17, g('chair_exec_up')); seat(5, 17, 'tech-lead', 'up');
  set(furniture, 4, 18, g('chair_visitor')); set(furniture, 7, 18, g('chair_visitor'));
  seat(4, 18, 'visitor', 'up'); seat(7, 18, 'visitor', 'up');
  set(objects, 3, 15, g('board_kanban')); set(objects, 9, 15, g('statuslight'));
  set(furniture, 10, 18, g('bookshelf_t')); set(furniture, 3, 19, g('plant_b'));
  poi(5, 17, 'lead-office', 'up');

  // =====================================================================
  // STORAGE / SUPPORT — bottom-centre (cols 12..19, rows 15..19)
  // =====================================================================
  set(furniture, 12, 16, g('desk_l')); set(furniture, 13, 16, g('desk_r'));
  collide(12, 16, 2, 1);
  set(objects, 12, 16, g('monitor_combo')); set(objects, 13, 16, g('clutter_c'));
  set(furniture, 12, 17, g('chair_up')); seat(12, 17, 'assistant', 'up');
  set(furniture, 15, 15, g('cabinet')); set(furniture, 16, 15, g('cabinet'));
  set(furniture, 15, 18, g('printer')); set(furniture, 17, 18, g('box'));
  set(furniture, 18, 15, g('server')); set(furniture, 19, 18, g('plant_b'));
  set(furniture, 17, 16, g('rack')); set(furniture, 14, 19, g('trash'));
  set(objects, 18, 17, g('docs'));
  poi(15, 18, 'printer', 'down');

  // per-floor accent slots (kept empty; renderer fills per floor type)
  for (const [c, r] of [[19, 4], [19, 6], [18, 13], [13, 13], [30, 8], [18, 19]]) if (inside(c, r)) accentSlot(c, r);

  // entries
  spawn(10, 13, 'up'); spawn(20, 5, 'right'); spawn(6, 15, 'down');

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
      og('seats', seats), og('pois', pois), og('spawns', spawns), og('accents', accents), og('collisions', collisions),
    ],
  };
}

// lavender rug across a rect using the rug tiles + H/V flips (no diagonal)
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

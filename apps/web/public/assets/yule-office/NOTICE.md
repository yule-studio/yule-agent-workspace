# Yule Agent Lab — runtime assets

These atlases are **baked**, not copied. Source art lives in
`assets-src/yule-workspace-motion/references/` (original, project-owned pixel-art
reference sheets). The baking scripts crop individual objects out of the
reference sheets, flood-fill the flat background to transparency, trim, and pack
them into texture atlases — the reference sheets themselves are never shipped or
rendered whole, and the `FRONT` / `BACK` / set-title labels in the sources do
not appear in the output.

Re-bake with:

```sh
node scripts/bake-office-atlas.mjs   # atlas/office-objects.{png,json}
node scripts/bake-agents.mjs         # atlas/agents.{png,json} + workstations.{png,json}
node scripts/bake-newmotion.mjs      # Building View: new-motion/{backgrounds,buildings,weather}
node scripts/gen-lab-map.mjs         # publish floor base image + ../../vendor/yule-office/yule-agent-lab.tmj (object-only)
```

## Runtime atlases (shipped)

- `atlas/office-objects.{png,json}` — desks (front/back per role), chairs, boards,
  shelves, plants, water cooler, globe, printer, racks, standalone monitors,
  `door_0..4` (door open/close swing).
- `atlas/agents.{png,json}` — 18 character skins × {idle, walk1, walk2, sit},
  front-3/4 facing, feet-anchored. Walking / standing.
- `atlas/workstations.{png,json}` — 18 skins × {wsfront, wsback} seated-at-desk
  composites (desk+monitor+chair+agent aligned). Occupied workstations.
- `new-motion/backgrounds/*` + `new-motion/buildings/*` + `new-motion/weather/*` —
  Building View: full city backdrops + the Yule Studio facade (checker-keyed to
  transparent) per time-of-day/weather, lazy-loaded; cloud/rain/snow overlay
  sprites. (No street props.)

## Source assets — used vs. reference-only

**Floor View base image (rendered whole — the only floor/wall visual):**
- `office-shell-floorplan-v2.png` — copied to `assets/yule-office/` by
  `scripts/gen-lab-map.mjs` and loaded by the runtime (`office/lab/scene.ts`) as
  the single base layer, stretched to the world so furniture/agent coordinates
  fall inside its rooms. The walls/floor/rooms/windows/corridor all live in this
  image; the Tiled map (`vendor/yule-office/yule-agent-lab.tmj`) is **object-only
  metadata** (seats/pois/spawns/doors/collisions) — no floor/wall tile layers.
  `scripts/analyze-floorplan.mjs` was used to derive the zone coordinates.

**Baked into runtime atlases (actually used):**
- `desk-ai-engineer-backend-devops.png`, `desk-analyst-product-designer.png` → desks/chairs
- `interior-props-boards-plants-watercooler-0{1,2}.png` → props/monitors
- `agent-motion-0{1,2,3}.png` → walk/idle frames
- `seated-desk-motion-0{1,2,3}.png` → seated composites (col1 sit, col2 wsfront, col4 wsback)
- `monitor-motion.png` → standalone monitors
- `door-motion.png` → door swing frames
- `new-motion/backgrounds/background-*.png` → Building View city backdrops (per time-of-day/weather)
- `new-motion/buildings/building-*.png` → Building View Yule Studio facade (per time-of-day)
- `new-motion/weather/*.png` → Building View cloud / rain-streak / snowflake overlay

**Legacy / no longer rendered (superseded by new-motion):**
- `time-of-day-building.png`, `time-of-day-backgrounds.png`, `weather-rain-snow-cloud-elements.png`,
  `weather-clear-elements.png`, `exterior-street-props.png` — the old Building View
  (facades/skies/weather panels/street props). Replaced by `new-motion/`.
- `references/deprecated/building-facade.png`, `references/deprecated/office-shell-floorplan.png`.
- `agent-motion-04.png`, `seated-desk-motion-04.png` — extra skins beyond the 18 used.

No third-party / non-redistributable assets are included.

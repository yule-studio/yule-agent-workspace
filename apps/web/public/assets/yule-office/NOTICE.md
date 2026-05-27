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
node scripts/bake-exterior.mjs       # atlas/exterior.{png,json}
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
- `atlas/exterior.{png,json}` — Building view: `bld_0..4` (Yule Studio facade per
  time of day), `sky_0..4` (full-width sky+skyline), `rain_panel`/`snow_panel`
  (scrolling weather), `cloud_a..d`/`wcloud`/`cloud_panel`, `sun`/`moon`, `puddle`,
  and street props (`st_lamp`/`st_bench`/`st_planter`/`st_vending`/`st_bike`/
  `st_traffic`/`st_mailbox`/`st_plant`/`st_sign`/`st_fence`/`st_pole`).

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
- `time-of-day-building.png`, `time-of-day-backgrounds.png` → Building facades + skies
- `weather-rain-snow-cloud-elements.png` → rain/snow panels + weather clouds + puddle
- `weather-clear-elements.png` → sun / moon / fair-weather cloud
- `exterior-street-props.png` → Building view street furniture

**Reference-only (not currently rendered):**
- `references/deprecated/building-facade.png`, `references/deprecated/office-shell-floorplan.png`
  — superseded by `office-shell-floorplan-v2.png` + `time-of-day-building.png`.
- `agent-motion-04.png`, `seated-desk-motion-04.png` — extra skins beyond the 18 used.

No third-party / non-redistributable assets are included.

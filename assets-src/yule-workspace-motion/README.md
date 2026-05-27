# Yule Workspace Motion Reference Pack

These images are source references for the Yule Agent Office redesign. They are
not final runtime sprites yet. Claude Code should crop, clean, atlas, and map
them into runtime assets under `apps/web/public/assets/yule-office/`.

## Latest Update

The files below were added from `~/Documents/yule-workspace-motion2` and should
be treated as the newest visual source for the next implementation pass:

- `references/building-facade.png`
  - Updated building/facade source. This replaces the previous
    `building-facade.png`.
- `references/office-shell-floorplan-v2.png`
  - Misnamed intermediate copy of the updated building/facade source. Do not use
    this as the interior floorplan reference.
- `references/door-motion.png`
  - Door/open-close motion sheet for room transitions and office entry points.
- `references/seated-desk-motion-01.png` through
  `references/seated-desk-motion-04.png`
  - Updated seated-at-desk motion references. Prefer these over the older
    `seated-desk-motion.png`.

## Files

- `references/office-shell-floorplan.png`
  - Current one-floor office shell reference for the interior map.
- `references/office-shell-floorplan-v2.png`
  - Misnamed intermediate copy of the updated building/facade source. Prefer
    `building-facade.png` for exterior/facade work and
    `office-shell-floorplan.png` for the interior map.
- `references/desk-ai-engineer-backend-devops.png`
  - Desk source sheet for AI engineer, backend/devops workstations, front/back
    views, and chairs.
- `references/desk-analyst-product-designer.png`
  - Desk source sheet for analyst/product/designer workstations, front/back
    views, and bonus chairs.
- `references/interior-props-boards-plants-watercooler-01.png`
  - Whiteboards, framed docs, shelves, plants, water cooler, globe.
- `references/interior-props-boards-plants-watercooler-02.png`
  - Additional office interior props.
- `references/agent-motion-01.png`
  - Agent body/idle/walk reference sheet.
- `references/agent-motion-02.png`
  - Additional agent motion variants.
- `references/agent-motion-03.png`
  - Additional agent motion variants.
- `references/agent-motion-04.png`
  - Additional agent motion variants.
- `references/seated-desk-motion.png`
  - Older seated-at-desk agent pose/motion reference.
- `references/seated-desk-motion-01.png`
  - Updated seated-at-desk agent pose/motion reference.
- `references/seated-desk-motion-02.png`
  - Updated seated-at-desk agent pose/motion reference.
- `references/seated-desk-motion-03.png`
  - Updated seated-at-desk agent pose/motion reference.
- `references/seated-desk-motion-04.png`
  - Updated seated-at-desk agent pose/motion reference.
- `references/door-motion.png`
  - Door animation reference for entry/open/close transitions.
- `references/monitor-motion.png`
  - Monitor/screen animation reference.
- `references/time-of-day-backgrounds.png`
  - Exterior time-of-day backgrounds for KST-driven windows/sky.
- `references/time-of-day-building.png`
  - Building exterior variations by time of day.
- `references/weather-clear-elements.png`
  - Clear weather sky/cloud/light elements.
- `references/weather-rain-snow-cloud-elements.png`
  - Cloud, rain, snow, puddle, sparkle overlays.
- `references/building-facade.png`
  - Current exterior building/facade reference. This has been replaced with the
    newly added source from `yule-workspace-motion2`.
- `references/exterior-street-props.png`
  - Street lights, poles, traffic/exterior props.

## Intended Runtime Direction

Use these as a clean source pack for a single-floor, game-like Yule Agent Lab.
The final app should not display these sheets directly. Extract sprites and
tiles into transparent PNG atlases plus Tiled JSON maps.

# Yule Workspace Motion Reference Pack

These images are source references for the Yule Agent Office redesign. They are
not final runtime sprites yet. Claude Code should crop, clean, atlas, and map
them into runtime assets under `apps/web/public/assets/yule-office/`.

## Canonical Layout Source

Use only this file as the canonical office/building layout source:

- `references/office-shell-floorplan-v2.png`
  - This is the selected source of truth.
  - Use it for the new single-floor Yule Agent Lab composition.
  - Do not choose between multiple shell/facade files anymore.

The older/confusing alternatives have been moved out of the active references:

- `references/deprecated/building-facade-deprecated.png`
- `references/deprecated/office-shell-floorplan-deprecated.png`

These deprecated files are kept only for historical comparison. Do not use them
for the implementation.

## Active Reference Files

- `references/office-shell-floorplan-v2.png`
  - Canonical map/building layout source.
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
- `references/new-motion/backgrounds/*.png`
  - Canonical full exterior backgrounds by time/weather. Use the full image;
    do not crop it only to make cloud motion.
- `references/new-motion/buildings/*.png`
  - Canonical Yule Studio building facade variants by time/weather.
- `references/new-motion/weather/*.png`
  - Canonical weather/motion element sheets: rain, puddles, snow, and clouds.

## Deprecated Exterior Sources

The previous generated exterior sheets are no longer active. They were moved to
`references/deprecated/exterior-legacy/` only for comparison:

- `references/deprecated/exterior-legacy/time-of-day-backgrounds.png`
- `references/deprecated/exterior-legacy/time-of-day-building.png`
- `references/deprecated/exterior-legacy/weather-clear-elements.png`
- `references/deprecated/exterior-legacy/weather-rain-snow-cloud-elements.png`
- `references/deprecated/exterior-legacy/exterior-street-props.png`

Do not use these for the Building view. The old traffic light, bicycle, vending
machine, and facade/background composition should be considered discarded.

## Intended Runtime Direction

Use these as a clean source pack for a single-floor, game-like Yule Agent Lab.
The final app should not display these sheets directly. Extract sprites and
tiles into transparent PNG atlases plus Tiled JSON maps.

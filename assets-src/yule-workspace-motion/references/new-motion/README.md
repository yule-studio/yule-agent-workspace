# New Motion Exterior Source Pack

This directory is the canonical source pack for the rebuilt Building view.
It replaces the previous exterior sheets for the building facade, sky/background,
cloud/weather motion, and street prop composition.

## Source Rules

- Use these files as the active exterior source of truth.
- Do not use the deprecated exterior sheets from `../deprecated/exterior-legacy/`.
- Do not reuse the old bicycle, traffic light, vending machine, bench, planter,
  or street composition unless a new-motion-compatible asset is added here.
- Building view may change by KST time-of-day/weather.
- Floor view must not be tinted by time-of-day. `office-shell-floorplan-v2` should
  stay visually stable indoors.
- Background images are full-stage images. Do not crop a background just to create
  cloud motion. Render the full background, then place moving clouds/weather as
  separate overlay sprites.
- Place the building against the street/ground line. Do not let it float above
  the street plane.
- If exterior props are added later, align them to the sidewalk/ground plane and
  scale them consistently with the building.

## Backgrounds

- `background-clear-day-bright.png` - bright clear daytime city.
- `background-clear-day-soft.png` - softer clear daytime city.
- `background-clear-night.png` - clear night city.
- `background-dawn-blue.png` - early dawn blue city.
- `background-dusk-violet.png` - violet dusk city.
- `background-overcast-day.png` - cloudy/overcast daytime city.
- `background-rain-night.png` - rainy night city.
- `background-snow-day.png` - snowy daytime city.
- `background-sunset-orange.png` - orange sunset city.

## Buildings

- `building-clear-day.png` - neutral clear/day facade.
- `building-clear-day-bright.png` - bright clear/day facade.
- `building-clear-day-soft.png` - soft clear/day facade.
- `building-dusk-violet.png` - dusk/violet facade.
- `building-night-lit.png` - night-lit facade.
- `building-overcast-day.png` - overcast/day facade.
- `building-snow-day.png` - snowy daytime facade.
- `building-snow-night.png` - snowy night facade.
- `building-sunset-orange.png` - sunset/orange facade.

## Weather And Motion Sheets

- `weather-rain-streaks-sheet.png` - rain streaks, droplets, splash motion.
- `weather-rain-puddles-sheet.png` - puddles and ripple motion.
- `weather-snowflakes-sheet.png` - snowflake and snow particle motion.
- `weather-snow-clouds-splashes-sheet.png` - snow clouds, splashes, ledge elements.

## Implementation Notes

The next bake/render pass should load these files directly or generate a new atlas
from them. A successful migration should make runtime code reference
`references/new-motion/...` or generated atlas frames derived from this directory,
not the deprecated legacy filenames.

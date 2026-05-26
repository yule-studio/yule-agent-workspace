# Office tilemap assets — provenance & license

`tileset.png`, `office.tmj`, and `tiles.json` in this directory are **generated
by this repository** (`scripts/gen-office.mjs` + `scripts/office-map.mjs`). They
are 100% our own pixel work and data — safe to use, modify, and redistribute
under this project's license.

## Structural reference (not asset reuse)

The Tiled map *structure* (orthogonal tile layers `floor / walls / furniture /
objects / overhead` plus object layers `seats / pois / spawns / collisions`, and
the seat-driven worker placement idea) was informed by the open-source
**[geezerrrr/agent-town](https://github.com/geezerrrr/agent-town)** project,
which is MIT-licensed **for its code**.

## What we did NOT do

agent-town's *art* (tilesets, character sheets) is the commercial
**LimeZu "Modern Interiors / Modern Office"** pack from itch.io, which the
agent-town author purchased under a license that **prohibits redistribution**
(their README: *"provide your own compatible assets"*). We therefore copied
**none** of those PNGs. Every tile here is drawn from scratch by our generator,
so nothing in this repo carries a third-party asset license.

To regenerate: `node scripts/gen-office.mjs`.

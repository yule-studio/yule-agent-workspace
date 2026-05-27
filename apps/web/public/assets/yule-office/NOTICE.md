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
node scripts/bake-agents.mjs         # atlas/agents.{png,json}
```

- `atlas/office-objects.{png,json}` — desks (front/back per role), chairs,
  boards, shelves, plants, water cooler, globe, printer, racks, standalone
  monitors. Phaser texture-atlas (JSON Hash) format.
- `atlas/agents.{png,json}` — 18 character skins × {idle, walk1, walk2}, drawn
  front-3/4 facing, feet-anchored on a common cell for jitter-free animation.

No third-party / non-redistributable assets are included.

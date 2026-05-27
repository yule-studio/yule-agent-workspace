# Claude Code Prompt: Rebuild Pixel Office As A Single-Floor Game UI

We are changing direction. Pixel Office should no longer feel like an operations
dashboard with a pixel background. It should become a playable, game-like
single-floor AI agent workspace.

Use the source images in:

```txt
assets-src/yule-workspace-motion/references/
```

Important: assets from `yule-workspace-motion2` have been copied into that
folder and should be treated as the latest design source. In particular,
`building-facade.png`, `door-motion.png`, and `seated-desk-motion-01.png`
through `seated-desk-motion-04.png` override the older first-pass references
where they overlap.

Note: `office-shell-floorplan-v2.png` was a misnamed intermediate copy of the
updated building/facade source. Do not use it as the interior floorplan
reference. Use `building-facade.png` for exterior/facade work and
`office-shell-floorplan.png` for the interior office map unless a separate
newer floorplan is provided.

Treat these images as source references/sprite sheets. Do not render the whole
reference sheets directly in the UI. Extract/crop/clean runtime sprites and map
assets into:

```txt
apps/web/public/assets/yule-office/
apps/web/public/vendor/yule-office/
```

## Core Direction

Replace the current multi-floor/building-driven Pixel Office experience with one
high-quality floor: `Yule Agent Lab`.

The user should feel like they are looking at a living game map where AI agents
work, walk, sit, review, wait for approval, and talk. Remove the dashboard/chart
mindset from the Office screen.

Do not keep the previous structure where the user switches between many floors
and sees large inspector/dashboard panels. One dense, well-designed floor is the
primary experience.

## Reference Assets

Use these source files:

- `office-shell-floorplan.png`
  - Main single-floor interior layout reference.
  - Use it to build a proper Tiled map with rooms, walls, doors, corridors, and
    floor material changes.
- `office-shell-floorplan-v2.png`
  - Misnamed intermediate copy of the updated building/facade source.
  - Do not use this as the interior floorplan reference.
- `building-facade.png`
  - Current building/facade source.
  - This has been replaced by the newly added image from
    `yule-workspace-motion2`.
  - If the building/exterior view is kept, use this file rather than the older
    facade.
- `door-motion.png`
  - Extract door sprites and open/close frames.
  - Use these for office entry, room doors, tech lead office, meeting/review
    room, and any agent transition through a doorway.
- `desk-ai-engineer-backend-devops.png`
  - Extract AI engineer, backend, devops workstation variants.
  - Must preserve front/back desk direction, monitor backs, cables, legs, desk
    depth, and chair variants.
- `desk-analyst-product-designer.png`
  - Extract analyst, product, designer workstation variants.
  - Use for product/design/growth desks.
- `interior-props-boards-plants-watercooler-01.png`
  - Extract whiteboards, charts, shelves, plants, water cooler, globe.
- `interior-props-boards-plants-watercooler-02.png`
  - Extract additional interior props.
- `agent-motion-01.png` through `agent-motion-04.png`
  - Extract agent sprites, idle poses, walk poses, phone/tablet/coffee poses.
- `seated-desk-motion-01.png` through `seated-desk-motion-04.png`
  - Extract the latest seated desk poses and desk-working motion frames.
  - These are now preferred over `seated-desk-motion.png`.
  - Use them when an agent is working/coding/reading at a workstation.
- `seated-desk-motion.png`
  - Older seated desk pose sheet. Use only if a needed pose is missing from the
    new four sheets.
- `monitor-motion.png`
  - Extract monitor/screen animation variants.
- `time-of-day-backgrounds.png`
  - Use for KST-based exterior/window background mood.
- `weather-clear-elements.png`
  - Use clear-day/cloud/sparkle elements.
- `weather-rain-snow-cloud-elements.png`
  - Use rain/snow/cloud/puddle overlays.
- `time-of-day-building.png`, `exterior-street-props.png`
  - Optional exterior/building view assets, but the Office screen should focus
    on the single interior floor first.

## UX Reset

On `/office`:

- Default directly into the `Yule Agent Lab` floor.
- Remove or hide the big building/floor selector as the primary UX.
- Do not show chart cards, dashboard metrics, or large side panels by default.
- Use a minimal game HUD:
  - small top agent/status strip
  - KST time/weather indicator
  - small controls for follow active, zoom, and sound/motion if needed
- Agent details should open on click as:
  - compact context menu near the agent, or
  - a lightweight drawer that does not cover the map too much.
- Speech bubbles should appear above agents when they are talking, waiting,
  blocked, reviewing, or returning to desk.

The map is the product. UI chrome should not dominate.

## Map Layout

Use one dense floor, not multiple floors.

Suggested layout using `office-shell-floorplan.png`:

- Upper-left main work area:
  - Engineering/AI desk pod.
  - 6-10 desks using mixed workstation variants.
  - Desks should face different directions correctly.
  - Include front-facing and back-facing desk assets.
- Lower-left focused office:
  - Tech Lead Office / Human Approval Office.
  - Add tech lead desk, assistant/visitor chair, small review board, plant,
    document shelf, approval door/sign.
- Upper-right planning/library room:
  - Product/design/planning area with bookshelves, boards, globe, table,
    whiteboard, roadmap chart.
- Lower-right ops/review room:
  - Server rack, CI/CD monitor, deploy board, review desk/table, printer/water
    cooler.
- Center corridor/common area:
  - Movement path between rooms.
  - Small standup/chat zone.
  - Agents should be able to move between desk, review, meeting, and lounge.

The floor must feel like a real office, not a tiled empty hall. If an area has
large empty tiles, add intentional props, rugs, shelves, boards, plants, cables,
paper stacks, or seating.

Do not build the floor by repeating generic desk rows across a huge rectangle.
Use the office shell image as the spatial source: room shapes, wall breaks, door
positions, corridors, and smaller office zones should drive the Tiled map.
The result should feel composed, not generated.

## Agent Placement

Use the live yule-studio-agent registry/source. Do not hardcode eight agents.

Create a single-floor allocation model:

- All agents exist on the same map.
- Use role/title/capability/metadata to assign each agent to a zone and seat.
- `metadata.zone`, `metadata.desk`, or `metadata.seat` should override automatic
  placement when present.
- Unknown agents go to a General Studio desk or overflow coworking desk.

State behavior:

- `coding` / `running` / `reading`
  - agent sits at own desk
  - monitor animation is active
- `planning`
  - agent moves to planning board or product area
- `reviewing`
  - agent moves to review table/board
- `meeting`
  - agents with same `groupId` gather at the same meeting/standup zone
- `waiting` / `awaiting_approval`
  - agent moves to Human Approval Office or shows a speech bubble at desk
- `blocked`
  - agent bubble becomes urgent and they may stand near Tech Lead Office
- `idle`
  - agent can remain at desk, lounge, shelf, or water cooler

## Door And Room Transition Motion

Use `door-motion.png` for real in-world transitions. Doors should not be static
rectangles.

Requirements:

- Extract open/close frames into the runtime atlas.
- Add door objects/POIs to the Tiled map.
- When an agent enters or exits a room:
  - walk to the door tile
  - play the open animation
  - pass through the doorway
  - play the close animation
- Door animation should respect depth sorting so the agent briefly appears
  behind/in front of the door frame naturally.
- Use door collision objects so agents do not walk through walls.
- Tech Lead Office, meeting/review rooms, and entry points should use these
  animated door sprites.

If full pathfinding is not ready yet, implement a simple deterministic
waypoint route through door POIs first.

## Seated Work Motion

Use `seated-desk-motion-01.png` through `seated-desk-motion-04.png` for desk
work states. The current “standing sprite placed near a chair” look is not
enough.

Requirements:

- Extract seated/front/back/side work poses where available.
- When an agent is `coding`, `running`, `reading`, or doing focused work:
  - snap or walk them to their assigned seat
  - switch to the appropriate seated-at-desk animation
  - align body, chair, desk, monitor, and keyboard as one believable
    workstation scene
- A seated agent should not look like they are standing on top of the desk or
  floating behind it.
- Seat orientation must match desk orientation:
  - chair below desk: agent faces upward toward the desk/monitor, but monitor
    front should face the chair/player side as designed by the source asset
  - chair above desk: use the correct back-facing desk/monitor and seated pose
  - side desks: use side-facing or nearest available seated pose
- If a precise pose is missing, create a small derived sprite from the provided
  motion sheet instead of reusing a generic standing character.

## Desk Direction And Depth

This is critical.

Use front/back desk sprites correctly:

- If the chair is below the desk, the monitor should face downward toward the
  chair. The player may see the screen/front side.
- If the chair is above the desk, the monitor should face upward away from the
  player. Use the back view of the monitor/desk.
- Do not rotate a front desk 180 degrees to fake the back view.
- Use the actual back-facing desk source sprites from the desk sheets.
- Chairs, desk legs, desk front lip, monitor stand, cables, and contact shadows
  must align as one workstation object.

Workstations should not look like flat UI rectangles. Each desk needs:

- top surface
- front lip / side edge
- legs
- monitor frame and stand
- keyboard/mouse
- papers/notes/cups/cables
- chair
- contact shadow

Desk sprites should come from the source sheets or from cropped/cleaned derived
sprites, not from CSS rectangles. The front/back relationship matters more than
simple rotation. A desk facing the opposite direction needs a different sprite,
not a 180-degree transform.

## Sprite Extraction Requirements

Create a runtime atlas/manifest with clear names, for example:

```txt
apps/web/public/assets/yule-office/atlas/office-objects.png
apps/web/public/assets/yule-office/atlas/office-objects.json
apps/web/public/assets/yule-office/atlas/agents.png
apps/web/public/assets/yule-office/atlas/agents.json
```

Suggested sprite names:

```txt
desk_ai_front
desk_ai_back
desk_backend_front
desk_backend_back
desk_devops_front
desk_devops_back
desk_product_front
desk_product_back
desk_designer_front
desk_designer_back
chair_mesh_black
chair_exec_brown
chair_blue
chair_green
whiteboard_blank
whiteboard_chart
bookshelf_wide
bookshelf_narrow
watercooler
plant_large
plant_small
server_rack
monitor_code
monitor_dashboard
monitor_review
monitor_design
door_office_closed
door_office_open_01
door_office_open_02
door_office_open_03
agent_seated_front_code
agent_seated_back_code
agent_seated_side_code
agent_seated_front_review
agent_seated_back_review
```

If fully automated extraction is hard, crop manually in a deterministic script
or create a documented crop manifest. The final runtime assets must have
transparent backgrounds and should not include labels like `FRONT`, `BACK`, or
set names.

## Rendering Architecture

Use Phaser 3 + Tiled tilemap if practical. If keeping the current canvas/Tiled
loader temporarily, structure it so Phaser can replace it cleanly.

Target structure:

```txt
apps/web/src/office/GameOffice.tsx
apps/web/src/office/game/
  AgentLabScene.ts
  agents.ts
  assetManifest.ts
  placement.ts
  speech.ts
  weather.ts
  timeOfDay.ts
apps/web/public/vendor/yule-office/
  yule-agent-lab.tmj
  yule-office-tiles.png
  yule-office-objects.png
  yule-office-agents.png
```

Keep React for lightweight overlay UI. Phaser owns the map, sprites, camera,
depth sorting, animation, and movement.

## Time And Weather

Use KST as the default time basis.

Map KST time to mood:

- dawn
- morning
- day
- sunset
- evening
- night

Use `time-of-day-backgrounds.png` for the exterior/window mood. If weather data
is not available yet, create a deterministic mock weather state with clear,
cloudy, rain, and snow variants. Use the weather source sheets for overlays:

- drifting clouds
- rain streaks
- snow particles
- puddles
- sparkle/star effects

Do not let weather effects cover agents or important UI.

## Interaction

Agent click:

- Open compact agent menu:
  - Assign Task
  - New Session
  - Session History
  - Stop Task
  - View Details

Agent speech:

- blocked: short urgent bubble
- waiting/approval: approval bubble
- meeting: short conversation bubble
- idle: occasional ambient bubble only, not constant
- returning to desk / browsing docs / running tests: small status bubble

Movement:

- Agents should interpolate between seat/poi positions.
- Use simple grid/path movement if collision is available.
- Use depth sorting by y position.

## What To Remove Or De-emphasize

- Multi-floor selection as the main experience.
- Building view as the default entry point.
- Right inspector always open.
- Chart/dashboard cards in Pixel Office.
- Large floor/team tabs that cover the map.
- Generated-looking repeated desks.
- CSS-drawn furniture as the final visual source.

The building/exterior can return later as a separate landing/overview, but the
current priority is one high-quality playable floor.

## Acceptance Criteria

- `/office` opens directly into a dense single-floor game office.
- The map uses `office-shell-floorplan.png` as the interior layout reference.
- The building/exterior view, if present, uses the updated `building-facade.png`.
- The office uses the provided source images as extracted sprites/tiles, not
  primitive CSS rectangles.
- Agents are loaded dynamically from the registry/source.
- All agents can be placed on the one floor via role/capability/metadata.
- Desk direction is correct: front/back sprites are used, not rotated fakes.
- Agent seated pose comes from `seated-desk-motion-01.png` through
  `seated-desk-motion-04.png` and faces the correct desk/monitor.
- Door motion from `door-motion.png` is wired for room entry/exit or at least
  extracted and integrated as animated door sprites.
- Agent speech bubbles feel like actual in-world dialogue.
- Time-of-day and weather elements are wired from the provided source sheets.
- Existing session/detail behavior still works through agent click or a compact
  drawer.
- The result feels closer to `agent-town` style: a living pixel workspace, not a
  dashboard.

Important: Do not chase every floor/building feature right now. Make one floor
beautiful and functional first.

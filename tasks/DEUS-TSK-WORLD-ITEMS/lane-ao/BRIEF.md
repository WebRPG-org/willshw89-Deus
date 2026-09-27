# Lane AO Brief: World item placement system (U7 items, placement design, containers, readability UI)

**NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ao | **Task ID:** `DEUS-TSK-WORLD-ITEMS` (non-WBS task folder; closest existing leaf GP.03.01 "Slice 3: Items and U7-style handling" is OWNER-GATED DRAFT and is NOT changed; the leaf is to be recorded by Gemini) | **Branch:** task/lane-ao | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ao` | **Size:** L | **Base:** origin/main `1c2fcc28736566f8dd4f14ccd0633f09687e3521` | **Source:** Owner 14:48-15:01 CT (A9c items 23-26, 31), item 43 movement (16:41 CT). PM brief 21:10 CT (main-chat ops for the Owner).
**LAUNCH GATE MET (PM 21:10 CT):** Lane AA merged (Gemini 3.8 Flash final gate) and the Lane AL A9c standard (items 23-26 fields) merged to main at `c1bb4469` (Gemini 3.8 Flash final gate, CLEAN PASS). Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; while gemini-3.1-pro-preview is quota-blocked the Owner-authorised final gate is gemini-3.8-flash thinking HIGH, ruling 2026-09-26 20:45 CT).

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-WORLD-ITEMS/lane-ao/lane.json`)
- `game/js/plugins/DEUS_WorldItems.js`
- `game/js/plugins/DEUS_Containers.js`
- `game/js/sim/world_items/**`
- `tools/world_items/**`
- `docs/systems/DEUS_WorldItems.md`
- `tasks/DEUS-TSK-WORLD-ITEMS/**`
Notes: `DEUS_Items.js`, `DEUS_Objects.js`, `DEUS_Jobs.js`, `DEUS_Walls.js`, `DEUS_Floors.js` are in Lane AD's live write set: do NOT edit them; integrate by RMMZ-style aliasing from your own plugin files, or escalate. The mass ledger (`game/js/sim/ledger*`) is READ-ONLY: post spills/collapse/destruction through its existing API. `DEUS_Move8.js` (8-way movement) belongs to Lane AN: read-only; if it is not on main yet, keep an 8-way pathing adapter inside your own files. Sprites are resolved by slot ID only (asset standard AS-ID-001).
**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, the Lane AD/AE/AN paths, `game/js/sim/ledger*`, `docs/art/**`, `game/data/UF_AssetStandard.json`, `art/**`, `game/img/**`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool.

## Scope (the queued Owner brief, reproduced below, is the authority for content)
# World item placement system - code lane brief (Owner 14:48-15:01 CT; A9c items 23-25 + 31 UI; movement per A9c item 43, 16:41 CT)

Queued by PM 15:00 CT. **NOT launched. BLOCKED** on Lane AA merged and the Lane AL A9c standard (items 23-26 fields) reviewed and merged. No lane letter or WBS ID yet (leaf to be recorded via a Gemini directive). Writer Grok grok-4.7 xhigh, reviewer Gemini (non-author). No art or audio generation, no merging, no messaging, no WBS minting. Sprites are resolved by slot ID only (A9 item 14).

## Scope
1. **U7-style item placement (item 23):** every item has a world sprite (~16-24 px, RMMZ top-down 3/4 view per A9c item 38) beside its icon and 144 portrait; items placed at pixel offsets within tiles, on surfaces and in containers, with sim hooks (ownership, theft, hauling, decay; hauling units play the CARRY life animation, A9c item 43).
2. **Placement design (item 24):** full detail near the player; far areas keep summarized counts, re-placed from a fixed seed; storage by chunk and layer; clutter cleanup; change-only saves; **100,000 placed-item stress benchmark** (report frame time, memory and save size). Logic on **6 px cells (8 per tile side)**, rendering on whole pixels; size classes 12/24/48 px drawn true size, no scaling; heights as whole-pixel offsets, surfaces on 12 px quarters (table top 1 quarter, shelves 2-3); draw order: footprint bottom line, then height offset (inside the map's row-then-layer order); SRD pound weights set surface load limits and spill/collapse through the mass ledger; 1-2 px hard drop shadows, nearby glows lit; units move tile to tile **8-way** (A9c item 43: RMMZ plugin, 8-direction character sprites; reverts item 38's orthogonal-only rule for characters) while **terrain, walls and caves stay square-grid**; pathfinding is 8-way and treats small items as passable, large as blocking (PM default, Owner-overridable: no diagonal step that cuts past a blocking corner).
3. **U7-style containers (item 25):** double-click opens a movable window with the container interior art and contents as free-placed sprites (no grid); drag between containers, map and the equipment paper doll (inventory UI only; the map sprite changes only with the worn armor category (5 armor states of one base per race x sex), A9c item 43 as revised 16:44-16:47 CT); nested containers one window each; multiple windows; SRD weight/volume capacity (backpack 1 cu ft / 30 lb), nested weight counts toward carried weight (Str x 15); SRD locks/traps (thieves' tools vs DC, keys as items); destroyed/burned containers spill or destroy contents via the mass ledger and the same damage rules; NPC shop stock in real containers, stealable; a container with contents counts as one object for item-count and save budgets.
4. **Units (item 26):** 1 layer = 5 ft = 48 px, quarters 12 px, whole-pixel positions, 1 tick = 6 s round.

5. **Readability UI (item 31):** 1 px hover outline plus name tooltip; drag preview snapped to 6 px cells; topmost-first picking with a modifier key cycling through stacks; optional hold-to-zoom at integer 3x/4x. Readability reference: the PixelLab trial's table-with-items test at true 2x screen size.

## Acceptance
Deterministic tests for seeded re-placement, load-limit spill, nested weight, lock/trap checks, mass conservation on container destruction, save round-trip with change-only saves; the 100k benchmark with numbers; review: any missing item = MAJOR.

## Gate tests (lane.json)
- `node tools/world_items/test_world_items.js` (seeded re-placement, load-limit spill, nested weight, lock/trap checks, mass conservation on container destruction via the ledger, save round-trip with change-only saves, picking/stack cycling, 6 px snap; RESULT line; killed mutants)
- `node tools/world_items/bench_world_items_100k.js` (100,000 placed items: frame time, memory, save size; prints numbers and budget verdicts)
- `node tools/sim/test_ledger.js` (regression, unchanged)
- `node tools/check_deus_syntax.js`

## Registration of new plugins
Do NOT edit `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js` (shared files; RMMZ editor safety). Keep headless logic loadable directly by your tests. Put the exact registration entry you need (plugin name, load order, parameters) under a `## Registration request` heading in REPORT.md; the PM applies it at merge time.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art/audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only (the Owner generates all art in the PixelLab web UI).
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AO-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/DEUS-TSK-WORLD-ITEMS/lane-ao/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-ao`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
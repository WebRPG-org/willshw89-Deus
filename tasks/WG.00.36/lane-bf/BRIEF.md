# Lane BF Brief: WG.00.36 Cross-layer multi-unit selection and group orders

**LAUNCH GATE MET (PM, 2026-09-27 ~13:10 CT):** Owner request 12:51 CT (team idle; launch the next unblocked, non-overlapping WBS tasks). Deps on main: WG.00.17 (`1c2fcc28`) and WG.00.35 lower-layer overlays (Lane AW, `4ba742ed`). Routing: writer grok-4.7 xhigh (multi-agent on; input/selection logic across layers); reviewer gemini (non-author; gemini-3.8-flash thinking HIGH final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034; Pro takes the gate back once it resets).

**NO ART GENERATION BY ANYONE (DEC-007).** Selection rings/boxes use the existing drawn primitives only.

**Lane:** lane-bf | **Task ID:** WG.00.36 | **Branch:** task/lane-bf | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bf` | **Writer:** grok (grok-4.7 xhigh) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `ecc7b8984a0ab1a919595c792f98a60f18872f73`

## WBS row (verbatim, docs/worldgen/DEUS_WORLDGEN_WBS.md; minted by Gemini 0084-CG, `605cff06`)
> **WG.00.36** Cross-Layer Multi-Unit Selection & Group Orders. Multi-unit selection and group orders operate across layers: player can select units on several layers at once and give them orders together (box-select through visible lower layers, modifier-click/box multi-layer selection). Selected units and group orders keep working while units cross layers on slopes (selection is not dropped at a layer change; Owner requirement 2026-09-26 12:12 CT; DEC-020). Dep: WG.00.17, WG.00.35. (Owner requirement 2026-09-26 11:32 CT; DEC-011).

## allowedPaths (exact; mirrored in `tasks/WG.00.36/lane-bf/lane.json`)
- `game/js/plugins/DEUS_Select.js`
- `game/js/plugins/DEUS_LayerOverlays.js`
- `docs/systems/UF_Select.md`
- `tools/select_xlayer/**`
- `tasks/WG.00.36/**`

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Docs to read (only these)
- `docs/systems/UF_Select.md` and `docs/design/SELECTION.md` (current gestures, group move, API)
- `docs/systems/DEUS_LayerOverlays.md` (what is visible on lower layers, how overlays are drawn at 1:1)
- `docs/systems/DEUS_Depth.md` (which lower-level cells are visible through open cells; read only: BE owns DEUS_Depth.js)
- `docs/systems/DEUS_ZRange.md` sections 1 and 5 (level API)
- DEC-011 and DEC-020 in `docs/OWNER_DECISIONS.md` (read only)

## Scope
1. **Box-select through visible lower layers.** A drag box on the viewed level also picks player units on lower levels whose cell is visible through open cells (the same visibility rule the renderer and overlays use; call it, do not copy it). Units under solid cover are never picked.
2. **Multi-layer modifier selection.** Shift+drag / Shift+click adds units from any visible layer; the selection holds units on several levels at once. Define and document the exact gesture per level; keep every existing single-layer gesture and hotkey working unchanged.
3. **Group orders across layers.** A move order with a mixed-level selection sends each unit to a sensible target (document the rule: e.g. the clicked cell's level with per-unit pathing across slopes/stairs). Formation (V68) still applies within a level.
4. **Selection survives layer changes.** A selected unit that walks to another level on a slope, stair or ramp stays selected and keeps its order (DEC-020); changing the viewed level never clears the selection. Selected units on a non-viewed but visible level show their selection ring on the lower-layer overlay (DEUS_LayerOverlays.js), at 1:1 (DEC-011).
5. **Performance.** Box-select cost scales with units in the box's visible cells, not with all units in the world; no per-frame full scan.
6. **Tests** `tools/select_xlayer/test_xlayer_select.js`: checks for (1)-(5) each with a provocation (`--provoke=<name>`, `--provoke-all`) that makes it FAIL; plus run the existing `select` suite (UF_Select.md section 7) on base and tip and report both (must not regress).
7. Update `docs/systems/UF_Select.md` (cross-layer section, API, tests); open questions and PROPOSED-BF-NN follow-ups in REPORT.md.

## Acceptance
- All scope items; every lane.json gate test exits 0 on your tip (paste output).
- Independent Gemini review passes; Gemini marks DONE.

## Gate tests
- `node tools/select_xlayer/test_xlayer_select.js`
- `node tools/layer_overlays/test_layer_overlays.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BF-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/WG.00.36/lane-bf/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bf`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.

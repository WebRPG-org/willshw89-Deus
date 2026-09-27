# Lane BE Brief: WG.00.21 Layer occlusion culling rule and exposed-area draw bound

**LAUNCH GATE MET (PM, 2026-09-27 ~13:10 CT):** Owner request 12:51 CT (team idle; launch the next unblocked, non-overlapping WBS tasks). WG.00.21 was skipped at 10:25 CT only because Lane AW (WG.00.35) held `DEUS_Depth.js`; AW merged (`4ba742ed`), and its other deps (WG.00.17 `1c2fcc28`, Lane K flat render, WG.00.09b Fix2 planes) are on main. Routing: writer grok-4.7 xhigh (multi-agent on; hard renderer logic); reviewer gemini (non-author; gemini-3.8-flash thinking HIGH final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034; Pro takes the gate back once it resets).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-be | **Task ID:** WG.00.21 | **Branch:** task/lane-be | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-be` | **Writer:** grok (grok-4.7 xhigh) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `ecc7b8984a0ab1a919595c792f98a60f18872f73`

## WBS row (verbatim, docs/worldgen/DEUS_WORLDGEN_WBS.md)
> **WG.00.21** Layer Occlusion Culling Rule & Exposed-Area Bound. Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). Traverses from viewed layer down to first opaque surface; cells under solid cover cost zero. Benchmark: 32-layer stress scene costs approx same as 5 layers when solid. (DEC-018; dep: Lane K follow-up, WG.00.17).

## allowedPaths (exact; mirrored in `tasks/WG.00.21/lane-be/lane.json`)
- `game/js/plugins/DEUS_Depth.js`
- `game/js/plugins/DEUS_Culling.js`
- `tools/occlusion/**`
- `docs/systems/DEUS_OcclusionCulling.md`
- `tasks/WG.00.21/**`

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Docs to read (only these)
- `docs/systems/DEUS_Depth.md` and the header/plane code of `game/js/plugins/DEUS_Depth.js` (flat 1:1 planes, MaxDepth, exposure mask, pooled planes, in-place switch)
- `game/js/plugins/DEUS_Culling.js` header (UF.Culling viewport scheduling) and `tools/bench_viewport_culling.js`
- `docs/systems/DEUS_ZRange.md` sections 1, 2, 5 and 7 (32 layers, consumers, scale)
- `docs/systems/DEUS_LayerOverlays.md` sections 2, 3 and 5 (what "visible" means for lower-layer overlays; read only: BF owns DEUS_LayerOverlays.js)
- VISION V133 and the DEC-011 / DEC-018 entries in `docs/OWNER_DECISIONS.md` (read only)

## Scope
1. **Rule.** A cell of a lower level is drawn only when every level between the viewed level and it is open at that cell (the existing exposure rule), and nothing under the first opaque surface is drawn: no tiles, units, objects, items, cliff faces, ramps or effects. Units and sprites on a covered cell of a lower level must not be created, updated or rendered for the plane. The viewed level itself is unchanged.
2. **Cost bound.** Plane paint and sprite work scale with the exposed cells inside the camera bounds (UF.Culling bounds), not with the level size or the number of levels in the range. Covered cells cost zero per frame. Work happens on generation, mutation, camera move or view change (V133 change-driven), not by a per-frame full scan.
3. **Traversal.** From the viewed level downward to the first opaque surface, within the renderer's MaxDepth (DEC-011: MaxDepth stays as the Owner set it; do not change the default). Record in the doc how the rule would extend if MaxDepth grows; do not change MaxDepth.
4. **1:1 unchanged.** DEC-011: no blur, scale, parallax, alpha or tint depth shading. What is visible must look exactly as today; only hidden work is removed. Prove it: pixel-identical frames (or identical plane contents) before/after on the existing depth suite scenes.
5. **Benchmark** `tools/occlusion/bench_occlusion.js` (NW.js in a throwaway clone): a solid-covered 32-layer scene (`DEUS_Z_RANGE=default`) vs the same scene at `DEUS_Z_RANGE=legacy` (5 layers), plus an open scene (ravine / dug shaft). Report per-frame paint/sprite counts and ms; acceptance is the WBS line (32 layers solid about equal to 5 layers solid; state the tolerance you measured and why).
6. **Test** `tools/occlusion/test_occlusion_culling.js`: checks for (a) covered lower-level units/objects/items not drawn or updated, (b) exposed ones drawn exactly as before, (c) cost counters proportional to exposed cells in bounds, (d) no per-frame full scan, (e) level switch and camera pan keep the rule. Each check has a provocation (`--provoke=<name>`, `--provoke-all`) that makes it FAIL.
7. `docs/systems/DEUS_OcclusionCulling.md`: rule, cost model, API/counters, bench results, open questions, PROPOSED-BE-NN follow-ups.

## Acceptance
- All scope items; every lane.json gate test exits 0 on your tip (paste output); also run `node tools/test_culling_native.js` on base and tip and report both (must not regress).
- Independent Gemini review passes; Gemini marks DONE.

## Gate tests
- `node tools/occlusion/test_occlusion_culling.js`
- `node tools/test_layer_render_flat.js --suite depth`
- `node tools/depth_demo/test_depth_demo.js`
- `node tools/layer_overlays/test_layer_overlays.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BE-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/WG.00.21/lane-be/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-be`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.

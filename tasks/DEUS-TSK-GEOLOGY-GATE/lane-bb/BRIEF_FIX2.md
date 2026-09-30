# BRIEF_FIX2: Lane BB (DEUS-TSK-GEOLOGY-GATE) widened: repair tools/test_strata_foundation.js for the current main

**PM, 2026-09-27 ~13:10 CT, Owner request 12:51 CT** ("find why test_strata_foundation is red on main and get a fix lane going; BB may need its brief widened; no weakening checks"). This supersedes the FIX1 stop condition: `tools/test_strata_foundation.js` is now in allowedPaths. Routing: writer grok-4.7 xhigh (multi-agent on); reviewer gemini (non-author; gemini-3.8-flash thinking HIGH while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034). Your FIX1 geology repair (tip `11e4d630`) stands.

**NO ART GENERATION BY ANYONE (DEC-007).**

## allowedPaths (exact; lane.json updated in this commit)
- `tools/test_geology_strata.js`
- `tools/test_strata_foundation.js`
- `tasks/DEUS-TSK-GEOLOGY-GATE/**`
Every plugin, every other test and all data remain READ-ONLY.

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Step 0: bring the branch up to main
Your branch is based on `188fee26`; main is now `ecc7b8984a0ab1a919595c792f98a60f18872f73` and carries a second cause (below). Run `git fetch origin` and `git merge --no-ff origin/main` on `task/lane-bb` (a normal merge commit; never rebase or force). No conflict is expected (main has not touched your files).

## PM diagnosis (bisected 2026-09-27 12:55-13:05 CT in a throwaway worktree; verify it yourself)
`node tools/test_strata_foundation.js`:
| Commit | Result |
|---|---|
| `e57a5da6` (parent of `bdf45b4c`) | 26 passed, 0 failed |
| `bdf45b4c` WG.00.17 WIP "Z range authority in DEUS_World ... 2 ft strata / 10 ft layers" (merged via Lane AA `1c2fcc28`) | 22/4: `fills_0_to_5`, `floor_on_substrate`, `surface_elevation_matches`, `sphere_aoe` |
| `d8fbdc9d` (main before the AV merge) | same 22/4 |
| `42c3bc9a` merge of Lane AV, WG.00.15 `eed4776b` "couple underground biomes to the surface column" | 18/8: adds `generation_deterministic`, `baseline_roundtrip`, `legacy_shapes_match`, `unchanged_terrain_regenerates` |
| `ecc7b8984a0ab1a919595c792f98a60f18872f73` (main now) | same 8 |

**Cause A (4 checks, WG.00.17 frame).** The test still hard-codes the pre-WG.00.17 frame: zMin -2 (elevation `(S + 2) x 5`), 1 ft strata, and the 1 ft blast table (7 strata at r = 3 ft). Its vm has no `process`, so New Game takes `Z_RANGES.default` (-16..+15) and 2 ft strata: elevations come out 70 higher (89 vs 19) and a 3 ft sphere hits 3 strata. This frame is Owner-decided (DEC-013: 32 layers, 10 ft layers, 2 ft strata) and documented in `docs/systems/DEUS_ZRange.md` section 7 (elevation `e = (z - zMin) x 5 + s`; sphere table 3 / 9 / 27 strata for r = 3 / 5 / 7 ft, computed by `tools/zrange/blast_tables.js`). **The test side moves** for these: re-derive each expectation from the documented rule through the live API (`UF.World.zRange()`, `UF.Space.STRATUM_FEET`, the blast-table geometry), never from observed output, and keep every value exact. Keep checking the same cells, strata, HP and counts. Where useful, run the check at both the default range and `legacy` (-2..+2) so the old numbers are still proven where they still apply.

**Cause B (4 checks, WG.00.15 generation change).** These compare the live strata world with the pre-strata plugins of `2d5fc47` (checksums of levels -2/-1, baseline material/biome grids, legacy shapes, regeneration of unchanged terrain). WG.00.15 changed what -2/-1 generate. Decide which case applies from the docs (`docs/systems/DEUS_VerticalBiomes.md`, `docs/systems/DEUS_ZRange.md` sections 3 and 9 "legacy rule", the WG.00.15 lane REPORT under `tasks/WG.00.15/`), not from the output:
- (B1) WG.00.15 documents the change as intended for the worlds this check builds (for example new worlds, a new generator version) **and** old saves still load identically (the legacy rule: "an old 5-level save loads at -2..+2 and plays as before"). Then re-point the comparison at the documented reference (for example compare the pre-strata plugins against a legacy/old-generator world, and pin the new generator's determinism separately) so each check keeps its full strength: exact checksums/grids, determinism (repeat same, seed+1 differs), migration with no data loss.
- (B2) The change also alters what an old save's unchanged cells regenerate to, or no doc says it is intended. That is a plugin regression or an open design question, outside this lane. Do NOT change those checks. Write `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/escalation_fix2.md` with the check names, exact expected/actual output, the deciding doc lines and the evidence (for example a save made at `d8fbdc9d` loaded at `ecc7b8984a0ab1a919595c792f98a60f18872f73`), finish Cause A anyway, commit, push, and stop.

## Required
1. Step 0, then reproduce on your tip in a fresh clone: all gate tests, paste EXIT lines.
2. Fix Cause A in `tools/test_strata_foundation.js` per above. Fix Cause B only under B1; otherwise escalate per B2.
3. All 23 existing mutants (`MUTANTS` in the test) must still make it exit 1; add a mutant for every changed expectation (for example the old zMin -2 formula, the 1 ft blast table) that must now FAIL.
4. REPORT.md: both causes with the commits above, each changed expectation with its doc line, mutant results, raw gate output with EXIT values, and PROPOSED-BB-NN follow-ups. Note for the PM: the AV merge was gated on its lane gate tests only; the repo `gate` list in `tools/ops/gate_tests.json` includes this test (do not edit gate_tests.json).
5. Commit `[grok] DEUS-TSK-GEOLOGY-GATE Fix2: ...` and `git push origin task/lane-bb`.

## Gate tests (lane.json)
- `node tools/test_strata_foundation.js`
- `node tools/test_geology_strata.js`
- `node tools/test_strata_cuts_and_caves.js`
- `node tools/check_deus_syntax.js`

Re-read the original `BRIEF.md` in the same folder for everything this file does not change. Effort: xhigh.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BB-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bb`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.

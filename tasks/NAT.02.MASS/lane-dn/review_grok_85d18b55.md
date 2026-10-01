# Independent Grok review — NAT.02.MASS lane-dn

| Field | Value |
|---|---|
| Role | Reviewer (grok), writer was codex |
| Lane | lane-dn |
| Branch | `task/lane-dn` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-dn` |
| Reviewed commit | `85d18b550dd03464c67331d28e813d40516bd077` |
| Subject | `[codex] NAT.02.MASS record isolated gate evidence and review handoff` |
| Diff base | `b889de90` (`[pm] open wave-1 natural-world lanes…`) |
| Authority | `tasks/NAT.02.MASS/lane-dn/BRIEF.md`, WORK-GATE G02 row dn, `lane.json` |
| Review date | 2026-10-01 |

HEAD at review time was `85d18b550dd03464c67331d28e813d40516bd077`, and `origin/task/lane-dn` pointed at the same commit. The tracked tree matched that commit. One untracked local file, `tasks/NAT.02.MASS/lane-dn/launches/20261001_032027_prompt.txt`, is not in the reviewed range and was not staged.

## Scope

`git diff --name-status b889de90..85d18b55` lists 21 paths, every one status `A`, every one inside `lane.json` `allowedPaths`:

- `game/js/sim/units.js`
- `tools/sim/test_units.js`
- `docs/systems/DEUS_Matter.md`
- `tasks/NAT.02.MASS/lane-dn/REPORT.md`
- `tasks/NAT.02.MASS/lane-dn/WORK_LOG.md`
- `tasks/NAT.02.MASS/lane-dn/verify_lane.js`
- `tasks/NAT.02.MASS/lane-dn/launches/20261001_024559_prompt.txt`
- `tasks/NAT.02.MASS/lane-dn/evidence/` (14 logs: baseline syntax, baseline aquifer, baseline units absence, base-final harness absence, preflight, syntax-units, syntax-test-units, gate-1 through gate-4, negative-gallons, negative-bound, sweep-survivor-negative-control)

No path sits outside that list. `units.js` and `test_units.js` are unchanged between the implementation commit `42d864f3` and this tip; the tip adds the evidence logs, the handoff, and a wording edit in `DEUS_Matter.md` that still names lanes do, ea, and ed as the planned importers. Gates below were re-run on the tip itself.

## Gate commands

Run in this worktree, foreground, at the reviewed commit:

| Command | Exit | Observed |
|---|---:|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/sim/test_units.js` | 0 | 7 passed, 0 failed (`units_geometry_matches_space`, `kg_to_cp_rule`, `apportion_exact`, `overflow_refused`, `water_stratum_is_312000`, `gallons_are_derived`, `world_bound_safe`) |
| `node tools/sim/test_units.js --mutation-sweep` | 0 | Same 7 passes, then `MUTATION RESULT: 4/4 killed; 0 survived/invalid` |
| `node tools/test_aquifer_seepage.js` | 0 | `ALL CHECKS PASSED: 12 check(s)` |

The sweep killed each required mutant by assertion, in an isolated VM, without rewriting the file:

- `density_6250`: `312500 !== 312000` and `6250 !== 6240`
- `round_half_down`: `0.00226796185` returned `0 !== 1`
- `apportion_drops_remainder`: `apportion(10, [1,1,1])` stayed `[3,3,3]` instead of `[4,3,3]`
- `overflow_guard_removed`: `addCp`, `subCp`, and `mulCp` all missed the expected `RangeError` (`3 !== 0`)

The committed survivor log shows the same sweep exiting 1 when `apportion_exact` is disabled (`MUTATION RESULT: 3/4 killed; 1 survived/invalid`, `EXIT 1`). The suite's return is `killed === mutants.length ? 0 : 1`.

## Pure units invariants

Independent BigInt arithmetic, using `1 lb = 0.45359237 kg` and half-up (`remainder * 2 >= denominator`), matches the module loaded from this commit:

| Input | Independent half-up | `units.js` |
|---|---:|---:|
| granite 3,894 kg | 858,480 | 858,480 |
| stone 3,256 kg | 717,825 | 717,825 |
| basalt 4,106 kg | 905,218 | 905,218 |
| bar_iron 4,000 g | 882 | 882 |

None of the four pins is an exact half, so half-up and half-down agree on them. The ties that distinguish the rule are exact halves: `kgToCp("0.00226796185")` and `gToCp("2.26796185")` are `1` half-up and `0` half-down. The module returns `1` for both. `kgToCp(4)` and `gToCp(4000)` both return 882.

Water and geometry on the loaded module: `CP_PER_LB` 100, `CELL_FT` 5, `STRATUM_FT` 2, `STRATA_PER_Z` 5, `STRATUM_FT3` 50, `WATER_CP_PER_FT3` 6240, `WATER_CP_PER_STRATUM` 312000 (`6240 * 50`), `WATER_CP_PER_Z_CELL` 1560000 (`312000 * 5`), `CP_PER_GALLON` 834. `6240 * 231 / 1728` is 834 with remainder 288, so 834 stays a display constant. `WORLD_BOUND` is frozen `{cellsX: 768, cellsY: 768, zLevels: 32}` and `WORLD_BOUND_WATER_CP` is 29,444,014,080,000, matching `768 * 768 * 32 * 5 * 312000`. The exported table is frozen.

`units_geometry_matches_space` executes the real `Space` block in `game/js/plugins/DEUS_World.js`: `GRID_SIZE_FEET` 5, `FEET_PER_CELL` 5, `STRATUM_FEET` 2, `STRATA_PER_LAYER` 5, and `Z_STEP_FEET` reassigned to `STRATA_PER_LAYER * STRATUM_FEET` (10). Those match the unit table.

Host globals: `game/js/sim/units.js` is `"use strict"`, exports through `module.exports` only, and contains none of `window`, `globalThis`, `process`, `require(`, `Game_`, `$game`, `PluginManager`, `Graphics`, `SceneManager`, `document`, or `UF.`. `require()` of the file adds no properties to `globalThis` (`[]`).

Art (DEC-007): the 21-path diff contains no `art/` path and no image file. `units.js`, `test_units.js`, and `DEUS_Matter.md` do not request or generate art. `DEUS_Matter.md` records that no art is touched and that F5 evidence is not required for this lane.

## Contract reading

`kgToCp` / `gToCp` scale by `10000000000 / 45359237` and `10000000 / 45359237` in BigInt, then round half up once. `addCp`, `subCp`, and `mulCp` reject results outside `0..Number.MAX_SAFE_INTEGER`. `94906265 * 94906265` is 9,007,199,136,250,225 (inside the safe range) and `94906266 * 94906266` is 9,007,199,326,062,756 (outside); the overflow check fails all three guards when they are removed. `apportion` is largest-remainder, stable toward the lower index, and does not mutate weights. `apportion(10, [1,1,1])` is `[4,3,3]` and `apportion(7, [0,2,1])` is `[0,5,2]`.

No product code was edited for this review.

VERDICT: CLEAN PASS

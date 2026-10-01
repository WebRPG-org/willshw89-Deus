# Independent review — NAT.02.MASS / lane-do

- Reviewer: grok (family grok)
- Writer of the repair: codex
- Target commit: 55599fc831f19e9a6a2b0147d86d618e25356c47
- Subject: [codex] NAT.02.MASS repair zrange gate checks
- Parent: 72de8c3a
- Branch: task/lane-do
- Brief: tasks/NAT.02.MASS/lane-do/BRIEF.md at this commit (Owner follow-up under Goal; allowed paths include the Z-range harness, `geology_304ca7b2_seed18.json`, and `docs/VISION.md`)
- Review date: 2026-10-01

Reviewed the tree of 55599fc831f19e9a6a2b0147d86d618e25356c47. Commands below ran in this worktree. `git rev-parse HEAD` printed that hash. `git status --porcelain` showed only untracked launch prompts under `tasks/NAT.02.MASS/lane-do/launches/`. They are not in the target commit and were not staged. This was not a second clone.

## What the commit does

The commit does not change world generation, the ledger, or the catalogue. It repairs the three `tools/test_zrange.js` checks that were still red at 6e002849 (`sparse_memory`, `old_layers_identical`, `matter_unchanged`).

- `tools/zrange/zrange_suite.js` predicts outer MIXED chunks from `materializeCaps` and `materializeDeepCuts` in `game/js/plugins/DEUS_Levels.js`: cap thickness uses the same stretch (`maxRockLevel` capped at 11, `maxAvailable = (maxRockLevel - 2) * 5`, the `t0 / 12` stretch when that exceeds 12), and a deep cut is painted from `zMin` through `-3` only when the core column has no water or lava. The only fluid stratum materials in that plugin are water and lava, so the name check matches `FLUID_B`. The chunk-index set is compared to the live chunk map, and the one-cell split/revert check is unchanged.
- `tools/zrange/bounds.js` counts those outer MIXED chunks (cap rock and deep cuts) in the same directory-plus-5632-byte bound.
- `old_layers_identical` and `matter_unchanged` compare each Z configuration with `tools/zrange/fixtures/geology_304ca7b2_seed18.json`. The 5255f1a5 fixture remains the 1 ft blast table and the legacy-save reference (`BASE` is still `5255f1a58a9d95bb7bc08377ef055c366610e486`).
- `censusDiff` compares `strata`, `outer`, `objects`, `items`, and `units`. Cap rock is compared at New Game, and both censuses go through `ledger.js` `createLedger` / `seal` / `checksum`.
- `docs/VISION.md` appends the 2026-10-01 Owner instruction. The brief and `lane.json` add the harness paths and add `node tools/test_zrange.js` beside the existing static scan. `lane.json` `gateTests` now lists both.

`git diff --name-only 6e002849 304ca7b2` prints only `tasks/NAT.02.MASS/lane-do/review_grok_6e002849.md`. Game code at the pin is the same code the fixture cites.

Every path in this commit is inside the allowed list recorded in the same commit: `docs/VISION.md`, the brief, `lane.json`, `tasks/NAT.02.MASS/lane-do/evidence/zrange-fix/**`, `tools/test_zrange.js`, `tools/zrange/bounds.js`, `tools/zrange/zrange_suite.js`, and `tools/zrange/fixtures/geology_304ca7b2_seed18.json`.

## Pinned reference

A comparison of `geology_304ca7b2_seed18.json` with `evidence/zrange-tip/{config}_{core,sim}/zrange_report.json` and with `evidence/zrange-fix/{config}_{core,sim}/zrange_report.json` found 0 mismatches on checksums, regenerated, baseline, cells, shapes, census, and censusAfter (the `ms` field stripped). The fixture header is `reference` `304ca7b2`, seed 18, 1500 updates.

Core checksums in the pin:

- `-4..4` and `-16..15`: `1f5c2a72 eaf389b9 9998ffb2 95c997d4 1ed786a5`, strata.1 `390890`, cap rock `5160` and `19408`
- `-2..2`: `34c59783 eaf389b9 9998ffb2 e96252ee 5e3c240b`, strata.1 `390979`, cap rock `5160`

Recomputing the ledger checksum from the pinned census with the tip `createLedger` reproduces the committed aggregate: `-4..4` `ce5a214c`, `-16..15` `4ce57b52`, `-2..2` `78879322`, same before and after 1500 updates.

## Independent suite run

`node tools/test_zrange.js --jobs=3 --evidence=<temp>` on this worktree. Wall clock 256 s. Process exit code 0.

`RESULT: 10 passed, 0 failed (exit 0)`.

The three repaired checks passed:

- `PASS sparse_memory` — each range "outer generated mix only, split one chunk". Store `-16..+15` `1907608` B minus `-2..+2` `1622552` B is `285056` B, equal to the bound (`3456` B of directory + `50` MIXED chunks × `5632` B). The derivation text says "cap rock and deep cuts".
- `PASS old_layers_identical` — geology reference `304ca7b2` seed 18, the checksums above, identical on all three ranges.
- `PASS matter_unchanged` — New Game and after 1500 updates identical on all three ranges. Rock above `+2` is `5160` / `19408` / `5160`. Ledgers `ce5a214c` / `4ce57b52` / `78879322`. Outer material keys `4` / `23` / `0`.

The other seven checks passed on the same run. `feet_2ft_10ft` still matches the 2 ft table at the tip and the 1 ft table at base `5255f1a5`. `legacy_save_loads` loaded the base save at `-2..2` (1240 units, 3302 items) and round-tripped. `sparse_save` terrain-and-fluid parts were `5955` B versus `5953` B (difference `2` B, bound `256` B). Whole-save character counts on this run were `7209711` / `7209700`; the committed aggregate has `7209704` / `7209702`. The check judges the terrain-and-fluid parts, and those matched.

Per-phase exits: three sim phases exit 0 (2 passed, 126–128 s); three play phases exit 0 (4 passed, 49–53 s); three core phases exit 0 (8 passed, 37–40 s); legacy exit 0 (2 passed, 39 s).

## Provocations

`node tools/test_zrange.js --provoke=outer_dense,generator_changed,matter_destroyed --jobs=3`. Wall clock 189 s. Process exit code 0. `PROVOCATIONS: 3/3 caught`.

The harness exits 0 when every named check goes red. Each one did:

- `outer_dense` → `FAIL sparse_memory`. On `-16..15` the in-game check failed: `1728` MIXED chunks against the predicted pattern (4 chunks on each of `+3..+11`, 1 chunk on each of `-16..-3`), and the sky write split `0` chunks because every chunk was already split. `-2..2` stayed "generated mix only" (no outer levels). The byte bound still equalled the difference (`9735552` B), because the bound counts whatever outer MIXED chunks the run reports. The catch is the chunk map and the split, which is what that provocation is for.
- `generator_changed` → `FAIL old_layers_identical`. The `-4..4` core phase itself exited 0 (8 passed); the driver comparison failed. Baseline checksums differed on all five core levels (`f90991eb d600d999 5f74eb61 7dfddd1f 1a7e91c2` versus the pin `90fbf353 eaf389b9 99c985a5 32014625 aa067190`), and checksums, regenerated, cells, and shapes differed with them.
- `matter_destroyed` → `FAIL matter_unchanged`. New Game and after 1500 updates: `strata.1` `390885` versus `390890`, ledger `e146d5a0` versus `ce5a214c`. Cap rock stayed `5160`. Those are the figures in `evidence/zrange-fix/README.md`.

Each provocation's source edit occurs once in `DEUS_Levels.js` (`uniformStore` for the outer fill, `passageHalf: [0.7, 1.3]`, and `onWorldCreated` / `ensureWorldLevels`).

## Translation evidence

`evidence/zrange-fix/README.md` has the GAME TRANSLATION block from `tools/ops/GAME_TRANSLATION_TEMPLATE.md`: all ten fields, class C (foundational test tooling), `CONSUMED BY GAME SYSTEMS`, and the six bridge-status lines. The claims that can be checked against this tree hold.

- No new runtime behavior. This commit does not edit `game/`.
- The cited path is the one that ran: `zrange_suite.js` samples the NW.js game; `test_zrange.js` compares those samples with `geology_304ca7b2_seed18.json`; `ledger.js` supplies the checksum.
- Automated proof matches this review's runs: suite `10 passed, 0 failed (exit 0)`; provocations `3/3 caught` with the stone and ledger figures above.
- Persistence: `sparse_save` and `legacy_save_loads` passed on this run. No save schema changed in the diff.
- In-game proof is the NW.js play phase, which passed on all three ranges. The block says native RMMZ editor F5 was not run. It was not run in this review either. DEC-059 keeps the editor closed for this build.
- The block's writer SHA is the sentence "the commit containing this report", which is `55599fc831f19e9a6a2b0147d86d618e25356c47`.

Opened all six screenshots under `evidence/zrange-fix/`. Each shows the blue-haired walker, a green status bar, zoom 1.0x, the level plate, and the bottom hotbar.

- `-2..2_play/zrange.extreme_p2.png`: plate `+2`, wooden deck outdoors among grass, trees, and a ring of standing figures.
- `-2..2_play/zrange.extreme_m2.png`: plate `-2`, the walker in a dark stone chamber.
- `-4..4_play/zrange.extreme_p4.png`: plate `+4`, wooden deck on a black field.
- `-4..4_play/zrange.extreme_m4.png`: plate `-4`, dark stone room.
- `-16..15_play/zrange.extreme_p15.png`: plate `+15`, wooden deck on a black field.
- `-16..15_play/zrange.extreme_m16.png`: plate `-16`, dark stone room.

That matches the README's description of the same six files.

The committed aggregate `evidence/zrange-fix/zrange_report.json` still prints the pre-final driver wording: "outer UNIFORM" and "the mountain rock above +2". The committed source, and this review's run, print "generated mix only" and "cap rock and deep cuts". The numbers in that JSON (50 MIXED chunks, difference `285056` B, the geology checksums, the three ledger checksums) match the re-run. The phase `results.txt` files already use the new suite text (cap columns and deep-cut candidates). The two summary phrases were edited after that aggregate was copied. The pass/fail result is the same.

## Manifest gates

Each `lane.json` gate except the full `tools/test_zrange.js` (already run above) was run in this worktree, starting 2026-10-01T15:08:07-05:00. `node --check` on the three edited JavaScript files is included. All exited 0.

| Command | Exit | Observed result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | Checked 62 DEUS plugin files. Errors: 0 |
| `node tools/sim/test_materials.js` | 0 | RESULT: 114 passed, 0 failed |
| `node tools/sim/test_ledger.js` | 0 | mutants: 42; RESULT: 119 passed, 0 failed |
| `node tools/sim/test_ledger_longrun.js` | 0 | RESULT: 18 passed, 0 failed |
| `node tools/sim/test_reclaim.js` | 0 | RESULT: 38 passed, 0 failed |
| `node tools/sim/test_reclaim_longrun.js` | 0 | CHECKSUM seed1 1afb4f75; CHECKSUM seed2 54b9da8d; RESULT: 20 passed, 0 failed |
| `node tools/sim/test_living_world_rules.js` | 0 | RESULT: PASS (0 failed) |
| `node tools/sim/test_water_dynamics.js` | 0 | RESULT: PASS (0 failed) |
| `node tools/test_fluid_correctness_lane_cw.js` | 0 | RESULT: 46 passed, 0 failed |
| `node tools/sim/migrate_mass_units.js --check` | 0 | CHECK: OK (materials.json and mass_tables.json are integer centipounds) |
| `node tools/world_items/test_world_items.js` | 0 | RESULT: 86 passed, 0 failed |
| `node tools/sim/test_decay_core.js` | 0 | decay core 87 passed, 0 failed |
| `node tools/zrange/scan_z_literals.js` | 0 | 139 allowed by 116 allow-list entries; 0 not allowed; 0 stale entries |
| `node tools/test_zrange.js --jobs=3` | 0 | RESULT: 10 passed, 0 failed (exit 0) |
| `node tools/spells/validate_spell_effects.js` | 0 | 121 effect records; errors 0 |

`test_ledger.js` still kills 42 mutants. The brief's names `grams_row`, `no_E_UNIT`, and `restore_schema1` are the same failures already asserted as `mutant_mass_unit_bad` / `E_UNIT_STATUS`, `legacy_mu_fixture_refused`, and `schema1_snapshot_refused`. The Z-range repair's own mutants are the three provocations above.

## Not checked

Native RMMZ editor F5 and F8 were not run.

VERDICT: CLEAN PASS

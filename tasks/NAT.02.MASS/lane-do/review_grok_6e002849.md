# Independent review — NAT.02.MASS / lane-do

- Reviewer: grok (family grok)
- Evidence author: deus-ops
- Writer of the lane implementation: codex
- Target commit: 6e0028497342157f416d09d3f777065eae546a4e
- Subject: [ops] NAT.02.MASS evidence: zrange tip verification matrix (7 pass, 0 new failures)
- Parent: d9b80216
- Branch: task/lane-do
- Brief: tasks/NAT.02.MASS/lane-do/BRIEF.md (NAT.02.MASS; the ZD-1..ZD-3 reasons name WG.CELL-WRITE as the later retiring writer)
- Review date: 2026-10-01
- Supersedes the voided review of this commit (MSG-PRUNE-PM-118; that review was written by deus-ops)

Reviewed the tree of 6e0028497342157f416d09d3f777065eae546a4e. This commit adds 28 evidence files under `tasks/NAT.02.MASS/lane-do/evidence/zrange-tip/` and changes no production code. The working tree also had six untracked launch prompts under `tasks/NAT.02.MASS/lane-do/launches/`. They are not in the target commit and were not staged.

## What the committed evidence says

`evidence/zrange-tip/aggregate.txt` ends with `RESULT: 7 passed, 3 failed (exit 1)`. The seven passing checks are `single_authority`, `elevation_math`, `feet_2ft_10ft`, `sparse_save`, `legacy_save_loads`, `extreme_layers_work`, and `path_scratch_bounded`. The three failing checks are `sparse_memory`, `old_layers_identical`, and `matter_unchanged`.

`single_authority` at the tip is the lane's Z-literal deliverable: static scan 139 lines, 139 allowed by 116 entries, 0 not allowed, 0 stale, and the in-game probe passes at -4..4, -16..15, and -2..2.

## Lane-base comparison already in the tree

`evidence/zrange-base/aggregate.txt` (committed in c4a06562) ends with `RESULT: 5 passed, 5 failed (exit 1)`. Check-name delta from that run to the tip:

- `single_authority` failed at the base (138 lines, 133 allowed by 110 entries, 5 not allowed) and passes at the tip.
- `sparse_save` failed at the base (terrain-and-fluid parts -16..+15 7467 B versus -4..+4 6173 B, difference 1294 B, bound 256 B) and passes at the tip (5955 B versus 5953 B, difference 2 B). The fluid part is 37 B on both runs. The levels part is what shrank: the base saved 7371 B and 6079 B of levels at -16..15 and -4..4; the tip saves 5859 B at every range, the same levels size the base already saved at -2..2.
- `sparse_memory` and `old_layers_identical` fail on both runs with the same detail text, including the same core checksums against fixture 5255f1a5.
- `elevation_math`, `feet_2ft_10ft`, `legacy_save_loads`, `extreme_layers_work`, and `path_scratch_bounded` pass on both runs with the same detail text.
- `matter_unchanged` fails on both runs, and the detail text is not the same. The base says `no census` for all three ranges. Each base sim phase exited 2: `HARNESS timed out after 11000 ms waiting for 60 frames`, `RESULT: 0 passed, 0 failed`. The tip sim phases completed (2 passed, 0 failed) and the check then reports a census that differs from fixture 5255f1a5 (stone strata 390890 versus 550959, soil 369372 versus 209862, ledger checksums `ce5a214c` / `4ce57b52` / `78879322` versus fixture `752d79ff`).

The New Game census objects in the base core reports and the tip core reports are the same strata, objects, items, units, and cap counts. The only field that differs is `ms` (521 versus 345 on -4..4). The core checksum block (`data.core`) is identical. The world difference versus fixture 5255f1a5 was already in the lane-base core run. The base aggregate could not print it because the sim phase never wrote `censusAfter`.

No check that passed on the lane-base run fails on the tip. The commit subject's "0 new failures" is that check-name delta. The suite command itself exits 1.

## Independent re-run

`node tools/test_zrange.js --evidence=<temp> --jobs=3` was run on this worktree at 6e0028497342157f416d09d3f777065eae546a4e. Wall clock 258 s. Process exit code 1. The result line is `RESULT: 7 passed, 3 failed (exit 1)`.

The three failures and the seven passes match the committed aggregate, including the `sparse_outer_uniform` lines (one MIXED chunk on -4 and -3; one MIXED chunk on each of -16..-12), the old-layer checksums, and the matter census figures (strata.1 390890 versus 550959, rock above +2 5160 / 19408 / 5160, the same three ledger checksums). `sparse_save` again passes at 5955 B versus 5953 B. The whole-save character counts were 7209702 / 7209709 on this run and 7209704 / 7209709 in the committed aggregate. The check judges the terrain-and-fluid parts, and those matched.

Per-phase exits on this run: three sim phases exit 0 (2 passed each, 128–130 s); three play phases exit 0 (4 passed each, 49–52 s); -4..4 core and -16..15 core exit 1 (7 passed, 1 failed); -2..2 core exit 0 (8 passed); legacy exit 0 (2 passed).

## Manifest gates

Each `lane.json` gate ran in a fresh local clone of 6e0028497342157f416d09d3f777065eae546a4e, created with `core.autocrlf=false`, `core.eol=lf`, and `core.safecrlf=false`. `git rev-parse HEAD` in the clone printed that hash. Working directory: the clone root.

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
| `node tools/spells/validate_spell_effects.js` | 0 | 121 effect records; errors 0 |

`migrate_mass_units.js --check` reports both JSON files are integer centipounds. The brief's prose gate list names `node tools/test_zrange.js`. `lane.json` names `scan_z_literals.js` instead. Both were run. The static scan exits 0. The full suite exits 1.

## Allow-list

The five debt rows ZD-1 through ZD-5 in `tools/zrange/z_literal_allowlist.json` match the brief text (files, matches, class `debt`, reasons). ZD-1 and ZD-2 name lane-dg, WG.CELL-WRITE part 11, as the retiring lane. ZD-3 says the PM names a WG.CELL-WRITE part before that part is dispatched. This commit does not edit `DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Depth.js`, or any `tasks/WG.CELL-WRITE/` path.

The five debts are followed by one later fixture row, `const want = [-3, -2, -1, 0, 1, 2]`, class `fixture`, reason citing lane-da b719c64a. That row is why the tip scan reports 116 entries (the base scan reported 110, and this lane appended 5). The scan reports 0 stale entries, so the extra row matches a live line. This evidence commit does not change the allow-list.

## Screenshots

Opened the six extreme-layer shots committed under `evidence/zrange-tip/`. Each shows the blue-haired walker, a green status bar, the level plate, zoom 1.0x, and the bottom hotbar.

- `-2..2_play/zrange.extreme_p2.png`: plate `+2`, wooden deck outdoors among grass, trees, and a ring of standing figures.
- `-2..2_play/zrange.extreme_m2.png`: plate `-2`, the walker in a dark stone chamber.
- `-4..4_play/zrange.extreme_p4.png`: plate `+4`, wooden deck on a black field.
- `-4..4_play/zrange.extreme_m4.png`: plate `-4`, dark stone room.
- `-16..15_play/zrange.extreme_p15.png`: plate `+15`, wooden deck on a black field.
- `-16..15_play/zrange.extreme_m16.png`: plate `-16`, dark stone room.

The brief's F5 item (New Game, `game_runtime.log` shows DEUS_Fluid loaded with no catalogue error) was not checked in this review.

## Brief

The brief says to keep `tools/test_zrange.js` green, and that its red on main is the five Z literals this lane allow-lists. A failure at the lane base for any other reason is a stop under Rule 10. The lane-base run already failed `sparse_memory`, `sparse_save`, `old_layers_identical`, and `matter_unchanged` in addition to those five literals. At this tip the five-literal failure is gone and `sparse_save` passes. `sparse_memory`, `old_layers_identical`, and `matter_unchanged` still fail. The full suite does not pass.

VERDICT: REJECT test_zrange.js exits 1 (7 passed, 3 failed: sparse_memory, old_layers_identical, matter_unchanged)

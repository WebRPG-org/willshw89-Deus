# Independent review — NAT.02.MASS / lane-do

- Reviewer: grok
- Writer: codex
- Target commit: bcbe824133358f9b38ecaaa63d4de2fa9738f766
- Subject: [ops] NAT.02.MASS merge origin/main into task/lane-do
- Parents: a1208b46 (mu alias audit) and 95501a0b (origin/main)
- Incorporated writer tip: c4a06562 (catalogue and mass tables on integer centipounds), on top of the schema-2 ledger and the ZD-1..ZD-5 allow-list
- Branch: task/lane-do
- Brief: tasks/NAT.02.MASS/lane-do/BRIEF.md
- Rework mail: MSG-PRUNE-PM-091
- Review date: 2026-10-01

Reviewed the tree of bcbe824133358f9b38ecaaa63d4de2fa9738f766. Gate commands ran in a fresh shared clone of that commit, created with `core.autocrlf=false`, `core.eol=lf`, and `core.safecrlf=false`, then checked out detached. The clone's local `core.autocrlf` was `false` and `core.eol` was `lf`. `git rev-parse HEAD` in the clone printed `bcbe824133358f9b38ecaaa63d4de2fa9738f766`.

The worktree at review time had three untracked launch prompts under `tasks/NAT.02.MASS/lane-do/launches/`. They are not in the target commit and were not staged.

## What the tip is

`bcbe8241` is a merge of `origin/main` (`95501a0b`) into `task/lane-do` after the audit commit `a1208b46`. `git diff --stat a1208b46 bcbe8241` is the main-side history (lane-eb water return, lane-pg brief, mail, catalogue index). A search of the sim, data, tools, and lane-do paths at the tip found no conflict markers.

Against merge-base `95501a0b`, the branch changes 65 paths. Every path is inside `lane.json` `allowedPaths`: the ledger and its defaults, `materials.js`, the two JSON tables, the migrator, the materials fixtures, the ledger and reclaim tests, the z-literal allow-list, and files under `tasks/NAT.02.MASS/lane-do/`. `docs/systems/DEUS_Materials.md` and `docs/systems/DEUS_Matter.md` are allowed and unchanged on this branch. `DEUS_Matter.md` already states integer centipounds and a 312000 cp water stratum (lane-dn).

The production change is the one reviewed at c4a06562, still present at this tip:

- Ledger schema is 2. A family unit other than `cp` fails `E_UNIT`. Restoring a schema-1 snapshot fails `E_UNIT_PROVENANCE`. `ledger_defaults.js` sets every family unit to `cp` and records a full water stratum as 312000 cp.
- `materials.json` uses `massUnit` `cp` and `cpPerStratum`. Read from the tip JSON: stone 717825, granite 858480, water 312000, basalt 905218, lava 905218, electrum 4244120 (the alloy nudge so a 1:1 gold/silver split divides the stratum). Collapse postings stay on form `strata`. A search for form `held` in the two JSON files found none.
- `mass_tables.json` uses `massCp`. Object lines, bills, yields, and collapses store `cp`.
- `materials.js` refuses a non-cp `massUnit`, a legacy `mu` / `muRef` block, `massPerSlice`, `muPerDu`, and posting fields `mu` / `du` / `unmappedMu` (`E_UNIT`, `E_UNIT_STATUS`). `E_CP_RULE` checks water 312000, lava 905218, ice 312000, and `kgToCp` (half-up, 1 lb = 0.45359237 kg) on the other rows.
- `tools/sim/migrate_mass_units.js --check` refuses a legacy key and a stratum or posting sum that is not the integer cp total.

## Mu alias consumers

`tasks/NAT.02.MASS/lane-do/evidence/mu_consumer_audit.md` (committed at a1208b46) lists the aliases `materials.js` adds on returned objects: `unmapped.mu = unmapped.cp`, yield `p.mu = p.cp`, bill line `mu = cp`, and `totalMu` / `elementMu` equal to the cp totals. I re-read those sites and every production reader. The audit's conclusion matches the code: each consumer copies the integer through. None scales it as grams.

- `reclaim.js` does not import a conversion constant. `massOf` (cp) is stored on a place field named `mu` and posted with `ledger.transform` one-for-one. `yieldOf` is read after the alias, and `postingAmount` uses that integer. `billOfMaterials` is read after the alias; `build` multiplies `line.mu` by count. Unmapped residue is `unmapped.mu` after the alias and is compared with `massOf`, so both sides are the same cp integer. Block counts use `Math.floor(g.mu / slice)` where `slice` is `massOf(..., "strata", 1)` in cp.
- `registerObject` reads raw `mass_tables.json` lines (`line.mu`), not the API alias. The tip JSON has `cp` on those lines and no `mu`. `test_reclaim.js` and `test_reclaim_longrun.js` copy `cp` onto `mu` with no scale before `createReclaim` (`adaptForReclaim`). `registerObject` is called only from those two tests. A call on the raw bag would throw `E_AMOUNT` (`mul` rejects a missing amount). It would not treat a gram figure as centipounds. `test_living_world_rules.js` passes the raw bag and mines through `massOf`; that run passed.
- `test_materials.js` asserts `billOfMaterials("masonry").totalMu === 215392` together with `totalCp === 215392`.
- `game/js/sim/decay/core.js` checks `rec.mu` on bookings the caller supplies. It does not import `materials.js` or the mass tables.
- `game/js/sim/world_items/` keeps its own `massMu` catalog integers and does not call `materials.js`. `ledger_bridge.js` says that field is the integer posted and does not define how many mu are in a pound. Those fields are lane-dr's, outside this lane. `test_world_items.js` stayed green.
- No file under `game/js/plugins/` imports `materials.js` or reads `totalMu`.
- `game/js/sim/hydro/index.js` calls `material()` only to read permeability. It does not read a mass field.

The long-run reclaim check named "injected gram" posts `mu: 1` and expects the mineral family to move by 1. That is one ledger integer, which is one centipound, not a gram conversion. The same file's closed totals use the cp quanta (iron 882, gold 22, ore 5292).

## Named checks

Present in the tip suites and covered by the gate runs below:

- `catalogue_is_cp`
- `cp_rule_every_row` (stone 717825, granite 858480)
- `water_stratum_312000`
- `lava_equals_basalt_stratum`
- `postings_close_exactly`
- `bom_exact_after_convert` (wall_stone 6614, masonry 215392)
- `migrate_check_clean`
- `legacy_mu_fixture_refused` (`E_UNIT`)
- `unit_cp_only`
- `schema1_snapshot_refused` (`E_UNIT_PROVENANCE`)

The brief names mutants `grams_row`, `no_E_UNIT`, and `restore_schema1`. Those three identifiers are not in the test sources. The same failures are asserted as `mutant_mass_unit_bad` / `E_UNIT_STATUS`, `legacy_mu_fixture_refused`, and `schema1_snapshot_refused`. `test_ledger.js` reports 42 mutants killed.

Base-fail re-runs (the checks the brief marks as failing on main, and the idle-machine `tools/test_zrange.js` pair MSG-PRUNE-PM-091 item 2 asked for) were not re-executed in this review. `tasks/NAT.02.MASS/lane-do/evidence/scan-before.txt` is the committed base scan. `tasks/NAT.02.MASS/lane-do/evidence/zrange_base_vs_tip/` is empty. Combined `tools/test_zrange.js` runs are left to the PM at merge time with lane-db, per the review assignment and AG_QUEUE.md. `AG_QUEUE.md` is not in this worktree. I did not open the z-range screenshots and I do not cite them.

The Z gate the PM accepted after the fact (`scan_z_literals.js`, MSG-PRUNE-PM-091 item 1) is still the entry in `lane.json`. The five debt rows ZD-1 through ZD-5 are the last debt entries in `tools/zrange/z_literal_allowlist.json`, matching the brief text.

## Gate commands

Each command ran in the fresh clone above. Working directory: the clone root. Exit codes are the process exit codes.

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

`lane.json` still lists two further gate commands. I ran those in the same clone. They are not a substitute for the PM's combined `tools/test_zrange.js` run.

| Command | Exit | Observed result |
|---|---|---|
| `node tools/zrange/scan_z_literals.js` | 0 | 139 allowed by 116 allow-list entries; 0 not allowed; 0 stale entries |
| `node tools/spells/validate_spell_effects.js` | 0 | 121 effect records; errors 0 |

`node tools/sim/migrate_mass_units.js --check` reports OK: both JSON files are integer centipounds.

## Scope

Diff paths against `origin/main` stay inside the lane allow-list. Reclaim production code, world-item fields, and new forms are untouched. The mu names that remain are aliases and place-field names holding the same integer centipounds.

VERDICT: CLEAN PASS

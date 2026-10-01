# Independent review — NAT.02.MASS / lane-do

- Reviewer: grok
- Writer: codex
- Target commit: c4a06562f784b284611ec8c4f54c86d51447f26c
- Subject: [codex] NAT.02.MASS flip materials catalogue and mass tables to integer centipounds
- Parent: 714a39a7
- Branch: task/lane-do
- Brief: tasks/NAT.02.MASS/lane-do/BRIEF.md
- Review date: 2026-10-01

Reviewed the commit blob, not the dirty overlay in the lane-do worktree. At review time that worktree had uncommitted edits on ledger, materials, fixtures, reclaim tests, the migrator, and the z-literal allowlist. Those edits are not in c4a06562f784b284611ec8c4f54c86d51447f26c. They were not staged or committed. Gate commands were run in a detached checkout of that commit.

## What the commit does

The commit flips the material catalogue and the mass tables from gram-scale mu onto integer centipounds, and teaches `materials.js` to read and validate cp.

- `game/data/sim/materials.json` drops the `mu` block, sets `massUnit` to `cp`, stores `cpPerStratum`, and rewrites yield and collapse postings onto `cp` / `unmappedCp`.
- `game/data/sim/mass_tables.json` drops `muRef`, sets `massUnit` to `cp`, and stores `massCp` on items and objects. Bills, lines, and postings use `cp`.
- `game/js/sim/materials.js` validates `E_UNIT`, `E_UNIT_STATUS`, and `E_CP_RULE`. Legacy `mu`, `du`, `massPerSlice`, `massMu`, and `unmappedMu` are refused.
- `tools/sim/migrate_mass_units.js` is the converter. `--check` confirms the two JSON files are already integer cp.
- Material fixtures and the materials, reclaim, and reclaim-longrun tests follow the new fields.
- Paths stay inside the lane allow-list. Ledger schema 2 and the five z-literal debts are already on the branch from earlier commits; this commit does not reopen them.

## Numeric check against units.js

Parent blobs are `c4a06562~1`. Tip blobs are the target commit. Conversion uses `game/js/sim/units.js` `kgToCp` and `gToCp` (half-up, 1 lb = 0.45359237 kg).

| Row | Parent | Tip | units.js |
|---|---|---|---|
| stone stratum | 3256 kg, 3,256,000 mu | 717825 cp | kgToCp(3256) = 717825 |
| granite stratum | 3894 kg, 3,894,000 mu | 858480 cp | kgToCp(3894) = 858480 |
| basalt stratum | 4106 kg, 4,106,000 mu | 905218 cp | kgToCp(4106) = 905218 |
| lava stratum | open, no slice | 905218 cp | equals basalt |
| water stratum | open, no slice | 312000 cp | WATER_CP_PER_STRATUM |
| ice stratum | — | 312000 cp | same quantum as water |
| stone item | 15000 mu | 3307 cp | gToCp(15000) = 3307 |
| log item | 8000 mu | 1764 cp | gToCp(8000) = 1764 |
| ore_iron item | 12000 mu | 2646 cp | gToCp(12000) = 2646 |
| gold item | 100 mu | 22 cp | gToCp(100) = 22 |
| bone item | 500 mu | 110 cp | gToCp(500) = 110 |
| bar_iron item | 4000 mu | 882 cp | gToCp(4000) = 882 |

All 61 items: `massCp` equals `gToCp` of the old `massMu`. Where `catalogWeightTimes1000` existed, `catalogWeightCp` equals `gToCp` of that weight and equals `massCp`. Every `kgPerSlice` on the tip is a safe integer, so the local `kgToCp` in `materials.js` matches `units.kgToCp` on those rows.

Electrum is the one stratum that is not the raw conversion. `kgToCp(19251)` is 4244119. The stored stratum is 4244120, one centipound higher, so the 1:1 gold/silver composition divides the mass (`E_ALLOY`). The same nudge is in `migrate_mass_units.js` and in `validate`. Yield and collapse post that adjusted total. Water and lava are special-cased to the brief's fixed quanta and are exempt from the fluid yield/collapse requirement.

No `mu`, `du`, `massMu`, `massPerSlice`, `muPerDu`, or `unmappedMu` keys remain in the tip JSON. Collapse rows that were `strata` stay `strata`. Nothing is rewritten to a `held` form. New remainder rows on timber and the iron grate exist so an item count times `massCp` does not exceed the stratum; they do not replace a strata collapse with the lane-dp form.

Object and material postings that name an item with a count match `count * massCp`. Parent line, bill, yield, and collapse sums match the parent `massCp` or `cpPerStratum`. A few identity lines (tree stumps, ironstone and copper-outcrop `rocks_small`) sit 1 cp, or 2 cp on `tree_tropical`, under the child object's own `massCp`. That slack keeps the parent equal to `gToCp` of the old total while each whole item stays on its own quantum. The posting script still sums to the parent. Reclaim moves the posting amount, so those scripts stay closed. Direct `massOf` on `stump` (1764) or `rocks_small` (6614) is the catalogue quantum, not that slack line.

## Named checks

Present and asserted in the tip suites:

- `catalogue_is_cp`
- `cp_rule_every_row` (stone 717825, granite 858480)
- `water_stratum_312000`
- `lava_equals_basalt_stratum`
- `postings_close_exactly`
- `bom_exact_after_convert` (wall_stone 6614, masonry 215392)
- `migrate_check_clean`
- `legacy_mu_fixture_refused` (`E_UNIT` on a restored `massPerSlice`)
- `unit_cp_only`
- `schema1_snapshot_refused` (`E_UNIT_PROVENANCE`)

`tasks/NAT.02.MASS/lane-do/evidence/scan-before.txt` records the base scan: the five ZD lines, `5 not allowed; 0 stale entries`, exit 1. The tip allow-list still carries those five debts. I did not re-execute the base scan in this review.

The brief also names mutants `grams_row`, `no_E_UNIT`, and `restore_schema1`. Those three identifiers are not in the test sources. The failures they would expose are already asserted: a non-cp `massUnit` is `mutant_mass_unit_bad` / `E_UNIT_STATUS`, a legacy slice field is `legacy_mu_fixture_refused`, and a schema-1 snapshot is `schema1_snapshot_refused`. Ledger source mutants still kill (42 killed in `test_ledger.js`).

## Gate commands

Each command was run in a fresh process against the detached checkout of c4a06562f784b284611ec8c4f54c86d51447f26c. All exited 0.

| Command | Result |
|---|---|
| `node tools/check_deus_syntax.js` | 62 plugins, 0 errors |
| `node tools/sim/test_materials.js` | 114 passed, 0 failed |
| `node tools/sim/test_ledger.js` | 119 passed, 0 failed, 42 mutants killed |
| `node tools/sim/test_ledger_longrun.js` | 18 passed, 0 failed |
| `node tools/sim/test_reclaim.js` | 38 passed, 0 failed |
| `node tools/sim/test_reclaim_longrun.js` | 20 passed, 0 failed; seed1 `1afb4f75`, seed2 `54b9da8d` |
| `node tools/sim/test_living_world_rules.js` | 0 failed |
| `node tools/sim/test_water_dynamics.js` | 0 failed |
| `node tools/test_fluid_correctness_lane_cw.js` | 46 passed, 0 failed |
| `node tools/sim/migrate_mass_units.js --check` | CHECK OK |
| `node tools/world_items/test_world_items.js` | 86 passed, 0 failed |
| `node tools/sim/test_decay_core.js` | 87 passed, 0 failed |
| `node tools/zrange/scan_z_literals.js` | 139 allowed, 0 not allowed, 0 stale |
| `node tools/spells/validate_spell_effects.js` | errors 0 |

The head of `evidence/zrange-base/-2..2_core/game_runtime.log` shows a new-game boot that loads `DEUS_Fluid` and enters `setupNewGame`. A search of that log for catalogue, `E_UNIT`, `E_CP_RULE`, and `Error` returned no hits. The log is a z-range core boot (it also records two optional companions missing on disk). It is not a separate fluid-only smoke beyond that boot.

## Scope

Diff paths are the catalogue, the mass tables, `materials.js`, the migrator, material fixtures, the materials and reclaim tests, and files under `tasks/NAT.02.MASS/lane-do/`. That matches `lane.json` `allowedPaths`. Ledger code, reclaim production code, world-item fields, and new forms are untouched in this commit.

VERDICT: CLEAN PASS

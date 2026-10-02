# NAT.02.MASS lane-dp writer report (2026-10-02)

Writer: codex. Starting branch HEAD: `fb652c4e9622284b067eaa5431fcb787de7bc021`;
base main ancestor: `d874e0beadf20ed2a031cdd522c54e8bfc634095`.
The PM owns the manifest, brief, review and integration.

## What changed

- `game/js/sim/ledger_defaults.js`: added water and lava reservoir forms and balanced transforms, removed `world-edge`, the `rain` source and `evaporation` sink, and declared the transitional Levels writer source/sink.
- `game/data/sim/materials.json`: added natural obsidian and peridotite strata rows with integer cp and closed yield/collapse postings. `mass_tables.json`, `materials.js` and the importer needed no changes.
- `tools/sim/test_ledger.js` and `tools/sim/test_materials.js`: added the named reservoir, escape-hatch, quench and material checks, including in-memory mutant kills. The new checks first failed at the base: ledger 78 passed / 9 failed; materials 115 passed / 4 failed.
- `tools/sim/test_ledger_longrun.js` and its fixture: moved weather water through `return`, changed out-of-bounds test injections to `debug-explicit`, and re-pinned the deterministic long run once. `tools/sim/test_reclaim_longrun.js` has only its `cpPins` values changed.
- `docs/systems/DEUS_Matter.md` and `docs/systems/DEUS_Materials.md`: documented reservoir moves, the three remaining escape hatches, material densities and the existing `solidify` quench move.

## How I tested it

All commands below ran in the foreground. Full stdout is in `evidence/` beside this report.

| Command | Result |
|---|---|
| `node tools/check_deus_syntax.js` | exit 0, 62 plugin files, 0 errors |
| `node tools/sim/test_ledger.js` | exit 0, 131 passed, 0 failed; 45 mutants |
| `node tools/sim/test_ledger_longrun.js` | exit 0, 18 passed, 0 failed; all seven fault injections detected |
| `node tools/sim/test_materials.js` | exit 0, 119 passed, 0 failed |
| `node tools/sim/test_reclaim.js` | exit 0, 38 passed, 0 failed |
| `node tools/sim/test_reclaim_longrun.js` | exit 0, 20 passed, 0 failed |
| `node tools/world_items/test_world_items.js` | exit 0, 86 passed, 0 failed |
| `node tools/sim/test_living_world_rules.js` | exit 0, RESULT: PASS (0 failed) |
| `node tools/sim/migrate_mass_units.js --check` | exit 0, CHECK: OK |
| `node tools/sim/test_decay_core.js` | exit 0, 87 passed, 0 failed |
| `node tools/spells/validate_spell_effects.js` | **exit 1**, two `LEDGER_NAME_UNKNOWN` errors in `control-weather` |
| `node tools/test_zrange.js` | exit 0, 10 passed, 0 failed, including `matter_unchanged` |

The long-run fixture changed for an accounted reason: `exit` now transfers
`water|fluid` to `water|return`, and `rain` transfers it back instead of
adding water. Rain attempts can skip when the return reservoir is empty,
changing the random operation path, world checksum and operation counts.
Water source/sink tallies fell because those internal transfers no longer
cross the ledger boundary. Determinism, snapshot continuity, independent
recounts and all fault kills stayed green. The four new ledger/world checksum
pairs are `a2b567a5/572dd3ff`, `6875b999/f4f93e07`,
`d2b3208c/6762f9bb`, `09d9728e/0f40152b` (seeds 1-4).
The reclaim pins are `3f4a40cb` and `38bad9af` on this branch state; its
checksum embeds the ledger config fingerprint, so a vocabulary change moves
it even when reclaim outcomes are unchanged.

## Evidence

- `evidence/test_ledger.log`: `PASS water_cycle_closes`, `PASS pore_roundtrip`, `PASS quench_same_family`, `PASS mutant_evaporation_sink_back_killed`, `PASS mutant_cross_family_row_killed`, `PASS mutant_solid_holding_form_killed`; `RESULT: 131 passed, 0 failed`.
- `evidence/test_materials.log`: `PASS obsidian_row_present`, `PASS peridotite_row_present`, `PASS new_row_postings_close`, `PASS mutant_duplicate_strataId_killed`; `RESULT: 119 passed, 0 failed`.
- `evidence/test_ledger_longrun.log`: `PASS fault_delete_one_unit_detected (exit 1, ... MASS mineral ... AUDIT E_UNBALANCED ...)`; `RESULT: 18 passed, 0 failed`.
- `evidence/test_zrange.log`: `PASS matter_unchanged` with the pinned geology reference in all three configurations; `RESULT: 10 passed, 0 failed (exit 0)`.
- No screenshot was produced: no plugin loads this lane's simulation modules or tables.

## Not done / known problems

- The spell validator is red because `srd:spell:control-weather` still names `source:rain` and `sink:evaporation` under `/effects/0/ledger/downstream/0` and `/1`. Its spell data is outside this lane's allowed paths. See `evidence/validate_spell_effects.log`. The PM needs an owned spell-data change and a new gate run before independent review can pass.
- RMMZ F5/F8, screenshot and save/load behavior were not checked. This is a foundational class C lane with no plugin consumer; runtime wiring belongs to lane-ec, lane-ei, lane-dy and lane-dg/dj.
- `origin/task/lane-dr` was not merged into local `origin/main` at the writer's starting state. The `cpPins` may require the brief's combined-state recomputation after that integration; this writer did not merge another branch.
- `docs/STATUS.md` has no lane-dp claim at this branch base. It is outside the explicit allowed paths, so this writer did not edit it; the PM needs to reconcile the active-lane table.

## Try it in RMMZ

1. No direct F5 step exists for this lane. Its files under `game/js/sim` and `game/data/sim` are not loaded by a plugin.

Expected: the named headless checks above exercise this lane; the consumer lanes must supply later in-game scenarios.

## Decisions needed

- PM: assign the `control-weather` ledger references to their owning spell-data lane and rerun `validate_spell_effects.js` on the combined candidate.
- PM: recompute the reclaim long-run pins on the combined candidate if lane-dr merges before this lane, as the brief directs. Independent Grok review and merge gate remain pending.

## GAME TRANSLATION (class C, foundational)

- **Player / World Effect:** future water displacement, return, pore exchange, lava movement and obsidian quench can retain accounted mass.
- **Trigger:** future water/lava authorities call `ledger.transform` for the named moves.
- **Runtime Authority:** `game/js/sim/ledger.js` enforces the defaults; future authorities own the world writes.
- **Simulation Path:** `ledger_defaults.js` forms and rows; `materials.json` strata masses and postings.
- **Engine Bridge:** deferred to lane-ec, lane-ei, lane-dy and lane-dg/dj; no plugin imports these files here.
- **Visible Result:** none observed in this lane; later fluid and rock consumers make it visible.
- **Persistence:** ledger snapshot has a config fingerprint; game save wiring is deferred to consumers.
- **Failure Without This Lane:** the specified water/lava destinations and two stone masses are absent.
- **Automated Proof:** the foreground checks and logs above, subject to the red spell validator.
- **In-Game Proof:** not checked.

Simulation implemented: YES (ledger vocabulary and catalogue rows). Engine bridge implemented: NO. Presentation implemented: NO. Input/player interaction implemented: NO. Save/load implemented: NO. Playable verification performed: NO.

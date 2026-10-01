Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **da** ("GO — amended, CELL-owned"), with section 3 (D1 REALIGNMENT: canonical IDs, ownership, and the da dependency correction) and the da rows of section 4. This amended brief replaces the plan's original lane-da brief (2026-09-30) as the dispatch contract.

# lane-da: Sparse outer save: no save entry for an unchanged outer layer (CELL save-only part)

| Field | Value |
|---|---|
| Canonical deliverable | WG.00.43 (sparse save). Merged D1 calls it "WG.00.18"; that ID is taken, so WG.00.43 stays canonical (G02 section 3). |
| Execution leaf | WG.CELL-WRITE, part 1 (the total is fixed once at the wave-2 D1 reconciliation). G02 section 3 reclassifies the Levels work of da, dc, dd, dg, di and dj as CELL parts and renumbers CELL once. Other CELL homes are still pending there (the Levels edits the plan gave lane-df and lane-dk), so no total is given here. da is the first Levels writer, so it is part 1 under any numbering. No `.0N` sub-ID. |
| Cross-reference | WG.CELL-WRITE (lane-da) implements WG.00.43. WG.00.43 completes when this lane merges. WG.CELL-WRITE stays open until its remaining parts finish. |
| taskId (manifest) | WG.CELL-WRITE |
| Branch | `task/lane-da` |
| Manifest | `tasks/WG.CELL-WRITE/lane-da/lane.json` (copy of `lane.json` beside this brief; the one primary manifest for this dispatch) |
| Writer -> reviewer | grok -> gemini |
| Size | S |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Execution predecessors | the post-cu base and a verified WG.00.17 prerequisite only (G02 section 3 dependency correction) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row da, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. The WG.00.17 prerequisite is verified on the live board. The PM's record of it (WBS Rev 33, row WG.00.17) names two known reds on main: the sparse save, regressed by `a8c1e62a`, which is this lane's work; and `tools/zrange/scan_z_literals.js`, which finds 5 Z literals outside its allow-list (`DEUS_Levels.js:109,110,2608`, `DEUS_WorldGen.js:1608`, `DEUS_Depth.js:1423`; plan risk 16). The scan is not this lane's work and not one of its gates.
3. The ID crosswalk is published and the live registry checked: sparse save **WG.00.43**, race starts **WG.62.02**, D1 band milestone **WG.00.30**. CELL ownership is recorded: da is registered as the save-only CELL implementation of WG.00.43, and plan risk 25's general D1 exception is replaced, not reaffirmed.
4. `docs/CANONICAL_ROLES.md` is synchronized under the existing Owner authorization. The sync records da's **grok -> gemini** assignment and the D1 family rule: D1 work goes to codex, gemini or grok, with a reviewer from a different family, and never to Claude. The old Claude fallback does not apply to this lane.
5. This brief and `lane.json` are on main as written, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

## Goal

A New Game's save holds level entries for the core (-2..+2) only. An outer layer gets an entry with its first change and loses it with its last. Viewing a layer is not changing it: a viewed layer gets no entry. Saves written since `a8c1e62a` hold an entry with a checksum for all 32 levels, and the 27 outer ones are checksum-only unless something changed there. They are cleaned once on load, without losing a real change. All 32 layers stay reconstructible with unchanged baseline output. This lane changes persistence, not generation output.

## Scope (save and initialization only)

- Manifest `tasks/WG.CELL-WRITE/lane-da/lane.json`, branch `task/lane-da`, writer grok, reviewer gemini. gateTests are the gate commands below (node, 900 s).
- `DEUS_Levels.js` `ensureWorldLevels` (4597-4617 at main a3b2c3ed; re-locate at your base): write entries and checksums for `CORE_LEVELS` only. Leave baseline construction as it is at the lane base. Whether baselines are built eagerly or on demand is not part of this lane's acceptance; laziness is lane-dd's work. Building a baseline, whether at New Game or when the view moves to a level (`setView`, `step`), writes no save entry.
- **Checksum-only entry** (one definition, used by `dropEmptyOuterEntry` and by the migration): every key of the entry is `z`, `gen`, `checksum` or `strata`; `strata` is absent or an empty object; and there is no `caps` key. An outer entry with any strata record or any caps record holds a real change.
- `dropEmptyOuterEntry` (1704 at a3b2c3ed): a checksum-only outer entry counts as empty.
- A one-shot load migration, recorded in `st.migrations` under rule `'WG.00.43'` (the migration marker G02 keeps), deletes checksum-only outer entries. It keeps every other outer entry unchanged, byte for byte, its `checksum` key included. A strata change and a caps-only entry are both real changes.
- **Caps are not moved.** Generated caps stay where generation puts them: on +2's baseline (`b.caps`), materialized above +2 by `materializeCaps`. They are baseline data, not save entries. A changed cap stays saved at `levels[zMax].caps`, the shipped format (`docs/systems/DEUS_ZRange.md` section 9; `writeCap`, `DEUS_Levels.js` 3337-3360 at a3b2c3ed). At -16..+15 that is the outer entry `'15'`, so a caps-only outer entry is a real change. Moving saved caps would change the save format, which is outside this lane's save and init scope.
- `tools/test_32_levels_generation.js`: at main it pins the non-sparse save in six checks and holds one check that can never fail. Rewrite every one of them as follows (lines at main e6b221a3). The permanent requirement "all 32 baselines generated at New Game" is withdrawn (G02 section 2).

  | Check at main (line) | At the tip |
  |---|---|
  | `world_default_zrange_is_32` (88) | unchanged |
  | `ensure_world_levels_generates_all_32_entries` (93) | `core_entries_only`: sorted `Object.keys(st.levels)` equals `CORE_LEVELS` (-2..+2) |
  | `level_entries_span_minus16_to_plus15` (97) | `all_32_levels_reconstructible`: for every z in -16..+15, `L.baseline(z, 0, 0)` is non-null and has `z` equal to that z |
  | `all_32_levels_have_valid_checksums` (112) | `core_levels_have_valid_checksums`: each core entry has a string checksum other than `"n/a"` |
  | `all_32_levels_have_gen5` (113) | `core_levels_have_gen`: each core entry's `gen` equals `L.GEN` |
  | `level_minus_16_baseline_exists` (117), `level_plus_15_baseline_exists` (120) | unchanged |
  | `level_entry_minus_10_present` (123) | `no_entry_for_unchanged_minus_10`: after `L.baseline(-10, 0, 0)` has been built, `st.levels["-10"]` is still undefined |
  | `level_entry_plus_10_present` (124) | `no_entry_for_unchanged_plus_10`: the same for +10 |
  | `mutant_core_only_caught` (127-130) | Removed. It tests a literal object and can never fail (Rule 4). It is replaced by a real mutant run against `DEUS_Levels.js`: `node tools/test_32_levels_generation.js --mutant=checksum_all_levels` rewrites the plugin source before the vm loads it (as `tools/test_natural_connections.js` does with `--mutant=`) and must exit 1 at `core_entries_only`. Copy that output into the evidence. |

- The save bound is measured on **terrain+range**: the levels, `zRange` and fluid parts, as DEUS_ZRange.md section 9 and ADR-003 section 15.5 define them. Levels JSON alone is not the measure.
- Docs:
  - `docs/systems/DEUS_ZRange.md` section 9 (merged D1 assigns that rewrite to "WG.00.18", here WG.00.43).
  - In section 6, only the two statements about save entries: core entries from New Game, and an outer level having no entry until it changes. The band, stone and lava statements in sections 6 and 11 belong to the geology milestone (WG.00.30, lane-dg).
  - The save section of `docs/systems/DEUS_Levels.md`.
  - GAME TRANSLATION class C.

## Out of scope

- Generation output of any kind, including the baseline content of any layer (lane-dg and the D1 geology lanes).
- Lazy or demand-driven area generation (lane-dd), and per-area checksums.
- Moving generated or saved caps, or any other save-format change beyond dropping checksum-only outer entries.
- The CELL contract surfaces: commitMatterBatch and removeStratum; setShape, derivePacked and standing; committed-change publication; flood delegation; effectiveSupport; the matter-participant registry.
- Fluid and matter save payloads (lane-ec, lane-dv).
- WBS and registry rows (PM).

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/plugins/DEUS_Levels.js`
- `tools/test_sparse_outer_save.js`
- `tools/fixtures/levels/save_32_entries_seed18.json`
- `tools/test_32_levels_generation.js`
- `docs/systems/DEUS_ZRange.md`
- `docs/systems/DEUS_Levels.md`
- `tasks/WG.CELL-WRITE/lane-da/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

lane-da is the first writer of each file below.

- `game/js/plugins/DEUS_Levels.js`: before lane-dc (w2), lane-dd (w3), lane-dw (w5), lane-dv (w6), lane-dx (w7), lane-dy (w8), lane-dz (w9), lane-dg (w10), lane-di (w11), lane-dj (w12) and lane-eg (w14). G02 section 3 removes Levels permissions from the D1-GEO portions of lane-df (w4) and lane-dk (w15), and reverses dl and dj. The PM rebuilds this row with the wave-2 D1 reconciliation.
- `docs/systems/DEUS_Levels.md`: before lane-dc (w2), lane-dd (w3), lane-df (w4), lane-dw (w5), lane-dv (w6), lane-dx (w7), lane-dy (w8), lane-dz (w9), lane-dg (w10), lane-di (w11), lane-dj (w12), lane-eg (w14) and lane-dk (w15), in the current plan. The wave-2 rebuild settles df and dk.
- `tools/test_32_levels_generation.js`: before lane-db (w2).
- `docs/systems/DEUS_ZRange.md`: before lane-dd (w3), lane-df (w4) and lane-dg (w10).

As the first writer, lane-da starts from the post-cu base. Later writers start from a base that already holds this lane (plan, Hot-file ownership order; see Plan excerpts).

## Tests

The mixed fixture `tools/fixtures/levels/save_32_entries_seed18.json` is captured at the lane base: the 32 entries a seed-18 New Game writes at -16..+15 (5 core and 27 outer, each with a checksum). Two outer entries are then given real changes:

- one outer entry gets one real strata change;
- the +15 entry (`levels[zMax]`) gets one changed cap, and its strata stay empty, so it is a caps-only entry. If a -16..+15 game cannot produce a changed cap at +15 (DEUS_ZRange.md section 6: at -16..+15 every cap fits under zMax), write the cap record by hand in `writeCap`'s save format (6 hex digits) and say so in the fixture's notes.

The other 25 outer entries stay checksum-only.

### Must fail before / pass after

These are the tests G02 section 2 says must be shown failing for da, plus the merged D1 "viewed ≠ saved" check. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change)

- NEW `tools/test_sparse_outer_save.js::new_game_core_entries_only`. Seed-18 New Game at -16..+15: `Object.keys(state.levels)` holds only the core -2..+2. There is no outer entry, `'15'` included, because no cap has changed. FAILS at the base because ensureWorldLevels writes an entry for every z (DEUS_Levels.js 4603-4609).
- `tools/test_sparse_outer_save.js::view_does_not_save`. Seed-18 New Game at -16..+15. Step the view to -10 and to +12 (`UF.Levels.setView` or `step`; each builds that level's baselines), then build the save contents: `Object.keys(levels)` is still the core only. FAILS at the base, which writes all 32 entries at New Game.
- `tools/test_sparse_outer_save.js::revert_drops_outer_entry`, two cases:
  - (a) Fresh world: change one outer cell, then revert it. The outer entry is gone.
  - (b) Mixed fixture: load it and migrate, then revert its preserved real strata change. That entry still holds its `checksum` key, because the migration leaves kept entries byte for byte. After the revert the entry must be gone.

  Case (b) is the one `drop_ignores_checksum` turns red. On a fresh world, `levelEntry` (DEUS_Levels.js:1702) creates `{z, gen, strata: {}}` with no checksum, so even the base `dropEmptyOuterEntry` deletes it, and case (a) alone cannot catch that mutant.
- `tools/test_sparse_outer_save.js::migration_strips_checksum_only_entries`. The mixed fixture loads with exactly its 25 checksum-only outer entries removed. Its outer keys are then exactly the two real ones. The migration runs once and is recorded in `st.migrations` as `'WG.00.43'`; a second load removes nothing and adds no second record.
- `tools/test_sparse_outer_save.js::fresh_save_terrain_range_bound`. This is the corrected save-bound check and replaces `fresh_save_levels_bound`. Seed 18: terrain+range at -16..+15 minus terrain+range at -4..+4 must be at most 256 B (ADR-003 section 15.5). Terrain+range is the levels, `zRange` and fluid parts, not the levels JSON alone. The draft's figure, 1,787 B, is the -16..+15 levels-JSON size: the PM's headless probe reproduced it at a3b2c3ed on 2026-10-01 (32 keys; the five core entries alone are 275 B). It is not the terrain+range differential. Re-measure terrain+range at the lane base and record that number.

#### Under mutants at the tip (each must make its named check exit 1)

G02 requires the first three. The others close gaps this brief names.

- `checksum_all_levels`: ensureWorldLevels writes an entry and checksum for every z again. Turns red `new_game_core_entries_only`, `view_does_not_save` and `fresh_save_terrain_range_bound`, and `core_entries_only` in `tools/test_32_levels_generation.js` (its `--mutant=` run).
- `drop_ignores_checksum`: dropEmptyOuterEntry no longer treats a checksum-only entry as empty. Turns red `revert_drops_outer_entry` (case b).
- `strip_all_outer`: the migration deletes every outer entry, real changes included. Turns red the guard `migration_keeps_real_outer_change`.
- `strip_caps_only`: the migration deletes the caps-only entry (it treats an entry with empty strata as checksum-only and ignores `caps`). Turns red `migration_keeps_real_outer_change`.
- `entry_on_view`: building an outer level's baselines when the view moves there creates its save entry with a checksum. Turns red `view_does_not_save`.
- `outer_baseline_shift`: `outerBaseline` returns different content for one outer z (for example AIR in place of stone at z = -9). Turns red the guard `all_32_layers_reconstructible_unchanged`.

### Guards (pass before and after)

- `tools/test_sparse_outer_save.js::migration_keeps_real_outer_change`. After the mixed fixture loads (and, at the tip, migrates), both real outer entries are present and byte-identical to the fixture: the strata change and the caps-only entry at `'15'`, `checksum` keys included. At the base nothing is migrated, so the check passes there too. `strip_all_outer` and `strip_caps_only` must each make it fail.
- `tools/test_sparse_outer_save.js::all_32_layers_reconstructible_unchanged`. This replaces `all_32_layers_generated_at_new_game`. Seed 18 at -16..+15: the baseline output of each of the 32 layers equals the lane base's output, whether the layer was built at New Game or on demand.
  - The expected values are 32 per-layer hashes captured at the lane base and pinned as constants in `tools/test_sparse_outer_save.js`. Use the per-level checksums the base New Game writes into `st.levels[z].checksum` for seed 18. They come from `checksumOf`, which hashes a level's baseline strata bytes, connectors, biome codes and caps, and which `UF.Levels.checksum(z, seed, gen)` exposes.
  - At the tip the test recomputes each one with `UF.Levels.checksum(z, 18, gen)` and compares it with its constant. Never compute the expected values with the tip's own code; that would make the guard a tautology.
  - `outer_baseline_shift` must make it fail.

### Other named checks (pass at the tip)

- `tools/test_32_levels_generation.js`: the nine checks in the Scope table (`world_default_zrange_is_32`, `core_entries_only`, `all_32_levels_reconstructible`, `core_levels_have_valid_checksums`, `core_levels_have_gen`, `level_minus_16_baseline_exists`, `level_plus_15_baseline_exists`, `no_entry_for_unchanged_minus_10`, `no_entry_for_unchanged_plus_10`). The run with `--mutant=checksum_all_levels` exits 1.

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_sparse_outer_save.js`
- `node tools/test_32_levels_generation.js`
- `node tools/test_strata_cuts_and_caves.js`

## F5 evidence

Run NW.js `--uf-test` on a snapshot: New Game at -16..+15, step the view to -10 and back, dig one cell on -3, Save, then Load. There must be no console errors, and the log excerpt must show the saved levels object holding the 5 core keys plus `'-3'` (no `'-10'`). Class C.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- Execution predecessors: the post-cu base and a verified WG.00.17. That is all.
- lane-da is the save-only CELL precursor. It does not consume the completed CELL dry pipeline, which already depends on it (G02 section 3). Merged D1's "Dep: WG.00.17, WG.CELL-WRITE" for this leaf is corrected to WG.00.17 alone. The full CELL dry checkpoint remains a prerequisite for lane-dg's new matter application, not for this lane.
- Lanes that depend on this one: lane-db (w2), lane-dc (w2).

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, sections 2 to 4 (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/DESIGN-D1_merged_grok_heavy.md`: "Save / versioning", and the "WG.00.18 NEW" leaf row (here WG.00.43). That row's scope and acceptance items map onto this brief:
  - (1) -> `new_game_core_entries_only` (its "caps stay on the top core level entry" is read as settled below)
  - (2) -> `revert_drops_outer_entry`
  - (3) -> `migration_keeps_real_outer_change` and `migration_strips_checksum_only_entries`
  - (4) -> `fresh_save_terrain_range_bound`
  - (5) -> the `checksum_all_levels` mutant
  - the scope item "viewed ≠ saved" -> `view_does_not_save` and the `entry_on_view` mutant
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D1_grok_heavy.md` (Save). Background only; the merged D1 and G02 win.
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md` DEC-040, DEC-058.
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/systems/DEUS_ZRange.md` section 9; `docs/adr/ADR-003_sim_render_split_and_lod.md` section 15.5.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- **Ownership.** CELL owns `DEUS_Levels.js`, and this lane is a WG.CELL-WRITE part that executes WG.00.43. The general D1 Levels exception of plan risk 25 is retired (G02 section 3). The lane is limited to save and initialization surfaces: ensureWorldLevels entry and checksum writing, dropEmptyOuterEntry, and the load migration.
- **ID.** WG.00.43 stays the canonical sparse-save deliverable, not WG.00.18 (taken; WG.00.40-.42 are also taken). The migration marker is `'WG.00.43'`.
- **32 layers.** "All 32 baselines generated at New Game" (Owner request 2026-09-29, carried in the original brief) is replaced as a permanent acceptance requirement by "all 32 layers remain reconstructible with unchanged baseline output" (G02 section 2). The PM records the New Game generation policy before lane-dd (G02 section 4, wave-3 deadline): each faction-home area may be generated once, but all 32 levels are not materialized eagerly in every area.
- **Outer layers.** An outer layer gets no entry unless it has changed, and viewing it is not a change. A one-shot migration strips checksum-only entries, as defined in Scope.
- **Caps.** Merged D1's "caps stay on the top core level entry" means generated caps stay on the +2 baseline. Changed caps stay saved at `levels[zMax].caps`, the shipped format. This lane moves no saved caps, and a caps-only outer entry is a real change.

## Writer and reviewer

- Writer `grok` (family grok), reviewer `gemini` (family gemini). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row da, and section 3, D1 routing: codex, gemini or grok, with a reviewer from a different family. Merged D1 excludes Claude from D1 implementation.
  - DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code).
  - DEC-058.
  - The CANONICAL_ROLES.md sync is precondition 4. No Claude fallback.
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/WG.CELL-WRITE/lane-da/review_gemini_<sha8>.md`, has subject `[gemini] WG.CELL-WRITE review <sha8>`, and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`.

## Rules that bind this lane

- The engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS. Show each named check failing without the change (Rule 4).
- No full-world scans per frame. Use indexes, dirty sets and the shared tick (Rule 14).
- If two fixes fail on the same problem, stop. Write down what is known and what is ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred. Creatures, flora and fauna are placed by seeded rules per biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); lanes write rows and cards only. The PM chooses what goes in game (DEC-056). Art uses PixelLab-native forms (DEC-055) and starts static (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-da`, with subject tag `[grok]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 16: "Checks already red on main, not used as gates until fixed: ... tools/zrange/scan_z_literals.js; ..." (5 unallowed literals at a3b2c3ed; see precondition 2).
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."
- Risk 25, as replaced under G02 section 3 (the PM records this text on main; it is precondition 3): "WG.CELL-WRITE is the only writer of `game/js/plugins/DEUS_Levels.js`. The Levels work of the D1 lanes da, dc, dd, dg, di and dj runs as WG.CELL-WRITE parts, each with one manifest under `tasks/WG.CELL-WRITE/<lane>/` and a cross-reference to its D1 deliverable (WG.00.43, WG.00.45, WG.00.46, WG.00.30, WG.62.03, WG.62.04). df and dk lose their Levels paths; D1-GEO owns `DEUS_WorldGen.js` and `game/js/sim/geology/*`; MASS owns the ledger and materials; W-CORE owns fluid. lane-da is the save-only CELL precursor: its predecessors are main after lane-cu and the verified WG.00.17, not the CELL dry checkpoint."

# lane-do: Flip the ledger, material catalogue and mass tables to centipounds in one step

| Field | Value |
|---|---|
| WBS | NAT.02.MASS (SHARED; merged D2/D3 MASS), part 2 of 7 (was NAT.02.MASS.02) |
| taskId (manifest) | NAT.02.MASS |
| Branch | `task/lane-do` |
| Manifest | `tasks/NAT.02.MASS/lane-do/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | codex -> grok |
| Size | L |
| Wave | 2 of 19 |
| Dependencies | lane-dn (w1) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34). That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at the wave-2 launch commit, which holds every wave-1 merge this lane follows (lanes cu, ex, en, dn, ct, ez and el) and WBS Rev 34 (0b4a0689). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4; plan risk 17).

## Goal

Ledger, catalogue and mass tables hold only integer cp; old unit snapshots are refused.

Owner follow-up, 2026-10-01: fix the three `tools/test_zrange.js` failures (`sparse_memory`, `old_layers_identical`, `matter_unchanged`) found at 304ca7b2. This directly supersedes the earlier stop instruction for those three pre-existing failures and adds the Z-range harness, its pinned reference, and the full suite to this lane's repair scope. The 5255f1a5 fixture remains the historical 1 ft and legacy-save reference; the post-geology reference is pinned per Z configuration at 304ca7b2.

## Scope

- Manifest tasks/NAT.02.MASS/lane-do/lane.json, branch task/lane-do, writer codex, reviewer grok; GATE lines as gateTests. First sim/ledger.js writer.
- ledger_defaults.js:9-11, :26-36 units 'cp'; ledger.js SCHEMA 2; E_UNIT; E_UNIT_PROVENANCE for schema 1.
- materials.json: massUnit cp (DEC-038 item 3); cpPerStratum = kgToCp(kgPerSlice); water 312000; lava = basalt 905,218; postings re-summed exactly. Collapse postings keep form strata here; lane-dp flips them to held with the form it adds.
- mass_tables.json massCp; NEW tools/sim/migrate_mass_units.js (--check).
- materials.js reads cp; validate() E_UNIT, E_UNIT_STATUS, E_CP_RULE.
- Keep test_decay_core, test_zrange, validate_spell_effects and test_world_items green; if one fails, adjust only unit labels in fixtures listed here, else stop (Rule 10).
- tools/zrange/z_literal_allowlist.json, in this lane's first commit and before any other change: append these five entries at the end of `entries`, exactly, and change nothing else in the file. At main the static scan (`tools/zrange/scan_z_literals.js`, the static half of test_zrange's single_authority check) reports exactly these five lines as not allowed; allowing them as named debts scopes the check to new literals (D1 reconciliation, 2026-10-01). Each reason names the commit that added the line and the lane that retires it; a retiring lane removes its entry, because the scan fails on an entry that matches no line.

  ```json
  {
   "file": "DEUS_Levels.js",
   "match": "id: \"deep_caverns\", zMin: -16, zMax: -9",
   "class": "debt",
   "reason": "ZD-1 (D1 reconciliation, 2026-10-01): a DEC-013 DEPTH_BANDS row, unallowed at main since eed4776b (WG.00.15). Retired by lane-dg (WG.CELL-WRITE part 11), which deletes DEPTH_BANDS and this entry"
  },
  {
   "file": "DEUS_Levels.js",
   "match": "id: \"shallow_underground\", zMin: -8, zMax: -1",
   "class": "debt",
   "reason": "ZD-2 (D1 reconciliation, 2026-10-01): a DEC-013 DEPTH_BANDS row, unallowed at main since eed4776b (WG.00.15). Retired by lane-dg (WG.CELL-WRITE part 11), which deletes DEPTH_BANDS and this entry"
  },
  {
   "file": "DEUS_Levels.js",
   "match": "for (let li = 0; li < 5; li++) {",
   "class": "debt",
   "reason": "ZD-3 (D1 reconciliation, 2026-10-01): materializeDeepCuts' DEC-001 fluid guard walks five core levels, unallowed at main since dab44cb9 (WG.00.41). No retiring lane yet: the PM names a WG.CELL-WRITE part before that part is dispatched"
  },
  {
   "file": "DEUS_WorldGen.js",
   "match": "ctx.z !== -2 || typeof L.setStrata !== \"function\"",
   "class": "debt",
   "reason": "ZD-4 (D1 reconciliation, 2026-10-01): quietCampLava acts only at z = -2, where Levels makes lava today; unallowed at main since 559139b0 (SIM.10.05). No retiring lane yet: the PM names a D1-GEO WorldGen writer after lane-dj removes the z === -2 lava branches"
  },
  {
   "file": "DEUS_Depth.js",
   "match": "W.zRange ? W.zRange() : { zMin: -2, zMax: 2 }",
   "class": "debt",
   "reason": "ZD-5 (D1 reconciliation, 2026-10-01): a -2..+2 fallback when the World authority has no zRange, unallowed at main since 87f4e4ee (WG.00.21). No retiring lane yet: the PM names the next DEUS_Depth.js writer, or that lane re-classes it as a fallback entry with its reviewer's agreement"
  }
  ```

## Out of scope

- New forms/rows (lane-dp)
- Transactions (lane-dq)
- reclaim/world_items fields (lane-dr)
- Structural collapse (lane-eq)
- Soil

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/ledger.js`
- `game/js/sim/ledger_defaults.js`
- `game/js/sim/materials.js`
- `game/data/sim/materials.json`
- `game/data/sim/mass_tables.json`
- `game/data/sim/README.md`
- `tools/sim/migrate_mass_units.js`
- `tools/sim/test_ledger.js`
- `tools/sim/test_ledger_longrun.js`
- `tools/sim/test_materials.js`
- `tools/sim/fixtures/materials/**`
- `tools/sim/test_reclaim.js`
- `tools/sim/test_reclaim_longrun.js`
- `docs/systems/DEUS_Materials.md`
- `docs/systems/DEUS_Matter.md`
- `tools/zrange/z_literal_allowlist.json`
- `tools/test_zrange.js`, `tools/zrange/zrange_suite.js`, `tools/zrange/bounds.js`, `tools/zrange/fixtures/geology_304ca7b2_seed18.json` (Owner follow-up above)
- `docs/VISION.md` (direct Owner instruction recorded in its Decision log)
- `tasks/NAT.02.MASS/lane-do/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `game/js/sim/ledger.js`: after (first writer); before lane-dq (w4)
- `game/js/sim/ledger_defaults.js`: after (first writer); before lane-dp (w3)
- `game/js/sim/materials.js`: after (first writer); before lane-dp (w3), lane-fu (w16)
- `game/data/sim/materials.json`: after (first writer); before lane-dp (w3), lane-fu (w16)
- `tools/sim/migrate_mass_units.js`: after (first writer); before lane-dp (w3)
- `tools/sim/test_ledger.js`: after (first writer); before lane-dp (w3), lane-dq (w4)
- `tools/sim/test_ledger_longrun.js`: after (first writer); before lane-dp (w3), lane-dq (w4)
- `tools/sim/test_materials.js`: after (first writer); before lane-dp (w3), lane-fu (w16)
- `tools/sim/test_reclaim.js`: after (first writer); before lane-dr (w3)
- `tools/sim/test_reclaim_longrun.js`: after (first writer); before lane-dr (w3)
- `docs/systems/DEUS_Materials.md`: after (first writer); before lane-dp (w3), lane-fu (w16)
- `docs/systems/DEUS_Matter.md`: after lane-dn (w1); before lane-dp (w3), lane-dq (w4), lane-du (w5), lane-ds (w9)
- `tools/zrange/z_literal_allowlist.json`: after (first writer); before lane-df (w4), lane-dz (w9), lane-dg (w10), lane-dj (w12), lane-eg (w14)

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- `node tools/zrange/scan_z_literals.js`: exit 1 at the lane base with exactly ZD-1 to ZD-5 not allowed (`5 not allowed; 0 stale entries`), exit 0 after the first commit; with one more literal appended to a scratch copy of a scanned plugin (for example `function probe(z) { return z <= -2; }` in DEUS_Fluid.js, run with `--root` on that copy) it exits 1 again. Copy the three outputs into the evidence - FAILS on main
- tools/sim/test_materials.js::catalogue_is_cp - FAILS on main
- `tools/sim/test_materials.js` ::cp_rule_every_row (stone 717,825; granite 858,480) - FAILS on main
- `tools/sim/test_materials.js` ::water_stratum_312000; ::lava_equals_basalt_stratum - FAIL on main
- tools/sim/test_ledger.js::unit_cp_only - FAILS on main; ::schema1_snapshot_refused

### Mutants and provocations

- Mutants grams_row, no_E_UNIT, restore_schema1

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- `tools/sim/test_materials.js` ::postings_close_exactly; ::bom_exact_after_convert; ::migrate_check_clean; ::legacy_mu_fixture_refused

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/sim/test_materials.js`
- `node tools/sim/test_ledger.js`
- `node tools/sim/test_ledger_longrun.js`
- `node tools/sim/test_reclaim.js`
- `node tools/sim/test_reclaim_longrun.js`
- `node tools/sim/test_living_world_rules.js`
- `node tools/sim/test_water_dynamics.js`
- `node tools/test_fluid_correctness_lane_cw.js`
- `node tools/sim/migrate_mass_units.js --check`
- `node tools/world_items/test_world_items.js`
- `node tools/sim/test_decay_core.js`
- `node tools/test_zrange.js`
- `node tools/spells/validate_spell_effects.js`

## F5 evidence

F5 smoke: New Game; game_runtime.log shows DEUS_Fluid loaded with no catalogue error; log excerpt screenshot opened and described.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-dn (w1): Shared units and geometry table in centipounds

Lanes that depend on this one: lane-dp (w3), lane-dr (w3), lane-eo (w3), lane-du (w5).

## Design references

- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_chatgpt_pro.md sections 1, 2, 8
- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md section 2, 5 Q3

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- tools/test_zrange.js gates this lane although it was red on main: the original scope covered the five Z literals this lane allows as debts in its first commit. The Owner follow-up under Goal directly authorizes repair of the three additional failures found at 304ca7b2 (`sparse_memory`, `old_layers_identical`, `matter_unchanged`); other unscoped failures still follow Rule 10.
- cp replaces mu/du; schema-1 snapshots refused; lava = basalt per stratum (PM).
- Extra keep-green gates (critic): test_decay_core, test_zrange, validate_spell_effects, test_world_items.

## Writer and reviewer

- Writer `codex` (family codex), reviewer `grok` (family grok): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). docs/CANONICAL_ROLES.md section 2.1 (synced 2026-10-01 under DEC-051) lets Grok and Codex write natural-world lanes (plan risk 2; see Plan excerpts).
- Fallback if that sync is not recorded before this lane starts: re-manifest the lane with a claude writer (plan risk 2; see Plan excerpts).

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`. Its data files (`game/data/sim/materials.json`, `game/data/sim/mass_tables.json`, `game/data/sim/README.md`) sit in subfolders of `game/data/`, which the editor does not load or save.

## Rules that bind this lane

- Engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4).
- No full-world scans per frame; use indexes, dirty sets and the shared tick (Rule 14).
- Two failed fixes on the same problem: stop, write down what is known and ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred; creatures, flora and fauna are placed by seeded rules by biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); rows and cards only; the PM chooses what goes in game (DEC-056); PixelLab-native forms (DEC-055); static art first (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-do`, subject tag `[codex]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 and the D1 reconciliation amend the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 2: "Roles: docs/CANONICAL_ROLES.md:23-24 says Grok does not implement production engine code and Codex is bounded to tools/ and docs/telemetry/. ... Before wave 1 the PM records the CANONICAL_ROLES.md sync under DEC-051. If the PM does not, the fallback is to re-manifest the plugin-touching codex lanes ... and the grok lanes with claude writers." The sync is recorded on main (docs/CANONICAL_ROLES.md section 2.1, 2026-10-01).
- Risk 16: "Checks already red on main, not used as gates until fixed: test_region_seam_continuity sky_cap_empty_z12 (lane-dg fixes it); test_round_world.js and test_seamless_map_edges.js (Scene_Map ReferenceError); test_liquid_depth_simulation legacy_flooding_compatibility (lane-ec); tools/zrange/scan_z_literals.js; build_catalogue --check (lane-er rebuilds it); test_vertical_biome_coupling, test_ecology and test_upper_elevation_terrain." The D1 reconciliation scopes scan_z_literals.js to new literals by allow-listing its five current red lines as named debts in this lane's first commit (see Deliverables); the plan's row for `tools/zrange/z_literal_allowlist.json` begins at lane-dz [9], and this lane is its first writer [2].
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

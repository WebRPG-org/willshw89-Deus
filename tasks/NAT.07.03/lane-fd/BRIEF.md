# lane-fd: Encounter tables per biome cell and tier

| Field | Value |
|---|---|
| WBS | NAT.07.03 |
| taskId (manifest) | NAT.07.03 |
| Branch | `task/lane-fd` |
| Manifest | `tasks/NAT.07.03/lane-fd/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> gemini |
| Size | S |
| Wave | 2 of 19 |
| Dependencies | lane-ex (w1) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34). That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at the wave-2 launch commit, which holds every wave-1 merge this lane follows (lanes cu, ex, en, dn, ct, ez and el) and WBS Rev 34 (0b4a0689). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4; plan risk 17).

## Goal

Deterministic weighted tables per (cell, tier); lair and elemental creatures on their own tables.

## Scope

- Manifest tasks/NAT.07.03/lane-fd/lane.json, branch task/lane-fd, writer claude, reviewer gemini; GATE lines as gateTests.
- NEW sim/placement/encounters.js buildTables, pick (integer weights).
- NEW encounter_weights.json (PM_DEFAULT); DEUS_Encounters.md.

## Out of scope

- Geometry
- Spawning
- Summoning

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/placement/encounters.js`
- `game/data/ecology/encounter_weights.json`
- `docs/systems/DEUS_Encounters.md`
- `tools/test_encounter_tables.js`
- `tasks/NAT.07.03/lane-fd/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- No file here is shared with another lane.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- NEW tools/test_encounter_tables.js (FAILS on main)::tier_ceiling
- `tools/test_encounter_tables.js` ::no_summon_exclude_people; ::lairs_only_in_lair_tables; ::elementals_feature_only; ::t0_nonempty; ::sky_tables_marked_unused_v1; ::pick_deterministic; ::weights_from_data

### Mutants and provocations

- Mutants tier_plus_one, summon_leak

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- (none)

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/test_encounter_tables.js`
- `node tools/test_bestiary_adaptation.js`
- `node tools/check_deus_syntax.js`

## F5 evidence

None.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-ex (w1): Bestiary adaptation layer: 317 SRD creatures as DEUS rows

Lanes that depend on this one: lane-fe (w7).

## Design references

- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D4_merged_minimax_m3.md section 5
- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/BESTIARY_grok_heavy.md

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- Elementals feature-only (merged D4).

## Writer and reviewer

- Writer `claude` (family claude), reviewer `gemini` (family gemini): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). docs/CANONICAL_ROLES.md section 2.1 (synced 2026-10-01 under DEC-051) lets Grok and Codex write natural-world lanes (plan risk 2; see Plan excerpts).
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/<taskId>/<lane>/review_gemini_<sha8>.md`, has subject `[gemini] <taskId> review <sha8>` and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`. Its data files (`game/data/ecology/encounter_weights.json`) sit in subfolders of `game/data/`, which the editor does not load or save.

## Rules that bind this lane

- Engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4).
- No full-world scans per frame; use indexes, dirty sets and the shared tick (Rule 14).
- Two failed fixes on the same problem: stop, write down what is known and ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred; creatures, flora and fauna are placed by seeded rules by biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); rows and cards only; the PM chooses what goes in game (DEC-056); PixelLab-native forms (DEC-055); static art first (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-fd`, subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 and the D1 reconciliation amend the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 2: "Roles: docs/CANONICAL_ROLES.md:23-24 says Grok does not implement production engine code and Codex is bounded to tools/ and docs/telemetry/. ... Before wave 1 the PM records the CANONICAL_ROLES.md sync under DEC-051. If the PM does not, the fallback is to re-manifest the plugin-touching codex lanes ... and the grok lanes with claude writers." The sync is recorded on main (docs/CANONICAL_ROLES.md section 2.1, 2026-10-01).
- Risk 16: "Checks already red on main, not used as gates until fixed: test_region_seam_continuity sky_cap_empty_z12 (lane-dg fixes it); test_round_world.js and test_seamless_map_edges.js (Scene_Map ReferenceError); test_liquid_depth_simulation legacy_flooding_compatibility (lane-ec); tools/zrange/scan_z_literals.js; build_catalogue --check (lane-er rebuilds it); test_vertical_biome_coupling, test_ecology and test_upper_elevation_terrain."
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **dn** ("GO"), with the dn rows of section 4. Part renumbering follows section 1 (the accepted dt-into-dp fold). This amended brief replaces the plan's original lane-dn brief (2026-09-30) as the dispatch contract.

# lane-dn: Shared units and geometry table in centipounds

| Field | Value |
|---|---|
| WBS | NAT.02.MASS (SHARED; merged D2/D3 MASS), part 1 (the total is fixed once at the wave-2 D1 reconciliation). The plan's draft counted eight MASS parts with this lane first, and called it "NAT.02.MASS.01" before that. G02 section 1 folds lane-dt into lane-dp, and G02 section 3 gives MASS further D1 work (ensureCore/ensureChamber; band material rows), so the total can still change; lane-dn is part 1 under any numbering. The leaf stays open until its remaining parts finish. |
| taskId (manifest) | NAT.02.MASS |
| Branch | `task/lane-dn` |
| Manifest | `tasks/NAT.02.MASS/lane-dn/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | codex -> grok (retained, G02 section 2) |
| Size | S |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Dependencies | none |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row dn, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. `docs/CANONICAL_ROLES.md` is synchronized under the existing Owner authorization, so a codex writer may write `game/js/sim/units.js` outside `tools/`. If the sync is not recorded, the lane waits. It is not re-manifested to another writer: G02 section 2 fixes codex -> grok.
3. NAT.02.MASS is registered as the shared leaf, with parts and no `.0N` sub-IDs.
4. This brief and `lane.json` are on main as written, including the `--mutation-sweep` gate test, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

## Goal

One module defines cp, stratum geometry, water density and exact integer helpers.

## Scope (unchanged units scope, G02 section 2)

- Manifest `tasks/NAT.02.MASS/lane-dn/lane.json`, branch `task/lane-dn`, writer codex, reviewer grok. gateTests are the gate commands below, including the mutation sweep.
- NEW `game/js/sim/units.js`:
  - Mass and geometry: CP_PER_LB 100; CELL_FT 5, STRATUM_FT 2, STRATA_PER_Z 5, STRATUM_FT3 50.
  - Water: WATER_CP_PER_FT3 6240, WATER_CP_PER_STRATUM 312000, WATER_CP_PER_Z_CELL 1560000.
  - CP_PER_GALLON 834, for display only.
- kgToCp and gToCp round half up to an integer, using BigInt internally. The four pinned values:
  - granite 3,894 kg -> 858,480
  - stone 3,256 kg -> 717,825
  - basalt 4,106 kg -> 905,218
  - bar_iron 4,000 g -> 882
- addCp, subCp and mulCp carry overflow guards. apportion uses largest remainder and is stable.
- A WORLD_BOUND self-check, and the Units section of NEW `docs/systems/DEUS_Matter.md`.
- NEW `tools/sim/test_units.js` takes a `--mutation-sweep` flag. With the flag it applies each mutant below, reruns the named checks against it, and exits 1 if any mutant survives.

## Out of scope

- Importers (lanes do, ed, ea)
- Soil constants (DEC-057)

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/units.js`
- `tools/sim/test_units.js`
- `docs/systems/DEUS_Matter.md`
- `tasks/NAT.02.MASS/lane-dn/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `docs/systems/DEUS_Matter.md`: lane-dn is the first writer, before lane-do (w2), lane-dp (w3), lane-dq (w4), lane-du (w5) and lane-ds (w9). Folding lane-dt into lane-dp adds no writer of this file.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

### Must fail before / pass after

These are the tests G02 section 2 says must be shown failing for dn. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change): absence

- NEW `tools/sim/test_units.js::units_geometry_matches_space`. FAILS at the base because `game/js/sim/units.js` does not exist. This missing-module failure establishes absence only; it is not evidence of behaviour (G02 section 2).
- `tools/sim/test_units.js::kg_to_cp_rule` (the four pinned conversions), `::apportion_exact` and `::overflow_refused` also fail at the base, but only because the module is missing. Their proof of behaviour is the next list.

#### Under mutants at the tip: behaviour

These run in the gate as `node tools/sim/test_units.js --mutation-sweep`, which exits 1 if any mutant survives. G02 requires each of these mutants to be killed:

- `density_6250`: WATER_CP_PER_FT3 becomes 6250. Turns red `::water_stratum_is_312000` and `::units_geometry_matches_space`.
- `round_half_down`: kgToCp and gToCp round half down. Turns red `::kg_to_cp_rule`.
- `apportion_drops_remainder`: apportion drops the remainder. Turns red `::apportion_exact`.
- `overflow_guard_removed`: the addCp, subCp and mulCp guards are removed. Turns red `::overflow_refused`.

Show that the sweep itself can fail (Rule 4): it must exit 1 when one mutant survives, for example with its killing check disabled in a scratch copy. Copy that output into the evidence.

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- `tools/sim/test_units.js::water_stratum_is_312000`; `::gallons_are_derived`
- `tools/sim/test_units.js::world_bound_safe`

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/sim/test_units.js`
- `node tools/sim/test_units.js --mutation-sweep` (added by G02 section 2. Recording the flag only in prose is not enough.)
- `node tools/test_aquifer_seepage.js`

## F5 evidence

None.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- None.
- Lanes that depend on this one: lane-do (w2), lane-ea (w2), lane-ed (w2).

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 row dn (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_chatgpt_pro.md`, section 2.
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md`, section 2.
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md` DEC-038 item 3, DEC-040.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- A water stratum is 312,000 cp. Each catalogue row is converted once. There is no cp-per-du quantum.
- G02 retains codex -> grok and the existing units scope. Its only change to this lane is the mutation-sweep gate test.

## Writer and reviewer

- Writer `codex` (family codex), reviewer `grok` (family grok). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row dn.
  - DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code).
  - DEC-058 (AG swarms the lanes, with writers and reviewers from different families).
  - The CANONICAL_ROLES.md sync is precondition 2. The original brief's Claude-writer fallback is withdrawn.

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
- Commit only on `task/lane-dn`, with subject tag `[codex]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

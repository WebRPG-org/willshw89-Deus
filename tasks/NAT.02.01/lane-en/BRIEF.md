Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **en** ("GO — brief correction"), with the en row of section 4. This amended brief replaces the plan's original lane-en brief (2026-09-30) as the dispatch contract.

# lane-en: Rooted support topology (pure)

| Field | Value |
|---|---|
| WBS | NAT.02.01 (REOPEN; merged D3 S-CORE), part 1 of 6 |
| taskId (manifest) | NAT.02.01 |
| Branch | `task/lane-en` |
| Manifest | `tasks/NAT.02.01/lane-en/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> grok (retained, G02 section 2) |
| Size | M |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Dependencies | none |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row en, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. NAT.02.01 and PKG-02 are reopened on main. PKG-02's gate `tools/test_structural_support.js` does not exist, and its pkg2 proof uses a fake ledger (plan risk 8; see Plan excerpts).
3. This brief and `lane.json` are on main as written, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

## Goal

Replace the stub support predicate with a rooted evaluator. A member is supported through a bearing chain to the foundation, or through a lateral path to a real anchor within the catalogue span. Floating clusters fail.

## Scope

- Manifest `tasks/NAT.02.01/lane-en/lane.json`, branch `task/lane-en`, writer claude, reviewer grok. gateTests are the gate commands below.
- NEW `reader.js`: the StrataReader contract, plus a fixture reader.
- NEW `rooted.js` (SIM.40.01 4.1-4.2, 4.6, 5.3): members, bearing, dist/rootDir, spanEff, verdicts, and an ops counter charged to the one structural budget (Bs, merged D3).
- Preserve these three properties (G02 section 2):
  - **Actual occupied geometry.** The reader returns real occupied geometry, partial deposits included, not a whole-cell SOLID flag. Missing coordinates or material properties are errors.
  - **Unknown as pending.** Unavailable terrain is pending, never air and never support (merged D3 section 3.2).
  - **A single structural counter.** Every member, bearing and lateral-path visit charges Bs.
- New exports in `index.js`, and NEW `docs/systems/DEUS_Structural.md`.

## Out of scope

- Load (lane-eo)
- Planner
- Mass
- Plugins

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/structural/rooted.js`
- `game/js/sim/structural/reader.js`
- `game/js/sim/structural/index.js`
- `tools/test_structural_rooted.js`
- `docs/systems/DEUS_Structural.md`
- `tasks/NAT.02.01/lane-en/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

lane-en is the first writer of each file below.

- `game/js/sim/structural/index.js`: before lane-eq (w8).
- `docs/systems/DEUS_Structural.md`: before lane-eo (w3), lane-ep (w4), lane-fo (w6), lane-eq (w8), lane-es (w9), lane-et (w10), lane-eu (w11), lane-ev (w12), lane-ew (w13), lane-fr (w14), lane-fk (w16), lane-fs (w17) and lane-ft (w18).

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

The original brief listed "Must fail without the change: none". G02 section 2 replaces that with two things: the NEW-module absence check, and named behavioural negative controls. An import failure is never taken as proof of repaired support.

### Must fail before / pass after

These are the tests G02 section 2 says must be shown failing for en. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change): absence

- NEW `tools/test_structural_rooted.js::rooted_modules_present` FAILS at the lane base, because `game/js/sim/structural/rooted.js` and `reader.js` do not exist. It establishes absence only.

#### Behavioural negative controls (the legacy predicate, and mutants at the tip)

- **Against the legacy predicate.** Run `::rooted_floating_ring_fails` and the rooted-bearing checks (`::rooted_bearing_needs_root` and `::rooted_cross_z_member`) against one of these:
  - the actual legacy predicate: `evalCellSupport` in `game/js/sim/structural/support.js` at the lane base, through an adapter that changes no logic; or
  - a source-faithful `legacy` mutant of rooted.js that reproduces that predicate.

  Each check must reject it (exit 1). The legacy predicate accepts a cell whose below or side neighbour is flagged solid and supported, so a disconnected ring of mutually flagged cells passes it.
- **Named mutants.** Each must turn its named check red at the tip:
  - `unknown_as_air`: unavailable terrain is read as air. Turns red `::rooted_unknown_is_pending`.
  - `reset_distance`: lateral distance restarts at each member instead of being carried to the anchor. Turns red `::rooted_distance_carried`.
  - `trust_flag`: a neighbour's stored solid/supported flag is accepted as bearing, instead of a certified path over actual occupied geometry. Turns red `::rooted_bearing_needs_root`.
  - `x_only`: lateral paths are searched along x only. Turns red `::rooted_rotation_invariant`.
  - `legacy` (above): turns red `::rooted_floating_ring_fails` and the rooted-bearing checks.

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- `tools/test_structural_rooted.js::rooted_rotation_invariant` (rotated cantilevers agree)
- `::rooted_distance_carried` (granite fixture reader)
- `::rooted_hp_band_span`
- `::rooted_unknown_is_pending`
- `::rooted_catalogue_span`
- `::rooted_ops_counted` (every member, bearing and lateral-path visit charges Bs)

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/test_structural_rooted.js`
- `node tools/check_deus_syntax.js`

## F5 evidence

None. Class C.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- None.
- Lanes that depend on this one:
  - lane-eo (w3).
  - lane-di (w11). G02 section 3 removes the en dependency from the dh -> di chain if its only purpose is D1's effective-support/no-over-span gate, because support rules belong to D3. The PM settles this in the wave-2 D1 reconciliation.

## Merged D3 (binding, 2026-09-30)

- Source: `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_merged_chatgpt_pro.md`, sections 3.2, 3.4, 3.5 and 4 (the braintrust's merge of both D3 voices, 2026-09-30). This lane was drafted from voice 1; where the two differ, the merge wins. The PM's D3 reconciliation notes (rounds 1 and 2, 2026-09-30; plan risk 24) are already applied in this brief, so the lane does not need them.
- Leaf: NAT.02.01 (REOPEN; merged role S-CORE), part 1 of 6. The six parts are lane-en (rooted topology), lane-eo (load and ladder), lane-ep (planner), lane-eq (commit), lane-fv (save codec) and lane-fr (wet commit). The leaf is reopened in place: replace the defective internals and keep the subsystem.
- One runtime bridge, `game/js/plugins/DEUS_Structural.js`, written only by NAT.02.01.BRIDGE lanes, one at a time in the Hot-file ownership order: lane-es, lane-et, lane-eu, lane-ev, lane-ew, lane-fs, lane-ft.
  - NAT.02.01.WET (lane-fk) and NAT.02.02 (lane-fj) supply components (`structural/fluid_adapter.js`, `structural/barrier.js`). They edit neither the bridge, nor an S-CORE entry or core file (NAT.02.01), nor `participant.js` (CELL). Their hooks live with those owners (merged section 4, shared-file rule).
  - There is no DEUS_Collapse.js. Its doc is the runtime part of `docs/systems/DEUS_Structural.md`.
- Structural budget: one counter, Bs = 512 primitive operations per simulation tick.
  - It is a versioned tuning value in `game/data/sim/structural_calibration.json`, to be profiled; it is not a timing guarantee.
  - Event admission, contact probes, dependency visits, load propagation, landing probes, occupant operations and commit mutations all charge it.
  - Large searches keep cursors. A commit reserves its bounded footprint before it runs. Unfinished work stays queued; there is no terminal 32-step or 160-cell cutoff.
  - It is separate from D2's water budget, and neither claims the whole host tick.
- Wet collapse. A collapse waits when its footprint touches fluid (source pore water, the descent path, landing displacement, newly connected openings) or its fluid state is unknown.
  - It waits for the D2 NAT.03.02 runtime cutover (lane-ec, lane-ec2) plus NAT.03.03 water return (lane-eb).
  - That work is NAT.02.01.WET (lane-fk, the fluid adapter), with its owner hooks in CELL (lane-fq, participant.js) and S-CORE (lane-fr, collapse.js). BRIDGE part 6 (lane-fs) makes it live in DEUS_Structural.js.
  - Wet candidates stay queued with their blocking dependency and revision and are retried, never dropped.
- Levels: no collapse lane edits `game/js/plugins/DEUS_Levels.js`. CELL (WG.CELL-WRITE) owns it (G02 section 3). Collapse submits through the CELL transaction, `Levels.commitMatterBatch`, and the hole fix belongs to CELL (lane-dw).
- This lane is pure and reads no fluid. rooted.js charges each member, bearing and lateral-path visit to Bs through its ops counter (::rooted_ops_counted).
- Support rule (merged): a vertical contact counts only through a certified path to a real foundation. Otherwise the member needs a cardinal lateral path to a vertically bearing anchor within the material's span, with distance measured to the anchor. Paths are deterministic and cycle-free.
- Merged NAT.02.01 tests carried here:
  - Test 1 (rotated cantilevers agree; disconnected support cycles fail): ::rooted_rotation_invariant and ::rooted_floating_ring_fails.
  - The fail-closed half of test 3: ::rooted_unknown_is_pending and the unknown_as_air mutant.
- Out of the program: soil runtime and rubble-to-sediment (DEC-057); fire, seasons, migration, rare geological events and structure decay (DEC-059). Frozen decay (`decay.breakElement`) is neither a collapse authority nor a prerequisite.

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 row en (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_merged_chatgpt_pro.md`, sections 3.2 (physical addresses and support) and 4 (NAT.02.01) (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_chatgpt_pro.md`, sections 1 and 2 (voice 1; background only, the merged D3 wins where they differ).
- `C:/Users/snewt/OneDrive/Desktop/UF/tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md`.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- Catalogue spans: granite and limestone stay in pure fixture readers (critic).
- Must-fail list (G02 section 2): the absence check plus the named negative controls above. This adopts Grok's wording correction without treating an import failure as proof.

## Writer and reviewer

- Writer `claude` (family claude), reviewer `grok` (family grok). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row en. Claude stays on D3 lanes; G02 section 3 removes Claude only from D1 lanes.
  - DEC-031 item 1.
  - DEC-058 (AG swarms the lanes, with writers and reviewers from different families).

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
- Commit only on `task/lane-en`, with subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."
- Risk 8 (part): "PM actions on main: ... reopen NAT.02.01 and PKG-02 (its gate tools/test_structural_support.js does not exist and the pkg2 proof uses a fake ledger)". The fake ledger is the caller-built `const ledger = { solid: 50000, rubble: 0 };` at `tools/test_package_proofs_ingame.js:84` (main e6b221a3).

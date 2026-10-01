Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **el** ("GO — amended"), with the el row of section 4. This amended brief replaces the plan's original lane-el brief (2026-09-30) as the dispatch contract.

# lane-el: Retire NaturalConnections' private water store

| Field | Value |
|---|---|
| WBS | NAT.03.02 (fluid writer audit) |
| taskId (manifest) | NAT.03.02 |
| Branch | `task/lane-el` |
| Manifest | `tasks/NAT.03.02/lane-el/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> gemini (retained, G02 section 2) |
| Size | S |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Dependencies | none |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row el, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. This brief and `lane.json` are on main as written, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

G02's other el precondition, "the current authoritative passage-flow path exercised at the lane base", cannot be recorded before the lane starts, because the check that exercises it is new and this lane writes it. It is the lane's first step (next section).

## First step: exercise the authoritative passage-flow path at the base

Do this before any change to `game/js/plugins/DEUS_NaturalConnections.js`.

1. Write `tools/test_natural_connections_no_mint.js::authoritative_flow_conserved` (defined under Tests).
2. Run it on the unchanged lane base. Save its real output as `tasks/NAT.03.02/lane-el/evidence/base_authoritative_flow.txt`, and commit the test and that output as the lane's first commit.
3. It is a guard: it must pass at the base and at the tip.
4. If it fails at the base, stop. A base failure means UF.Fluid does not move water through a natural passage at the base, and making the check pass would need Fluid-core edits, which G02 excludes from this lane. Make no Fluid edit and no other change to make it pass. Write down what is known and what is ruled out, and escalate to the PM (AGENTS.md Rule 10).

## Goal

DEUS_NaturalConnections.js stops creating water, and natural passages move water only through UF.Fluid. G02 says to perform this retirement now. A legacy private payload found in a save is kept inert and unchanged. Creatures keep stepping through passages.

## Scope

- Manifest `tasks/NAT.03.02/lane-el/lane.json`, branch `task/lane-el`, writer claude, reviewer gemini. gateTests are the gate commands below.
- Remove the active private simulation and store API from `DEUS_NaturalConnections.js`:
  - fluidsState as a live store; hasFluid, addFluid, clearFluids and updateFluids (289-369), and their entries in the exported API object (475);
  - the waterAt wrapper (490-496);
  - the `updateFluids()` call in the `Graphics.frameCount % 30 === 0` block of `Scene_Map.prototype.update` (517-520). Keep `stepCreatures()` in that block: creature stepping through passages stays (creature traversal is out of scope).

  Line numbers are from main e6b221a3 (the same code as a3b2c3ed); re-locate them at your base.
- Callers of the retired API, all inside this lane's allowed files:
  - `dry()` (line 53) reads `hasFluid(r, "water")`. Switch it to `isWater(r)`.
  - isWater reads Levels.waterAt and UF.Fluid, never the private store.
  - The in-game `natural_connections` suite in `DEUS_NaturalConnections.js` (603-608): `liquid_present_at_entrance` and `liquid_flow_through_connection` call `API.addFluid`, `API.hasFluid`, `API.updateFluids` and `API.clearFluids`. Rewrite both against UF.Fluid and keep their names: put water at the upper entrance through UF.Fluid, step UF.Fluid, and check that water reached the lower landing through UF.Fluid, with the source's debit equal to the landing's credit. Remove the test water through UF.Fluid afterwards. No call to the retired API remains.
  - `tools/test_natural_connections.js` (added to allowedPaths and to the gate). It passes 25 of 25 at a3b2c3ed (the PM's snapshot run, 2026-10-01), although `tools/ops/quarantine.json:538` still lists it as FAIL_API_DRIFT; that entry was measured on 2026-09-26 at 425b594c and is stale. merge_gate's own quarantine list (`tools/ops/gate_tests.json`) does not name it, so the gate runs it. Two of its checks call the retired API:
    - `liquid_makes_landing_wet_refusing_travel` (239-245): wet the landing through the fixture's authoritative water instead of `N.addFluid`: the fixture's `Levels.waterAt` (line 84), fed by its `wet` set or its baseline `water` array, or UF.Fluid if the fixture loads it. Travel must still be refused, with a reason that matches /landing/.
    - `liquid_physics_flow` (230-238): remove it. Its job moves to `::authoritative_flow_conserved` in the new file, which drives the real UF.Fluid. This file's fixture does not load UF.Fluid.

    Every other check in the file stays as it is and passes at the tip. Updating the stale quarantine entry is not this lane's work (`tools/ops/quarantine.json` is not in allowedPaths); the PM records it.
- **Legacy payload policy** (G02 section 2; this replaces "saved fluids ignored"):
  - The legacy private payload (`ufWorld.naturalConnections.fluids`) is retained inert and unchanged.
  - It is never queried as water or credited into authority.
  - Ambiguous conversion belongs to the existing migration owner: lane-ec2 (NAT.03.02 runtime cutover, part b: the fluid save codec, which owns legacy hydro stores and ambiguous saves; wave 8 in the current plan). lane-ec2's brief does not yet name this payload; the PM adds it there before lane-ec2 starts.

  So a saved private payload is carried through load and save unchanged. isWater never reads it, and nothing credits it into UF.Fluid.
- No Fluid-core edits and no new migration subsystem enter this lane (G02 section 2).

## Out of scope

- Passage geometry
- Creature traversal (beyond keeping the existing `stepCreatures()` call where it is)
- Converting the legacy private payload into authority water (lane-ec2)
- Any edit to the Fluid core
- `tools/ops/quarantine.json`

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/plugins/DEUS_NaturalConnections.js`
- `tools/test_natural_connections_no_mint.js`
- `tools/test_natural_connections.js`
- `docs/systems/DEUS_NaturalConnections.md`
- `tasks/NAT.03.02/lane-el/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- No file here is shared with another lane.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

### Must fail before / pass after

These are the tests G02 section 2 says must be shown for el. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change)

- NEW `tools/test_natural_connections_no_mint.js::link_does_not_mint`: FAILS on main.
- `tools/test_natural_connections_no_mint.js::waterAt_not_wrapped`: FAILS on main.

#### Under mutants at the tip (each must make its named check exit 1)

- `disable_all_flow` (no water moves through passages): turns red `::authoritative_flow_conserved` (G02 section 2).
- `credit_legacy_payload` (on load, the cells of the legacy private payload are credited into UF.Fluid, or isWater reads them): turns red `::legacy_payload_round_trip`.
- `drop_legacy_payload` (load or save deletes or rewrites `ufWorld.naturalConnections.fluids`): turns red `::legacy_payload_round_trip`.
- `drop_step_creatures` (the frame-30 block no longer calls `stepCreatures()`): turns red `::creatures_still_stepped`.

#### Legacy round-trip (pass at the tip; show it able to fail, Rule 4)

- `tools/test_natural_connections_no_mint.js::legacy_payload_round_trip`. A save that holds the legacy private fluids payload loads and saves again with these results:
  - the payload is unchanged and inert: isWater does not read it, and it is not credited into UF.Fluid;
  - authoritative water is unchanged.

  `credit_legacy_payload` and `drop_legacy_payload` must each make it fail (above).

### Guards (pass before and after)

- `tools/test_natural_connections_no_mint.js::authoritative_flow_conserved`. A natural passage connects a water source to a dry destination. The test steps UF.Fluid directly (it does not run `Scene_Map.update`, so the private frame-30 tick plays no part) and shows that the source's debit equals the destination's credit through the existing authority (UF.Fluid), in its current units. Its base run is the lane's first step; if it fails at the base, the lane stops (see "First step"). `disable_all_flow` must make it fail.
- `tools/test_natural_connections_no_mint.js::creatures_still_stepped`. With a creature (`data.kind` "creature", no job, no goal, no recent traverse) standing on a passage entrance whose landing is free, one `Scene_Map.prototype.update` call at a frame where `Graphics.frameCount % 30 === 0` moves it to the landing's z. This shows `stepCreatures()` still runs from the frame-30 block. The existing `creature_traversal` (in-game suite) and `universal_creature_traversal` (`tools/test_natural_connections.js`) call `traverse()` directly, so they do not cover the frame-30 path. They stay green but do not replace this guard. `drop_step_creatures` must make it fail.

### Other named checks (pass at the tip)

- `tools/test_natural_connections_no_mint.js::private_store_gone`. There is no active private simulation or store API: `UF.NaturalConnections` has no hasFluid, addFluid, clearFluids or updateFluids, and `Scene_Map.update` makes no updateFluids call. A frame-30 `Scene_Map.update` changes no fluid state and emits no `naturalConnections:fluidFlow` or `fluids:flow` event. The frame-30 block itself stays, because it still steps creatures (`::creatures_still_stepped`). This check does not require destroying preserved legacy evidence; the inert payload of `::legacy_payload_round_trip` stays (G02 section 2).
- `tools/test_natural_connections.js`: every check passes, with `liquid_makes_landing_wet_refusing_travel` rewritten and `liquid_physics_flow` removed (Scope).
- In-game suite `natural_connections`: `liquid_present_at_entrance` and `liquid_flow_through_connection` rewritten against UF.Fluid (Scope); every check passes (F5 evidence).

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/test_natural_connections_no_mint.js`
- `node tools/test_natural_connections.js`
- `node tools/check_deus_syntax.js`

## F5 evidence

`--suite natural_connections` PASSes, including the two rewritten liquid checks. Take a screenshot of a link with no water minted below it, open it, and describe it.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- None.
- Lanes that depend on this one: lane-em (w18).

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 row el (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md`, sections 3.2 and 3.6.
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md` DEC-040.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- The private store is disabled rather than counted: Fluid already moves water through passages. The positive check above proves it, and the lane stops if it does not hold at the base.
- Saved legacy payload: retained inert and unchanged, never queried as water or credited into authority. Ambiguous conversion belongs to the existing migration owner, lane-ec2 (G02 section 2).
- `private_store_gone` means no active private simulation or store API. It does not mean destroying preserved legacy evidence, and it does not remove creature stepping.

## Writer and reviewer

- Writer `claude` (family claude), reviewer `gemini` (family gemini). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row el. Claude stays on D2 lanes; G02 section 3 removes Claude only from D1 lanes.
  - DEC-031 item 1.
  - DEC-058.
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/NAT.03.02/lane-el/review_gemini_<sha8>.md`, has subject `[gemini] NAT.03.02 review <sha8>`, and holds exactly one VERDICT line.

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
- Commit only on `task/lane-el`, with subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

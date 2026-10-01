Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **ex** ("GO — amended"), with the ex row of section 4. This amended brief replaces the plan's original lane-ex brief (2026-09-30) as the dispatch contract.

# lane-ex: Bestiary adaptation layer: 317 SRD creatures as DEUS rows

| Field | Value |
|---|---|
| WBS | NAT.07.01. This is the existing PKG-07 leaf, re-scoped by DEC-057 to the bestiary adaptation layer; the PM unlocks PKG-07. |
| taskId (manifest) | NAT.07.01 |
| Branch | `task/lane-ex` |
| Manifest | `tasks/NAT.07.01/lane-ex/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> gemini (retained, G02 section 2) |
| Size | M |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Dependencies | none |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row ex, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. PKG-07 is unlocked (it was DEPENDENCY_LOCKED), and NAT.07.01's seeded-adaptation scope (DEC-057) is recorded.
3. The adopted bestiary source and its hash are pinned, and the PM confirms them before ex writes its generated output.
   - The named adopted source is `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/BESTIARY_grok_heavy.md`.
   - For information only: this amendment read that file as 46,217 B with sha256 `c6f9d41853f29ecd83b4ffa5cbd26b17d6a1e67f3445bfde29b843c41e740914`. The hash the PM confirms governs.
   - If the file at dispatch does not match the pinned hash, stop and ask the PM.
4. This brief and `lane.json` are on main as written, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

The DEC-053 question about the 14 rows the source does not place in a FAMILY/BAND cell (Scope) is not a precondition. It does not hold the lane's start or its output.

## Goal

Each of the 317 SRD creatures has exactly one adaptation row, generated from the pinned bestiary. The source and the output correspond one to one, and srd51 is untouched.

## Scope

- Manifest `tasks/NAT.07.01/lane-ex/lane.json`, branch `task/lane-ex`, writer claude, reviewer gemini. gateTests are the gate commands below.
- Copy the named adopted source, `BESTIARY_grok_heavy.md`, verbatim to `docs/design/bestiary/`, with a `SOURCE.json` that records its sha256. Keep that source. Do not silently substitute another advisory draft; `BESTIARY_chatgpt_pro.md` in the same folder, for example, is not a substitute.
- NEW `tools/bestiary/build_bestiary.js` -> `game/data/srd_adaptation/creatures.json` (`--check`).
- **Exact source-ID/output-ID bijection** (G02 section 2): every source creature ID maps to exactly one output row ID, and every output row ID to exactly one source ID. There are no duplicates and no omissions. This proves the existing "exactly one" promise; it adds no bestiary design.
- Fields include bodies[] from species_map.js, and the placement rules. Write `docs/systems/DEUS_Bestiary.md` (CC-BY-4.0).
- **Build from the 317 rows of the pinned source.** Its sections A to C are not inputs:
  - Occupancy is counted from the rows. Section A (the occupancy grid) has one wrong cell: COLD/Deep Earth T1 says 2, and the rows give 3 (the PM's check, 2026-10-01). A check against section A cannot pass.
  - Section B (the wildlife map) is advisory. bodies[] and the wildlife mapping come from the live `game/js/sim/rules/species_map.js`. Section B differs from it on 4 of its 23 species (fowl, wildcat, sand_stalker, ice_wraith); those differences are recorded in `docs/systems/DEUS_Bestiary.md`, not applied.
- **EXCLUDE rows stay one row each**, with role EXCLUDE and no cell, as the pinned source has them. So does `srd:creature:solar`, whose only home is the Sky. The DEC-053 question about these 14 rows (DEC-053 item 1 and DEC-050 item 3 put every SRD creature in the world's cells) goes to the Owner and the PM. Any answer arrives later as a versioned revision of the source: a new pinned file and hash, and a new build. It is not made in this lane, and it adds no bestiary design here (G02 section 2).
- **World name.** The world is Emerys (DEC-054). The pinned source says "Emrys" in five places: the notes of couatl, half-red-dragon-veteran, androsphinx and gynosphinx (source lines 21, 125, 186 and 187) and recommendation C2 (line 361). The pinned copy in `docs/design/bestiary/` stays verbatim, because it is a source record. Source notes are not player-facing text. The generated `creatures.json` contains no "Emrys": the builder either leaves a note out of the output or writes the world name as "Emerys".

## Out of scope

- srd51 and srd5_1 edits.
- Re-auditing unchanged upstream SRD content. Verifying the generated adaptation is required (G02 section 2; this replaces the original blanket "Verification" exclusion).
- Art rows (lane-fl).
- species_map.js.

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `docs/design/bestiary/**`
- `tools/bestiary/build_bestiary.js`
- `game/data/srd_adaptation/creatures.json`
- `docs/systems/DEUS_Bestiary.md`
- `tools/test_bestiary_adaptation.js`
- `tasks/NAT.07.01/lane-ex/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- No file here is shared with another lane.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

### Must fail before / pass after

These are the tests G02 section 2 says must be shown failing for ex. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change)

`tools/test_bestiary_adaptation.js` is new, so every check below FAILS at the lane base.

- `::row_count_317`
- `::source_output_bijection`: the NEW identity check. Every source ID maps to exactly one output ID and back.
- `::tier_from_cr`, `::cells_valid`, `::exclude_empty`, `::occupancy_matches_source`, `::placement_rules`, `::bodies_consistent`, `::build_reproducible`. These are the retained tier, cell, occupancy, body, placement and reproducibility checks. Two of them are defined exactly:
  - `::exclude_empty`: every EXCLUDE row has no cell, and every other row has at least one cell (a FAMILY/BAND cell or the Sky). This is the check as the pinned source stands; it changes only with a versioned source revision.
  - `::occupancy_matches_source`: the output's occupancy per FAMILY/BAND cell and tier, and on the Sky line, equals the occupancy counted from the 317 source rows. It never compares against the source's section A.

#### Under mutants at the tip (each must turn its named check red, exit 1)

- `dup_plus_omit`: one row is duplicated and another omitted, so the output still has 317 rows. It must fail `::source_output_bijection` (G02 section 2). `::row_count_317` alone cannot catch it.
- `srd51_edit`: must fail the unchanged-source guard `::srd51_untouched` (G02 section 2).
- `tier_shift`: turns red `::tier_from_cr`.
- `drop_row`: turns red `::row_count_317` and `::source_output_bijection`.
- `bad_cell`: turns red `::cells_valid`.
- `hand_edit`: turns red `::build_reproducible`, and makes `build_bestiary.js --check` exit 1.

### Guards (pass before and after)

- `tools/test_bestiary_adaptation.js::srd51_untouched`: the unchanged-source guard. G02 section 2 moved it here from the must-fail list. `srd51_edit` must make it fail (above).

### Other named checks (pass at the tip)

- `tools/test_bestiary_adaptation.js::no_old_world_name`: no string in `game/data/srd_adaptation/creatures.json` contains "Emrys" (DEC-054). A build that copies the five source notes verbatim must make it fail; show that once in the evidence (Rule 4).

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_bestiary_adaptation.js`
- `node tools/bestiary/build_bestiary.js --check`

## F5 evidence

None.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- None.
- Lanes that depend on this one: lane-fd (w2), lane-fl (w5). After the G02 folds, lane-fl depends on lane-dp and lane-ex.

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 row ex (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/BESTIARY_grok_heavy.md` (the named adopted source).
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md` DEC-050, DEC-053, DEC-057.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- The C1-C10 braintrust recommendations are adopted. NAT.07.01 is reused and re-scoped (critic).
- Verification boundary (G02 section 2): "Re-auditing unchanged upstream SRD content is excluded; verifying the generated adaptation is required."
- The adopted source stays `BESTIARY_grok_heavy.md` at its pinned hash.
- The 13 EXCLUDE rows and `solar` are built as the source has them. The DEC-053 question about them is for the Owner and the PM, and any change comes later as a versioned source revision; there is no `OVERRIDES.json` in this lane.
- Inputs: the 317 rows, never sections A or B; bodies[] from the live species_map.js.

## Writer and reviewer

- Writer `claude` (family claude), reviewer `gemini` (family gemini). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row ex. Claude stays on the bestiary lane; G02 section 3 removes Claude only from D1 lanes.
  - DEC-031 item 1.
  - DEC-058.
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/NAT.07.01/lane-ex/review_gemini_<sha8>.md`, has subject `[gemini] NAT.07.01 review <sha8>`, and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`. Its data file (`game/data/srd_adaptation/creatures.json`) sits in a subfolder of `game/data/`, which the editor does not load or save.

## Rules that bind this lane

- The engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS. Show each named check failing without the change (Rule 4).
- No full-world scans per frame. Use indexes, dirty sets and the shared tick (Rule 14).
- If two fixes fail on the same problem, stop. Write down what is known and what is ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred. Creatures, flora and fauna are placed by seeded rules per biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); lanes write rows and cards only. The PM chooses what goes in game (DEC-056). Art uses PixelLab-native forms (DEC-055) and starts static (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-ex`, with subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

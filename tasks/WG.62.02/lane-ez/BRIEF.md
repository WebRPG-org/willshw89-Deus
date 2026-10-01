Binding source: `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 (FINAL WAVE 1), row **ez** ("GO — amended"), with the WG.62.02 collision resolution in section 3 and the ez rows of section 4. This amended brief replaces the plan's original lane-ez brief (2026-09-30) as the dispatch contract.

# lane-ez: Race start solver (pure) on the merged D4

| Field | Value |
|---|---|
| WBS | WG.62.02: the existing "Race Home-Layer Assignment in WorldGen" leaf. G02 section 3 preserves WG.62.02 for race starts. Merged D1's "WG.62.02" band-stone milestone maps to WG.00.30, not here. |
| taskId (manifest) | WG.62.02 |
| Branch | `task/lane-ez` |
| Manifest | `tasks/WG.62.02/lane-ez/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | grok -> gemini (retained, G02 section 2) |
| Size | M |
| Wave | 1 (G02 section 1: the revised plan's lane and wave totals are not yet validated, so no "of N" is given) |
| Dependencies | none |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by G02. That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` after `task/lane-cu` (OPS.PRUNE.06) merges. It had not merged when this amendment was written (main a3b2c3ed). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4).

## Preconditions (G02 section 2 row ez, section 4)

The lane does not start until each of these is recorded on main. A missing precondition holds this lane only, not unrelated wave-1 lanes. This amendment does not check any of them.

1. Post-cu base: `task/lane-cu` is merged through the existing merge_gate, and the required paths are verified on that base.
2. `docs/CANONICAL_ROLES.md` is synchronized under the existing Owner authorization, so a grok writer may write production code under `game/js/sim/starts/`. If the sync is not recorded, the lane waits. It is not re-manifested to another writer: G02 section 2 fixes grok -> gemini.
3. **WG.62.02 remains the existing race-start leaf.** The ID crosswalk is published and the live registry checked: sparse save WG.00.43, race starts WG.62.02, D1 band milestone WG.00.30.
4. This brief and `lane.json` are on main as written, and the manifest validates: task path, allowedPaths, reviewer-family separation, required negative controls, and current file ownership.

## Goal

A pure seeded solver places nine starts, one per map on merged D4's fixed lattice, each inside its race's merged home range. Placement is farthest-point with a z weight and an anti-border shift. If the ratio is still below 0.65 after four shift passes, the solver accepts the layout and logs home_band_degraded. Every z it reads and every position it accepts lies inside the world range and passes validation.

## Scope

- Manifest `tasks/WG.62.02/lane-ez/lane.json`, branch `task/lane-ez`, writer grok, reviewer gemini. gateTests are the gate commands below.
- NEW `game/data/worldgen/race_starts.json`. Map coordinates are [col,row], converted from D4's (row,col) table:

  | Race | Family | Home range | Centre | Map |
  |---|---|---|---|---|
  | dragonborn | VOLCANIC | [-15,-11] | -13 | [0,0] |
  | tiefling | WILD | [-4,0] | -2 | [1,0] |
  | dwarf | COLD | [-10,-5] | -8 | [2,0] |
  | gnome | WET | [-8,-4] | -5 | [0,1] |
  | half-elf | WET | [-2,+3] | 0 | [1,1] |
  | half-orc | ARID | [-1,+3] | +1 | [2,1] |
  | halfling | TEMPERATE | [+2,+6] | +5 | [0,2] |
  | human | TEMPERATE | [0,+4] | +3 | [1,2] |
  | elf | TEMPERATE | [+5,+10] | +8 | [2,2] |

  Order deepest first. Candidates 1024. The metric is d2 = dx2 + dy2 + (2dz)2 on the torus. ratioTarget 0.65. Shift 32 cells x 4 passes.
- NEW `sim/starts/place_starts.js`:
  - The first race goes at its map's standable centre at -13.
  - For each race, 1024 candidates are drawn at the home band, with z weighted to the centre (PM default), and filtered by walkableAt, familyAt and the water rules.
  - Maximin score. Tie-breaks in order: band centre, family cell, lowest |z - centre|, then a per-race PRNG (seed ^ race_salt).
- Equidistance: if the ratio is below 0.65, shift the start of the worst pair up to 32 cells away from their shared border, for up to 4 passes. Then accept and log home_band_degraded.
- **Range and validation (G02 section 2):**
  - **Validate -13 before reader access.** Keep the shipped -13 preference for the first (deepest) race, but check -13 against the world range [zMin, zMax] before the reader is asked for it. The solver never reads a z outside the world range.
  - **Clip to the world range.** At -4..+4, or any range that cuts a home interval, clip each home interval to the world range. An interval that lies entirely outside the range degrades to the nearest permitted boundary and logs home_band_degraded. At -4..+4, dragonborn [-15,-11] degrades to -4.
  - **Validate every accepted shift and fallback** for its assigned map, world bounds, standability and water rules. A shift or fallback that fails validation is not accepted.
  - **Relax in the documented order only.** Family and home preference are relaxed only in this order: relax family, then relax z by +/-1, then use the map's standable centre at home z (degraded).
  - **Underground failure still throws.** worldgen_infeasible is thrown when no permitted standable candidate exists for an underground home. Lane-fn makes that unreachable on generated worlds.
  - **Above-ground homes** (halfling, elf) use the highest standable surface in the map within or below the range, logged home_band_degraded (PM ruling).
  - **Low ratio still accepts with degradation** after the bounded passes.
- Distance ops are at most 100,000. NEW `docs/systems/DEUS_RaceStarts.md`.

These amendments close an explicit range and fallback ambiguity. They do not change D4's algorithm (G02 section 2).

## Out of scope

- New Game wiring
- Reachability
- Founders and relations
- Ally hearth link

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/starts/place_starts.js`
- `game/data/worldgen/race_starts.json`
- `docs/systems/DEUS_RaceStarts.md`
- `tools/test_race_starts.js`
- `tasks/WG.62.02/lane-ez/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `docs/systems/DEUS_RaceStarts.md`: lane-ez is the first writer, before lane-fn (w12), lane-fb (w17) and lane-fh (w18).

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

## Tests

### Must fail before / pass after

These are the tests G02 section 2 says must be shown failing for ez. Each passes at the tip without mutants. Copy the real output into the evidence (AGENTS.md Rule 4).

#### At the lane base (before the change)

`tools/test_race_starts.js` is new, so every check below FAILS at the lane base.

Retained lattice, determinism, ratio and fallback tests:

- `::nine_starts`
- `::fixed_map_assignment` (merged D4 lattice)
- `::ratio_065_all_walkable` (20 seeds; D4 T2)
- `::low_ratio_accepts_degraded` (patterned fixture: degraded is logged, nothing is thrown)
- `::shift_passes_bounded`, `::home_band`, `::no_sky`
- `::determinism` (reference re-implementation; 100 runs)
- `::failsafe_family`, `::failsafe_z`, `::failsafe_centre`, `::infeasible_throws_underground_only`, `::elevated_home_degrades`
- `::order_deepest_first`, `::cost_bound`, `::zrange_clip`. For zrange_clip, a home interval entirely outside -4..+4 degrades to the nearest permitted boundary.

New fixtures (G02 section 2):

- `::shift_blocked_rejected` (blocked-shift fixture). Every candidate shift would land off the assigned map, outside world bounds, on unstandable ground, or against the water rules. No such shift is accepted, the start keeps a validated position, and the degradation is logged.
- `::reader_range_respected` (out-of-range-reader fixture). The reader throws on any z outside the world range. At -4..+4 the solver never reads -13 or any clipped-out z, and the dragonborn start degrades to -4.

#### Under mutants at the tip (each must turn its named check red, exit 1)

- `bypass_validation`: an accepted shift or fallback skips the map, bounds, standability and water validation. Turns red `::shift_blocked_rejected` (G02 section 2).
- `hardcode_minus13`: the first race is read at -13 without the range check. Turns red `::reader_range_respected` and `::zrange_clip` (G02 section 2).
- `throw_on_low_ratio`: still required to fail. Turns red `::low_ratio_accepts_degraded` (G02 section 2).
- Retained from the original brief: `no_wrap`, `no_z_weight`, `shallow_first`, `no_shift`. Each must turn red the check it targets.

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- (none)

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/test_race_starts.js`
- `node tools/check_deus_syntax.js`

## F5 evidence

None; this is wired in lane-fb.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- None.
- Lanes that depend on this one: lane-fb (w17), lane-fn (w12). G02 section 1 keeps fh separate from fb; the shared race-start leaf is not complete until lane-fh passes.

## Design references

- `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, section 2 row ez and the WG.62.02 collision resolution in section 3 (binding).
- `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D4_merged_minimax_m3.md`, sections 2, 3 and 7.
- `C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md` DEC-013, DEC-030, DEC-050, DEC-058.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled

- Merged D4 replaces voice 1 (critic).
- The elevated-home fail-safe is a PM ruling (flagged).
- WG.62.02 is reused for race starts. Its collision with merged D1's "WG.62.02" is resolved by mapping the D1 band milestone to WG.00.30 (G02 section 3).
- The -13 preference stays and is validated before reader access. Home intervals are clipped to the world range (G02 section 2).

## Writer and reviewer

- Writer `grok` (family grok), reviewer `gemini` (family gemini). The families differ, as merge_gate requires: it refuses a review tag from the writer's family with REVIEW_SAME_FAMILY, and it treats claude and fable as one family.
- Authority:
  - G02 section 2, row ez.
  - DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code).
  - DEC-058.
  - The CANONICAL_ROLES.md sync is precondition 2. The original brief's Claude-writer fallback is withdrawn.
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/WG.62.02/lane-ez/review_gemini_<sha8>.md`, has subject `[gemini] WG.62.02 review <sha8>`, and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`. Its data file (`game/data/worldgen/race_starts.json`) sits in a subfolder of `game/data/`, which the editor does not load or save.

## Rules that bind this lane

- The engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS. Show each named check failing without the change (Rule 4).
- No full-world scans per frame. Use indexes, dirty sets and the shared tick (Rule 14).
- If two fixes fail on the same problem, stop. Write down what is known and what is ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred. Creatures, flora and fauna are placed by seeded rules per biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); lanes write rows and cards only. The PM chooses what goes in game (DEC-056). Art uses PixelLab-native forms (DEC-055) and starts static (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-ez`, with subject tag `[grok]`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 amends the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 1: "task/lane-cu (OPS.PRUNE.06 ...) must merge before wave 1. It renames UF_Levels/World/WorldGen/Factions/Wildlife/NaturalConnections/Test.md to DEUS_*.md, archives DEUS_VerticalBiomes.md to docs/archive/systems/, and edits docs/ASSET_REQUESTS.md. Every path in this plan already uses the DEUS_* names." On 2026-10-01, `origin/task/lane-cu` is at `66abee3e`.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."

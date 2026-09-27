# OPS.70.01 lane-as report

Writer: grok. Reviewer: gemini (not this lane). Branch: `task/lane-as`. No art was generated, drawn, edited, or integrated.

The checker does not decide a stale row. Rows that conflict with a later Owner decision are `SUPERSEDED-PENDING-OWNER` and are skipped. Process, review, and visual rows with no closed tree check are `NOT-MECHANICAL`. Exit 0 means every active row is `PASS`.

## What changed

- `tools/governance/check_invariants.js` reads `docs/INVARIANT_REGISTRY.md` and prints one row per invariant. `--root` selects the tree. The registry stays the copy beside the script unless `--registry` is set, so a fixture root does not need its own copy. `--only` runs one row. `--json` prints the same rows as JSON. Exit 0 / 1 / 2 as in the script header.
- `tools/governance/test_check_invariants.js` requires the real tree to pass, requires every active check to `FAIL` on its mutant under `tools/governance/fixtures/invariants/<ID>/` with a `defect:` detail, and requires a registry the catalogue does not match to exit 1.
- `tools/ops/gate_tests.json` was not edited.

Active checks (9), all `PASS` on this tree:

| ID | What the check holds on this tree | What the mutant breaks |
|---|---|---|
| INV-CORE-01 | `game/js/main.js`, `game/js/rmmz_*.js`, and text files under `game/js/libs/` contain neither `DEUS_` nor `window.UF` nor `UF.` | `rmmz_core.js` defines `DEUS_planted` |
| INV-GEO-03 | `M_AIR` is 0, water and lava are other fluid ids, and `continuousAirHeight` / `airRunAt` stop on any byte that is not `M_AIR` | clearance stops only on a solid byte |
| INV-GEO-04 | the carve flood from bedrock and the area edge deletes unconnected solid with `setE` to `M_AIR` | that deletion is gone |
| INV-FLD-02 | over-capacity fluid is moved (`excess -= move`) and `tools/test_strata_fluid_reconciliation.js` exits 0 | the move is gone and the suite exits 1 |
| INV-FLD-03 | shafts, skylights, and cuts return before carving a column that has `FLUID_B` set | the shaft guard is gone |
| INV-SIM-01 | `Window_NewGameSetup.initialize` sets `this._year = 0`, and `Game_UFTime` uses 0 when no setup year is set | the default year is 1 |
| INV-SIM-03 | `game/js/sim/ledger.js` refuses `register` after `seal`, moves one amount inside one family, balances recipes, and checks closure | the transform credits the output only |
| INV-GOV-02 | `check_claims.js` rule 4.4 refuses a frozen path and a path outside the committer's whitelist | the outside-whitelist refusal is gone |
| INV-GOV-05 | `check_claims.js` rule 4.1 accepts a closure only with a reachable commit or a passing test log | evidence is forced true |

`INV-GEO-03`, `INV-GEO-04`, and `INV-FLD-03` are static scans of the code the registry cites inside `DEUS_Levels.js`. `tools/test_strata_cuts_and_caves.js` is already on the GATE list and was not spawned again from this checker. `INV-FLD-02` does run its cited suite. On this machine that suite, including its five internal mutants, took 137824 ms inside the checker run below.

`INV-CORE-01` covers the read-only sentence. `tools/verify_engine_read_only.js` is cited by the registry and is not in the tree. The residence sentence (all DEUS logic in `game/js/plugins/DEUS_*.js`) is an open Owner question below, because `game/js/sim/` and `UF_*.js` exist and DEC-012 adopts plain sim modules.

## Open Owner questions

These are listed and not answered.

1. **INV-GEO-01.** Which cell geometry binds? The registry says five 1 ft strata in a 5 ft cube. DEC-013 D-2 and merged WG.00.17 say five 2 ft slices in a 10 ft layer, and DEC-013 sets 32 Z layers.
2. **INV-GEO-02.** Which vertical partition binds? The registry says five macro-Z levels, Z-2, Z-1, Z0, Z+1, Z+2. DEC-013 and merged WG.00.17 say 32 Z layers, default `zMin -16` and `zMax 15`. DEC-013 still marks the coordinate split OPEN.
3. **INV-GEO-05.** Do the fixed pixel offset per stratum (DEC-019) and the RMMZ top-down 3/4 view (`docs/art/DEUS_ASSET_STANDARD.md` AS-TERR-001) replace the registry row that retires 2.5D height offsets and states a flat chibi perspective?
4. **INV-FLD-01.** Do the five fluid depth states map onto 1 ft strata, as the registry says, or onto 2 ft slices, as DEC-013 D-2 says?
5. **INV-ART-01.** Which generator rule binds? The registry says Nano Banana Pro (`gemini-3-pro-image`) only. AS-GEN-004 and AS-GEN-005 (`docs/art/DEUS_ASSET_STANDARD.md`, mirrored in `game/data/UF_AssetStandard.json`) say PixelLab is primary, Retro Diffusion is standby, and Nano Banana Pro is concepts only. DEC-007 also suspends generation.
6. **INV-ART-03.** Do character sheets stay on the registry's 3x4 layout (3 Down, 3 Left, 3 Right, 3 Up), or do character map sprites follow the eight-direction PixelLab ruling AS-CHMAP-001 (`game/data/UF_AssetStandard.json` item 43)?
7. **INV-ART-05.** DEC-007 suspends every autonomous-generation mandate, including AGENTS.md Rules 11 and 13, until the Owner rewrites them. Does the living-exclusion sentence remain binding on its own under that freeze, or is the whole row suspended with those rules?
8. **INV-GOV-01.** Who may integrate into `main`? The registry says Gemini / Antigravity alone. Owner directive 0028-AC, recorded in `docs/worldgen/DEUS_WORLDGEN_WBS.md` revision 24 and `tools/governance/README.md`, says the PM launches workers and merges.
9. **INV-SIM-02.** `UF_Time.schedule` uses `opts.domain || "engine"`, and `UF.Time.after(ticks, fn)` schedules a naked engine timer. Does that violate the invariant, or is the legacy path still allowed? `UF_Time.js` is outside this lane, so the row is `NOT-MECHANICAL` until that is answered.
10. **INV-CORE-01, residence sentence.** DEC-012 places the simulation in plain modules (`game/js/sim/`). `UF_*.js` plugins also exist. Does that supersede "all DEUS logic resides in `game/js/plugins/DEUS_*.js`" while the read-only engine sentence remains?

## PROPOSED-AS-01

Append these two strings to the `gate` array in `tools/ops/gate_tests.json`, in this order, after review. This lane did not edit that file.

```json
"tools/governance/test_check_invariants.js",
"tools/governance/check_invariants.js"
```

`test_check_invariants.js` already runs the checker once, including the cited fluid suite (about 138 s here). The second entry repeats that tree pass. Both match `tasks/OPS.70.01/lane-as/lane.json`.

## PROPOSED-AS-02

After the Owner answers question 9, a follow-up can turn INV-SIM-02 into an active check. Until then a domain-required scan would reject `game/js/plugins/UF_Time.js`, which this lane cannot edit.

## Gate output

Commands were run in this worktree after the checker text that this report describes was saved, and before the commit that adds this report. Exit codes are the process exit codes.

### `node tools/governance/test_check_invariants.js`

Exit 0. Duration 134.26 s.

```
PASS catalogue_matches_registry_order
PASS real_tree_exit_0
PASS real_tree_summary
PASS real_tree_row_order
PASS status_INV-CORE-01
PASS status_INV-CORE-02
PASS status_INV-CORE-03
PASS status_INV-CORE-04
PASS status_INV-CORE-05
PASS status_INV-GEO-01
PASS status_INV-GEO-02
PASS status_INV-GEO-03
PASS status_INV-GEO-04
PASS status_INV-GEO-05
PASS status_INV-FLD-01
PASS status_INV-FLD-02
PASS status_INV-FLD-03
PASS status_INV-SIM-01
PASS status_INV-SIM-02
PASS status_INV-SIM-03
PASS status_INV-ART-01
PASS status_INV-ART-02
PASS status_INV-ART-03
PASS status_INV-ART-04
PASS status_INV-ART-05
PASS status_INV-GOV-01
PASS status_INV-GOV-02
PASS status_INV-GOV-03
PASS status_INV-GOV-04
PASS status_INV-GOV-05
PASS status_INV-SOC-01
PASS status_INV-SOC-02
PASS status_INV-SOC-03
PASS status_INV-SOC-04
PASS status_INV-SOC-05
PASS status_INV-SOC-06
PASS status_INV-SOC-07
PASS status_INV-SOC-08
PASS status_INV-SOC-09
PASS summary_counts
PASS fixture_present_INV-CORE-01
PASS mutant_fails_INV-CORE-01
PASS fixture_present_INV-GEO-03
PASS mutant_fails_INV-GEO-03
PASS fixture_present_INV-GEO-04
PASS mutant_fails_INV-GEO-04
PASS fixture_present_INV-FLD-02
PASS mutant_fails_INV-FLD-02
PASS fixture_present_INV-FLD-03
PASS mutant_fails_INV-FLD-03
PASS fixture_present_INV-SIM-01
PASS mutant_fails_INV-SIM-01
PASS fixture_present_INV-SIM-03
PASS mutant_fails_INV-SIM-03
PASS fixture_present_INV-GOV-02
PASS mutant_fails_INV-GOV-02
PASS fixture_present_INV-GOV-05
PASS mutant_fails_INV-GOV-05
PASS unknown_registry_id_fails
PASS duplicate_registry_id_fails
PASS empty_registry_fails
PASS unknown_only_is_usage
PASS help_exits_0
RESULT: 63 passed, 0 failed
```

### `node tools/governance/check_invariants.js`

Exit 0. Duration 138.04 s.

stderr:

```
check_invariants: running tools/test_strata_fluid_reconciliation.js
```

stdout:

```
ID            STATUS                      DETAIL
INV-CORE-01   PASS                        Read-only scan of game/js/main.js, game/js/rmmz_*.js, and text files under game/js/libs: none contain DEUS_, window.UF, or UF. Open Owner question: DEC-012 places simulation in plain modules under game/js/sim, while the registry also says all DEUS logic resides in game/js/plugins/DEUS_*.js. This pass is the read-only sentence. tools/verify_engine_read_only.js is cited by the registry and is not in the tree; this scan is the check.
INV-CORE-02   NOT-MECHANICAL              Single ownership of World, Entities, Fluid, Jobs, and Items is an architecture audit. The tree has no map from each state to one subsystem that a scan can accept or reject.
INV-CORE-03   NOT-MECHANICAL              The cited enforcement is the PERF_QUIET_WORLD frame-time benchmark. A source pattern for 'scans the whole world in one frame' is not closed enough to accept or reject.
INV-CORE-04   NOT-MECHANICAL              The cited enforcement is a save/load round trip. Stable integer identity for every entity, with no live object reference crossing a save, is not a closed tree scan.
INV-CORE-05   NOT-MECHANICAL              The rule covers every suite in the repo. This process does not mutation-test every suite. tools/governance/fixtures/invariants proves this checker can fail; that is the local proof, and the repo-wide rule stays a quality-policy audit.
INV-GEO-01    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: five 1 ft strata in a 5 ft cube. Later decision DEC-013 D-2 and merged WG.00.17: five 2 ft slices in a 10 ft layer, and DEC-013's 32 Z layers. Check skipped.
INV-GEO-02    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: five macro-Z levels Z-2, Z-1, Z0, Z+1, Z+2. Later decision DEC-013 and merged WG.00.17: 32 Z layers, default zMin -16 and zMax 15, with the coordinate split still OPEN in DEC-013. Check skipped.
INV-GEO-03    PASS                        M_AIR is 0. Water and lava are fluids with other ids. validMaterialByte treats byte 0 as air. continuousAirHeight and airRunAt stop on any byte that is not M_AIR, so a fluid is not clearance.
INV-GEO-04    PASS                        Natural carve deletes solid strata the flood from bedrock (elevation 0) and the area edge never reaches, by setE to M_AIR.
INV-GEO-05    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: flat top-down 2D, with 2.5D height offsets retired. Later decision DEC-019 requires a fixed pixel offset per stratum. docs/art/DEUS_ASSET_STANDARD.md AS-TERR-001 keeps the RMMZ top-down 3/4 view. Check skipped.
INV-FLD-01    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: five depth states map 1:1 onto 1 ft strata. Later decision DEC-013 D-2: a stratum is 2 ft. Check skipped.
INV-FLD-02    PASS                        Over-capacity fluid is moved upward and sideways (excess -= move) before the cell is reduced. tools/test_strata_fluid_reconciliation.js exited 0 in 137824ms, and its output records closed_loop_mass_conserved.
INV-FLD-03    PASS                        fluidIn refuses a shaft or skylight whose column has FLUID_B set, and a natural cut does the same before it writes M_AIR. The carve itself writes M_AIR only into solid strata.
INV-SIM-01    PASS                        Window_NewGameSetup.initialize assigns this._year = 0. Game_UFTime keeps a non-negative setup year and uses 0 when none is set.
INV-SIM-02    NOT-MECHANICAL              Open Owner question. UF_Time.schedule uses opts.domain || "engine", and UF.Time.after(ticks, fn) schedules a naked engine timer. A scan that required an explicit domain on every timer would reject this tree, and UF_Time.js is outside this lane. Whether that legacy path remains allowed is unanswered here.
INV-SIM-03    PASS                        game/js/sim/ledger.js: after seal(), register is refused (E_SEALED); transforms move one amount inside one family and never mint ore; recipes balance per family; a finite class accepts a source only when that source sets allowFinite; closure is sealed + sources - sinks.
INV-ART-01    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: Nano Banana Pro (gemini-3-pro-image) only. Later Owner ruling AS-GEN-004 and AS-GEN-005 in docs/art/DEUS_ASSET_STANDARD.md, mirrored in game/data/UF_AssetStandard.json: PixelLab is the primary generator, Retro Diffusion is standby, Nano Banana Pro is concepts only. DEC-007 also suspends generation. Check skipped.
INV-ART-02    NOT-MECHANICAL              The cited enforcement is visual inspection (AGENTS.md Rule 12). A text ban on scale, sway, stretch, or shaders false-hits ordinary placement. There is no closed repo check.
INV-ART-03    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: every charset is a 3x4 sheet (3 Down, 3 Left, 3 Right, 3 Up). Later Owner ruling AS-CHMAP-001, recorded in game/data/UF_AssetStandard.json item 43: character map sprites are whole PixelLab v3 characters with animations in eight directions. Check skipped.
INV-ART-04    NOT-MECHANICAL              The flat near-black cap (#08080C to #121218) on a 48x96 wall is a visual property (AGENTS.md Rule 13). tools/clean_packed_sheet.js records the convention. Pixel inspection of every wall is not this check.
INV-ART-05    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: autonomous production applies to non-living assets, and living beings need an explicit Owner request. Later decision DEC-007 suspends every autonomous-generation mandate, including AGENTS.md Rules 11 and 13, until the Owner rewrites them. Check skipped.
INV-GOV-01    SUPERSEDED-PENDING-OWNER    Open Owner question. Registry: Gemini / Antigravity is the sole integrator into main. Later Owner directive 0028-AC, recorded in docs/worldgen/DEUS_WORLDGEN_WBS.md revision 24 and tools/governance/README.md: the PM launches workers and merges. Check skipped.
INV-GOV-02    PASS                        check_claims.js checkWhitelist refuses a frozen path and a path outside the committer's whitelist. That is the repo check for one writer per file set.
INV-GOV-03    NOT-MECHANICAL              Reviewers forming a conclusion from the diff and the spec before reading author explanations is a workflow rule. merge_gate.js checks reviewer family, which is a different rule. There is no repo check of reading order.
INV-GOV-04    NOT-MECHANICAL              Durable task state (docs/AGENT_COMMUNICATION_PROTOCOL.md) means defects and task state survive a crash because they were committed or written to docs/agents/mailboxes. A directory listing is not that proof.
INV-GOV-05    PASS                        check_claims.js evidenceOf accepts a closure only with a reachable commit or a cited script plus a passing log, and requireEvidence records a 4.1 failure otherwise.
INV-SOC-01    NOT-MECHANICAL              Three independent identity axes are specified in docs/society/DEUS_PERSON_AND_INSTITUTIONS.md and SOC.10.01. The tree has no executable check that Craft, civic office, and SRD class stay independent.
INV-SOC-02    NOT-MECHANICAL              Current duty as operational state is specified by SOC.13.01. The tree has no duty-scheduler check that separates duty from an identity axis.
INV-SOC-03    NOT-MECHANICAL              An office surviving its holder is specified by SOC.20.01 and SOC.23.01. The tree has no executable vacancy check.
INV-SOC-04    NOT-MECHANICAL              Workload-driven offices are specified by SOC.21.01 and SOC.22.02. The tree has no executable workload-index check.
INV-SOC-05    NOT-MECHANICAL              Conserved minting of assayed metal into coin is specified by SOC.30.01. The tree has no executable mint check.
INV-SOC-06    NOT-MECHANICAL              Treasury versus stores is specified by SOC.31.01 and SOC.32.01. The tree has no executable separation check.
INV-SOC-07    NOT-MECHANICAL              Military participation by service status (NONE, RESERVE, MILITIA, GUARD, PROFESSIONAL) is specified by SOC.40.01. The tree has no executable ratio check.
INV-SOC-08    NOT-MECHANICAL              Mobilization's economic and harvest cost is specified by SOC.40.02 and SOC.42.01. The tree has no executable cost check.
INV-SOC-09    NOT-MECHANICAL              Class mechanics are specified to come from the 2014 SRD 5.1 by SOC.11.01 and docs/SRD5_1_INTEGRATION.md. The registry's reference copy is untracked, so exclusivity is not a closed tree scan.
SUMMARY active=9 pass=9 fail=0 not-mechanical=18 superseded-pending-owner=8
```

### `node tools/check_deus_syntax.js`

Exit 0.

```
Checked 52 DEUS plugin files. Errors: 0
```

## Scope note

This lane does not merge and does not mark the task DONE. Gemini reviews.

# Independent Review: OPS.70.01 Invariant Checker (lane-as)

**Reviewer:** Gemini (Independent Reviewer; non-author)
**Reviewed Writer:** Grok (`deus-grok`)
**Reviewed SHA:** `70964c2db83beca3f044fe984844d1dc837b42d4`
**Branch:** `task/lane-as`
**Base:** `origin/main` at `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de`

---

## 1. Commit and Verification Identity

- **HEAD commit:** `70964c2db83beca3f044fe984844d1dc837b42d4`
- **origin/task/lane-as:** `70964c2db83beca3f044fe984844d1dc837b42d4`
- **Merge base with origin/main:** `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de`

Git verification output:
```text
70964c2db83beca3f044fe984844d1dc837b42d4
70964c2db83beca3f044fe984844d1dc837b42d4
70964c2db83beca3f044fe984844d1dc837b42d4 deus-grok [grok] OPS.70.01 Invariant checker and lane report
e114d29a59c6b843f4150e50e8e0f229dd26d95b deus-grok [grok] OPS.70.01 WIP invariant checker
fc9a832b3414a1606bdecedf7b0ef7e51be08df1 deus-pm [pm] Open lane-as (OPS.70.01): BRIEF.md and lane.json
```

---

## 2. Scope Verification

Command:
```powershell
git diff --name-status a6be423d54bd2f7d4b5a5f24f51bae73f978c4de 70964c2db83beca3f044fe984844d1dc837b42d4
```

| Status | File Path | In `lane.json` allowedPaths? |
|---|---|---|
| A | `tasks/OPS.70.01/lane-as/BRIEF.md` | YES (`tasks/OPS.70.01/**`) |
| A | `tasks/OPS.70.01/lane-as/REPORT.md` | YES (`tasks/OPS.70.01/**`) |
| A | `tasks/OPS.70.01/lane-as/lane.json` | YES (`tasks/OPS.70.01/**`) |
| A | `tools/governance/check_invariants.js` | YES (`tools/governance/check_invariants.js`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/libs/effekseer.min.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/libs/localforage.min.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/libs/pako.min.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/libs/pixi.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/libs/vorbisdecoder.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/main.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_core.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_managers.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_objects.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_scenes.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_sprites.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-CORE-01/game/js/rmmz_windows.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-FLD-02/game/js/plugins/DEUS_Fluid.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-FLD-02/tools/test_strata_fluid_reconciliation.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-FLD-03/game/js/plugins/DEUS_Levels.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-GEO-03/game/js/plugins/DEUS_Levels.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-GEO-04/game/js/plugins/DEUS_Levels.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-GOV-05/tools/governance/check_claims.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_Core.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-SIM-01/game/js/plugins/DEUS_FactionMenus.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/INV-SIM-03/game/js/sim/ledger.js` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/registry_duplicate.md` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/registry_empty.md` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/fixtures/invariants/registry_unknown_id.md` | YES (`tools/governance/fixtures/invariants/**`) |
| A | `tools/governance/test_check_invariants.js` | YES (`tools/governance/test_check_invariants.js`) |

Confirmed:
- NO changes to `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, or any WBS documents.
- NO changes to `game/js/plugins.js` or production `game/js/plugins/DEUS_Core.js`.
- NO changes to `tools/ops/gate_tests.json` (PROPOSED-AS-01 is proposed in REPORT.md only).
- NO art generated, requested, or modified (DEC-007 compliant).
- All changes are strictly within allowedPaths.

---

## 3. Independent Gate Test Execution (Temp Clone)

Executed in a detached fresh clone `.review_tmp_clone` at SHA `70964c2db83beca3f044fe984844d1dc837b42d4`.

### Test 1: `node tools/governance/test_check_invariants.js`
Raw exit code: `0`
Output:
```text
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

### Test 2: `node tools/governance/check_invariants.js`
Raw exit code: `0`
Output:
```text
check_invariants: running tools/test_strata_fluid_reconciliation.js
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
INV-FLD-02    PASS                        Over-capacity fluid is moved upward and sideways (excess -= move) before the cell is reduced. tools/test_strata_fluid_reconciliation.js exited 0 in 136972ms, and its output records closed_loop_mass_conserved.
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

### Test 3: `node tools/check_deus_syntax.js`
Raw exit code: `0`
Output:
```text
Checked 52 DEUS plugin files. Errors: 0
```

---

## 4. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

### Observations:
1. All active mechanical checks (9) pass on the real tree and are empirically verified to fail on their corresponding mutant fixtures under `tools/governance/fixtures/invariants/**`.
2. Stale or superseded registry items against subsequent Owner rulings are correctly marked `SUPERSEDED-PENDING-OWNER` without unilateral resolution, and documented as open Owner questions in `REPORT.md`.
3. Process and qualitative rules without closed repo test harnesses are appropriately categorized as `NOT-MECHANICAL`.
4. `tools/ops/gate_tests.json` was not touched, and the suggested integration is noted as `PROPOSED-AS-01` in `REPORT.md`.
5. DEC-007 (Art Freeze) and DEC-011 (Engine read-only) standards strictly adhered to.

---

## 5. Verdict

VERDICT: CLEAN PASS

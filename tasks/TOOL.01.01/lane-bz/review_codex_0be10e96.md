# Independent adversarial review: 0be10e96

- **Date:** 2026-09-29
- **Evidence timestamp:** 2026-09-29 22:17:51 CDT (2026-09-30 03:17:51 UTC).
- **Target Commit:** `0be10e96aaab70dcdbd14d27b697f1fd4177bf22`
- **Parent Commit:** `cc1d5063a21b5eea7ad82a9a9a5c3ead19f66bf5`
- **Reviewer:** Codex (gpt-6-astra)
- **Authority:** Zero self-certification (DEC-034 / CANONICAL_ROLES.md); explicit Owner request for this independent review and its report-only commit on main.
- **Implementation attribution:** Gemini, as identified in the target commit message.
- **Verdict: FAIL.** One introduced MAJOR validation regression requires correction. The restored tile-size and geometry-digest checks pass the focused probes. No implementation fixes were made in this review.

## Scope / Path verification

Inspected `git show 0be10e96aaab70dcdbd14d27b697f1fd4177bf22` and the actual parent and target code, without relying on prior review verdicts. `git diff-tree --no-commit-id --name-status -r <target>` lists exactly:

```text
M tools/art/make_blank_templates.js
```

The patch restores strict tile-size equality and geometry digest comparisons, and changes the stratum height condition from padded-only to accepting either raw or padded heights. It changes no tests, fixtures, schema, catalogue data, or documentation.

The checkout was on `main` at `b224aae320436bd64ef738abfd5929d557b7303e`, with the target as an ancestor. Both `git rev-parse <target>:tools/art/make_blank_templates.js` and `git hash-object tools/art/make_blank_templates.js` returned `24b0c6b3a949228b65aa77291fc52e23f573b6a1`. The template suite, its fixtures, PNG helper modules and master palette also had no diff against the target.

Unrelated tracked modifications and untracked assets, prompts, telemetry and lane files were present before review. They were preserved. The report is the only intended staged file. A temporary review claim in `docs/STATUS.md` is removed before delivery; no WBS status or production file is changed.

Read the required governance rules, current STATUS, latest audit A10 and its open findings, SLICES, relevant locked VISION decisions, ENGINE_RULES, ART_STANDARD, lane brief/manifest and catalogue contract. A10's runtime findings are outside this bounded tooling review. The lane brief expressly requires padded stratum slots. Current Owner authorization supplies the scope for this report on main; this is not a merge-gate run or retrospective approval of the unreviewed integration.

A same-family Codex subagent independently traced catalogue and placement contracts and performed a read-only parent/target validator probe. Its work is supporting analysis, not a second cross-family certification. The reviewer reproduced the regression through the real CLI and owns this verdict.

All file/line citations below refer to the target commit.

## Test execution results

Tests were executed in the foreground using Node.js `v24.19.0`. Each requested command's exit code was captured immediately in PowerShell. The full captured output of those three commands is in Appendix A.

| Command / execution | Exit | Observed result |
|---|---:|---|
| `node tools/art/test_catalogue.js` on main | 1 | 46/47 checks passed. `catalogue.rebuild_identical` failed: six generated outputs differ from committed files. |
| `node tools/art/test_make_blank_templates.js` on main | 1 | `MODULE_NOT_FOUND`; this test file does not exist. |
| `node tools/art/make_blank_templates.js --check` on main | 1 | `ERROR: unknown argument --check`. No catalogue validation occurred. |
| `node tools/art/test_blank_templates.js --keep` on main | 0 | Actual existing template suite: `RESULT: 77 passed, 0 failed`, including refusal cases and 13 killed mutants. |
| `node tools/art/test_catalogue.js` in an exact-target dependency snapshot | 1 | Again 46/47; the same six rebuild outputs differ. This confirms the failure is present at the target, not only on the later main checkout. |
| `node <review-temp>/probe.js` | 0 | 24 focused assertions plus canonical catalogue validation, real CLI acceptance/refusal probes and parent/target comparisons. See Appendix B for exact output. |

The exact-target snapshot was exported from Git objects with `git archive`, not copied from dirty working files. It contains the test dependencies, catalogue sources and tracked reference files at the target. It is a dependency snapshot, not a full fresh clone, and no merge-gate certification is claimed. Its first catalogue run also reported a missing `tools/scale_resolver.js` because the reviewer initially omitted that dependency; adding its exact target blob removed that setup-only failure. The final result was 46/47, as above.

Template-suite output relevant to validation and falsifiability:

```text
PASS templates.stratum_param[stale_catalogue_refused]
PASS templates.stratum_param[stale_rects_refused]
PASS templates.refusals[tile_size_mismatch]
PASS templates.mutants[sha_check_removed]
INFO mutant sha_check_removed killed by stratum_param: stale_catalogue_refused: exit 2 codes STRATUM_HEIGHT_MISMATCH stderr: REFUSED STRATUM_HEIGHT_MISMATCH: TEST_SURFACE_B1_RAMP_RISE1_V1_BASE: GEOM_STRATUM_1 needs frame height 20 from
PASS templates.fixture_contract
PASS templates.fixture_drift
PASS templates.repo_untouched
RESULT: 77 passed, 0 failed
EXIT=0
```

The mutant passes mean the harness detected deliberately broken implementations; they do not mean those implementations were acceptable. The focused probe also asserted refusal exit 2 and absence of an output directory for wrong tile type, missing SHA and the parent's raw-height rejection.

The first focused-probe run stopped on a reviewer assertion that expected a height-49 stratum error inside a 48-high sheet. The implementation correctly emitted `SLOT_OUT_OF_SHEET` first. The probe sheet was enlarged to 96 pixels to isolate the intended height test; the corrected probe completed. No production code was changed.

Local retained evidence:

- Review temp root: `C:/Users/snewt/AppData/Local/Temp/deus-codex-0be10e96-gsVykF/`.
- Exact target snapshot: `<review-temp>/target/`.
- Probe source and captured output: `<review-temp>/probe.js`, `<review-temp>/probe.log`.
- Template-suite temporary output: `C:/Users/snewt/AppData/Local/Temp/deus-blank-templates-test-pIormd/`.
- These temporary paths are not committed dependencies. The critical reproduction and outputs are recorded in this report.

## Code inspection & findings

### F1 — MAJOR, introduced: raw-height acceptance bypasses the production slot contract

**Location:** `tools/art/make_blank_templates.js:347-348`.

**Contract:** `docs/art/catalogue/SCHEMA.md:47-57` defines stratum envelopes using the shortest, lowest and tallest consecutive runs of strata. The paint slot must fit the tallest run and be padded per frame to the tile grid. The slot formula at `:121` is `rows * 48 * ceil(hMax / 48)`. The production builder enforces grid alignment at `tools/art/build_catalogue.js:1161` and padded maximum-window height at `:1175`.

The target instead accepts:

```js
slot.h === rows * spec.frameH
// OR
slot.h === rows * Math.ceil(spec.frameH / g.tilePx) * g.tilePx
```

Here `spec.frameH` is the sum of the lowest strata, not the padded maximum-window frame height.

**Reproduction, starting from a valid catalogue:**

1. Load target `art/catalogue/geometry.json` and reorder its split to `[20,19,19,19,19]`. It still contains five positive integer strata summing to 96.
2. Build with `B.build({ root: snapshot, geometry: g })`. The build returns `ok: true`. Set catalogue geometry path/digest to the actual temporary geometry bytes, so provenance is correct.
3. Select `LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT`. Its one-frame slot is `48x48`; its honest envelope has `hMin:19, hTarget:20, hMax:20`.
4. Change only `slot.h` from 48 to 20 in the complete catalogue.
5. The parent's template validator returns `STRATUM_HEIGHT_MISMATCH`; the target's returns no errors. The production catalogue validator returns exactly `SLOT_OFF_GRID` and `GEOM_HEIGHT`.
6. Run the real parent and target CLIs with a compact single-sheet extract of that entry, keeping the same geometry, SHA, envelope and 20-pixel slot height. Parent: exit 2 and no output. Target: exit 0, PNG and sidecar written; sidecar slot `h` is 20. A padded 48-pixel control also exits 0.

Real output:

```text
CLI raw-parent EXIT=2 outputExists=false
REFUSED STRATUM_HEIGHT_MISMATCH: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: GEOM_STRATUM_1 needs slot height 48 from stratumPx [20,19,19,19,19] (padded to 48px grid) but the slot is 20 high
REFUSED: 1 problem(s); nothing written

CLI raw-target EXIT=0 outputExists=true
WROTE TEST_REVIEW_STRATUM.png 48x48 slots=1 sha256=dbb11fe3608fd059415de4206f300495e311a81541c9448cf959b0cf71070ed5
```

**Why existing checks do not save this:** With default `[19,19,19,19,20]`, the raw H1-H4 heights are one pixel below honest envelope maxima; the envelope check at `:341-343` rejects them. With the reordered valid split, raw prefix equals maximum and that guard passes. A whole-slot modulo check alone is insufficient: the probe also accepted 12 rows of raw 20-pixel frames, total height 240 (a multiple of 48), where the canonical per-frame padding requires 576.

**Impact:** A catalogue that fails its canonical geometric invariants now produces apparently successful blank templates and matching sidecar dimensions. This is a validator acceptance regression, with potential downstream crop/layout disagreement. No game-rendering failure is claimed.

The inspected placement checks do not restore this invariant: `validate_art.js:485-493` checks positive integer dimensions and bounds; `:672` requires a frame at least as tall as the maximum stratum run, which a raw 20-pixel frame satisfies here. `place_art.js:236-278` checks sheet grid size and overlaps, not the canonical padded per-frame slot formula. The accepted dimensions propagate to template sidecars at `make_blank_templates.js:470-480`, and `validate_art.js:677-686` checks equality against those sidecars. An actual approved-art placement was not attempted.

**Required correction:** Enforce the production catalogue's padded maximum-window formula and reconcile the template fixtures with it. If raw frames are needed, they need an explicitly separate, documented layout contract; silently accepting them under the existing schema is not justified by this patch. Add regression coverage that changes a single valid production slot to the raw height and asserts refusal, including a multi-row case whose total height happens to be tile-aligned.

### Tile-size validation — correct in the inspected call path

**Location:** `make_blank_templates.js:243`, with geometry validation at `:145-180,604-609`.

`g.tilePx` must first be a positive integer. The new strict inequality correctly rejects a different integer, numeric string `"48"`, null or absent catalogue tile size. The probe exercised all four. There is no coercion bypass, and the check occurs before sheet filtering. The real CLI refused the numeric string with exit 2 and wrote nothing.

Minor diagnostic limitation: the numeric-string case says `tileSizePx 48 differs from geometry tilePx 48`, hiding the type difference. This does not weaken the check.

### Geometry SHA validation — correct freshness checks, with explicit normalization limits

**Location:** `make_blank_templates.js:244-251`, digest computation at `:107-109,573-578`.

The compared SHA values come from bytes actually read by `readJsonFile`: a CRLF-to-LF-normalized text digest and a raw-byte digest. Missing, empty, null, numeric, object-valued, incorrect and uppercase digests were all refused in the probes. Changed geometry content with an old digest was refused even when its geometry remained otherwise valid. A digest mismatch also failed with a selected sheet. The existing path comparison still rejected a different path even when the normalized digests matched.

Both documented compatibility forms work: a CRLF file accepts its LF-normalized digest or its own raw-byte digest. A raw CRLF digest carried over to an LF-only checkout is rejected; the code cannot reconstruct the original raw bytes from that digest. Prefer normalized text digests for portable catalogue records.

These checks prove agreement with referenced content, not cryptographic authorization: editing both a geometry file and its recorded hash is naturally possible. No authentication claim is made by this tool. No new digest-comparison bypass was found.

### C1 — pre-existing: lowest-prefix height differs from the required tallest window

**Locations:** `make_blank_templates.js:205-210`; `build_catalogue.js:199-207,1175`.

For valid split `[10,20,30,20,16]`, an H2 frame must fit the tallest two-stratum run, 50 pixels, so the canonical slot height is 96. Both parent and target derive their padded height from the lowest pair, 10+20=30, and reject that valid 96-pixel slot. The target's raw alternative does not solve this problem.

The probe confirmed a valid catalogue build and identical rejection by parent and target for `LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H2_DEFAULT`. This is a relevant existing defect, not attributed to the new commit. Using the canonical maximum-window calculation in the F1 correction should address it.

### C2 — coverage gap: existing fixture tests encode a different height contract

`tools/art/fixtures/templates/build_fixture.js:139-148` creates raw stratum heights, and `tools/art/test_blank_templates.js:913` expressly expects cumulative raw heights. The unchanged suite's 77 passes therefore establish compatibility with those fixtures, not compliance with the production catalogue's padded maximum-window invariant.

No regression tests were added in the target commit. The production-contract counterexample in F1 is not covered by that suite. The tick function itself at `make_blank_templates.js:217-229` uses actual per-row frame height and bottom-relative cumulative strata; with existing integer/divisibility guards, no new tick overflow or cross-row arithmetic defect was found.

### C3 — existing failing catalogue gate and unavailable requested commands

The requested catalogue suite fails at the target: committed outputs have drifted from the rebuild. The six files are `art/catalogue/catalogue.json`, `art/catalogue/conflicts.md`, `docs/art/catalogue/BAND_ALL.md`, `BAND_LOWER1.md`, `BAND_SURFACE.md` and `INDEX.md`.

The exact-target comparison found changed source records, sheets and entries, not merely a nondeterministic run: two fresh builds agree with each other. The target changes only the template generator, which the catalogue suite neither imports nor lists as a catalogue source; the catalogue suite and its inputs are identical between parent and target. This failing gate is not introduced by the reviewed patch, but it cannot be reported as passing.

`test_make_blank_templates.js` and `make_blank_templates.js --check` are not supported interfaces at this target or its parent. The actual template suite was run explicitly as an additional command; the requested failures were retained as failures.

## Evidence and limits

Both focused blank-template PNGs were opened and visually inspected:

- `<review-temp>/raw-target-out/TEST_REVIEW_STRATUM.png`: a 48x48 blank sheet with cyan outer grid, yellow `0000 GS1` label and an internal horizontal slot boundary at row 19; the invalid slot ends after 20 pixels.
- `<review-temp>/padded-target-out/TEST_REVIEW_STRATUM.png`: a 48x48 blank sheet whose slot fills the grid cell, with cyan guide ticks at row 28 marking a bottom-aligned 20-pixel stratum. Its SHA256 is `595afb61e7730c0994d27a69fb51c0ac69e1e7cf988fb39ecabb584ee0e42454`.

These are permitted blank-template test outputs, not generated game art. The suite's full pixel-oracle checks ran; its many intermediate fixture PNGs were not individually visually reviewed. No Playtest screenshot was taken. No Owner asset QA, originality, final art sign-off, live console, save/load or runtime FPS claim is made.

The committed canonical catalogue also passed the target's internal `checkGeometry/checkCatalogue` path with zero problems in the probe. This is bounded validator evidence, not a claim that `--check` exists or that full production-template generation was run.

## GAME TRANSLATION

**WBS / Lane:** TOOL.01.01 / lane-bz. **Class:** C — FOUNDATIONAL / INDIRECT.

| Field | Review assessment |
|---|---|
| Player / World Effect | Indirect assurance that asset sheet slots retain the dimensions expected by later placement and presentation. No direct game behavior is implemented by this patch. |
| Trigger | Offline invocation of `make_blank_templates.js` with catalogue, geometry and output directory. |
| Runtime Authority | No runtime authority is added. Catalogue geometry is the offline dimensional contract. |
| Simulation Path | Catalogue builder -> catalogue -> blank template PNG/sidecar -> validation and placement tools. This is an asset pipeline, not simulation state. |
| Engine Bridge | Named immediate consumers are `tools/art/validate_art.js` and `tools/art/place_art.js`. Runtime exports for supported mappings are a later bridge. No bridge completion was tested here. |
| Visible Result | Blank sheet grids, slot boundaries, labels and stratum guide ticks. A downstream dimensional disagreement could cause a rejected or incorrectly cut asset. Only blank templates were observed. |
| Persistence | JSON catalogue/template sidecars and PNG files; no game save-schema change. |
| Failure Without This Lane | Stale geometry or inconsistent slot dimensions can enter offline asset preparation. F1 shows the new check still permits a canonical-contract violation. |
| Automated Proof | Three requested commands, existing template suite, 24 focused assertions and parent/target CLI reproduction recorded above. |
| In-Game Proof | NOT PERFORMED; not required to establish this offline validator defect. No playability completion is claimed. |

**CONSUMED BY GAME SYSTEMS:** indirectly through validated placement and supported runtime sheet exports. The reproduced EDGE entry has `runtime.kind:"NONE"`, `file:null`, `standardPending:"DW.01.06"` and `status:"MISSING"`; its direct in-game consumer is not implemented by this change. A hypothetical rendering failure is not used as evidence for F1.

| Required status | YES/NO and explanation |
|---|---|
| Simulation implemented | NO — inapplicable to this tooling-only change. |
| Engine bridge implemented | NO — no bridge added or established for the reproduced stratum entry. |
| Presentation implemented | NO — no game presentation added; offline blank output was observed. |
| Input/player interaction implemented | NO — inapplicable. |
| Save/load implemented | NO — inapplicable; repository artifact persistence only. |
| Playable verification performed | NO — RMMZ F5/F8 not run. |

## Verdict and required follow-up

**FAIL.** F1 is an introduced acceptance regression against the frozen production catalogue contract. Restored tile-size/SHA checks are sound in the inspected paths, but they do not compensate for accepting invalid stratum slot heights. The catalogue gate also remains failed for pre-existing drift.

An implementer should restore canonical per-frame padded maximum-window validation, reconcile the legacy fixtures, add production-derived raw-height refusal tests and rerun the catalogue/template gates. Resolve the actual catalogue rebuild drift rather than weakening the test. Any correction requires a new independent review of its own commit.

This report neither changes WBS closure nor retroactively approves the original main commit. No Owner decision is needed to deliver this review. No RMMZ action is required to reproduce the offline defect; playable approval and future art integration remain outside this report.

## Delivery / Git status

The review file was written and the temporary STATUS claim removed with no remaining STATUS diff. The requested staging command was attempted on main:

```text
git add tasks/TOOL.01.01/lane-bz/review_codex_0be10e96.md
fatal: Unable to create 'C:/Users/snewt/OneDrive/Desktop/UF/.git/index.lock': Permission denied
EXIT=128
```

The session grants read-only access to `.git` and does not permit permission escalation. The report therefore remains unstaged/uncommitted. The requested commit was not created; the commit command was not run after staging failed. No unrelated file was staged. Completion of the Git step requires a session with write access to this repository's Git metadata, using the Owner's requested commands:

```powershell
git add tasks/TOOL.01.01/lane-bz/review_codex_0be10e96.md
git commit -m "[codex] TOOL.01.01 Independent review of commit 0be10e96"
```

## Appendix A — requested commands: captured output

### `node tools/art/test_catalogue.js`

```text
PASS catalogue.schema: $id deus-art-catalogue/1.2.0; unsupported keywords 0; 10089 entries, 169 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10089 entries checked; 0 bad
FAIL catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: art/catalogue/catalogue.json, art/catalogue/conflicts.md, docs/art/catalogue/BAND_ALL.md, docs/art/catalogue/BAND_LOWER1.md, docs/art/catalogue/BAND_SURFACE.md, docs/art/catalogue/INDEX.md; catalogue.json sha256 6c1cb26cae072d1d...
PASS catalogue.rule_derived_derived_base: a derivedFrom pointing at a derived base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT: derivedFrom LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT is itself derived)
PASS catalogue.rule_derived_missing_base: a derivedFrom pointing at a missing base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: derivedFrom SURFACE_SHARED_EDGE_NOSUCH_S-H2_DEFAULT is missing)
PASS catalogue.rule_dup_id: a duplicate id: baseline fixture 0 errors; patched fixture -> 1 DUP_ID (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate entry id)
PASS catalogue.rule_dup_slot: a duplicate slotId: baseline fixture 0 errors; patched fixture -> 1 DUP_SLOT (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate slotId ATLAS_SURFACE_SHARED_PROP_01:0036)
PASS catalogue.rule_geom_height: a geometry-derived slot height that is not computed from stratumPx/layerPx: baseline fixture 0 errors; patched fixture -> 1 GEOM_HEIGHT (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: height 38/48/48 is not 38/38/39 from stratumPx/layerPx)
PASS catalogue.rule_missing_anchor: a missing anchor: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing anchor)
PASS catalogue.rule_missing_envelope: a missing envelope: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing envelope)
PASS catalogue.rule_missing_footprint: a missing footprint: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing footprint)
PASS catalogue.rule_missing_ramp: a missing palette ramp: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing palette ramp)
PASS catalogue.rule_missing_size: a missing size (frames): baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing size (frames))
PASS catalogue.rule_no_source: an entry that traces to no source: baseline fixture 0 errors; patched fixture -> 1 NO_SOURCE (ALL_SHARED_ITEM_LOG_V1_DEFAULT: entry traces to no source)
PASS catalogue.rule_oos_no_reason: an outOfScope row without a reason: baseline fixture 0 errors; patched fixture -> 1 OOS_NO_REASON (skins:human: outOfScope row without a reason)
PASS catalogue.rule_paperdoll_anchor: a paper-doll part whose anchor differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: anchor differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT)
PASS catalogue.rule_paperdoll_frames: a paper-doll part whose frame layout differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: frame layout [16,4,["S","W","E","N"]] differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT [3,4,["S","W","E","N"]])
PASS catalogue.rule_ramp_unknown: a ramp id not in the palette registry: baseline fixture 0 errors; patched fixture -> 1 RAMP_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: ramp NOT_A_REGISTRY_RAMP is not in the palette registry)
PASS catalogue.rule_scalerow_unknown: a scaleRow not in scale_chart.json: baseline fixture 0 errors; patched fixture -> 1 SCALEROW_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: scaleRow TREE_NOT_IN_THE_CHART is not in scale_chart.json or size_classes.json)
PASS catalogue.rule_sheet_not_grid: a sheet side not a multiple of 48: baseline fixture 0 errors; patched fixture -> 1 SHEET_NOT_GRID (ATLAS_SURFACE_SHARED_PROP_01: atlas 2880x150 is not a multiple of 48)
PASS catalogue.rule_sheet_too_large: an atlas side over 4096: baseline fixture 0 errors; patched fixture -> 1 SHEET_TOO_LARGE (ATLAS_SURFACE_SHARED_PROP_01: atlas 4128x144 is over 4096)
PASS catalogue.rule_size_outside_row: a size outside its chart row min/max: baseline fixture 0 errors; patched fixture -> 1 SIZE_OUTSIDE_ROW (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: envelope outside TREE_COMMON_OAK min/max)
PASS catalogue.rule_slot_off_grid: a slot off the 48 grid: baseline fixture 0 errors; patched fixture -> 1 SLOT_OFF_GRID (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot 2071,0 96x96 is off the 48 grid)
PASS catalogue.rule_slot_outside_sheet: a slot outside its sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OUTSIDE_SHEET (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot leaves ATLAS_SURFACE_SHARED_PROP_01 (2880x144))
PASS catalogue.rule_slot_overlap: overlapping slot rects in a sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OVERLAP (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: overlaps SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT in ATLAS_SURFACE_SHARED_TILE_01)
PASS catalogue.rule_slot_too_small: a slot smaller than the chart envelope: baseline fixture 0 errors; patched fixture -> 1 SLOT_TOO_SMALL (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot cell 96x48 is smaller than the envelope 80x96)
PASS catalogue.rule_source_dropped: a source id dropped without an outOfScope reason: baseline fixture 0 errors; patched fixture -> 1 SOURCE_DROPPED (objects:fixture_only_id: catalog source id "objects:fixture_only_id" maps to no entry and has no outOfScope reason)
PASS catalogue.rule_variant_has_slot: a variant (derivedFrom set) with a paint slot: baseline fixture 0 errors; patched fixture -> 1 VARIANT_HAS_SLOT (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: a variant row owns a paint slot)
PASS catalogue.rule_z_out_of_range: a zMin/zMax outside the geometry range: baseline fixture 0 errors; patched fixture -> 1 Z_OUT_OF_RANGE (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: z 0..40 outside -16..15)
PASS catalogue.rule_coverage: 19 FAIL rules, 26 fixture cases; rules without a case: none
PASS catalogue.live_catalogue_valid: real build: 10089 entries, 0 rule errors
PASS catalogue.scale_chart_vs_registry: 39 registry rows for 39 registry classes; 17 STRIP rows (+ 1 tile label); 0 problems
PASS catalogue.geometry_stratum_sum: stratumPx [19,19,19,19,20] sums to 96 (layerPx 96); geometry errors 0; stratum_invalid_zero rejected, stratum_invalid_sum rejected
PASS catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 4/4 slot heights changed (EDGE_MEADOW_S-H2 48->96, WALLFACE_OPENING_H2 48->96, RAMP_MEADOW_N-C2 96->144, RAMPSIDE_MEADOW_E-H2 48->96); [20,19,19,19,19]: 3/3 target heights changed (19->20, 57->58, 124->125)
PASS catalogue.geometry_no_literal_layer_count: 0 lines with a literal 9 or 32 in build_catalogue.js
PASS catalogue.geometry_nine_layers: 9-layer fixture (z -4..4): build OK, 10089 entries, 0 outside z range, 5 bands
PASS catalogue.size_srd: 9 race rows checked against SRD Size traits and 7 px/ft; 6 ft human = 42 px (humanPx 42); 7 frame-class rows; 0 problems
PASS catalogue.size_footprint_frame_separate: 129 creature/character/equipment entries carry footprint (squares) and frameClass (px frame) separately; e.g. ALL_SHARED_CREATURE_GIANT-SPIDER_V1_DEFAULT footprint 2x2 squares, frame 96x48 px; 0 problems
PASS catalogue.size_frame_classes: TINY 8 / LARGE_TALL 6 / LARGE_LONG 6 entries with the right cells; 96x96 Large frames: 0; HUGE/GARGANTUAN null frames without slots; TINY footprint 24x24 in a 48x48 frame: true; 0 problems
PASS catalogue.size_optional_params: defaults OFF: true; TALL_MEDIUM entries default 0, enabled 5 (slots 144x384); readability floor on: GNOME 21/25/28 -> 26/27/28, HALFLING 21/21/21 -> 26/27/28
PASS catalogue.size_character_blocks: 129 character/creature/equipment slots in 3x4-frame blocks (144x192, 144x384, 288x192); RMMZ character sheets not 3x4: 0; 0 problems
PASS catalogue.coverage: WorldCatalog ids 246/246; brief anchor/ui/eq/face ids 36/36; manifest rows 18/18; open AR rows 49/49; addendum family x band cells: 65/65
PASS catalogue.references_hash: 27 references, 26 tracked re-hashed and matching; 1 untracked (UNVERIFIED_ABSENT); entries with unknown references: 0; 0 problems
PASS catalogue.depth_no_colours: 7595 DEPTH_<band> rows: 0 colour values, 0 colour keys; 5 depth palette placeholders, 0 with colours; variant rows with a paint slot: 0
PASS catalogue.no_image_data: image files under art/catalogue, docs/art/catalogue, tools/art/fixtures/catalogue: 0; outputs with embedded image data: 0
PASS catalogue.schema_doc_terrains: 29 terrains used; SCHEMA.md lists 30; missing none; extra none
PASS catalogue.conflicts_required: 19/19 required topics present; conflicts.md 134 lines

46/47 checks passed
EXIT=1
```

### `node tools/art/test_make_blank_templates.js`

```text
node:internal/modules/cjs/loader:1520
  throw err;
  ^

Error: Cannot find module 'C:\Users\snewt\OneDrive\Desktop\UF\tools\art\test_make_blank_templates.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
    at Module._load (node:internal/modules/cjs/loader:1294:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v24.19.0
EXIT=1
```

### `node tools/art/make_blank_templates.js --check`

```text
ERROR: unknown argument --check
usage: node tools/art/make_blank_templates.js --catalogue <catalogue.json> [--geometry <geometry.json>] --out <dir> [--bg transparent|magenta] [--sheet <sheetId>]
EXIT=1
```

## Appendix B — focused probe output

```text
BASELINE reordered geometry: builder valid; parent=[]; target=[]
RAW HEIGHT LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: h 48->20; parent=[{"code":"STRATUM_HEIGHT_MISMATCH","msg":"LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: GEOM_STRATUM_1 needs slot height 48 from stratumPx [20,19,19,19,19] (padded to 48px grid) but the slot is 20 high"}]; target=[]; builder=[{"code":"SLOT_OFF_GRID","id":"LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT","msg":"slot 48,0 48x20 is off the 48 grid"},{"code":"GEOM_HEIGHT","id":"LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT","msg":"slot height 20 is not computed from geometry (48)"}]
tileSizePx=47: ["CATALOGUE_INVALID"]
tileSizePx="48": ["CATALOGUE_INVALID"]
tileSizePx=null: ["CATALOGUE_INVALID"]
tileSizePx missing: ["CATALOGUE_INVALID"]
sha=null: ["GEOMETRY_SHA_MISMATCH"]
sha="": ["GEOMETRY_SHA_MISMATCH"]
sha=0: ["GEOMETRY_SHA_MISMATCH"]
sha={}: ["GEOMETRY_SHA_MISMATCH"]
sha="0000000000000000000000000000000000000000000000000000000000000000": ["GEOMETRY_SHA_MISMATCH"]
sha="0120215BCD53CB0C57EF171D72AF147F420FD49ECE9CE54058C34540BEDB8659": ["GEOMETRY_SHA_MISMATCH"]
sha missing: ["GEOMETRY_SHA_MISMATCH"]
sha mismatch with --sheet: ["GEOMETRY_SHA_MISMATCH"]
wrong slot height 19: ["ENVELOPE_EXCEEDS_SLOT","STRATUM_HEIGHT_MISMATCH"]
wrong slot height 21: ["STRATUM_HEIGHT_MISMATCH"]
wrong slot height 47: ["STRATUM_HEIGHT_MISMATCH"]
wrong slot height 49: ["STRATUM_HEIGHT_MISMATCH"]
padded height 48: []
12 rows raw height 240 (total is grid multiple): []
12 rows padded height 576: []
CRLF file LF-normalized digest: []
CRLF file raw digest: []
LF file stale CRLF-raw digest: ["GEOMETRY_SHA_MISMATCH"]
content changed with stale digest: ["GEOMETRY_SHA_MISMATCH"]
geometry path mismatch despite same hash: ["GEOMETRY_MISMATCH"]
CLI raw-parent EXIT=2 outputExists=false
REFUSED STRATUM_HEIGHT_MISMATCH: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: GEOM_STRATUM_1 needs slot height 48 from stratumPx [20,19,19,19,19] (padded to 48px grid) but the slot is 20 high
REFUSED: 1 problem(s); nothing written

CLI raw-target EXIT=0 outputExists=true
WROTE TEST_REVIEW_STRATUM.png 48x48 slots=1 sha256=dbb11fe3608fd059415de4206f300495e311a81541c9448cf959b0cf71070ed5
TEMPLATES: 1 sheet(s), 1 slot(s) in C:\Users\snewt\AppData\Local\Temp\deus-codex-0be10e96-gsVykF\raw-target-out

CLI padded-target EXIT=0 outputExists=true
WROTE TEST_REVIEW_STRATUM.png 48x48 slots=1 sha256=595afb61e7730c0994d27a69fb51c0ac69e1e7cf988fb39ecabb584ee0e42454
TEMPLATES: 1 sheet(s), 1 slot(s) in C:\Users\snewt\AppData\Local\Temp\deus-codex-0be10e96-gsVykF\padded-target-out

CLI tile-string-target EXIT=2 outputExists=false
REFUSED CATALOGUE_INVALID: tileSizePx 48 differs from geometry tilePx 48
REFUSED: 1 problem(s); nothing written

CLI sha-missing-target EXIT=2 outputExists=false
REFUSED GEOMETRY_SHA_MISMATCH: catalogue.geometry.sha256 is missing
REFUSED: 1 problem(s); nothing written

COMMITTED CATALOGUE: target checkGeometry/checkCatalogue problems=0 (no rendering)
PRE-EXISTING valid skew parent: {"code":"STRATUM_HEIGHT_MISMATCH","msg":"LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H2_DEFAULT: GEOM_STRATUM_2 needs slot height 48 from stratumPx [10,20,30,20,16] (padded to 48px grid) but the slot is 96 high"}
PRE-EXISTING valid skew target: {"code":"STRATUM_HEIGHT_MISMATCH","msg":"LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H2_DEFAULT: GEOM_STRATUM_2 needs frame height 30 from stratumPx [10,20,30,20,16] (slot height 1 x 30 = 30) but the slot is 96 high"}
PROBE PASS: 24 focused assertions; parent/target regression demonstrated; no production files changed.
EXIT=0
```

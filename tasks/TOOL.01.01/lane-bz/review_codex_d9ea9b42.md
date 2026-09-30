# Independent adversarial closure re-review: TOOL.01.01 / lane-bz

- **Date:** 2026-09-29
- **Evidence timestamp:** 2026-09-29 22:42:31 CDT (2026-09-30 03:42:31 UTC).
- **Target Commit:** `d9ea9b42` (`d9ea9b425963f07ac712b0b0fba39bd0e953d14b`).
- **Parent Commit:** `d2b7f21c4347f62e43fe53255e490a015b094dd4`.
- **Reviewer:** Codex (gpt-6-astra), OpenAI / GPT family, independent reviewer.
- **Implementation attribution:** Gemini, per commit message, `BRIEF_FIX1.md`, and lane manifest. Git author: `deus-ops <deus-ops@local.invalid>`.
- **Authority:** Zero self-certification (DEC-034 / CANONICAL_ROLES.md); explicit Owner instruction for this independent closure re-review. The two-party independence rule is stated in `docs/CANONICAL_ROLES.md` section 3 and `.agents/rules/deus-review-policy.md`; DEC-034 records conditional final merge-gate routing.
- **VERDICT: CLEAN PASS**
F1's introduced unpadded-height acceptance is resolved. All three requested gates pass. No new introduced finding was identified. This verdict does not close the pre-existing irregular-geometry limitation described below, certify gameplay, change WBS status, or authorize a merge.

## Scope / Path verification

The review ran in `C:\Users\snewt\.deus_worktrees\lane-bz`, branch `task/lane-bz`. `git rev-parse HEAD` returned the full target SHA above. Before review, there were no tracked modifications; the existing untracked `tasks/TOOL.01.01/lane-bz/codex_rereview_prompt.txt` was preserved. The implementation and catalogue paths still had no working-copy diff against the target after the gates.

Inspected `git show d9ea9b42`, the source around each changed guard/test, the schema, fixture construction, prior F1 reproduction, and the generated-data changes. `git diff-tree --no-commit-id --name-status -r d9ea9b42` lists these 12 paths; a programmatic comparison against the target `lane.json` found zero paths outside its whitelist:

```text
M art/catalogue/catalogue.json
M art/catalogue/conflicts.md
M docs/art/catalogue/BAND_ALL.md
M docs/art/catalogue/BAND_LOWER1.md
M docs/art/catalogue/BAND_SURFACE.md
M docs/art/catalogue/INDEX.md
A tasks/TOOL.01.01/lane-bz/BRIEF_FIX1.md
M tasks/TOOL.01.01/lane-bz/lane.json
M tools/art/fixtures/templates/build_fixture.js
M tools/art/fixtures/templates/catalogue.fixture.json
M tools/art/make_blank_templates.js
M tools/art/test_blank_templates.js
```

The manifest now identifies Codex as reviewer, includes the fixture/test paths, and adds the template test to its gates. No engine-core, runtime-plugin, game-data, or shipped-art file changes are in this commit.

The regenerated catalogue retains 10,089 entries and 2,494 paint slots; sheets increase from 169 to 186. A semantic parent/target comparison found 74 changed entries: `promptFile` changes in 69, `runtime` in 23, `statusWhy` in 18, and `status` in 12 (counts overlap). None of the 69 removed prompt paths exists in this checkout; `build_catalogue.js:1694-1702` links sidecars that exist. The required Granite Boulder prompt remains linked to `art/prompts/SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT.json`. The 12 status changes remove prior APPROVED classifications: ten become EXISTING_UNAPPROVED and two STAND_IN. These regenerated files match a fresh build byte-for-byte in `catalogue.rebuild_identical`; the reviewer did not grant or revoke an art approval.

Read the project rules, current STATUS, latest audit A10/open findings, slice/vision context, ENGINE_RULES, ART_STANDARD, catalogue schema, lane brief, fix addendum and manifest. A10's runtime defects are outside this bounded tooling review. The requested gate generation writes blank templates only, explicitly allowed by DEC-007. A temporary STATUS review claim is removed before delivery.

A read-only same-family Codex subagent challenged the guard, fixture and mutation wiring. Its analysis is supporting work, not another cross-family certification. The primary reviewer inspected the implementation and produced the execution evidence and verdict independently of the implementer's results.

## Test execution results

All three commands ran sequentially in the foreground in the requested worktree with Node.js `v24.19.0`. Each native exit code was captured immediately in PowerShell as `$LASTEXITCODE`. No provocation or mutant environment override was used for these gates. Full captured outputs are appended below.

| Command | Exit code | Observed result |
|---|---:|---|
| `node tools/art/test_catalogue.js` | 0 | **47/47 checks passed**; schema 1.2.0 accepted; all 12 generated outputs match the committed files; live catalogue has zero rule errors. |
| `node tools/art/test_blank_templates.js` | 0 | **79 passed, 0 failed**; unpadded refusal passes; all **14 mutants killed**; unmodified control, fixture drift and repository-preservation checks pass. |
| `node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out art/templates --bg transparent` | 0 | **186 sheets, 2,494 slots** generated. Counts are 26 ATLAS, 151 RMMZ_CHARACTER and 9 RMMZ_TILESET sheets. |

Relevant real output:

```text
PASS templates.refusals[unpadded_stratum_slot]
PASS templates.mutants[control_passes]
PASS templates.mutants[unpadded_stratum_allowed]
INFO mutant unpadded_stratum_allowed killed by refusals: unpadded_stratum_slot: want exit 2 codes STRATUM_HEIGHT_MISMATCH; got exit 0; out written: true
PASS templates.fixture_contract
PASS templates.fixture_drift
PASS templates.repo_untouched
RESULT: 79 passed, 0 failed
EXIT=0
```

An additional read-only audit of every generated sidecar found all 2,494 slot rectangles equal to their catalogue rectangles. All 1,336 `GEOM_STRATUM_*` / `GEOM_LAYER_FACE` slots in this production catalogue satisfy per-frame padded `envelope.hMax` height. This count includes layer-face slots and is not a count of stratum-only slots.

These are working-tree closure checks on the actual target, not a fresh-clone integration run. The coordinator's fresh-clone and normal merge-gate obligations remain separate; no merge gate, merge or push was run.

Supplemental command: `node C:/Users/snewt/AppData/Local/Temp/deus-codex-d9ea9b42-review-20260929-2238/probe.js` (working directory: the lane worktree). Exit code 0. The separate sidecar/path audit was a Node script supplied on standard input (`node -`), also exit 0.

## Code inspection & resolution of finding F1

**F1 — MAJOR, introduced in 0be10e96: RESOLVED by d9ea9b42 for unpadded-height acceptance.**

At `tools/art/make_blank_templates.js:347-352`, the raw-height alternative is removed:

```js
const expectedSlotH = rows * Math.ceil(spec.frameH / g.tilePx) * g.tilePx;
if (slot.h !== expectedSlotH) {
    refuse('STRATUM_HEIGHT_MISMATCH', /* diagnostic */);
}
```

Padding is applied per frame before multiplying by the row count. Thus even a raw multi-row total that happens to be divisible by 48 is rejected. A naturally grid-aligned raw height needs no extra padding and is correctly accepted when equal to the required height. The CLI collects validation problems and returns 2 before creating the output directory or writing PNG/JSON files (`make_blank_templates.js:597-633`).

The `tileSizePx` strict equality and the normalized/raw geometry SHA alternatives remain at `make_blank_templates.js:242-247`. The passing tile-size refusal and SHA-removal mutant provide execution evidence; the supplemental probe also rejected numeric 47, string `"48"`, null tile size, and missing/mismatched geometry digests.

**Regression test quality.** `test_blank_templates.js:505` changes the first ramp's slot height from 48 to the raw first-stratum value 19. Its unchanged synthetic envelope fits 19, so an unrelated envelope refusal cannot hide the raw-height regression. At `:525-527`, the case requires exit 2, exactly `STRATUM_HEIGHT_MISMATCH`, and absence of the output directory. It does not pass for an arbitrary failure.

**Mutation quality.** The new mutant at `test_blank_templates.js:636` restores precisely the previous prohibited alternative: accepting `rows * spec.frameH`. The replacement anchor must occur exactly once (`:644-649`), the exercise selects `unpadded_stratum_slot` (`:665`), and an unmodified copied-tool control must first pass (`:873-887`). Exceptions do not count as kills (`:900-902`). The observed kill is behavioral: the broken tool exits 0 and writes output, causing the refusal assertion to fail. It is not a syntax-error or missing-dependency kill.

**Fixture and geometry scenarios.** `build_fixture.js:136-160` pads ramp/edge heights, repositions their anchors at the padded frame bottom, and uses padded `bandH` for single-row and two-row wall faces. `fixture_drift` confirms the committed fixture matches the builder. Stratum-change tests now inspect moving ticks when a split changes without crossing a tile boundary; the stale-rectangle scenario uses `[40,14,14,14,14]` to cross that boundary. The layer-height scenario at `test_blank_templates.js:456-463` uses 120-pixel layers with 144-pixel padded frames, including the two-row wall-face fixture's 288-pixel total. Pixel and sidecar checks run for those scenarios.

**Independent replay of the original exploit.** A temporary review script builds a real production catalogue for `[20,19,19,19,19]`, verifies the padded baseline is accepted, and changes only the selected stratum slot height to 20. It loads parent/target validators from their actual source with test-only exports in memory; no repository source is modified. The parent accepts the raw slot, the target rejects it, and the catalogue builder reports `GEOM_HEIGHT` and `SLOT_OFF_GRID`. Real CLI probes then verify both one row of 20 and twelve rows totaling 240 are refused with exit 2 and no output directory. Padded 48/576 controls pass the target validator. Full output is in Appendix D.

```text
PASS CLI rows=1 rawHeight=20: EXIT=2, outputExists=false
PASS CLI rows=12 rawHeight=240: EXIT=2, outputExists=false
PASS padded control rows=12 slotHeight=576: validator accepts
```

## Not done / known problems

1. **Pre-existing irregular-geometry limitation remains open.** `stratumSpec()` at `make_blank_templates.js:205-212` uses the bottom cumulative run; `SCHEMA.md:57,121` and `build_catalogue.js:1170-1175` require the tallest consecutive run (`hMax`) for slot padding. With `[10,20,30,20,16]`, H2 has a bottom run of 30 but maximum run of 50. A schema-valid production slot is 96 high; the target still expects 48 and refuses it. The supplemental probe reproduced this refusal on both the actual parent and target. The irregular synthetic fixture shares the bottom-run assumption, so its passing test does not prove arbitrary-geometry compatibility with the production builder. This was already documented in the previous review and is not introduced by this fix. F1's raw-height acceptance is closed; general tallest-window compatibility is not.
2. **Coverage limit:** the committed new refusal directly covers one synthetic ramp row. The original production-catalogue and aggregate-grid multi-row regressions were exercised by this review's temporary probe; those probes are not permanent repository tests.
3. **Playable proof not performed:** no RMMZ F5/F8 run, gameplay screenshot, asset placement, new-art QA, animation check, or save/load test occurred. This tooling closure does not establish those outcomes.
4. The review does not reconcile historical STATUS counts (for example 207 sheets / 85 atlases) or change coordinator-owned WBS state. The observed target output is 186 sheets / 26 atlases.

## Evidence and GAME TRANSLATION

**Classification: C — FOUNDATIONAL / INDIRECT.** TOOL.01.01's bounded effect is to reject malformed template layout before a downstream art-validation/placement operation consumes it.

| Required field | Evidence / status |
|---|---|
| Player / World Effect | Indirect assurance against disagreement between atlas slots and placement crops; no new visible game behavior is claimed. |
| Trigger | Run the catalogue/template validation commands during asset preparation. |
| Runtime Authority | No new simulation authority. `art/catalogue/catalogue.json`, geometry and schema define the offline layout contract. |
| Simulation Path | No simulation mutation. `build_catalogue.js` -> catalogue -> `make_blank_templates.js` -> blank PNG and JSON sidecar. |
| Engine Bridge | Downstream `validate_art.js` / `place_art.js` consume the catalogue and template sidecars. Runtime texture integration is outside this fix and was not exercised. |
| Visible Result | Opened `art/templates/ATLAS_LOWER1_SHARED_PROP_01.png`: an 864x144 blank template with cyan grid/slot edges, yellow slot labels, and short stratum ticks on the layer-face slots; no painted asset imagery. This is a template inspection, not a gameplay screenshot or review of every sheet. |
| Persistence | Catalogue and test fixtures persist in Git; generated template PNG/JSON files persist under `art/templates/`. No game-save schema or data change. |
| Failure Without This Lane | Raw stratum frames can produce successful template sidecars despite failing the catalogue builder's padded-grid contract. |
| Automated Proof | Three passing foreground gates, original-exploit/multi-row probe, and all-sidecar rectangle/padding audit described above. |
| In-Game Proof | Not performed; inapplicable to direct proof of this offline refusal. Subsequent approved asset integration needs its own engine and Owner proof. |

**CONSUMED BY GAME SYSTEMS:** the immediate consumers are `tools/art/validate_art.js:677-686` (catalogue/sidecar rectangle agreement) and `tools/art/place_art.js` (validation and placement into prepared outputs). Eventual game textures are downstream of approved placement/export. No live-game consumption test was run, and this review does not rely on the older brief's `place_asset.js` / `DEUS_Visuals.js` references.

| Required status | Result for this fix |
|---|---|
| Simulation implemented | NO — offline tooling; inapplicable. |
| Engine bridge implemented | NO — no bridge change in this commit; existing downstream bridge not assessed. |
| Presentation implemented | NO — no game presentation change; blank-template rendering was exercised. |
| Input/player interaction implemented | NO — offline CLI only; inapplicable. |
| Save/load implemented | NO — static artifacts only; game save/load inapplicable. |
| Playable verification performed | NO — no RMMZ playtest performed. |

No gameplay screenshot was produced. The representative template PNG was opened and inspected as described above. Temporary full logs and the replay source are retained at `C:/Users/snewt/AppData/Local/Temp/deus-codex-d9ea9b42-review-20260929-2238/` (`gate1-catalogue.log`, `gate2-templates.log`, `gate3-generate.log`, `probe.js`, `probe.log`). These temporary paths are supporting evidence, not committed dependencies; the outputs are embedded below.

## What changed / delivery

The reviewer wrote this report only; no implementation fix was made. The explicitly requested third gate generated local blank templates under `art/templates/`. The temporary STATUS claim is removed before handoff; no WBS transition, merge, push, or art approval is made.

The final STATUS diff is empty. Staging only this report was attempted, but repository Git metadata is outside the session's writable root:

```text
git add tasks/TOOL.01.01/lane-bz/review_codex_d9ea9b42.md
fatal: Unable to create 'C:/Users/snewt/OneDrive/Desktop/UF/.git/worktrees/lane-bz/index.lock': Permission denied
STAGE_EXIT=128
```

The report remains unstaged/uncommitted. No commit command was run after staging failed, and no unrelated file was staged. The session prohibits permission escalation. A session with write access to that Git metadata can complete the project-required report-only commit:

```powershell
git add tasks/TOOL.01.01/lane-bz/review_codex_d9ea9b42.md
git commit -m "[codex] TOOL.01.01 independent closure re-review of d9ea9b42"
```

## Try it in RMMZ

Not applicable to reproducing this offline validator fix. Re-run the three exact commands above; expected results are 47/47, 79/79 with all 14 mutants killed, and 186 generated sheets / 2,494 slots. The coordinator and Owner retain subsequent integration and gameplay acceptance gates.

## Decisions needed

None to record this F1 closure verdict. The coordinator retains integration authority and should keep the pre-existing tallest-window mismatch distinct from the resolved raw-height regression.

## Appendix A - catalogue gate output

```text
PASS catalogue.schema: $id deus-art-catalogue/1.2.0; unsupported keywords 0; 10089 entries, 186 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10089 entries checked; 0 bad
PASS catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: none; catalogue.json sha256 d5330b8226c04ead...
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

47/47 checks passed
EXIT=0
```

## Appendix B - blank-template gate output

```text
INFO temp folder C:\Users\snewt\AppData\Local\Temp\deus-blank-templates-test-y23PY9
INFO fixture: 5 sheets, 28 paint slots, 31 entries, geometry text sha256 a1b95e7eb35208a0d1406a49e04fd7f977999e7751b5f96d20d45bc0a1b60235
PASS templates.run
PASS templates.one_per_sheet
PASS templates.dimensions
PASS templates.census
PASS templates.slot_edges
PASS templates.interior
PASS templates.free_area
PASS templates.labels
PASS templates.sidecar
PASS templates.png_chunks
INFO run1 sha256 TEST_ATLAS_SURFACE.png b1d47ceca94393bee4db8aa32690acdbbb50abea80a557ec79399bc121c16e89
INFO run1 sha256 TEST_A2_SURFACE.png b4ee04a59b6a47265b362b101e7f54415afca885560273b4ec6aa948e8536244
INFO run1 sha256 $TEST_Human.png a542c5fde1718221c316606cfed3648d7b9359cea7f9cc1d306d3da5e2b3e9b4
INFO run1 sha256 $TEST_Ogre.png bbf6ff2432161400f5325bb3cec99775db4ab78f0841c368f4f9a78db0064f1d
INFO run1 sha256 $TEST_Horse.png 8cdcbee81a4675d6428792926ef68ddd516fa67ffe28c72044dccc3a3daef05d
INFO run2 sha256 $TEST_Horse.png 8cdcbee81a4675d6428792926ef68ddd516fa67ffe28c72044dccc3a3daef05d
INFO run2 sha256 $TEST_Human.png a542c5fde1718221c316606cfed3648d7b9359cea7f9cc1d306d3da5e2b3e9b4
INFO run2 sha256 $TEST_Ogre.png bbf6ff2432161400f5325bb3cec99775db4ab78f0841c368f4f9a78db0064f1d
INFO run2 sha256 TEST_A2_SURFACE.png b4ee04a59b6a47265b362b101e7f54415afca885560273b4ec6aa948e8536244
INFO run2 sha256 TEST_ATLAS_SURFACE.png b1d47ceca94393bee4db8aa32690acdbbb50abea80a557ec79399bc121c16e89
PASS templates.determinism
PASS templates.bg_magenta
PASS templates.palette
INFO opaque colours in templates: #00FFFFFF, #FFFF00FF, #FF00FFFF; master palette 226 colours
PASS templates.stratum_param[changed_split]
PASS templates.stratum_param[stale_catalogue_refused]
PASS templates.stratum_param[stale_rects_refused]
PASS templates.stratum_param[invalid_zero_stratum_refused]
PASS templates.stratum_param[invalid_sum_not_layerPx_refused]
PASS templates.stratum_param[invalid_too_few_strata_refused]
PASS templates.stratum_param[invalid_fractional_refused]
PASS templates.stratum_param[invalid_not_an_array_refused]
PASS templates.stratum_param[irregular_split]
PASS templates.stratum_param[layerPx_param]
PASS templates.tall_medium[off_by_default]
PASS templates.tall_medium[on_adds_slots]
PASS templates.tall_medium[disabled_use_refused]
PASS templates.readability_floor
PASS templates.refusals[variant_has_slot]
PASS templates.refusals[huge_has_slot]
PASS templates.refusals[slot_overlap]
PASS templates.refusals[slot_out_of_sheet]
PASS templates.refusals[slot_too_small]
PASS templates.refusals[missing_scale_row]
PASS templates.refusals[duplicate_slot_id]
PASS templates.refusals[bad_slot_id]
PASS templates.refusals[unknown_sheet]
PASS templates.refusals[frame_size_mismatch]
PASS templates.refusals[frames_do_not_divide]
PASS templates.refusals[unknown_frame_class]
PASS templates.refusals[envelope_exceeds_slot]
PASS templates.refusals[z_out_of_range]
PASS templates.refusals[old_schema]
PASS templates.refusals[tile_size_mismatch]
PASS templates.refusals[character_sheet_size]
PASS templates.refusals[atlas_too_big]
PASS templates.refusals[unsafe_sheet_id]
PASS templates.refusals[sheet_id_case_clash]
PASS templates.refusals[geometry_missing]
PASS templates.refusals[palette_missing]
PASS templates.refusals[grid_colour_in_palette]
PASS templates.refusals[label_colour_in_palette]
PASS templates.refusals[magenta_in_palette]
PASS templates.refusals[unpadded_stratum_slot]
PASS templates.refusals[usage_no_out]
PASS templates.refusals[usage_bad_bg]
PASS templates.out_dir_safety[rerun_keeps_readme_removes_stale]
PASS templates.out_dir_safety[painted_template_refused]
PASS templates.out_dir_safety[unknown_file_refused]
PASS templates.out_dir_safety[unknown_png_refused]
PASS templates.out_dir_safety[file_as_out_refused]
PASS templates.no_literals
INFO literal scan: 118 numeric literals checked against 8,9,10,15,16,19,20,24,26,28,32,42,48,64,96,144,192,288,384
PASS templates.mutants[control_passes]
PASS templates.mutants[wrong_sheet_size]
INFO mutant wrong_sheet_size killed by dimensions: dimensions: TEST_ATLAS_SURFACE: PNG is 4097x4096, catalogue says 4096x4096
PASS templates.mutants[shifted_slot]
INFO mutant shifted_slot killed by slot_edges: slot_edges: TEST_ATLAS_SURFACE:0000 (0,0 96x96): 93 boundary pixel(s) not grid colour
PASS templates.mutants[missing_sheet]
INFO mutant missing_sheet killed by one_per_sheet: one_per_sheet: missing $TEST_Horse.png
PASS templates.mutants[extra_colour]
INFO mutant extra_colour killed by census: census: TEST_ATLAS_SURFACE: 164 pixel(s) outside {bg #00000000, grid #00FFFFFF, label #FFFF00FF}, e.g. (145,116) #010203FF, (146,116) #010203FF, (147,116) #010203FF
PASS templates.mutants[hardcoded_stratum]
INFO mutant hardcoded_stratum killed by stratum_param: changed_split: split [20,19,19,19,19]: interior: TEST_ATLAS_SURFACE:0008: 16 interior pixel(s) differ from grid/tick/background e.g. (1,172) #00000000 want #00FFFFFF; sidecar: TEST; literal scan: 19,19,19,19,20
PASS templates.mutants[sha_check_removed]
INFO mutant sha_check_removed killed by stratum_param: stale_catalogue_refused: exit 2 codes STRATUM_HEIGHT_MISMATCH stderr: REFUSED STRATUM_HEIGHT_MISMATCH: TEST_SURFACE_B1_RAMP_RISE2_V1_BASE: GEOM_STRATUM_2 needs slot height 96 from 
PASS templates.mutants[ticks_off]
INFO mutant ticks_off killed by interior: interior: TEST_ATLAS_SURFACE:0008: 25 interior pixel(s) differ from grid/tick/background e.g. (2,146) #FFFF00FF want #00000000
PASS templates.mutants[grid_offset]
INFO mutant grid_offset killed by free_area: free_area: TEST_ATLAS_SURFACE: 681652 pixel(s) outside slots differ from grid/background e.g. (480,1) #00000000 want #00FFFFFF
PASS templates.mutants[labels_off]
INFO mutant labels_off killed by labels: labels: TEST_ATLAS_SURFACE:0000: label reads "       " (want "0000 AB"), 68 pixel(s) differ
PASS templates.mutants[sidecar_xy_swapped]
INFO mutant sidecar_xy_swapped killed by sidecar: sidecar: TEST_ATLAS_SURFACE:0001: x is 0, want 96
PASS templates.mutants[variant_slot_allowed]
INFO mutant variant_slot_allowed killed by refusals: variant_has_slot: want exit 2 codes VARIANT_HAS_SLOT; got exit 0; out written: true
PASS templates.mutants[palette_check_removed]
INFO mutant palette_check_removed killed by refusals: grid_colour_in_palette: want exit 2 codes PALETTE_COLLISION; got exit 0; out written: true
PASS templates.mutants[unpadded_stratum_allowed]
INFO mutant unpadded_stratum_allowed killed by refusals: unpadded_stratum_slot: want exit 2 codes STRATUM_HEIGHT_MISMATCH; got exit 0; out written: true
PASS templates.mutants[timestamp_in_sidecar]
INFO mutant timestamp_in_sidecar killed by determinism: two runs differ
PASS templates.fixture_contract
PASS templates.fixture_drift
PASS templates.repo_untouched
RESULT: 79 passed, 0 failed
EXIT=0
```

## Appendix C - production template generation output

```text
WROTE ATLAS_ALL_SHARED_CHARACTER_01.png 4032x960 slots=104 sha256=6626fe8af98354c3faaacc9c8aabb2496358979b3f993f800a87620fada05d5d
WROTE ATLAS_ALL_SHARED_EFFECT_01.png 576x192 slots=4 sha256=efc61c029d5ace1bd2e2054417d4ee034f3db2c1c4561861ceb0b5b46ffa6cd0
WROTE ATLAS_ALL_SHARED_FACE_01.png 4032x2304 slots=52 sha256=af0e43ce2a8f61dc60b32df29746d2442429e09654fef4644917341054d2d6e0
WROTE ATLAS_ALL_SHARED_ITEM_01.png 2928x48 slots=61 sha256=6e551c6e62c882259677be4e9e1de2dfcc935f5b6f8cf091326ae720da9c6ce2
WROTE ATLAS_ALL_SHARED_PROP_01.png 4080x192 slots=50 sha256=4a29fedc827262aa9ef0db91f8d76b4a96b3a333125c56367846f23454d6c08f
WROTE ATLAS_ALL_SHARED_TILE_01.png 2112x144 slots=26 sha256=7452841291c6252aee3b92d614283a32ca92db798a37a118e5c85388c6e42ec4
WROTE ATLAS_LOWER1_SHARED_CHARACTER_01.png 864x384 slots=5 sha256=85f9b9b147fa5a5e2692acd53890d2e05576b7e50460c8793a60765089588542
WROTE ATLAS_LOWER1_SHARED_OVERLAY_01.png 1392x96 slots=29 sha256=74f65061648e04c28dee0e9a4a600eb49c16b6d4ad8128a36f9c8b176a0d2f48
WROTE ATLAS_LOWER1_SHARED_PROP_01.png 864x144 slots=13 sha256=c15b37345ebbbf6944042364f410d036c6ea3fc9b300e2d22d58ce12b71d28ee
WROTE ATLAS_LOWER1_SHARED_TILE_01.png 4080x432 slots=203 sha256=12419a297cc5f2ad0f6403e6c7f1fbeb8f85d421bed64289c5a01fd153478fc7
WROTE ATLAS_LOWER2_SHARED_CHARACTER_01.png 864x384 slots=5 sha256=85f9b9b147fa5a5e2692acd53890d2e05576b7e50460c8793a60765089588542
WROTE ATLAS_LOWER2_SHARED_OVERLAY_01.png 1392x96 slots=29 sha256=74f65061648e04c28dee0e9a4a600eb49c16b6d4ad8128a36f9c8b176a0d2f48
WROTE ATLAS_LOWER2_SHARED_PROP_01.png 384x96 slots=6 sha256=915f69b24136696faa6cdf6d4d789be8ddf277c9b97e42b521d34707d9beee5e
WROTE ATLAS_LOWER2_SHARED_TILE_01.png 288x96 slots=6 sha256=e37480855f78b25e14b1488868ca4a4914625e14891da1c0108cb8a1774d8eeb
WROTE ATLAS_SURFACE_SHARED_CHARACTER_01.png 864x384 slots=5 sha256=85f9b9b147fa5a5e2692acd53890d2e05576b7e50460c8793a60765089588542
WROTE ATLAS_SURFACE_SHARED_OVERLAY_01.png 1392x96 slots=29 sha256=74f65061648e04c28dee0e9a4a600eb49c16b6d4ad8128a36f9c8b176a0d2f48
WROTE ATLAS_SURFACE_SHARED_PROP_01.png 2880x144 slots=44 sha256=cd62bce2721d593c6d9212f08fb7a005bbd17545f62060f83985edc691c85902
WROTE ATLAS_SURFACE_SHARED_TILE_01.png 4080x2592 slots=1731 sha256=04c5dfe455ac8de27f5ad23514d1b8dec9418f86f5786c0e3a2cf6ea100b549a
WROTE ATLAS_UPPER1_SHARED_CHARACTER_01.png 864x384 slots=5 sha256=85f9b9b147fa5a5e2692acd53890d2e05576b7e50460c8793a60765089588542
WROTE ATLAS_UPPER1_SHARED_OVERLAY_01.png 1392x96 slots=29 sha256=74f65061648e04c28dee0e9a4a600eb49c16b6d4ad8128a36f9c8b176a0d2f48
WROTE ATLAS_UPPER1_SHARED_PROP_01.png 384x96 slots=6 sha256=915f69b24136696faa6cdf6d4d789be8ddf277c9b97e42b521d34707d9beee5e
WROTE ATLAS_UPPER1_SHARED_TILE_01.png 288x96 slots=6 sha256=e37480855f78b25e14b1488868ca4a4914625e14891da1c0108cb8a1774d8eeb
WROTE ATLAS_UPPER2_SHARED_CHARACTER_01.png 864x384 slots=5 sha256=85f9b9b147fa5a5e2692acd53890d2e05576b7e50460c8793a60765089588542
WROTE ATLAS_UPPER2_SHARED_OVERLAY_01.png 1392x96 slots=29 sha256=74f65061648e04c28dee0e9a4a600eb49c16b6d4ad8128a36f9c8b176a0d2f48
WROTE ATLAS_UPPER2_SHARED_PROP_01.png 384x96 slots=6 sha256=915f69b24136696faa6cdf6d4d789be8ddf277c9b97e42b521d34707d9beee5e
WROTE ATLAS_UPPER2_SHARED_TILE_01.png 288x96 slots=6 sha256=e37480855f78b25e14b1488868ca4a4914625e14891da1c0108cb8a1774d8eeb
WROTE RMMZ_ADAM.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_DUNGEON-A4.png 768x720 slots=0 sha256=685265cf13fe7b32419bb63e3ff8c9032347595d6bceb02c129f5c67cbd454a9
WROTE RMMZ_EVE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_OUTSIDE-A1.png 768x576 slots=0 sha256=2b2b4684d739be1181330f6990497edf016994d1bbcb223918f3ad315e5b08ad
WROTE RMMZ_OUTSIDE-A2.png 768x576 slots=0 sha256=2b2b4684d739be1181330f6990497edf016994d1bbcb223918f3ad315e5b08ad
WROTE RMMZ_OUTSIDE-A4.png 768x720 slots=0 sha256=685265cf13fe7b32419bb63e3ff8c9032347595d6bceb02c129f5c67cbd454a9
WROTE RMMZ_OUTSIDE-B.png 768x768 slots=0 sha256=4450d9365d9b86b02fb1dc80610566469632d80f4e5f0569ad3ccbffba554b6b
WROTE RMMZ_UF-APOTHECARY-BENCH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-BED-WOOD.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-BIRCH.png 288x576 slots=0 sha256=427d69c70be6014290ec84de758eb3d547e16c7bf14efc91948161ae22953db2
WROTE RMMZ_UF-BOWYER-BENCH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-BRIDGE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-BUSH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-CAMPFIRE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-CAVEMOSS.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-CHEST-WOOD.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-CRIB.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-CRYSTALSPIRE.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-DINING-BENCH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-DINING-TABLE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-DOOR-IRON.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-DOOR-STONE.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-DOOR-WOOD.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-DWARF-FEMALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-DWARF-MALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ELF-FEMALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ELF-MALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-FALLENPILLAR.png 288x192 slots=0 sha256=afba1d524684e6d9aaabc1056a6019137234737493d3aa926100e0aaad120427
WROTE RMMZ_UF-FARMPLOT.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-FIR-SNOW.png 288x576 slots=0 sha256=427d69c70be6014290ec84de758eb3d547e16c7bf14efc91948161ae22953db2
WROTE RMMZ_UF-FLETCHER-BENCH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-FRUIT-TREE.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-FRUIT-TREE-BARE.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-FURNACE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-FX-BLOOD.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-FX-HIT.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-GLOWCAPS.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-GNOME-FEMALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-GNOME-MALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-GRASSTUFT.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-GRAVEL.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-1-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-2-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-3-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-4-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-5-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-FEMALE-6-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-1-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-2-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-3-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-4-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-5-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-HUMAN-MALE-6-WALK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-102.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-107.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-110.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-114.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-120.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-128.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-129.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-132.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-135.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-136.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-138.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-140.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-141.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-150.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-153.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-167.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-169.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-216.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-225.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-256.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-260.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-261.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-265.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-274.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-289.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-290.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-291.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-295.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-297.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-298.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-300.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-301.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-313.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-96.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-97.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-98.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ICON-99.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-IRONSTONEDEPOSIT.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-BERRIES.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-BONE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-COPPERORE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-IRONORE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-LOG.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-MEATCOOKED.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-MEATRAW.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-STONE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-ITEM-STRAW.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-KITCHEN-COUNTER.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-KITCHEN-PANTRY.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-BOW-SHORT.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-CLUB.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-SHIELD-WOOD.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-SPEAR.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-STONE-AXE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-STONE-KNIFE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LAYER-STONE-PICK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-LEVELS-A1.png 768x576 slots=0 sha256=2b2b4684d739be1181330f6990497edf016994d1bbcb223918f3ad315e5b08ad
WROTE RMMZ_UF-LEVELS-A2.png 768x576 slots=0 sha256=2b2b4684d739be1181330f6990497edf016994d1bbcb223918f3ad315e5b08ad
WROTE RMMZ_UF-LEVELS-A4.png 768x720 slots=0 sha256=685265cf13fe7b32419bb63e3ff8c9032347595d6bceb02c129f5c67cbd454a9
WROTE RMMZ_UF-LEVELS-B.png 768x768 slots=0 sha256=4450d9365d9b86b02fb1dc80610566469632d80f4e5f0569ad3ccbffba554b6b
WROTE RMMZ_UF-LICHEN.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-MANGROVE.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-OAK.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-PALM.png 288x576 slots=0 sha256=427d69c70be6014290ec84de758eb3d547e16c7bf14efc91948161ae22953db2
WROTE RMMZ_UF-PINE.png 288x576 slots=0 sha256=427d69c70be6014290ec84de758eb3d547e16c7bf14efc91948161ae22953db2
WROTE RMMZ_UF-RUBBLE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-SHOP-COUNTER.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-SKELETON.png 288x192 slots=0 sha256=afba1d524684e6d9aaabc1056a6019137234737493d3aa926100e0aaad120427
WROTE RMMZ_UF-SMALLCRYSTALS.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-SMITHY.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-SNOWBUSH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-SPOREREEDS.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STALAGMITE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-BIGMONSTER1-R1.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-MONSTER-0.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-MONSTER-1.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-STOCK-MONSTER-4.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-MONSTER-5.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-MONSTER-6.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-NATURE-0.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-NATURE-1.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-NATURE-2.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-NATURE-3.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-NATURE-5.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-SF-MONSTER-2.png 288x192 slots=0 sha256=afba1d524684e6d9aaabc1056a6019137234737493d3aa926100e0aaad120427
WROTE RMMZ_UF-STOCK-SF-MONSTER-6.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-VEHICLE-2.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCK-VEHICLE-4.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STOCKPILE.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-STONEWALLS-SET.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-STRAW-BED.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_UF-TANNING-RACK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-TOWERCAP.png 432x576 slots=0 sha256=ebbf342ad53fb47f0f09e90b9764eb109bcdc2959b93ca66f41edc8e534ccf0c
WROTE RMMZ_UF-TREE-CURSED.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-TREE-DEAD.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-TREE-SAVANNA.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-TREE-SWAMP.png 288x384 slots=0 sha256=7dcd69e1c2bfd66ef5eb556b29abe88e831623d9acdd4d1356068f48ed21f1fb
WROTE RMMZ_UF-TREE-TROPICAL.png 432x576 slots=0 sha256=ebbf342ad53fb47f0f09e90b9764eb109bcdc2959b93ca66f41edc8e534ccf0c
WROTE RMMZ_UF-WEAPON-RACK.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-WELL.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-WILD-GRAIN.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-WILDFLOWERS.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_UF-WORKBENCH.png 144x192 slots=0 sha256=b26e60a542ea1834a0bee6ba3a4659b02f576a8cf3458583d425ad684dc1b8ba
WROTE RMMZ_WALLSTONE-SET.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
WROTE RMMZ_WALLWOOD-SET.png 144x384 slots=0 sha256=bb9d9adbe2e7c7b885a8714edcb6af967d33f74d302ec059a8e903203755473c
TEMPLATES: 186 sheet(s), 2494 slot(s) in C:\Users\snewt\.deus_worktrees\lane-bz\art\templates
EXIT=0
```

## Appendix D - supplemental regression probe output

```text
PASS production builder baseline: reordered [20,19,19,19,19], target validator accepts padded catalogue
PASS original F1 reproduction: raw20 parent accepts; target rejects STRATUM_HEIGHT_MISMATCH; builder rejects GEOM_HEIGHT,SLOT_OFF_GRID
PASS CLI rows=1 rawHeight=20: EXIT=2, outputExists=false
REFUSED STRATUM_HEIGHT_MISMATCH: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: GEOM_STRATUM_1 needs slot height 48 from stratumPx [20,19,19,19,19] (padded to 48px grid) but the slot is 20 high
REFUSED: 1 problem(s); nothing written
PASS padded control rows=1 slotHeight=48: validator accepts
PASS CLI rows=12 rawHeight=240: EXIT=2, outputExists=false
REFUSED STRATUM_HEIGHT_MISMATCH: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H1_DEFAULT: GEOM_STRATUM_1 needs slot height 576 from stratumPx [20,19,19,19,19] (padded to 48px grid) but the slot is 240 high
REFUSED: 1 problem(s); nothing written
PASS padded control rows=12 slotHeight=576: validator accepts
PASS preserved guards: tileSizePx 47/string48/null and missing/mismatched SHA refused
KNOWN pre-existing tallest-window mismatch parent: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H2_DEFAULT: GEOM_STRATUM_2 needs frame height 30 from stratumPx [10,20,30,20,16] (slot height 1 x 30 = 30) but the slot is 96 high
KNOWN pre-existing tallest-window mismatch target: LOWER1_SHARED_EDGE_CAVE-FLOOR_E-H2_DEFAULT: GEOM_STRATUM_2 needs slot height 48 from stratumPx [10,20,30,20,16] (padded to 48px grid) but the slot is 96 high
CATALOGUE semantic diff: {"entriesBefore":10089,"entriesAfter":10089,"sheetsBefore":169,"sheetsAfter":186,"changedEntries":74,"changedEntryFields":{"promptFile":69,"runtime":23,"statusWhy":18,"status":12}}
PROBE PASS: original raw-height regression and multi-row aggregate-grid case closed; retained geometry limitation reproduced on parent and target.
EXIT=0
```

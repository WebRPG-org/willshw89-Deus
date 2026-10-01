# Independent Grok Review — WG.20.03 / lane-pg

| Field | Value |
|---|---|
| Role | Reviewer (grok), writer was claude (Claude Opus 5.5) |
| Lane | lane-pg |
| WBS | WG.20.03 |
| Branch | `task/lane-pg` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-pg` |
| Reviewed commit | `41389d4c7d04580cfe274e1c610324536dfb1ae6` |
| Subject | `[claude] WG.20.03 evidence: --check, test_rmmz_rows and test_catalogue rerun at the report commit 0a6484b0 (clean LF clone)` |
| Diff range | `65e97351ed991a129fccf5e06edb75aa161566da..41389d4c7d04580cfe274e1c610324536dfb1ae6` |
| Authority | `tasks/WG.20.03/lane-pg/BRIEF.md` (Writer and reviewer), `lane.json` |
| Review date | 2026-10-01 |

No art was generated, requested, or integrated (DEC-007). Catalogue content, the builder, the fixtures, and the tests were not modified by this review. The only file added for the review is this one.

## Git confirmation

`git log -n 5 --oneline` and `git status --porcelain=v1` in the worktree, then `git rev-parse HEAD`:

```text
41389d4c [claude] WG.20.03 evidence: --check, test_rmmz_rows and test_catalogue rerun at the report commit 0a6484b0 (clean LF clone)
0a6484b0 [claude] WG.20.03 report: REPORT.md, evidence logs (fail-before, gates, provocations, mutants, sweep failure, --check after drop, WSR/slot evidence); STATUS row In Review
e6b5f421 [claude] WG.20.03 WIP: test_rmmz_rows.js (104 checks, 16 mutants), expected fixture from ROWS.md, SCHEMA.md 1.4.0
5096f24c [claude] WG.20.03 WIP: schema 1.4.0 (MARK, rmmzForm, envelopeOverride, footprintOverride), rule cases, rule_coverage
cccd0b86 [claude] WG.20.03 WIP: rmmz_rows.json input, builder rows/re-forms/rules, AR-2200..AR-2205, rebuilt outputs
```

HEAD is `41389d4c7d04580cfe274e1c610324536dfb1ae6` on `task/lane-pg`. The tracked tree matches that commit. One untracked file, `tasks/WG.20.03/lane-pg/launches/20261001_082633_prompt.txt`, is the reviewer launch prompt. It is outside the reviewed range and was not staged.

## Clone

Gates ran in a local clone made with `core.autocrlf=false`:

```text
git clone -c core.autocrlf=false --local --branch task/lane-pg <worktree> %TEMP%\lanepg_grok_tip
```

Checked in that clone before quoting the gate logs:

```text
TIP_HEAD=41389d4c AUTO=false PORCELAIN=0
```

Full HEAD `41389d4c7d04580cfe274e1c610324536dfb1ae6`. Porcelain empty.

The fail-before base is a second clone, detached at the lane base, also `core.autocrlf=false`, porcelain empty before the test files were copied on:

```text
BASE_HEAD=65e97351ed991a129fccf5e06edb75aa161566da AUTO=false PORCELAIN=0
```

The sweep and the dropped-row `--check` ran in a third clone of the tip, created in this review:

```text
git clone -c core.autocrlf=false --local --branch task/lane-pg %TEMP%\lanepg_grok_tip %TEMP%\lanepg_grok_scratch
SCRATCH_HEAD=41389d4c7d04580cfe274e1c610324536dfb1ae6 AUTOCRLF=false
```

## Scope

`git diff --name-status 65e97351ed991a129fccf5e06edb75aa161566da HEAD` (34 paths):

```text
M	art/catalogue/catalogue.json
M	art/catalogue/catalogue.schema.json
M	art/catalogue/conflicts.md
M	art/catalogue/references.json
A	art/catalogue/rmmz_rows.json
M	art/catalogue/scale_chart.json
M	art/catalogue/size_classes.json
M	docs/ASSET_REQUESTS.md
M	docs/STATUS.md
M	docs/art/catalogue/BAND_ALL.md
M	docs/art/catalogue/BAND_SURFACE.md
M	docs/art/catalogue/INDEX.md
M	docs/art/catalogue/SCHEMA.md
A	tasks/WG.20.03/lane-pg/REPORT.md
A	tasks/WG.20.03/lane-pg/evidence/check_after_drop.log
A	tasks/WG.20.03/lane-pg/evidence/envelope_before_overrides.log
A	tasks/WG.20.03/lane-pg/evidence/evidence_runs.log
A	tasks/WG.20.03/lane-pg/evidence/fail_before.log
A	tasks/WG.20.03/lane-pg/evidence/gates_base.log
A	tasks/WG.20.03/lane-pg/evidence/gates_tip.log
A	tasks/WG.20.03/lane-pg/evidence/mutant_sweep_fails.log
A	tasks/WG.20.03/lane-pg/evidence/mutants.log
A	tasks/WG.20.03/lane-pg/evidence/provocations.log
A	tasks/WG.20.03/lane-pg/evidence/report_tip_check.log
A	tasks/WG.20.03/lane-pg/evidence/size_override_case.log
A	tasks/WG.20.03/lane-pg/launches/20261001_073149_prompt.txt
M	tools/art/build_catalogue.js
A	tools/art/fixtures/catalogue/cases/rmmz_form.json
A	tools/art/fixtures/catalogue/cases/rmmz_size_override.json
A	tools/art/fixtures/catalogue/cases/rmmz_tile_dup.json
A	tools/art/fixtures/catalogue/rmmz_rows_expected.json
M	tools/art/test_catalogue.js
A	tools/art/test_rmmz_rows.js
M	tools/ops/active_lanes.json
```

Every path is inside `tasks/WG.20.03/lane-pg/lane.json` `allowedPaths`. Paths outside that list: 0. Image names (`png`, `jpg`, `jpeg`, `gif`, `bmp`, `webp`, `tga`): 0. Paths under `game/`: 0. `tools/art/fixtures/catalogue/mini/context.json` is allowed and is absent from the diff.

`docs/ASSET_REQUESTS.md` contains the ROWS.md section 4 fenced block once, starting at line 328 (the AR-2200 heading, after the AR-2100 table). Byte compare of that fenced block: `BLOCK_CHARS=3191`, `OCCURRENCES=1`, `AR_VERBATIM=1`.

## Gate commands

Run in `%TEMP%\lanepg_grok_tip` (`core.autocrlf=false`, porcelain empty, HEAD `41389d4c`). Each exit code is from that run.

| Command | Exit | Observed |
|---|---:|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | 0 | `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | 0 | `RESULT: 279 passed, 0 failed` |
| `node tools/art/build_catalogue.js --check` | 0 | `WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)` then `CHECK: OK (12 generated files match)` |
| `node tools/art/test_catalogue.js` | 0 | `50/50 checks passed` |
| `node tools/art/test_rmmz_rows.js` | 0 | `104/104 checks passed` |
| `node tools/art/test_rmmz_rows.js --mutants` | 0 | `16/16 mutants killed` |
| `node tools/art/test_multi_variant_topology.js` | 0 | `Results: 887 passed, 0 failed.` |
| `node tools/art/test_blank_templates.js` | 0 | `RESULT: 79 passed, 0 failed` |
| `node tools/art/test_place_art.js` | 0 | `RESULT: 154 passed, 0 failed` |

`test_catalogue.js` on the new schema and the three new cases:

```text
PASS catalogue.schema: $id deus-art-catalogue/1.4.0; unsupported keywords 0; 10194 entries, 199 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.rule_rmmz_form: an RMMZ form whose paint slot is not the RMMZ target (a 96x96 slot on a one-cell B tile): baseline fixture 0 errors; patched fixture -> 1 RMMZ_FORM (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot 96x96 is not the RMMZ target 48x48 (1x1 cells of 48 px))
PASS catalogue.rule_rmmz_size_override: an envelope that does not equal its per-row size override (WG.20.03 D4; the oak override 56-89x72-96 on an envelope left at the chart row 56-80x72-96): baseline fixture 0 errors; patched fixture -> 1 SIZE_OUTSIDE_ROW (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: envelope min/max 56-80x72-96 differ from its envelopeOverride 56-89x72-96)
PASS catalogue.rule_rmmz_tile_dup: two RMMZ forms claim the same cell (a 2x2 grid and a single tile both cover B tile 185): baseline fixture 0 errors; patched fixture -> 1 RMMZ_TILE_DUP (ALL_SHARED_ITEM_LOG_V1_DEFAULT: img/tilesets/DEUS_Outside_B.png cell 185 is also claimed by SURFACE_SHARED_TREE_OAK_V1_DEFAULT)
PASS catalogue.rule_coverage: 21 FAIL rules, 29 fixture cases; rules without a case: none
```

`test_rmmz_rows.js` named checks, all PASS:

```text
PASS rmmz_rows.counts: 72 new rows (want 72) by group {"E":3,"C":15,"F":7,"A":30,"B":16,"D":1} (want {"A":30,"B":16,"C":15,"D":1,"E":3,"F":7}); 20 re-forms (want 20)
PASS rmmz_rows.ar_rows: 6/6 AR rows in docs/ASSET_REQUESTS.md; all open 5-column rows, each naming its runtime files, none out of scope
PASS rmmz_rows.size_rows: 3/3 derived RMMZ_SPEC rows; ...
PASS rmmz_rows.rulings_cited: quotes at docs/OWNER_DECISIONS.md:1068, :924; 92/92 rows and re-forms present; every reason cites both lines; art/catalogue/rmmz_rows.json pinned (RMMZ_ROWS)
PASS rmmz_rows.schema_contract: 92 rmmzForm entries (want 92) validate; envelopeOverride + wTarget -> ["$.entries[0].envelopeOverride: unexpected property wTarget"]; footprintOverride + d -> ["$.entries[0].footprintOverride: unexpected property d"]; MARK, the three properties and deus-art-catalogue/1.4.0 in place
PASS rmmz_rows.envelope_admits_art: 12/12 recorded specimen boxes admitted (recorded dimensions only; no image is read)
PASS rmmz_rows.size_overrides: 9 entries carry envelopeOverride (want 9); footprintOverride on 0; conflicts.md section present
PASS rmmz_rows.rmmz_form: 92 rmmzForm entries (want 92); every slot is its RMMZ target
PASS rmmz_rows.pa_agrees: 72 rows without a grid (want 72) and 20 grid rows (want 20) against tools/art/place_art.js tilesetTarget; all agree, pixel positions as in ROWS.md
PASS rmmz_rows.tile_unique: 134 claimed cells (want 134); duplicates 0
PASS rmmz_rows.stock_positions: 28 stock positions (want 28), 30 A4 format examples (want 30); every label is the frozen MZ label; positions and parities hold
PASS rmmz_rows.append_only: comparison build OK with 10122 entries; 10122 common entries, 0 slots moved; 72 new rows (want 72), all on _RMMZnn sheets
104/104 checks passed
```

With the duplicate-tile rule left on, `dup_tile` is killed:

```text
KILLED mutant.dup_tile: build errors: RMMZ_TILE_DUP (SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT: img/tilesets/DEUS_Outside_B.png cell 156 is also claimed by SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED) || stock_positions FAIL: ...
16/16 mutants killed
```

## Fail-before at the base

`tools/art/test_rmmz_rows.js` and `tools/art/fixtures/catalogue/rmmz_rows_expected.json` copied from the tip clone onto the detached base `65e97351ed991a129fccf5e06edb75aa161566da` (`core.autocrlf=false`), then `node tools/art/test_rmmz_rows.js`.

```text
FAIL_BEFORE_EXIT=1
FAIL_LINES=104 PASS_LINES=0
0/104 checks passed
```

Counted from that log: 72 lines `FAIL rmmz_rows.row_*`, each containing `absent from the catalogue` (first: `FAIL rmmz_rows.row_SURFACE_SHARED_TERRAIN_CLIFF-GRANITE_TOP_DEFAULT: absent from the catalogue`), and 20 lines `FAIL rmmz_rows.reform_*`. A re-form line:

```text
FAIL rmmz_rows.reform_SURFACE_SHARED_SHADE_HEIGHT_H3_DEFAULT: runtime {"kind":"NONE","file":null,"index":null} != {"kind":"RMMZ_TILESET","file":"img/tilesets/DEUS_Outside_E.png","index":null,"tileId":771,"slotText":"tile 771"}; rmmzForm undefined != {"sheet":"E","stock":null}; absent from the no-rows/no-reforms comparison build
```

Population checks fail at the base:

```text
FAIL rmmz_rows.ar_rows: 0/6 AR rows in docs/ASSET_REQUESTS.md; AR-2200 absent; AR-2201 absent; AR-2202 absent; AR-2203 absent; AR-2204 absent; AR-2205 absent
FAIL rmmz_rows.size_rows: 0/3 derived RMMZ_SPEC rows; RMMZ_AUTOTILE_A4_TOP absent; RMMZ_AUTOTILE_A4_SIDE absent; RMMZ_TILE_48_2X2 absent
FAIL rmmz_rows.rulings_cited: quotes at docs/OWNER_DECISIONS.md:1068, :924; 20/92 rows and re-forms present; ...
FAIL rmmz_rows.schema_contract: 0 rmmzForm entries (want 92) validate; ... MARK not in the category enum; rmmzForm is undefined; envelopeOverride is undefined; footprintOverride is undefined; versions: $id deus-art-catalogue/1.2.0, schemaVersion.const deus-art-catalogue/1.2.0, SCHEMA_VERSION deus-art-catalogue/1.2.0 (want deus-art-catalogue/1.4.0); ...
FAIL rmmz_rows.envelope_admits_art: 0/12 recorded specimen boxes admitted ...
FAIL rmmz_rows.size_overrides: 0 entries carry envelopeOverride (want 9); footprintOverride on 0; conflicts.md section MISSING; ...
```

## Mutant-sweep failure

In the scratch clone, `tools/art/build_catalogue.js` line 1475 was changed from `if (claims.has(k)) err('RMMZ_TILE_DUP'` to `if (false && claims.has(k)) err('RMMZ_TILE_DUP'`. Then `node tools/art/test_rmmz_rows.js --mutants`.

```text
MUTANT_SWEEP_EXIT=1
SURVIVED mutant.dup_tile: build errors: none || stock_positions FAIL: 28 stock positions (want 28), 30 A4 format examples (want 30); SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT: claims 156/164 but names stock Outside_B 157/165
15/16 mutants killed
```

`stock_positions` still fails on that mutant. The conjunction that kills `dup_tile` requires `RMMZ_TILE_DUP` as well, so the sweep exits 1 with that one check disabled. The other 15 mutants in the same run were KILLED, including `drop_one_row` (`row_SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` absent, and the fresh `catalogue.json` differs) and `reform_ramp_drift` (`validateCatalogue 0 errors`, then `paletteRampIds changed (["NEUT_VOID_BLACK"] -> ["NEUT_COOL_GRAY"])`).

## Dropped-row `--check`

The builder was restored with `git checkout -- tools/art/build_catalogue.js`. The single `rmmz_rows.json` line with `"type":"oak"` and `"state":"DEPLETED"` was deleted. The file still parsed.

```text
REMOVED=1 rows_before=114 rows_after=113 json_ok=1
DROP_CHECK_EXIT=1
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
DIFF art/catalogue/catalogue.json
DIFF art/catalogue/conflicts.md
DIFF docs/art/catalogue/BAND_SURFACE.md
DIFF docs/art/catalogue/INDEX.md
CHECK: FAILED (4 file(s) differ from a fresh build)
```

`DIFF art/catalogue/catalogue.json` is present and the command exits 1, as BRIEF.md requires for this demonstration.

## Fixture against ROWS.md

Independent parse of ROWS.md section 5 against `tools/art/fixtures/catalogue/rmmz_rows_expected.json` (category, band, scale row, chart range, envelope min/max, `envelopeOverride`, frames, anchor, runtime file / tileId / grid / slotText / pixel, `rmmzForm` sheet and stock, ramps and ramp basis, paint slot, status `MISSING`; re-forms compared on AR, runtime, form, stock, pixels, and base slot). Override rows also checked so the override contains the chart range.

```text
ROWS parsed new=72 reforms=20 byGroup={"A":30,"B":16,"C":15,"D":1,"E":3,"F":7}
fixture rows=72 reforms=20 counts={"rows":72,"byGroup":{"A":30,"B":16,"C":15,"D":1,"E":3,"F":7},"reforms":20,"overrides":9,"judgedArt":12}
ROW_PROBLEMS=0
ROWS override rows=9
```

No `OVERRIDE_MISSING`, `OVERRIDE_VALUE`, `OVERRIDE_EXTRA`, or fixture row absent from ROWS.md. `footprintOverride` is null on the compared rows.

## Slots

Same comparison, committed catalogues, base `65e97351` `git show` against the tip `art/catalogue/catalogue.json`:

```text
base entries=10122 tip entries=10194
slot diff: changed=0 gone=0 added=72 baseWithoutSlot=7595
added on _RMMZnn=72 added elsewhere=0
COMPARE_DONE problems=0 slotsChanged=0
```

`baseWithoutSlot=7595` counts base entries that have no `slot` field. Zero changed means every base entry that has a slot still has that same slot. The 72 additions all sit on a sheet id ending `_RMMZ` plus two digits. This agrees with the gate line `rmmz_rows.append_only` (`10122 common entries, 0 slots moved; 72 new rows, all on _RMMZnn sheets`).

## `geometry_stratum_changes_slots`

REPORT.md Decisions needed item 1 asks the reviewer to accept or reject the edit to `geometry_stratum_changes_slots`. `git diff 65e97351..HEAD -- tools/art/test_catalogue.js` is two hunks: `RMMZ_FORM` and `RMMZ_TILE_DUP` added to the `rule_coverage` need list (the brief allows that), and this check. The check builds the skewed strata `[40,14,14,14,14]` twice: once with `reforms` emptied, for the original slot-height comparison, and once on the real input, which must fail with every error code `RMMZ_FORM`.

Accepted. The gate run prints the original assertions and the single form error:

```text
PASS catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 4/4 slot heights changed (EDGE_MEADOW_S-H2 48->96, WALLFACE_OPENING_H2 48->96, RAMP_MEADOW_N-C2 96->144, RAMPSIDE_MEADOW_E-H2 48->96); [20,19,19,19,19]: 3/3 target heights changed (19->20, 57->58, 124->125); skewed with the re-forms: RMMZ_FORM SURFACE_SHARED_WALLFACE_OPENING_H2_DEFAULT
```

Provoked in the same tip clone (`UF_TEST_PROVOKE=catalogue.geometry_stratum_changes_slots`, exit 1):

```text
FAIL catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 0/4 slot heights changed (EDGE_MEADOW_S-H2 48->48, WALLFACE_OPENING_H2 48->48, RAMP_MEADOW_N-C2 96->96, RAMPSIDE_MEADOW_E-H2 48->48); [20,19,19,19,19]: 0/3 target heights changed (19->19, 57->57, 124->124)
49/50 checks passed (provoked: catalogue.geometry_stratum_changes_slots)
```

The provoked run uses the real build for both geometry worlds, so the slot heights stay put and the check fails. The H2 opening is the row the real skewed build names: its re-form is one RMMZ cell, and the skewed slot grows from 48 to 96.

## Art

DEC-007. The 34-path diff contains no image and no `game/**` path. This review generated no art. The `envelope_admits_art` pass line states that it compares recorded dimensions and reads no image.

VERDICT: CLEAN PASS

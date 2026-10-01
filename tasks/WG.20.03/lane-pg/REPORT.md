# lane-pg report: RMMZ-format catalogue rows for the PM's art scope (WG.20.03)

Writer: claude (Claude Opus 5.5), 2026-10-01. Reviewer: grok. Branch `task/lane-pg`, rebased onto `origin/main` `65e97351` (mail and telemetry only since the brief's base; no catalogue-pinned file changed). Code tip tested: `e6b5f421`. This report commit changes only `tasks/WG.20.03/lane-pg/**` and the lane's `docs/STATUS.md` row. Neither is a catalogue-pinned source, so the tested outputs still hold at the new tip; `--check` was rerun there (see Evidence).

No art was generated, requested or integrated. Every new row is MISSING and carries no image data.

## What changed
- `art/catalogue/rmmz_rows.json` (new, the hand input): 2 ruling quotes, 7 runtime sheets, 72 rows (9 with `envelopeOverride` + `overrideWhy`) and 20 re-forms, with the values of ROWS.md section 5. The builder holds no row data.
- `tools/art/build_catalogue.js`:
  - `SCHEMA_VERSION` is `deus-art-catalogue/1.4.0`; `SRC.rmmzRows` is read as role `RMMZ_ROWS`, so it is pinned in `sources[]`.
  - Category `MARK` is in group OVERLAY.
  - `build({ overrides })` is a test-only option: it reaches `exists`, `buf`/`hashFile`, `text`/`read`/`lines`/`lineOf`. The CLI never sets it.
  - Three derived size rows, each with a `ref` naming its derivation: `RMMZ_AUTOTILE_A4_TOP` (= the A2 block), `RMMZ_AUTOTILE_A4_SIDE` (= the A3 block) and `RMMZ_TILE_48_2X2`. A new `RMMZ_SPEC` consistency check: the A4 sheet is 8 top widths wide and a whole number of top + side pairs high.
  - `buildRmmzRows`:
    - checks the input (`RMMZ_ROWS_INVALID`, naming the item index and key);
    - checks the rulings (`RULING_MISSING`), the ARs (`AR_MISSING`, which also covers closed, withdrawn and interface-pattern ARs) and the AR text (`RMMZ_AR_TEXT`);
    - builds the 72 rows through `entryBase` + `applySize`, with the override winning over the size row: min/max from the override, targets from the row;
    - applies the 20 re-forms, which change only `runtime`, `rmmzForm`, `sourceIds.ar` and `statusWhy` (`REFORM_TARGET` otherwise).
  - The new rows take every per-entry pass. They are packed append-only on `ATLAS_<band>_SHARED_<type>_RMMZ<nn>` after the main pack and the DEC-045 block.
  - `pack()` takes a sheet tag. The source-set override is factored out as `applySourceSet` (same behaviour), and the UI AR regex is lifted to the module constant `UI_AR` (same regex).
  - `validateCatalogue`: new rules `RMMZ_FORM` and `RMMZ_TILE_DUP`. `SIZE_OUTSIDE_ROW` now checks an entry that carries `envelopeOverride` against the override.
  - `conflicts.md`: new section "Per-row size overrides (DEC-016, open for the Owner)", one line per override.
- `art/catalogue/catalogue.schema.json`: 1.4.0 in `$id`, `description` and `schemaVersion.const`; `MARK` in the category enum; the optional `rmmzForm`, `envelopeOverride` and `footprintOverride`, each `additionalProperties: false`, exactly as scope item 3 gives them.
- `docs/art/catalogue/SCHEMA.md`: 1.4.0, the input file, the three size rows, the `_RMMZnn` sheets, the new fields, rules and build errors, and a new section 12. Section 12 covers the input contract, variant tokens and stumps as DEPLETED, the reason template, re-forms, the sheet layout and E-sheet rule, `RMMZ_FORM` (with the local-tile-0 rule labelled a DEUS convention), the size override (D4, the union rule, the `SIZE_OUTSIDE_ROW` change), the `mapping.rampBasis` rule and the tests.
- `docs/ASSET_REQUESTS.md`: the AR-2200 to AR-2205 section of ROWS.md section 4, verbatim, after the AR-2100 table.
- Generated outputs, rebuilt: `catalogue.json` (10,122 -> 10,194 entries), `scale_chart.json`, `size_classes.json`, `references.json`, `conflicts.md`, `docs/art/catalogue/INDEX.md`, `BAND_ALL.md`, `BAND_SURFACE.md`.
- `tools/art/test_rmmz_rows.js` (new): 72 row checks, 20 re-form checks and 12 named checks (104), with provocations and 16 in-memory mutants.
- `tools/art/fixtures/catalogue/rmmz_rows_expected.json` (new), the oracle. It was transcribed by a script from ROWS.md section 5, BRIEF.md scope item 1 (`sizeOverrides`, `judgedArt`: 12 items) and precondition 1 (the quotes). Targets and footprints come from `game/data/DEUS_ScaleRegistry.json` and ROWS.md section 3. The 48 stock labels come from the MZ label files (`RPG Maker MZ/newdata/img/tilesets/*.txt`, line n+1); the script stopped on any ROWS.md label that differs from the stock file, and none did. It never reads `rmmz_rows.json`.
- `tools/art/fixtures/catalogue/cases/rmmz_form.json`, `rmmz_tile_dup.json`, `rmmz_size_override.json` (new). `mini/context.json` is unchanged, because the cases need no new rows.
- `tools/art/test_catalogue.js`:
  - `rule_coverage` needs `RMMZ_FORM` and `RMMZ_TILE_DUP`.
  - **`geometry_stratum_changes_slots` was changed (outside the "schema version or category only" allowance; disclosed under Decisions needed).** With the re-forms in place, the skewed-strata fixture `[40,14,14,14,14]` fails the build on exactly one `RMMZ_FORM`: `WALLFACE_OPENING_H2`'s slot grows to 48x96 while its RMMZ home is one cell. That is the rule working. The check now does three things: it builds the skewed world without the re-forms (re-forms never change a slot) to compare slot heights as before; it asserts that the real-input skewed build fails on `RMMZ_FORM` alone; and it prints that error. Its provocation still fails.
- `docs/STATUS.md` §3A row and `tools/ops/active_lanes.json` `task/lane-pg` (claim commit). In this report commit the row's status changes to In Review. The registration stays until the merge, as for the other in-review lanes.

## How I tested it
Everything below ran in the foreground in fresh `core.autocrlf=false` clones under `%TEMP%\lanepg_w`: `tip` at `e6b5f421` and `base2` at `65e97351` (= `origin/main`, the lane base). The driver scripts are `run_evidence.sh` and `run_provocations.sh` in that folder (scratch, not committed). The commands, outputs and exit codes are in the logs listed under Evidence.
- Fail-before: `test_rmmz_rows.js` and its fixture copied onto `base2`, then run.
- The 11 gate commands of `lane.json` at the tip; the same guards at the base.
- Provocations: one row check, one re-form check (the `reform_ramp_drift` edit) and all 12 non-row checks of `test_rmmz_rows.js`, plus `rule_rmmz_form`, `rule_rmmz_tile_dup`, `rule_rmmz_size_override`, `rule_coverage` and `geometry_stratum_changes_slots` of `test_catalogue.js`.
- `test_rmmz_rows.js --mutants`.
- The sweep shown failing: a scratch copy with `RMMZ_TILE_DUP` switched off, then `--mutants`.
- The real `--check` on a scratch copy with the oak stump item deleted from `rmmz_rows.json`.
- The `rmmz_size_override` case under main's rule (base builder) and the lane's rule (tip builder).
- Evidence runs: `test_validate_asset_standard.js` at base and tip; `verify_world_state_registry.js` in report mode (`--report` into scratch, never into `tools/wsr/report`) at base and tip, with a findings diff; a slot diff from base to tip over every base entry.

## Evidence
All logs are in `tasks/WG.20.03/lane-pg/evidence/`.
- `fail_before.log`: at the base, `0/104 checks passed`, `[exit 1]`. Every one of the 72 `row_*` checks says "absent from the catalogue". Every one of the 20 `reform_*` checks fails because `runtime {"kind":"NONE"...}` is not the expected runtime. `ar_rows` "0/6 AR rows", `size_rows` "0/3", `schema_contract` "MARK not in the category enum; rmmzForm is undefined ...", `envelope_admits_art` "0/12", `size_overrides` "0 entries carry envelopeOverride (want 9)". Every named check fails on its population count.
- `gates_tip.log`: all 11 gates exit 0. `check_deus_syntax` 62 files, 0 errors; `test_control_board` CLEAN PASS; `test_palette` pass; `test_check_claims` 279 passed; `--check` `CHECK: OK (12 generated files match)`; `test_catalogue` 50/50; `test_rmmz_rows` 104/104; `--mutants` 16/16 killed; `test_multi_variant_topology` 887 passed; `test_blank_templates` 79 passed; `test_place_art` 154 passed.
- `gates_base.log`: `--check` OK, `test_catalogue` 47/47, 887, 79, 154, 279, CLEAN PASS, 62/0, palette pass. These are the brief's baseline numbers.
- `provocations.log`: "provocations: 19 of 19 exit 1". Each provoked check prints FAIL. For example, `reform_SURFACE_SHARED_SHADE_HEIGHT_H1_DEFAULT: paletteRampIds changed (["NEUT_VOID_BLACK"] -> ["NEUT_COOL_GRAY"])`, and `rule_rmmz_size_override` with the rule off reports 0 `SIZE_OUTSIDE_ROW`.
- `mutants.log`: 16/16 KILLED, each by its named code or check. `reform_ramp_drift` reports "validateCatalogue 0 errors", and the re-form check then fails, naming `paletteRampIds`. `drop_one_row` fails both its row check and the `--check` condition.
- `envelope_before_overrides.log`: the `strip_overrides` mutant gives "3/12 recorded specimen boxes admitted" and names all 9 override rows: oak 89x84, dead 84x89, birch 63x118, pine 96x132, and the oak, swamp, dead, pine and birch stumps.
- `mutant_sweep_fails.log`: with `RMMZ_TILE_DUP` off, `SURVIVED mutant.dup_tile`, `15/16 mutants killed`, `[exit 1]`.
- `check_after_drop.log`: `DIFF art/catalogue/catalogue.json` (plus `conflicts.md`, `BAND_SURFACE.md`, `INDEX.md`), `CHECK: FAILED (4 file(s) differ from a fresh build)`, `[exit 1]`. The large diffstat of `rmmz_rows.json` in that log is the scratch script rewriting the JSON pretty-printed; only one item was removed.
- `size_override_case.log`: base builder (1.2.0): "override on an envelope left at the chart row -> 0 SIZE_OUTSIDE_ROW; envelope set equal to the override -> 1". Tip builder (1.4.0): "-> 1 ...; -> 0".
- `evidence_runs.log`:
  - `test_validate_asset_standard.js`: `406 passed, 1 failed` (`rule-ids: set mismatch`) at both base and tip, so no new failure.
  - WSR: the gate already fails at the base, `GATE: FAILED (34 new, 983 stale)`; at the tip, `GATE: FAILED (105 new, 983 stale)`. The findings diff, base 301 and tip 372, shows 71 new: 7 `SLOT_CLASS_UNDECLARED` for `SOURCE:MARK` (the 7 marks) and 64 `SLOT_NO_STATE` for the new NATURAL_WORLD slots (31 TERRAIN, 17 TREE, 11 FLORA, 3 STONE, 2 WATER; that is the 72 new rows minus the 7 marks and the steam row, whose `SOURCE:EFFECT` is NON_WORLD_STATE). **0 findings gone**, so no existing key changed.
  - Slot diff: "slot diff base -> tip over the 10122 base entries: 0 changed slots, 0 entries gone; tip has 10194 entries".
- `report_tip_check.log`: `build_catalogue.js --check`, `test_rmmz_rows.js` and `test_catalogue.js` rerun in a fresh clean LF clone of the report commit (it changes only `tasks/**` and the STATUS row). The other gates were not rerun there.

## Not done / known problems
- `tools/art/test_catalogue.js` `geometry_stratum_changes_slots` was edited beyond the brief's allowance (see What changed). The reviewer should accept or reject this change.
- WSR: `SOURCE:MARK` is undeclared (7 new violations), and the 64 new NATURAL_WORLD slots are new gaps. `tools/wsr/**` is outside this lane. The WSR gate was already failing at the base.
- `tools/art/place_art.js` cannot export the 20 `runtime.grid` rows (10 are 1x2, 7 are 2x2, 2 are 2x3, 1 is 2x1). `pa_agrees` checks only the first cell for those rows.
- `tools/art/validate_art.js` `TILE_CLASS_ROWS` does not list the three new size rows. Not changed (out of scope).
- `envelope_admits_art` checks recorded measurements only and reads no image. The selected image is checked at induction.
- The PM's prototype was used as design data for the input file (`gen_rows.js` in scratch generated `rmmz_rows.json` from its spec). The builder code and tests were written here, and the oracle comes from ROWS.md, not from the prototype.
- No F5 run: the lane changes no game file (brief: F5 evidence "None").

## Try it in RMMZ
Nothing to try in RMMZ: these are catalogue rows only, and no game file changed. To see the rows:
1. `node tools/art/build_catalogue.js --check` in a clean clone of `task/lane-pg`.
2. `node tools/art/test_rmmz_rows.js`, then `node tools/art/test_rmmz_rows.js --mutants`.
Expected: `CHECK: OK (12 generated files match)`, `104/104 checks passed`, `16/16 mutants killed`.

## Decisions needed
1. Accept the `geometry_stratum_changes_slots` change, or rule another way. The alternative is that a re-form must not be made on a geometry-derived row, which would drop the 6 opening-wall re-forms.
2. WG.33 (Coordinator): declare `SOURCE:MARK` in `tools/wsr/scope.json`, take the 64 new NATURAL_WORLD slot gaps into the WSR baseline or states, and reconsider steam under `SOURCE:EFFECT` ("Combat effect sprites").
3. A placement lane to teach `tools/art/place_art.js` to export `runtime.grid` stacks; `validate_art.js` `TILE_CLASS_ROWS` to learn the three new size rows.
4. A game-data lane for `game/data/Tilesets.json`: one file per sheet slot (ROWS.md section 7); lane-cy's stock-named files against the `DEUS_*` files.
5. Carried from the brief's review log, still open: two homes for rock and soil cliff faces (AR-2100/AR-2101 on `UF_Levels_A4` against AR-2200 slots 0-1); Dungeon_A4 "Ledge B" (37/45) against "Wall B" (1/9) as the rock-cliff format example (the label only); and, for the engine owner, `DEUS_Levels.js` testing `isWaterTile` before lava, so A1 kind 4 reads as water.
6. Merge order with `task/lane-ce`: if lane-pg merges first, lane-ce takes 1.5.0 and rebuilds on a clean tree (brief, Shared files).

## GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane: WG.20.03 / lane-pg
Approved scope / Owner authorization reference: Owner 2026-10-01 rulings (docs/OWNER_DECISIONS.md DEC-063: standing row
permission :1068, RMMZ format :924 first hit); DEC-007 catalogue first; DEC-066 item 1 (the nine size overrides, DEC-016 amendment).
Writer SHA / evidence date: code tip e6b5f421, 2026-10-01 (report commit on top changes tasks/** and the STATUS row only)
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
None at merge. 72 new rows and 20 RMMZ homes for existing rows let the PM make, and the placement tools later drop into RMMZ
tilesets, the art for: cliff faces for 15 temperate materials (A4 top + side); map trees and the stump each species leaves;
grass, flowers, boulders, rocks, a bush, mushrooms and a fallen log; a still waterfall; lava, cooled obsidian and steam; and
the strained/failing ground marks that warn of collapse.

Trigger:
N/A at runtime: no game code changes. Consumers act when the PM schedules a generation run (catalogue-first gate) and when a
placement lane exports approved art into a DEUS tileset file.

Runtime Authority:
art/catalogue/catalogue.json (built from art/catalogue/rmmz_rows.json) owns each asset's slot, size, anchor and RMMZ tile
address. Runtime tile drawing stays with RMMZ Tilemap and DEUS_Levels/DEUS_Tiles; unchanged.

Simulation Path:
N/A - no simulation change. Data path: art/catalogue/rmmz_rows.json -> tools/art/build_catalogue.js (buildRmmzRows,
append-only pack, RMMZ_FORM/RMMZ_TILE_DUP) -> art/catalogue/catalogue.json.

Engine Bridge:
DEFERRED. (1) tools/art/place_art.js exports 1-cell and autotile rows today (rmmz_rows.pa_agrees: 72 rows agree with
tilesetTarget, pixel positions as in ROWS.md); the 20 grid rows need a placement lane. (2) game/data/Tilesets.json names no
DEUS_* sheet yet (game-data lane). (3) The lava row sits on the slot the engine already draws: DEUS_Levels.js:400, :550 (A1 kind 4).

Visible Result:
Nothing visible until art is approved and placed. NOT RUN (no runtime change).

Persistence:
N/A - build data, not save data; ids are stable (makeId) and slots append-only (0 of 10122 base slots changed).

Failure Without This Lane:
The PM may not generate Group 3-6, tree or stump art (DEC-007; TEMPERATE_GENERATION_LIST R8); art made without an RMMZ home
would need re-cutting before it could enter a tileset.

Automated Proof:
node tools/art/test_rmmz_rows.js: 104/104 at the tip, 0/104 (exit 1) at the base 65e97351; envelope_admits_art 12/12 on the
recorded specimens (3/12 without the overrides); --mutants 16/16 killed (15/16, exit 1, with RMMZ_TILE_DUP switched off);
node tools/art/build_catalogue.js --check OK at the tip, exit 1 with DIFF art/catalogue/catalogue.json after a dropped row;
node tools/art/test_catalogue.js 50/50 (47 + rule_rmmz_form, rule_rmmz_tile_dup, rule_rmmz_size_override). Tested SHA e6b5f421.

In-Game Proof:
NOT RUN - N/A: no game file changes in this lane.

CONSUMED BY GAME SYSTEMS:
- tools/art/place_art.js: reads runtime.file/tileId/grid and the slot size; contract test rmmz_rows.pa_agrees. Corruption
  would show as art in the wrong RMMZ cell or a placement refusal.
- tools/art/make_blank_templates.js: reads the paint slots; guard test_blank_templates.js (79 passed) plus append_only.
- tools/art/validate_art.js: checks the placed image against entry.envelope (SCALE_OUT_OF_ENVELOPE), so the 9 overrides
  reach art QA unchanged; envelope_admits_art checks only recorded measurements.
- The PM's generation cards and council boards cite the row id, envelope and anchor (DEC-007, DEC-053).

GAME BRIDGE STATUS
Simulation implemented: NO - not a simulation lane.
Engine bridge implemented: NO - deferred to the placement and Tilesets.json lanes.
Presentation implemented: NO - no art exists for these rows yet.
Input/player interaction implemented: NO - N/A for catalogue rows.
Save/load implemented: NO - N/A, build data only.
Playable verification performed: NO - nothing to play until art is placed.
```

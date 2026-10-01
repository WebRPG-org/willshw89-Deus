Binding source: the Owner's rulings of 2026-10-01, recorded as DEC-063 in `docs/OWNER_DECISIONS.md:1046-1084` (precondition 1, met on main since `4e4bde1d`): "You can always open more rows for assets we need" (`:1066`, item 12); RMMZ's own formats, with RMMZ stock as the format example and Ultima VII as the style example ("Using RMMZ's own format should make it easy to tool into the game as well", `:1062`, item 10); DEC-007 catalogue row before generation; the PM's art scope (TEMPERATE_GENERATION_LIST Groups 3-6 plus trees and stumps, item 8). Row list: `tasks/WG.20.03/lane-pg/ROWS.md`.

# lane-pg: RMMZ-format catalogue rows for the PM's art scope

| Field | Value |
|---|---|
| WBS | WG.20.03 (proposed; free on every ref, in the working copy and in the PM's records; next to WG.20.02, the art catalogue). The PM mints the row (precondition 2). |
| taskId (manifest) | WG.20.03 |
| Branch | `task/lane-pg` |
| Manifest | `tasks/WG.20.03/lane-pg/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> grok |
| Size | M (about 330 builder lines, one data file of 92 items with 9 size overrides, one test file with mutants, 6 AR rows, schema 1.4.0, regenerated outputs) |
| Work gate | MiniMax M3, 2026-10-01: GO WITH CHANGES (`~/.deus_pm/braintrust/2026-10-01/WORK-GATE-LANE-PG_minimax_m3.md`). Its five required changes are in this brief and ROWS.md (list: "Work-gate changes" below); its defaults 1-6 are kept; its five risks are in "Risks and the checks that block them". Second judge: ChatGPT Pro, 2026-10-01: GO WITH CHANGES (`~/.deus_pm/braintrust/2026-10-01/WORK-GATE-LANE-PG-2_chatgpt_pro.md`). Its four required changes are applied (list: "Work-gate changes (ChatGPT Pro, ...)" below), and its five risks are in the same risk table. |
| Dependencies | WG.20.02 (merged). `task/lane-cu` is merged (`b21cfe62`) and the pins were refreshed (`7c256c02`); see Base. |
| RMMZ editor must be closed | no |

**Base.** The base is the current `origin/main`. `task/lane-cu` (OPS.PRUNE.06) merged at `b21cfe62`, and the PM refreshed the catalogue pins at `7c256c02`. At `b889de90` and again at `30e90b7f` (main = origin/main later on 2026-10-01, after DEC-064 was appended at `7d91dbed` and the pins refreshed at `ae5dfb8b`) a clean LF clone gives `build_catalogue.js --check`: `CHECK: OK (12 generated files match)` and `test_catalogue.js` 47/47 (lane-pg review runs). DEC-064 was appended after DEC-063, so every `docs/OWNER_DECISIONS.md` line cited here still holds. Rechecked for the work-gate changes at `fbdd2bd9` (main = origin/main = GitHub main, 2026-10-01 03:02 CT; the only change since `30e90b7f` is `art/COUNCIL_RECORD.md`, the ART-COUNCIL-2 record): `--check` OK (12 files, exit 0), `test_catalogue.js` 47/47, both quotes still at `:1066` and `:923`, `docs/ASSET_REQUESTS.md:326` still the end of the AR-2100 table, WBS still Rev 33 with WG.20.02 at `:155`, and no file under `tools/art/`, `game/js/` or `docs/RMMZ_ASSET_SPEC.md` changed since `18dfd92d`. Main then moved to `d49563bd` (lane-ex merge, mail, telemetry) and `bdcee6f2` (mail, telemetry) while the work-gate changes were applied. None of those commits touches `tools/`, `art/`, `game/js/`, a catalogue-pinned source, `docs/OWNER_DECISIONS.md`, `docs/ASSET_REQUESTS.md` or the WBS. Every check was rerun at `d49563bd` in a fresh clean LF clone with the same results; `bdcee6f2` changes five mail and telemetry files only.

Any later main commit that edits a file the catalogue pins in `catalogue.sources[]` (for example `docs/ASSET_REQUESTS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`) makes every committed catalogue output stale until the pins are refreshed. So the writer:
- writes the code, data and tests on the current `origin/main`;
- before the final build, rebases onto the then-current `origin/main` (with the PM's pin refresh if a pinned source changed);
- then rebuilds the 12 outputs on a clean tree, reruns every gate and only then asks for review.

A review of an earlier tip does not count.

## Preconditions (PM; the lane does not launch until 1-3 and 5 are on main)

1. **Rulings recorded. MET** (DEC-063, `4e4bde1d`; line numbers at `b889de90`). `docs/OWNER_DECISIONS.md` holds the Owner's 2026-10-01 rulings:
   - the standing permission (DEC-063 item 12, quote `:1066`);
   - the RMMZ format (item 10, quote `:1062`; also quoted in the DEC-055 amendment at `:923`);
   - the PM's art scope (item 8);
   - a stump is its own tree cut down (item 5);
   - no animals, monsters, people, facesets, charsets or animations yet (item 4);
   - no IconSet, Ultima-style inventory (item 9). "Item sprites and container gumps come in a later lane" is the PM's scoping, not an Owner ruling.

   The builder looks for these two strings verbatim: `You can always open more rows for assets we need` and `Using RMMZ's own format should make it easy to tool into the game as well` (the Owner's exact wording ends "as well", `:1062`). `ctx.lineOf` returns the first line that holds a string (`tools/art/build_catalogue.js:138-145`), so at `b889de90` the cited lines are `:1066` and `:923`. The pins were refreshed after DEC-063 (`76647496`, `7c256c02`).
2. **WBS row. MET** (WBS Rev 39, the PM's opening commit; see the Revision Log). `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 33 at `b889de90` and at `fbdd2bd9`; Rev 34 since `0b4a0689`, the D1 reconciliation) gets this row, with a Rev bump to **the next free Rev at commit time** (other records may take Rev 35 first; read the `**Rev:**` header at `:4` when committing and add one) and a revision-log line. It goes after WG.20.02 (`:155` at `b889de90` and `fbdd2bd9`; `:159` at `0b4a0689`); IDs are never reused (`:8`). WG.20.03 is free on every ref (checked 2026-10-01 at `b889de90`):

   ```text
   | **WG.20.03** | RMMZ-format catalogue rows for the PM's art scope (lane-pg) | Claude / Grok | Catalogue rows before generation (DEC-007) for TEMPERATE_GENERATION_LIST Groups 3-6 plus trees and stumps, in RMMZ's own formats (Owner 2026-10-01, DEC-063): 72 new rows (A4 cliff materials; trees, per-species stumps and natural objects at stock Outside_B positions with a DEUS E extension sheet; A1 waterfall and lava, A2 obsidian, steam; integrity marks as new category MARK) and 20 runtime re-forms of existing depth-piece rows, from the new hand input art/catalogue/rmmz_rows.json; per-row size overrides (envelopeOverride/footprintOverride, schema deus-art-catalogue/1.4.0) for 9 tree and stump rows whose judged art is outside its scale-chart row (work gate D4); append-only paint sheets; FAIL rules RMMZ_FORM and RMMZ_TILE_DUP; AR-2200..AR-2205. Rows only, status MISSING, zero image data. **NO ART GENERATION, BY ANYONE.** WHY THE PLAYER CARES: cliffs, trees and their stumps, ground clutter, lava and collapse warnings cannot be drawn until a row exists (DEC-007), and each row gives the art an RMMZ tile slot, so it drops into the game's tilesets without re-cutting. Dep: WG.20.02. | `PLANNED` |
   ```
3. **Lane files.** `BRIEF.md`, `ROWS.md` and `lane.json` are committed under `tasks/WG.20.03/lane-pg/` by a single-parent `[pm]` commit (merge_gate manifest provenance, `tools/governance/merge_gate.js:194-200`, `:482-490`). The manifest validates: `validateManifest` printed VALID for this file on 2026-10-01 (rerun by the lane-pg review after its allowedPaths edit: VALID; writer family claude, reviewer family grok).
4. **Before the final build only:** the catalogue pins on main are fresh (`--check` OK on a clean clone of the base). **MET at `b889de90`, `fbdd2bd9` and `d49563bd`**; recheck at the writer's final base.
5. **Size authority for the overrides (DEC-016). MET:** the Owner approved the nine overrides on 2026-10-01 ("8-18 a"; DEC-066 item 1, commit `5a41cfc5`, with a pointer under DEC-016). The text below is kept as the requirement it met. DEC-016 (`docs/OWNER_DECISIONS.md:255-260`, Owner) says every catalogue entry's envelope and footprint derive from the scale chart, citing one chart row, and that disagreements with other documents "go to the Owner and are never resolved by workers". The 9 size overrides of scope item 1 widen chart rows for single entries, which DEC-016 does not provide for. Before launch, the PM records an Owner amendment to DEC-016 authorizing these per-row size exceptions, or an Owner ruling explicitly delegating that size-authority decision. A PM interpretation of DEC-056, or an art-council approval, does not independently satisfy this precondition. The PM puts the 9 overrides to the Owner with the version-qualified measurements of scope item 1. This is a PM pre-launch action: `docs/OWNER_DECISIONS.md` is not in allowedPaths, and the writer does not edit it. The builder lists every override in `art/catalogue/conflicts.md` (scope item 2.d), so each departure from the chart stays in front of the Owner. Until the PM records the Owner's amendment or delegation, the lane does not launch (wording from WORK-GATE lane-pg 2, ChatGPT Pro, REQUIRED CHANGE 1).

## Goal

Every asset the PM may make next has a catalogue row before generation (DEC-007; TEMPERATE_GENERATION_LIST R8). The row says where the asset goes in RMMZ's own sheet formats: A4 cliff kinds, A1/A2 kinds, B/E tile cells at the stock RMMZ positions. No existing slot moves. No art is made.

## Scope

1. **NEW hand input `art/catalogue/rmmz_rows.json`**, read with `ctx.readJson(SRC.rmmzRows, 'RMMZ_ROWS')` so that it is pinned in `catalogue.sources[]` and covered by `--check`.
   - Top-level keys:
     - `schema` (`deus-rmmz-rows/1`);
     - `about`;
     - `rulings` (the two quotes of precondition 1);
     - `sheets` (the 7 runtime files of ROWS.md 2.1, each with its RMMZ letter and slot rule);
     - `rows` (the 72 new rows of ROWS.md section 5);
     - `reforms` (the 20 re-forms).
   - Each row item has: group, ar, band, category, type, variant, state, scaleRow, anchor (GROUND|CENTER|WALL|CEILING), frames, ramps, rampBasis, file, tileId, grid (null or `WxH`), stock (string or null), standardPending, notes.
   - **Size overrides (work gate REQUIRED CHANGE 3, decision D4 (a)).** A row item may also carry `envelopeOverride` `{wMin, wMax, hMin, hMax}` (integers, exactly these four keys) and `footprintOverride` `{w, h}` (exactly these two keys), and then must carry `overrideWhy` (a non-empty string naming the measured specimen: file, sha256 prefix and bounding box). The override is the union of the size row's min/max and the measured specimen's bounding box (the version-qualified table below; WORK-GATE lane-pg 2, REQUIRED CHANGE 2), so it only widens and the size row's targets stay inside it. Nine items carry one, and no item carries a `footprintOverride` (all keep the 1x1 footprint of their size row):

     | Row id | Size row (min-max) | `envelopeOverride` | Measured specimen (bbox) |
     |---|---|---|---|
     | `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | `{wMin: 56, wMax: 89, hMin: 72, hMax: 96}` | 89x84 |
     | `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | `{wMin: 56, wMax: 84, hMin: 72, hMax: 96}` | 84x89 |
     | `SURFACE_SHARED_TREE_BIRCH_B-V1_DEFAULT` | TREE_COMMON_BIRCH 44-70 x 76-100 | `{wMin: 44, wMax: 70, hMin: 76, hMax: 118}` | 63x118 |
     | `SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT` | TREE_COMMON_PINE 42-64 x 80-104 | `{wMin: 42, wMax: 96, hMin: 80, hMax: 132}` | 96x132 |
     | `SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | `{wMin: 16, wMax: 28, hMin: 12, hMax: 21}` | 27x21 |
     | `SURFACE_SHARED_TREE_SWAMP_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | `{wMin: 16, wMax: 40, hMin: 12, hMax: 34}` | 40x34 |
     | `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | `{wMin: 16, wMax: 31, hMin: 12, hMax: 23}` | 31x23 |
     | `SURFACE_SHARED_TREE_PINE_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | `{wMin: 16, wMax: 34, hMin: 12, hMax: 20}` | 34x18 |
     | `SURFACE_SHARED_TREE_BIRCH_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | `{wMin: 11, wMax: 28, hMin: 12, hMax: 20}` | 11x15 |

     The swamp tree (80x93), the fruit tree (66x73, a historical candidate) and the fruit (apple) stump (19x19) fit their rows and carry no override; they stay in the `envelope_admits_art` oracle. Every override keeps the slot and the anchor its row gave (each effective envelope rounds up to the same 48 px cells: 96x96, 96x144 or 48x48), so no paint slot or tile cell changes, and every measured box fits one slot frame. Each stump is as wide as its own tree's trunk (DEC-063 item 5).

     **Measurement basis (WORK-GATE lane-pg 2, ChatGPT Pro, REQUIRED CHANGE 2).** The PM measured each specimen on 2026-10-01 (`lanepg/measure_specimens.js`, output `lanepg/specimens_measured.json`, PM scratch): the bounding box of the pixels with alpha > 0, which equals the alpha >= 128 box for all 14 files. The files are in the PM scratch, not in the repo, so the sha256 names the version. "Current" is the version the council passed. Council lines are `art/COUNCIL_RECORD.md` at main `392427f3`.

     | Row id | Specimen file (PM scratch `scratchpad/pixellab/trees/`) | sha256 (first 16) | Canvas | Measured bbox | Council | Selection |
     |---|---|---|---|---|---|---|
     | `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT` | `v7/oak_v7k.png` | `dc4c5c2f212269d4` | 96x96 | 89x84 | passed 4 of 4 (ART-COUNCIL-5b/6; `art/COUNCIL_RECORD.md:91`) | current |
     | `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEFAULT` | `v4/dead_v4.png` | `592368a0cac43284` | 96x96 | 84x89 | passed 4 of 4 (ART-COUNCIL-5b; `art/COUNCIL_RECORD.md:93`) | current |
     | `SURFACE_SHARED_TREE_BIRCH_B-V1_DEFAULT` | `v4/birch_v4b.png` | `21208f3d92bc70cd` | 144x144 | 63x118 | passed 4 of 4 (ART-COUNCIL-5b; `art/COUNCIL_RECORD.md:94`) | current |
     | `SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT` | `pine_c2d.png` | `88f0f45b618bc9e0` | 144x144 | 96x132 | passed 4 of 4 (ART-COUNCIL-5b; `art/COUNCIL_RECORD.md:95`) | current |
     | `SURFACE_SHARED_TREE_SWAMP_B-V1_DEFAULT` | `v4/swamp_v4.png` | `0ab47583bbe97696` | 96x96 | 80x93 | passed 4 of 4 (ART-COUNCIL-5b; `art/COUNCIL_RECORD.md:92`) | current |
     | `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT` | `apple_c2d.png` | `5b3eab5dbc593dcd` | 96x96 | 66x73 | rejected (ART-COUNCIL-2, `art/COUNCIL_RECORD.md:62-63`) | historical candidate, not passed art (in the oracle as a fits-without-override control) |
     | `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT` | `v7/appleA_v7b.png` | `7d678cf56e94aa15` | 96x96 | 70x78 | rejected, Gemini NAY (ART-COUNCIL-5/5b/6 table, `art/COUNCIL_RECORD.md:96`) | historical candidate, not passed art (not in the oracle) |
     | `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT` | `v7/appleB_v7b.png` | `53ada8e054e62c9c` | 96x96 | 73x69 | rejected, Gemini NAY (ART-COUNCIL-5/5b/6 table, `art/COUNCIL_RECORD.md:97`) | historical candidate, not passed art (not in the oracle) |
     | `SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` | `oak_stump10.png` | `b944740e091bc5a2` | 48x48 | 27x21 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:52`) | current |
     | `SURFACE_SHARED_TREE_SWAMP_B-V1_DEPLETED` | `swamp_stump10.png` | `e2f274d4b8906ba0` | 48x48 | 40x34 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:53`) | current |
     | `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEPLETED` | `dead_stump10.png` | `cb4a2cb025cd035e` | 48x48 | 31x23 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:54`) | current |
     | `SURFACE_SHARED_TREE_PINE_B-V1_DEPLETED` | `pine_stump10.png` | `f684d2d41cd7608a` | 48x48 | 34x18 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:57`) | current |
     | `SURFACE_SHARED_TREE_BIRCH_B-V1_DEPLETED` | `birch_stump10.png` | `7ae6f5878bcebbfa` | 48x48 | 11x15 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:55`) | current |
     | `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEPLETED` | `fruit_stump10.png` | `d2eab4e21314d798` | 48x48 | 19x19 | passed 4 of 4 (ART-COUNCIL-2; `art/COUNCIL_RECORD.md:56`) | current |

     - The WG1 tree sizes came from the versions judged at ART-COUNCIL-2, which did not pass, and were not re-measured. The table above replaces them, and the overrides were recomputed from it: oak 56-89 wide, dead 56-84 wide, birch 76-118 tall. The pine tree and the six stumps measure as before. There are still 9 overrides, with the same slots and anchors.
     - The fruit tree has no passed version. The oracle keeps `apple_c2d.png` (66x73, rejected at ART-COUNCIL-2) as a historical candidate and a fits-without-override control, not as passed art. The later candidates `appleA_v7b.png` (70x78) and `appleB_v7b.png` (73x69) were also rejected (Gemini NAY) and are not in the oracle. `appleB_v7b.png` is 69 px tall, under the chart row's 72 px minimum height, so any future fruit tree must be measured at induction.
     - These rows approve no image's size. `envelope_admits_art` checks the recorded boxes above; induction checks the actual selected image against the effective envelope (`tools/art/validate_art.js` SCALE_OUT_OF_ENVELOPE, `:787`).
   - Each re-form item has: id, ar, file, tileId, grid, stock.
   - The values are exactly those of ROWS.md. This file is the single source; the code holds no row data (AGENTS Rule 14).
2. **`tools/art/build_catalogue.js`** (B):
   - a. **Input check.** Every item is checked: required keys; enums (band is a geometry band or ALL; category is in `CATEGORIES`; state is DEFAULT or DEPLETED; variant matches `^(TOP|SIDE|A1|A2|B-V[1-9])$`); every `file` is listed in `sheets` with the matching letter; every ramp is in the palette registry; and every size override has exactly its keys (`envelopeOverride` wMin/wMax/hMin/hMax as integers, `footprintOverride` w/h as numbers > 0), `wMin <= wMax`, `hMin <= hMax`, the size row's `wTarget` and `hTarget` inside it, and a non-empty `overrideWhy`. A failure is the build error `RMMZ_ROWS_INVALID`, naming the item index and key. The prototype showed why this is needed: an item without `state` produced the id `..._UNDEFINED`, which the id pattern accepts.
   - b. **Size rows.** Three derived RMMZ_SPEC size rows go into `parseRmmzSpec` and the RMMZ_SPEC list at `:363`:
     - `RMMZ_AUTOTILE_A4_TOP` = the parsed A2 block (96x144, `docs/RMMZ_ASSET_SPEC.md:69`);
     - `RMMZ_AUTOTILE_A4_SIDE` = the parsed A3 block (96x96, `:70`);
     - `RMMZ_TILE_48_2X2` = 2 x `RMMZ_TILE_48` (`:11`).

     Each `ref` names its derivation. The two A4 rows also cite `game/js/rmmz_core.js:2547-2552` (A4 even block rows use the floor table, odd ones the wall table); the 2x2 row cites `:2483-2498` (B-E cells). A consistency check, build error `RMMZ_SPEC` on failure: the parsed A4 sheet width is 8 x the top width, and its height is a whole number of (top + side) pairs (768 = 8 x 96; 720 = 3 x 240). `docs/RMMZ_ASSET_SPEC.md` is **not** edited (lane-pm-streamline puts a "Do not update this file" banner on it). The legacy `RMMZ_AUTOTILE_A4` (96x120) stays for its 8 rows.
   - c. **Category.** `CATEGORY_GROUP` gets `MARK: 'OVERLAY'`.
   - d. **New rows.** They are built with `entryBase` + `applySize` and given:
     - `runtime {kind: RMMZ_TILESET, file, index: null, tileId, slotText, grid?}`, where `slotText` is `tile N`, `tiles a, b, c, d` or the A4/A1/A2 kind text of ROWS.md;
     - `rmmzForm {sheet, stock}`;
     - `sourceIds.ar = [ar]`;
     - `status: MISSING`;
     - the `statusWhy` of ROWS.md section 1, with the real `docs/ASSET_REQUESTS.md` line of the AR (`parseRequests`) and the `docs/OWNER_DECISIONS.md` lines of both quotes (`ctx.lineOf`);
     - `mapping {scaleBasis: MATCH, rampBasis, rule}`.

     **Size overrides win over the size row (work gate REQUIRED CHANGE 2).** `entryBase` (`tools/art/build_catalogue.js:487-516` at `fbdd2bd9`) leaves `envelope` and `footprint` null; `applySize` (`:518-529`) fills them from the size row unless `opts.envelope` / `opts.footprint` is given (`:521`, `:523`). For an item with an override the new-row builder passes:
     - `opts.envelope = {wMin: ov.wMin, wTarget: row.wTarget, wMax: ov.wMax, hMin: ov.hMin, hTarget: row.hTarget, hMax: ov.hMax}`: min and max from the override, targets from the row;
     - `opts.footprint = footprintOverride` when present.

     The slot (`pack`, `:1057-1111`) and the anchor (`applySize`, `:525-528`) then follow the effective envelope, as for every other row. The entry also carries copies `envelopeOverride` / `footprintOverride` (only when the item has them), and its `statusWhy` gets the clause `; size override of <scaleRow> <row min-max> to <override min-max> (WG.20.03 D4): <overrideWhy>`. Consumers need no change: `tools/art/validate_art.js` checks art against `entry.envelope` (SCALE_OUT_OF_ENVELOPE, `:787`) and `tools/art/make_blank_templates.js` sizes frames from it (`:341-343`). `conflicts.md` gets a section "Per-row size overrides (DEC-016, open for the Owner)" with one line per override: entry id, size row and its `ref` (file:line), row min-max, override min-max and `overrideWhy` (precondition 5; the line format the prototype printed is in ROWS.md 5B).

     They go through the same per-entry passes as every other row: sourceIds sort, `promptFile`/`specFile`, style pack (`:1704-1709`), optional-field cleanup. They also get the source-set override that `add()` applies (`:570-593`), so a later induction of one of these ids needs no code change. The new TERRAIN rows are **not** added to the builder's terrain list (`terrains`, built from WorldCatalog `groundKinds`, `:995`): that list spawns the TOP/EDGE/RAMP/RAMPSIDE families and is checked against SCHEMA.md by T `schema_doc_terrains` (`tools/art/test_catalogue.js:468-476`).
   - e. **Build errors** (each prints `FAIL <code>` and writes nothing):
     - `AR_MISSING` if the AR row is absent, closed or withdrawn, or matches the UI out-of-scope regex (`:1288`), that is, if the AR id lands in `outOfScope` (work-gate risk 5);
     - `RMMZ_AR_TEXT` if the AR row's text does not name the basename of every runtime file its rows use;
     - `RULING_MISSING` if a quote is not found in `docs/OWNER_DECISIONS.md`;
     - `REFORM_TARGET` if a re-form names an id that does not exist or whose `runtime.kind` is not `NONE`.
   - f. **Re-forms** change only `runtime`, `rmmzForm`, `sourceIds.ar` (keeps every previous member and adds the AR) and `statusWhy` (the previous text, then the AR and ruling clause). Every other field stays exactly as the build without lane rows and re-forms gives it, slot, envelope, footprint, anchor, ramps, alphaMode and status among them (checked by `rmmz_rows.reform_<id>`; WORK-GATE lane-pg 2, REQUIRED CHANGE 3).
   - g. **Append-only packing.** New rows are left out of the main `pack()`. They are then packed by the same shelf algorithm and sort key into `ATLAS_<band>_SHARED_<groupType>_RMMZ<nn>` sheets, after the main pack and the DEC-045 block. No existing slot moves (the DEC-045 pattern, `:1719-1751`). `runtimeSheets` lists the 7 new RMMZ sheets.
   - h. **`validateCatalogue` rules** for every entry that carries `rmmzForm`, each switchable through `disabled` for its provocation:
     - `RMMZ_FORM`: the tileId lies in the range of the file's sheet letter (`game/js/rmmz_core.js:2667-2676`); an autotile id is shape 0; local tile 0 of a B-E sheet is refused; a grid stays inside its 8-column half and 16 rows; `rmmzForm.sheet` equals the file's letter; and the slot equals the RMMZ target. The targets, from the parsed sizes: A1 kinds 0-1 and the even kinds from 4 up are 3 x the A1 block; the other A1 kinds are 1 A1 block; A2 is the A2 block; A4 is TOP in even block rows and SIDE in odd ones; B-E is grid x tilePx. A3 and A5 have no rows here and are refused (fail closed) until a lane gives them a target. The local-tile-0 refusal is a **DEUS convention**, not an RMMZ rule: RMMZ leaves only tileId 0 undrawn (`Tilemap.isVisibleTile`, the B sheet's "Transparent" tile in `Outside_B.txt`), and stock C sheets use their local tile 0 (`Outside_C.txt` line 1 "Obelisk"). Say so in the error text and in SCHEMA.md.
     - `RMMZ_TILE_DUP`: two entries claim the same file and cell (every cell of a grid counts).
     - **`SIZE_OUTSIDE_ROW` learns the override** (`:1140-1144`; this changes an existing rule, for every entry): an entry that carries `envelopeOverride` is checked against the override instead of its chart row (its envelope's wMin/wMax/hMin/hMax must equal the override's, and its targets must lie inside); every other entry is checked against its chart row exactly as today. Without this change the live rule reports 9 `SIZE_OUTSIDE_ROW` errors, one on each override row and none elsewhere (prototype at `fbdd2bd9`).
   - i. **Test option.** `build({ root, overrides: { '<relPath>': '<text>' } })` replaces input files in memory, for tests only. The CLI never sets it. No other new option (`geometry` already exists). An override must be seen by every reader of that path: `ctx.exists`, `ctx.text`/`ctx.read`/`ctx.lines`/`ctx.lineOf` **and** `ctx.buf`/`ctx.hashFile` (`:114-146`), so the pinned sha256 in `sources[]` is the override's.
   - j. **No literal `9` or `32` token anywhere in B** (T `geometry_no_literal_layer_count`, `tools/art/test_catalogue.js:260-266`). RMMZ id constants such as 2048, 2816, 5888 and 8192 are fine.
3. **Schema.**
   - `art/catalogue/catalogue.schema.json` (work gate REQUIRED CHANGE 1):
     - add `MARK` to the category enum (`:88`);
     - add three optional entry properties (not in `required`), each with `additionalProperties: false`:
       - `"rmmzForm": { "type": "object", "required": ["sheet", "stock"], "additionalProperties": false, "properties": { "sheet": { "enum": ["A1", "A2", "A3", "A4", "A5", "B", "C", "D", "E"] }, "stock": { "type": ["string", "null"] } } }`;
       - `"envelopeOverride": { "type": "object", "required": ["wMin", "wMax", "hMin", "hMax"], "additionalProperties": false, "properties": { "wMin": { "type": "integer", "minimum": 0 }, "wMax": { "type": "integer", "minimum": 1 }, "hMin": { "type": "integer", "minimum": 0 }, "hMax": { "type": "integer", "minimum": 1 } } }`;
       - `"footprintOverride": { "type": "object", "required": ["w", "h"], "additionalProperties": false, "properties": { "w": { "type": "number", "minimum": 0 }, "h": { "type": "number", "minimum": 0 } } }` (the same shape as `footprint`, `:98-101`);
     - set the version to **`deus-art-catalogue/1.4.0`** in `$id` (`:3`), `description` (`:5`) and `properties.schemaVersion.const` (`:10`). Not 1.3.0: `task/lane-ce` (WG.21.01, unmerged) already uses 1.3.0 on its branch (`origin/task/lane-ce` `7d7bba11`), and no ref uses 1.4.0, `envelopeOverride`, `footprintOverride` or `envelope_admits_art` (checked at `d49563bd` on main and all 74 task refs).
     - `SCHEMA_VERSION` in `tools/art/build_catalogue.js:22` changes to `'deus-art-catalogue/1.4.0'`. The generated outputs that print it (`references.json`, `scale_chart.json`, `size_classes.json`, `conflicts.md`, `INDEX.md`) follow on the rebuild.
   - `docs/art/catalogue/SCHEMA.md` documents the input file, `rmmzForm`, `envelopeOverride`/`footprintOverride` (the D4 rule, the union rule, and the `SIZE_OUTSIDE_ROW` change), MARK, the variant tokens (`TOP`/`SIDE`/`A1`/`A2`/`B-V<n>`, stumps as `DEPLETED`), the three size rows, the new rules and build errors, the `_RMMZnn` sheets, the E-sheet layout rule, the `mapping.rampBasis` rule for the rows of `rmmz_rows.json` (ROWS.md section 1: MATCH = copied ramp identifiers, PROPOSED = a PM-selected palette assignment; MATCH does not mean the source art or the palette decision is approved; existing catalogue families are not relabelled; WORK-GATE lane-pg 2, REQUIRED CHANGE 4) and the version: the title (`:1`) and the `schemaVersion` row (`:84`, which still says 1.1.0 on main) become 1.4.0.
4. **`docs/ASSET_REQUESTS.md`:** add the AR-2200 to AR-2205 section of ROWS.md section 4, verbatim, after line 326.
5. **Generated outputs:** rebuild all 12 (`art/catalogue/catalogue.json`, `scale_chart.json`, `size_classes.json`, `references.json`, `conflicts.md`, `docs/art/catalogue/INDEX.md`, `BAND_*.md`) with `node tools/art/build_catalogue.js` **in a clean worktree or clone**. The main working copy holds 69 gitignored `art/prompts/*.json` files that change `promptFile`, so a build there differs from a clean one (`.gitignore:43-44`). Never hand-merge a generated file; rebase, then rebuild.
6. **Tests:** NEW `tools/art/test_rmmz_rows.js` and NEW `tools/art/fixtures/catalogue/rmmz_rows_expected.json`. The fixture is the expected value of every listed field for the 72 rows and 20 re-forms, transcribed from ROWS.md, plus the frozen stock labels used, the base slot of each re-form target, the 9 `sizeOverrides` (id and values, from scope item 1) and the 12 `judgedArt` items of the version-qualified table of scope item 1 (row id, specimen file, sha256, measured bounding box, council status, and current or historical). It is an oracle independent of `rmmz_rows.json`, so a row or an override dropped from the input is caught. For the 20 re-forms the test also checks preservation (WORK-GATE lane-pg 2, REQUIRED CHANGE 3): every field outside `runtime`, `rmmzForm`, `sourceIds.ar` and `statusWhy` equals the same entry in the no-rows/no-reforms comparison build of `rmmz_rows.append_only`; `sourceIds.ar` keeps its previous members and adds only AR-2203; `statusWhy` is the previous text plus the specified suffix (Tests, `rmmz_rows.reform_<id>`). Also add three rule cases, `tools/art/fixtures/catalogue/cases/rmmz_form.json`, `rmmz_tile_dup.json` and `rmmz_size_override.json` (more `cases/rmmz_*.json` files are allowed, one per RMMZ_FORM sub-rule if wanted). `tools/art/test_catalogue.js` picks them up as `rule_rmmz_form`, `rule_rmmz_tile_dup` and `rule_rmmz_size_override`. Add `RMMZ_FORM` and `RMMZ_TILE_DUP` to the `need` list of T `rule_coverage` (`tools/art/test_catalogue.js:192-198`, list at `:193`), so that deleting a case file fails a check instead of silently dropping one. Extend `tools/art/fixtures/catalogue/mini/context.json` only as far as those cases need (the mini catalogue itself is not edited; a case patches it). Otherwise edit `tools/art/test_catalogue.js` only if an existing check must learn the new schema version or category.
7. **Registration:** a row in `docs/STATUS.md` §3A and `task/lane-pg` in `tools/ops/active_lanes.json` `activeLanes`, changed together (`tools/test_control_board.js:307-353`). Remove the claim in the report commit, as the other lanes do.
8. **Report** `tasks/WG.20.03/lane-pg/REPORT.md` in the AGENTS.md report format, with the GAME TRANSLATION block below filled with observed results, and the evidence logs under `tasks/WG.20.03/lane-pg/evidence/`.

## Out of scope

- Art of any kind. No generation, no PixelLab or other generator call, and no PNG anywhere (DEC-007; Owner: "I will generate all the art"). The PM's first A4 sheet is not inducted here or later: ART-COUNCIL-1 rejected all ten of its sets (NAY rows in `art/APPROVALS.md` from `4e4bde1d`; reasons `art/COUNCIL_RECORD.md:19-28`), and they were made before any row existed. Slots 0-9 are the homes for the remade materials.
- Item sprites and container gumps (the Ultima-style inventory, no IconSet) are a later lane. The ITEM and EQUIPMENT rows are untouched.
- Animals, monsters, people, facesets, charsets and animations.
- The Owner's own tile sets, and any Group 1-2 ground row.
- Native EDGE/RAMPSIDE/RAMP rows, the SOIL/DIRT question, and the 8 legacy `RMMZ_AUTOTILE_A4` rows and their slot collisions (ROWS.md section 7).
- `docs/RMMZ_ASSET_SPEC.md`, `art/catalogue/mapping.json`, `game/**` (including `Tilesets.json`), `tools/art/place_art.js` (grid export), `tools/art/validate_art.js`, `tools/art/make_blank_templates.js` and `tools/wsr/**` (the `SOURCE:MARK` declaration and the baseline). Each needed follow-up is listed in the report under "Decisions needed".

Anything not in Scope is out of scope (AGENTS.md Rule 1).

## Files this lane may touch (allowedPaths)

- `art/catalogue/catalogue.json`
- `art/catalogue/catalogue.schema.json`
- `art/catalogue/conflicts.md`
- `art/catalogue/references.json`
- `art/catalogue/rmmz_rows.json`
- `art/catalogue/scale_chart.json`
- `art/catalogue/size_classes.json`
- `docs/ASSET_REQUESTS.md`
- `docs/STATUS.md`
- `docs/art/catalogue/**`
- `tasks/WG.20.03/lane-pg/**`
- `tools/art/build_catalogue.js`
- `tools/art/fixtures/catalogue/cases/rmmz_*.json`
- `tools/art/fixtures/catalogue/mini/context.json`
- `tools/art/fixtures/catalogue/rmmz_rows_expected.json`
- `tools/art/test_catalogue.js`
- `tools/art/test_rmmz_rows.js`
- `tools/ops/active_lanes.json`

merge_gate refuses the merge with SCOPE_VIOLATION if the branch changes any other path (`tools/governance/MERGE_GATE.md:116`).

### Shared files and merge order

- **Catalogue code and data:** `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js` and `art/catalogue/catalogue.schema.json`, plus every generated output. The other writers are `task/lane-ce` (WG.21.01, active, unmerged since 2026-09-29; it takes schema 1.3.0, adds the status `REQUESTED` and `variants.derivation`, and touches neither `envelope` nor `footprint`) and `task/art-temperate-induction` (outputs only). lane-pg takes **1.4.0** whatever the merge order (work gate REQUIRED CHANGE 1). If lane-pg merges first, lane-ce rebases and takes the next free minor above 1.4.0 (1.5.0), never 1.3.0; if lane-ce merges first, lane-pg rebases onto 1.3.0 and stays at 1.4.0. Either way the second lane merges both schema changes and rebuilds the outputs on a clean tree. No lane-pg id collides with an id on those branches, and none uses AR-22xx, `_RMMZnn`, `rmmzForm` or `rmmz_rows` (rechecked by the lane-pg review on 2026-10-01 against main `b889de90`, `task/lane-ce`, `task/art-temperate-induction` and `task/lane-pm-streamline`).
- **Unpinned builder inputs:** `task/lane-cy` (ART.GROUND.INDUCT, held; DEC-064 item 3) adds `art/masters/source_sets/**` manifests, which the builder applies through `add()` (`tools/art/build_catalogue.js:570-593`) without pinning them. If it merges before lane-pg, rebase and rebuild. It also keeps stock file names (`Outside_A1.png`, `Outside_A2.png`, `Outside_D.png`) for DEUS art in `game/img/tilesets/` and `game/data/Tilesets.json`, while lane-pg names new `DEUS_*` files (ROWS.md 2.1); see ROWS.md section 7, "One file per sheet slot".
- **`docs/ASSET_REQUESTS.md`:** also edited by `task/lane-pm-streamline` and `task/lane-ce` (`task/lane-cu`'s line-278 edit is on main since `b21cfe62`). lane-pg adds only its new section after line 326.
- **`docs/STATUS.md` and `tools/ops/active_lanes.json`:** registration lines only, which `task/lane-ct` and `task/lane-pm-streamline` also add.
- **Pins:** any main commit that edits a pinned source makes the committed outputs stale. That includes `docs/OWNER_DECISIONS.md`, `docs/VISION.md` and `docs/ASSET_REQUESTS.md`. The lane's last commit before review must hold outputs rebuilt on its final base.

## Tests

The baseline was measured on 2026-10-01 in a clean LF clone of main `18dfd92d`:
- `build_catalogue.js --check`: `CHECK: OK (12 generated files match)`.
- `test_catalogue.js`: 47/47.
- `test_multi_variant_topology.js`: 887 passed.
- `test_blank_templates.js`: 79 passed.
- `test_place_art.js`: 154 passed.
- `test_check_claims.js`: 279 passed.
- `test_control_board.js`: CLEAN PASS.
- `check_deus_syntax.js`: 62 files, 0 errors.
- `test_palette.js`: pass.
- `test_validate_asset_standard.js`: 406 passed and **1 FAIL** (`rule-ids: set mismatch`). That failure was there before this lane, so the test is not a gate.

Re-measured on 2026-10-01 by the lane-pg review in a clean LF clone of main `b889de90`: the same result on every line above (`--check`, `test_catalogue.js` and the prototype rerun again at `30e90b7f`: unchanged). The read-only prototype (`proto_lanepg.js` pointed at that clone) reproduced ROWS.md section 5 row for row (92 table lines identical), with 0 `validateCatalogue` errors, 0 RMMZ_FORM mismatches, 134 cells claimed once and 0 existing slots moved.

Re-measured again for the work-gate changes in fresh clean LF clones of `fbdd2bd9` (`lanepg/clone_wg1`) and `d49563bd` (`lanepg/clone_wg2`), both `core.autocrlf=false`, with the same results at both: `--check` OK (exit 0), `test_catalogue.js` 47/47, `test_multi_variant_topology.js` 887 passed, `test_blank_templates.js` 79, `test_place_art.js` 154, `test_check_claims.js` 279, `check_deus_syntax.js` 62 files 0 errors, `test_control_board.js` CLEAN PASS, `test_palette.js` pass (outputs in the lane-pg scratch `CHANGES_WG1.md`). The revised prototype (`node proto_lanepg.js clone_wg2`, identical output on `clone_wg1`, with the 9 overrides, the swamp rename and the 1.4.0 schema patch): 92 table lines equal ROWS.md section 5; `validateCatalogue` 0 errors with the override rule of scope 2.h (9 `SIZE_OUTSIDE_ROW`, all on the override rows, under main's rule); schema 0 errors with the patch; RMMZ_FORM 0; 134 cells claimed once; 0 existing slots moved; slots and anchors of the 72 rows identical with and without the overrides; `envelope_admits_art` 12/12.

Rerun on 2026-10-01 for WORK-GATE lane-pg 2 (ChatGPT Pro) on `clone_wg2` (`d49563bd`), with the measured sizes of scope item 1 and the birch and pine stumps as MATCH (`node proto_lanepg.js clone_wg2`, output `lanepg/proto_lanepg_wg2b.out.txt`): every result above holds with the measured values; `envelope_admits_art` 12/12 (9 not admitted without the overrides, 1 (pine) with pine's override dropped); re-form preservation 20/20 against the no-rows/no-reforms build; the `reform_ramp_drift` edit is caught on `paletteRampIds`, while `validateCatalogue` reports 0 errors and the WG1 re-form check passes it. Main is at `392427f3` now; since `d49563bd` it changed no file under `tools/art/`, and in `art/catalogue/` only the WBS pin and its cited lines (`catalogue.json`, `conflicts.md`). The writer reruns everything at its own base.

Rerun every one of these at your own base before claiming FAIL-before or PASS-after.

### Must fail before / pass after

**At the lane base (before the change).** Copy `tools/art/test_rmmz_rows.js` and its fixture onto a base checkout and run it. It must print FAIL and exit 1 for:
- `rmmz_rows.row_<id>`, one check for each of the 72 new ids in ROWS.md section 5 (the id is absent);
- `rmmz_rows.reform_<id>`, one check for each of the 20 re-forms (`runtime.kind` is still `NONE`);
- `rmmz_rows.ar_rows` (AR-2200 to AR-2205 absent), `rmmz_rows.size_rows` (the 3 rows absent), `rmmz_rows.rulings_cited` (no row cites the quotes) and `rmmz_rows.schema_contract` (MARK, `rmmzForm`, `envelopeOverride` and `footprintOverride` absent; version 1.2.0, not 1.4.0);
- `rmmz_rows.envelope_admits_art` and `rmmz_rows.size_overrides` (the judged rows and the override rows are absent; each check fails on its population count).

Copy the real output into `evidence/fail_before.log`. Each row check compares every field ROWS.md lists for the row:
- category, band, scaleRow, envelope (the effective one: override min/max where the row has an override), `envelopeOverride` and `footprintOverride` (present exactly on the fixture's override rows, with the fixture's values), footprint, anchor;
- runtime file, tileId, grid and slotText;
- rmmzForm, paletteRampIds and rampBasis;
- `status === 'MISSING'`;
- a `statusWhy` that carries the AR's real `docs/ASSET_REQUESTS.md` line and the real `docs/OWNER_DECISIONS.md` lines of both quotes.

A re-form check (WORK-GATE lane-pg 2, REQUIRED CHANGE 3):
- compares runtime and rmmzForm with the fixture, and checks that the slot equals the fixture's base slot (sheet:index and w x h);
- checks preservation against the same entry in the no-rows/no-reforms comparison build of `rmmz_rows.append_only`: every field outside the four permitted re-form changes (`runtime`, `rmmzForm`, `sourceIds.ar`, `statusWhy`) is deep-equal, among them slot, envelope, footprint, anchor, paletteRampIds, alphaMode, status, frames, scaleRow, mapping and every other `sourceIds` kind;
- checks that `sourceIds.ar` keeps every previous member and adds only AR-2203;
- checks that `statusWhy` is the previous text followed by exactly the specified suffix (the AR and ruling clause of ROWS.md section 1, with the real line numbers).

A failure names the field. The WG1 form of this check (runtime, form, slot, status and AR inclusion only) passes an edit that changes only a ramp or the anchor; the prototype showed it (mutant `reform_ramp_drift` below).

**At the tip.**
- `node tools/art/build_catalogue.js --check` prints `CHECK: OK (12 generated files match)` and exits 0.
- `node tools/art/test_rmmz_rows.js`: every check passes, and each check prints FAIL under `UF_TEST_PROVOKE=rmmz_rows.<check>`. The provocation run covers one row check, one re-form check and each non-row check. The re-form provocation is the `reform_ramp_drift` edit (one valid palette ramp changed; slot and status kept), not a forced failure, and the check must name `paletteRampIds`.
- `node tools/art/test_catalogue.js`: 47 checks plus `rule_rmmz_form`, `rule_rmmz_tile_dup` and `rule_rmmz_size_override`, all passing. Each of the three new cases shows FAIL with its rule switched off. `rule_rmmz_size_override` is the new case `tools/art/fixtures/catalogue/cases/rmmz_size_override.json` (code `SIZE_OUTSIDE_ROW`): it adds `envelopeOverride {wMin: 56, wMax: 89, hMin: 72, hMax: 96}` (the measured oak override) to the mini catalogue's `SURFACE_SHARED_TREE_OAK_V1_DEFAULT` and leaves its envelope at the chart row's 56-80 x 72-96. Main's rule does not fire on that patch (the envelope is inside the row); the lane's rule must (the envelope does not equal the override). The baseline mini catalogue stays at 0 errors. Drafts of the case file are in the lane-pg scratch folder: the WG1 draft (`draft_case_rmmz_size_override.json`, `wg1_casecheck.js`, oak value 90, run on `fbdd2bd9`) and the WG2b draft with the measured value 89 (`draft_case_rmmz_size_override_wg2b.json`, `wg2b_casecheck.js`, run on `d49563bd`). Both give: main rule 0 hits, lane rule 1 hit; with the envelope set equal to the override, main rule 1 hit, lane rule 0.

**Mutants at the tip** (`node tools/art/test_rmmz_rows.js --mutants`). Each mutant is built in memory, never on disk. All but one go through `overrides`; `reform_ramp_drift` edits the built catalogue in memory before the checks run, because a re-form item has no ramp or anchor to override (it stands for a builder defect). The run exits 1 if any mutant survives:

| Mutant | Edit | Must be killed by |
|---|---|---|
| `drop_one_row` | delete the item for `SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` from `rmmz_rows.json` | `row_SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` FAIL **and** the fresh `catalogue.json` differs from the committed one (the `--check` condition) |
| `dup_tile` | sapling tileId 157 -> 156 | `RMMZ_TILE_DUP` (and `stock_positions`) |
| `wrong_grid` | oak grid `2x2` -> `1x1` | `RMMZ_FORM` |
| `side_on_top_kind` | granite SIDE tileId 6272 -> 6656 (a top kind) | `RMMZ_FORM` (96x96 slot vs 96x144 target) |
| `local_zero` | steam tileId 769 -> 768 | `RMMZ_FORM` |
| `half_overflow` | broadleaf canopy 2x2 tileId 178 -> 183 | `RMMZ_FORM` (leaves the 8-column half) |
| `ar_text` | remove `DEUS_Outside_E.png` from the AR-2205 text | `RMMZ_AR_TEXT` |
| `ruling_missing` | remove the first quote from `docs/OWNER_DECISIONS.md` | `RULING_MISSING` |
| `reform_has_runtime` | a re-form targets `SURFACE_SHARED_TREE_OAK_V1_DEFAULT` | `REFORM_TARGET` |
| `reform_ramp_drift` | after the build, in memory: `paletteRampIds` of the re-formed `SURFACE_SHARED_SHADE_HEIGHT_H1_DEFAULT` `NEUT_VOID_BLACK` -> `NEUT_COOL_GRAY` (a registry ramp); slot, status and every other field unchanged | `reform_SURFACE_SHARED_SHADE_HEIGHT_H1_DEFAULT` FAIL naming `paletteRampIds` (`validateCatalogue` reports 0 errors on it, and the WG1 re-form check passed it; prototype at `d49563bd`) |
| `bad_input` | delete `state` from one item | `RMMZ_ROWS_INVALID` |
| `ar_closed` | AR-2204 status `REQUESTED (...)` -> `CHECKED` in `docs/ASSET_REQUESTS.md` | `AR_MISSING` |
| `a4_spec_height` | `docs/RMMZ_ASSET_SPEC.md:71` A4 sheet `768 × 720 px` -> `768 × 700 px` | `RMMZ_SPEC` (700 is not a whole number of 240 px top + side pairs) |
| `drop_override` | delete `envelopeOverride` (and `overrideWhy`) from the `SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT` item | `envelope_admits_art` (pine 96x132 vs 42-64 x 80-104) **and** `size_overrides` |
| `strip_overrides` | delete every `envelopeOverride` and `overrideWhy` (the rows as they were before the work gate) | `envelope_admits_art`, naming all 9 override rows; copy this output to `evidence/envelope_before_overrides.log` |
| `bad_override` | pine `envelopeOverride.wMin` 42 -> 100 (above its wMax and the row's target) | `RMMZ_ROWS_INVALID` |

Every new build error and rule code is killed by at least one mutant or rule case: `RMMZ_ROWS_INVALID`, `RMMZ_SPEC`, `AR_MISSING`, `RMMZ_AR_TEXT`, `RULING_MISSING`, `REFORM_TARGET`, `RMMZ_FORM`, `RMMZ_TILE_DUP`, and the override path of `SIZE_OUTSIDE_ROW` (rule case `rmmz_size_override`). A mutant counts as killed only when the named code (or named check) is among the failures, not when the build fails for another reason.

Show that the sweep itself can fail (Rule 4): in a scratch copy, disable the killing check of one mutant and confirm that `--mutants` exits 1. Copy that output.

Also show the **real** `--check` failing on the drop: in a scratch clone, delete that item from `art/catalogue/rmmz_rows.json` and run `node tools/art/build_catalogue.js --check`. It must exit 1 with `DIFF art/catalogue/catalogue.json`. Copy the output to `evidence/check_after_drop.log`.

### Other named checks (pass at the tip; each with a provocation)

Each of these checks first asserts its population from the fixture, so none can pass on an empty set (at the base every one of them must FAIL on the population count):

- `rmmz_rows.rmmz_form`: all 92 entries that carry `rmmzForm` match their RMMZ target.
- `rmmz_rows.pa_agrees`: for every row without a grid (A1, A2, A4 kinds and 1x1 tiles; 72 entries), `tools/art/place_art.js` `tilesetTarget(tileId)` equals the slot size. For the 20 grid rows, the first cell's target is 48x48 and the slot is grid x 48. This is the consumer contract test.
- `rmmz_rows.tile_unique`: 134 claimed cells, no duplicate.
- `rmmz_rows.stock_positions`, two kinds of stock reference:
  - **positions (28 entries):** the rows whose file is the DEUS counterpart of the named stock sheet (`DEUS_Outside_B` of `Outside_B`, `DEUS_Outside_A1` of `Outside_A1`, `DEUS_Dungeon_A1` of `Dungeon_A1`, `DEUS_Dungeon_A2` of `Dungeon_A2`): 6 of group B, 14 of C, 4 of F, the waterfall, lava, obsidian and the vines re-form. Each sits on the stock tile id or kind it names.
  - **format examples (30 entries):** the A4 rows name an `Outside_A4`/`Dungeon_A4` kind as a format example on another sheet (ROWS.md 5A), so they are checked for the label and for the same top/side parity (even or odd A4 block row), not for position.
  - In both, the label matches the frozen label in the fixture, transcribed from the RMMZ MZ stock `.txt` label files (one label per kind for A sheets, per tile id for B).
- `rmmz_rows.append_only`: the test builds with `overrides` that empty `rows` and `reforms` and remove the AR-2200 to AR-2205 lines. It compares that build with the real one: every common entry keeps an identical slot, every new row's slot is on a `_RMMZ\d\d` sheet, and no `_RMMZ` sheet holds an older row. The same comparison build is the baseline of the re-form preservation check (`rmmz_rows.reform_<id>`).
- `rmmz_rows.counts`: 72 new rows (A 30, B 16, C 15, D 1, E 3, F 7) and 20 re-forms.
- `rmmz_rows.ar_rows`: AR-2200 to AR-2205 exist in `docs/ASSET_REQUESTS.md` as open 5-column rows, each names the basename of every runtime file its rows use, and none of the six ids is in the catalogue's `outOfScope` (UI regex `:1288`, withdrawn or closed; work-gate risk 5). Rechecked 2026-10-01: none of the six AR lines of ROWS.md section 4 matches the regex (0 of 6; a control string "menu theme" matches).
- `rmmz_rows.envelope_admits_art` (work gate REQUIRED CHANGE 4; measurement basis WORK-GATE lane-pg 2, REQUIRED CHANGE 2): the fixture `tools/art/fixtures/catalogue/rmmz_rows_expected.json` holds a `judgedArt` list, typed in from the version-qualified specimen table of scope item 1, never read from `rmmz_rows.json`. Each item has the row id, specimen file, sha256, measured bounding box, council status and selection. Trees: oak 89x84 (`oak_v7k.png`), dead 84x89 (`dead_v4.png`), swamp 80x93 (`swamp_v4.png`), fruit 66x73 (`apple_c2d.png`, a historical candidate, not passed art), birch 63x118 (`birch_v4b.png`), pine 96x132 (`pine_c2d.png`). Stumps (`<species>_stump10.png`): oak 27x21, swamp 40x34, dead 31x23, pine 34x18, birch 11x15, fruit 19x19. 12 items. The check asserts the population (12), then for each item that the entry exists and that `envelope.wMin <= w <= envelope.wMax` and `envelope.hMin <= h <= envelope.hMax`, and that the box fits one slot frame. At the base it FAILs (rows absent). Without the overrides it FAILs on exactly the 9 override rows (mutant `strip_overrides`, evidence `evidence/envelope_before_overrides.log`). At the tip it passes 12/12. Prototype at `d49563bd` with the measured sizes (2026-10-01): 12/12 with the overrides, 9 not admitted without them, 1 (pine) with pine's override dropped. **What it does not check:** it compares recorded dimensions with the catalogue envelopes and reads no image. A changed or replaced image is invisible to it until its measurement is refreshed (a new `judgedArt` item with the new sha256 and box, in a rows edit). Validating the actual selected image against the effective envelope belongs to induction (`tools/art/validate_art.js` SCALE_OUT_OF_ENVELOPE, `:787`, on the real file).
- `rmmz_rows.size_overrides`: the entries that carry `envelopeOverride` are exactly the fixture's 9 (`sizeOverrides` list, with values), no entry carries `footprintOverride`, each override row's `statusWhy` holds the size-override clause, and `art/catalogue/conflicts.md` lists each of the 9 ids in its "Per-row size overrides" section (population 9 first).
- `rmmz_rows.schema_contract`: `catalogue.schema.json` has MARK in the category enum, the three optional properties exactly as scope item 3 gives them (each `additionalProperties: false`), `$id` and `schemaVersion.const` equal to `deus-art-catalogue/1.4.0`, and `B.SCHEMA_VERSION` equals the same string. It also feeds the schema validator two broken copies of one override row (an extra `wTarget` key in `envelopeOverride`, an extra key in `footprintOverride`) and expects one error each.

### Guards (pass before and after)

- `node tools/art/test_multi_variant_topology.js`: it reads the real catalogue and expects the granite boulder APPROVED with `RMMZ_CHARACTER_8`.
- `node tools/art/test_blank_templates.js` and `node tools/art/test_place_art.js`: these build their own fixture catalogues (`tools/art/test_blank_templates.js:203-223`), so they guard against code regressions only; the real rows' placement contract is `rmmz_rows.pa_agrees`.
- `node tools/governance/test_check_claims.js`, `node tools/test_control_board.js`, `node tools/check_deus_syntax.js` and `node tools/test_palette.js`

### Evidence runs (not gates; record base vs tip in the report)

- `node tools/art/test_validate_asset_standard.js`: the same single failure (`rule-ids: set mismatch`) and no new one.
- `node tools/verify_world_state_registry.js`, report mode only, never `--write`. Record:
  - the new gaps for new NATURAL_WORLD slots (`SOURCE:TERRAIN`, `TREE`, `FLORA`, `STONE`, `WATER`);
  - the 7 `SLOT_CLASS_UNDECLARED` for `SOURCE:MARK`;
  - that no existing key changed (no slot moved).

  The fix goes to the WSR owner (WG.33). Do not edit `tools/wsr/**`.
- A slot diff from base to tip over every entry that existed at base: 0 changed slots.

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_control_board.js`
- `node tools/test_palette.js`
- `node tools/governance/test_check_claims.js`
- `node tools/art/build_catalogue.js --check`
- `node tools/art/test_catalogue.js`
- `node tools/art/test_rmmz_rows.js`
- `node tools/art/test_rmmz_rows.js --mutants`
- `node tools/art/test_multi_variant_topology.js`
- `node tools/art/test_blank_templates.js`
- `node tools/art/test_place_art.js`

## F5 evidence

None. The lane changes no game file. These are catalogue rows and a builder. Seeing art in F5 is the job of the later induction and placement lanes, which carry the in-game proof. Open every screenshot you cite and describe it (AGENTS.md Rule 5). This lane should need none.

## Dependencies

- WG.20.02 (the catalogue, merged).
- Lanes that depend on this one:
  - every PM generation run for Groups 3-6, trees and stumps (DEC-007 row first);
  - the remake of the ten cliff materials (the first sheet was rejected by ART-COUNCIL-1) and of slots 10-14, generated after these rows exist, then inducted into `DEUS_Cliffs_Temperate_A4.png` once the council and the PM pass them;
  - a placement lane that teaches `tools/art/place_art.js` to export `runtime.grid` stacks;
  - a game-data lane that names the DEUS sheets in `game/data/Tilesets.json` (DEC-059 editor-closed permission).

## Design references (repo)

- `tools/art/build_catalogue.js`:
  - `:34-63` SRC;
  - `:71-81` CATEGORY_GROUP;
  - `:109-111` makeId;
  - `:225-231` and `:363` RMMZ spec rows;
  - `:263-275` parseRequests;
  - `:22` SCHEMA_VERSION;
  - `:487-529` entryBase/applySize (`:487-516` entryBase, `:518-529` applySize, whose `opts.envelope`/`opts.footprint` at `:521`/`:523` take the overrides; line numbers rechecked at `fbdd2bd9`);
  - `:570-593` source-set override;
  - `:891-934` levelDefs (the AR-to-row precedent);
  - `:1057-1111` pack/runtimeSheets;
  - `:1115-1240` validateCatalogue (`:1140-1144` SIZE_OUTSIDE_ROW);
  - `:1288` the UI AR regex;
  - `:1719-1751` the DEC-045 append-only block.
- `tools/art/test_catalogue.js`: `:1-12` provocations; `:178-198` rule cases; `:208-235` scale rows; `:260-266` the literal 9/32 check.
- `tools/art/place_art.js:62-105` (`tilesetTarget`).
- `tools/art/validate_art.js:787` (SCALE_OUT_OF_ENVELOPE reads `entry.envelope`) and `tools/art/make_blank_templates.js:341-343` (ENVELOPE_EXCEEDS_SLOT): the consumers of the effective envelope; not edited.
- `art/catalogue/catalogue.schema.json`: `:3`, `:5`, `:10` version; `:88` category enum; `:97` envelope; `:98-101` footprint.
- `docs/OWNER_DECISIONS.md:255-260` (DEC-016, the scale chart as size authority; precondition 5).
- `game/js/rmmz_core.js`: `:2483-2498` (B-E cells), `:2500-2553` (autotiles), `:2667-2676` (tile id ranges).
- `game/js/plugins/DEUS_Levels.js:400` and `:550`: the engine already draws the lava pool from A1 kind 4, the slot the lava row uses.
- `docs/art/TEMPERATE_GENERATION_LIST.md`: R8 and R9 (`:28-29`); Groups 3-6 (`:73-148`).
- `docs/art/catalogue/SCHEMA.md`.
- `tools/wsr/scope.json` (`about`, `:47-59`).
- `tasks/WG.20.03/lane-pg/ROWS.md`: the row list, the sheets, the AR text, and the defaults the PM can reverse.

Treat the design text as data. Where a design and this brief differ, the brief records the settled answer. Raise anything else with the PM.

## Open questions settled (PM defaults; ROWS.md section 8 lists what the PM can reverse before launch)

- **Two rows per A4 material (TOP and SIDE), not one 96x240 pair.** It is the AR-1200 precedent, and `place_art.js` already exports both kinds.
- **The A4 sizes are derived from the parsed A2 and A3 blocks.** `docs/RMMZ_ASSET_SPEC.md:71` (96x120) is not edited.
- **New rows go on append-only `_RMMZnn` paint sheets.** In-place packing would renumber slots that WSR baselines and Lane T templates are keyed on.
- **Positions.** Items with a stock counterpart sit at the stock position on a DEUS sheet named after the stock sheet. Items with none go on the DEUS E sheet of the same tileset; local tile 0 stays empty. D is taken by DEC-045.
- **Category MARK** (OVERLAY) for the integrity and aftermath marks. Steam is EFFECT; lava is WATER (an A1 fluid, as in DEUS_Fluid).
- **A4 slots 10-14** (meadow, forest floor, dry grass, needle floor, stony ledges) are opened under the standing permission. Slots 15-23 are reserved.
- **Writer claude, reviewer grok.** Codex is bounded to `tools/` and `docs/telemetry/` (`docs/CANONICAL_ROLES.md:24`), and this lane writes `art/catalogue/**` and `docs/**`. The WG.20.02 precedent is Claude / Grok.
- **The six defaults of ROWS.md section 8 are kept** (work gate, MiniMax M3: "DEFAULTS 1-6: keep all").
- **D4, the size question: (a) per-row overrides** (work gate: "per-row envelope overrides that admit the passed art"; keeping the chart envelopes "would leave the catalogue lying about what fits"). Precondition 5: the Owner rules on the DEC-016 side, by an amendment to DEC-016 or an explicit delegation of that decision; a PM interpretation of DEC-056, or an art-council approval, does not satisfy it. The second judge kept this Owner hold and did not require a split (rows at the chart sizes now, overrides later). Such a split would be a rescope: it would defer the override data and checks, revise the acceptance tests, and record that out-of-envelope specimens stay blocked until a later Owner-authorized change.

## Work-gate changes (MiniMax M3, 2026-10-01, GO WITH CHANGES)

1. **Schema** (scope item 3): optional `envelopeOverride {wMin, wMax, hMin, hMax}` and `footprintOverride {w, h}`, each `additionalProperties: false`; `deus-art-catalogue/1.4.0`, and `SCHEMA_VERSION` (`tools/art/build_catalogue.js:22`) to match.
2. **Builder** (scope item 2.d and 2.h): the row-level envelope and footprint win over the size row in `applySize` (`:518-529`); `SIZE_OUTSIDE_ROW` checks an override row against its override.
3. **Data** (scope item 1; ROWS.md 5B): overrides for the oak, dead, birch and pine trees and for the oak, swamp, dead, pine and birch stumps; the fruit stump (19x19) fits `DEBRIS_STUMP` and needs none. Slots unchanged.
4. **Test** (Tests, named checks): `rmmz_rows.envelope_admits_art` with the judged sprite sizes in the expected fixture as an independent oracle; FAIL without the overrides, PASS with them; mutant `drop_override` must be killed.
5. **Id hygiene:** the swamp tree and stump drop the doubled `TREE` token (input type `tree-swamp` becomes `swamp`) and are now `SURFACE_SHARED_TREE_SWAMP_B-V1_DEFAULT` / `_DEPLETED` everywhere in the packet. Neither new id appears in any file on main (`fbdd2bd9`, `d49563bd`, `bdcee6f2`) or on any of the 74 task refs at `d49563bd` (39 local `task/*` heads and 35 `origin/task/*`; GitHub's 35 `task/*` heads equal the local `origin/task/*` refs). The charset row `SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT` (CAT, `!$UF_*`) keeps its id, so the swamp B row no longer shares the type token with its charset row; nothing keys one to the other.

## Work-gate changes (ChatGPT Pro, 2026-10-01, second judge, GO WITH CHANGES)

Verdict: `~/.deus_pm/braintrust/2026-10-01/WORK-GATE-LANE-PG-2_chatgpt_pro.md`. Applied for the PM by a Claude sub-agent; the log with the measurement table is the lane-pg scratch `CHANGES_WG1.md` (last section) and `FIXES_WG2.md`.
1. **Precondition 5 without the DEC-056 alternative.** Before launch the PM records an Owner amendment to DEC-016 or an Owner ruling delegating the size decision; a PM interpretation of DEC-056, or an art-council approval, does not count. Precondition 5 (`BRIEF.md:44`), the D4 line (`:375`), the DEC-016 risk row (`:406`).
2. **Measurement basis.** A version-qualified table of the 12 specimens (row id, file, sha256, measured box, council status, current or historical) and the overrides recomputed from it: oak 56-89 wide, dead 56-84 wide, birch 76-118 tall; still 9 overrides, with the same slots and anchors. `envelope_admits_art` checks recorded dimensions only; the actual image is checked at induction. Scope item 1 (`:61-98`, table `:77-94`), the fixture (`:150`), `envelope_admits_art` (`:287`), the rule case (`:244`), the risk row (`:407`), GAME TRANSLATION (`:483` and `:497-500`), ROWS.md 5B.
3. **Re-form preservation.** Every field outside `runtime`, `rmmzForm`, `sourceIds.ar` and `statusWhy` is compared with the no-rows/no-reforms build; `sourceIds.ar` keeps its members and adds only AR-2203; `statusWhy` keeps its text plus the suffix; new mutant `reform_ramp_drift` (16 mutants). Scope 2.f (`:130`), scope item 6 (`:150`), the re-form check (`:233-239`), the mutant (`:259`), the risk row (`:403`).
4. **rampBasis settled.** The ROWS.md section 1 convention, with "MATCH does not mean approved"; the birch and pine stumps become MATCH; no existing family is relabelled. SCHEMA.md documents it (`:147`); remaining problem 1 is resolved (`:594-599`); ROWS.md section 1 and 5B.

Also: the judge's five risks are in the risk table (`:395-410`), and its precondition-5 note (no split required) is on the D4 line. `lane.json` is unchanged.

## Risks and the checks that block them

From the first work gate (MiniMax M3, its five risks), one found while applying its changes, and the second work gate (ChatGPT Pro, its five risks; two of them are folded into existing rows):

| Risk | What blocks it |
|---|---|
| **D4 unaddressed:** the catalogue would say the judged trees and stumps do not fit their rows. | Scope item 1 overrides; `rmmz_rows.envelope_admits_art` (12/12 at the tip, FAIL on the 9 override rows without them); mutants `drop_override` and `strip_overrides`; `rmmz_rows.size_overrides`. |
| **WSR `SOURCE:MARK` undeclared:** the 7 MARK slots are `SLOT_CLASS_UNDECLARED` in `tools/verify_world_state_registry.js`. | The lane does not edit `tools/wsr/**` (not in allowedPaths, so merge_gate refuses it with SCOPE_VIOLATION). REPORT.md records the WSR delta from the report-mode run (Evidence runs); the Coordinator declares `SOURCE:MARK` in WG.33 (ROWS.md 5F). |
| **Re-form drift on the 20 re-formed rows:** a re-form could move a slot or change size, status, ramps, anchor, alpha mode or another field. The WG1 check guarded only runtime, form, slot, status and AR inclusion (second judge). | `rmmz_rows.reform_<id>`: runtime and form against the fixture, slot equal to the fixture's base slot, and preservation against the no-rows/no-reforms build (every field outside `runtime`, `rmmzForm`, `sourceIds.ar` and `statusWhy` equal; `sourceIds.ar` = previous members + AR-2203 only; `statusWhy` = previous text + the suffix); mutant `reform_ramp_drift`; `rmmz_rows.append_only` (0 slots changed); the reviewer's slot diff base to tip; `REFORM_TARGET`. |
| **Schema version collision with `task/lane-ce`** (both at 1.3.0), and **collateral catalogue changes or schema regression during concurrent merges** (second judge, risk 2). | lane-pg takes 1.4.0 (scope item 3); `rmmz_rows.schema_contract` asserts `$id`, `schemaVersion.const` and `SCHEMA_VERSION` all equal `deus-art-catalogue/1.4.0`; the second lane to merge rebases and keeps both lanes' schema additions (Shared files); the re-form preservation check, `append_only` and the base-to-tip slot comparison; a clean rebuild after the final rebase. |
| **AR text against the UI-word regex** (`tools/art/build_catalogue.js:1288`): a matching AR title is listed out of scope as interface art and its rows lose their request. | `AR_MISSING` also fires when an AR-2200..2205 row is listed in `outOfScope` (UI, withdrawn or closed); `rmmz_rows.ar_rows` asserts none of the six is in `outOfScope`; the reviewer reruns `build_catalogue.js --check` in a scratch clone. The lane-pg review checked all six titles against the regex (no match). |
| **DEC-016 (found 2026-10-01 while applying D4):** per-row overrides depart from the scale chart, which DEC-016 makes the size authority, with disagreements sent to the Owner. | Precondition 5: before launch the PM records an Owner amendment to DEC-016, or an Owner ruling delegating the size decision; a PM interpretation of DEC-056, or an art-council approval, does not count. The builder lists every override in `conflicts.md` and in each row's `statusWhy`; `rmmz_rows.size_overrides` checks both. |
| **Historical specimens read as a current size approval** (second judge, risk 1; this row was "the trees' judged sizes may change"): the WG1 tree sizes came from ART-COUNCIL-2 versions that did not pass. Later versions of the oak, dead, birch, pine and swamp trees passed 4 of 4 (ART-COUNCIL-5b/6), and the fruit tree has no passed version. | Precondition 5 (the Owner rules on the measured overrides). The version-qualified specimen table of scope item 1 (file, sha256, box, council status, current or historical), which the fixture's `judgedArt` matches item for item. `envelope_admits_art` on those recorded boxes. That check reads no image, so it cannot see a changed image: a new version needs a refreshed measurement and a rows edit (one item in `rmmz_rows.json` and the fixture, no code). At induction, `tools/art/validate_art.js` SCALE_OUT_OF_ENVELOPE (`:787`) checks the actual selected image against the effective envelope; the fixture's historical dimensions do not stand in for that. |
| **Wrong tile addresses, overlapping grids or malformed row input** (second judge, risk 3). | `RMMZ_FORM`, `RMMZ_TILE_DUP`, `RMMZ_ROWS_INVALID`, `rmmz_rows.stock_positions` and the independent row fixture. A mutant counts as killed only when its named code or check fails, not on an unrelated error (Mutants). |
| **Prototype success taken for implementation evidence** (second judge, risk 4): the PM's prototype emulates the builder in memory; the lane's code is not written yet. | At completion, the merge waits until Grok runs the manifest's gates on the final tree in a clean LF clone, with the fail-before at the base, the mutant-sweep failure demonstration and the real dropped-row `--check` failure (Tests; Writer and reviewer). These are completion checks, not launch conditions. |
| **Rows read as generation permission or as a working game bridge** (second judge, risk 5). | Status MISSING and T `no_image_data`. The reviewer refuses any PNG, image data or `game/**` path in the diff, and merge_gate refuses paths outside allowedPaths (SCOPE_VIOLATION). A downstream runtime-ready signoff waits for grid export, sheet-slot reconciliation and the WSR follow-ups (ROWS.md 5F and section 7); this lane does not implement them. Registering the Group C rows does not widen the PM's generation scope (ROWS.md 5C). |

## Writer and reviewer

- Writer `claude`: a Claude worker launched for the lane, not the PM session. Reviewer `grok`. The families differ: merge_gate refuses a same-family review (REVIEW_SAME_FAMILY) and treats claude and fable as one family.
- The reviewer:
  - runs every gate in a fresh clone made with `-c core.autocrlf=false`;
  - reruns the fail-before at the base;
  - reruns the mutant-sweep failure demonstration (one killing check disabled, `--mutants` exits 1) and the real dropped-row `--check` failure (second judge, risk 4);
  - checks the expected fixture against ROWS.md row by row;
  - confirms that no existing slot moved;
  - confirms that no PNG and no `game/**` path is in the diff.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor any `game/data/*.json`.

## Rules that bind this lane

- No art and no generation, by anyone (DEC-007; WG.20 "NO ART GENERATION, BY ANYONE"). Rows have status MISSING and carry no image data (T `no_image_data`).
- Data over hardcoding (Rule 14): the rows live in `art/catalogue/rmmz_rows.json`, and the code holds rules only.
- Tests must be able to fail (Rule 4). Every check has a provocation, every mutant must be killed, and the sweep must be shown failing.
- Never claim what you did not observe (Rule 3). Write "not checked" for anything not run.
- Two failed fixes on the same problem: stop, write down what you know, and escalate to the PM (Rule 10).
- The engine core is read-only (Rule 9). This lane does not touch `game/` at all.
- Build and run `--check` only in a clean worktree or clone, never in the main working copy.
- Commit only on `task/lane-pg`, with subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`, `.` or `commit -a`). The PM merges through `merge_gate` (`--no-ff`). The review commit is the tip and holds the full hash of the last non-review commit.
- Report in the AGENTS.md report format, with the GAME TRANSLATION block filled with observed results.

## GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane: WG.20.03 / lane-pg
Approved scope / Owner authorization reference: Owner 2026-10-01 rulings (docs/OWNER_DECISIONS.md, precondition 1): standing row permission, RMMZ format, PM art scope; DEC-007 catalogue first.
Writer SHA / evidence date: (writer fills at the tip)
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
None at merge. The 92 rows let the PM make, and the placement tools drop into RMMZ tilesets, the art for: cliff faces at every
temperate height step; map trees and the stump each species leaves when felled; grass, flowers, boulders, rocks, bushes,
mushrooms and fallen logs; still waterfalls; lava, cooled obsidian and steam; and the strained/failing ground marks that warn
of collapse.

Trigger:
N/A at runtime: no game code changes. The consumers act when the PM schedules a generation run (catalogue-first gate) and
when a placement lane exports approved art into a DEUS tileset file.

Runtime Authority:
art/catalogue/catalogue.json (built from art/catalogue/rmmz_rows.json) owns each asset's slot, size, anchor and RMMZ tile
address. Runtime tile drawing stays with RMMZ Tilemap and DEUS_Levels/DEUS_Tiles; unchanged.

Simulation Path:
N/A - no simulation change. Data path: art/catalogue/rmmz_rows.json -> tools/art/build_catalogue.js (buildRmmzRows,
append-only pack, RMMZ_FORM/RMMZ_TILE_DUP) -> art/catalogue/catalogue.json.

Engine Bridge:
DEFERRED. (1) tools/art/place_art.js exports catalogued art into RMMZ sheets: 1-cell and autotile rows today (proved by
pa_agrees); multi-cell grid rows need a placement lane. (2) game/data/Tilesets.json names no DEUS_* sheet yet (game-data
lane, DEC-059). (3) The lava row already matches the slot the engine draws: game/js/plugins/DEUS_Levels.js:400, :550 (A1 kind 4).

Visible Result:
Nothing visible until art is approved and placed. NOT RUN (no runtime change).

Persistence:
N/A - catalogue rows are build data, not save data; ids are stable (makeId) and slots append-only.

Failure Without This Lane:
The PM may not generate Group 3-6, tree or stump art (DEC-007; TEMPERATE_GENERATION_LIST R8). Art made without an RMMZ home
would need re-cutting or conversion before it could enter a tileset.

Automated Proof:
node tools/art/test_rmmz_rows.js (72 row + 20 re-form checks with field preservation, envelope_admits_art 12/12 on the
measured specimens, FAIL at base, PASS at tip); --mutants (16 killed, incl. drop_override, strip_overrides and
reform_ramp_drift); node tools/art/build_catalogue.js --check (OK at tip;
exit 1 after a dropped row); node tools/art/test_catalogue.js (+ rule_rmmz_form, rule_rmmz_tile_dup,
rule_rmmz_size_override). Tested SHA: (writer fills).

In-Game Proof:
NOT RUN - N/A: no game file changes in this lane.

CONSUMED BY GAME SYSTEMS:
- tools/art/place_art.js: reads runtime.file/tileId/grid and the slot size; contract test rmmz_rows.pa_agrees.
  Corruption would show as art in the wrong RMMZ cell (a flower drawn where a stump belongs, a cliff side drawn as a top)
  or a placement refusal.
- tools/art/make_blank_templates.js: reads the paint slots; guard test_blank_templates.js plus append_only (no slot moved).
- tools/art/validate_art.js: checks the actual placed image against entry.envelope (SCALE_OUT_OF_ENVELOPE, :787), so the
  9 size overrides reach the art QA with no change there. rmmz_rows.envelope_admits_art checks only the 12 recorded
  specimen measurements against the envelopes (it reads no image); the real image is checked here, at induction.
  Corruption would show as a passed tree or stump refused at placement, or an oversized sprite accepted.
- The PM's generation cards and council boards: each run cites its row id, envelope and anchor (DEC-007, DEC-053).

GAME BRIDGE STATUS
Simulation implemented: NO - not a simulation lane.
Engine bridge implemented: NO - deferred to the placement and Tilesets.json lanes named above.
Presentation implemented: NO - no art exists for these rows yet.
Input/player interaction implemented: NO - N/A for catalogue rows.
Save/load implemented: NO - N/A, build data only.
Playable verification performed: NO - nothing to play until art is placed.
```

## Owner ruling excerpts

- "You can always open more rows for assets we need" (Owner, 2026-10-01 06:27 UTC, `docs/OWNER_DECISIONS.md:1066`; standing permission, DEC-063 item 12).
- "Using RMMZ's own format should make it easy to tool into the game as well" (Owner, 2026-10-01 06:01 UTC, `docs/OWNER_DECISIONS.md:1062`) and "use all those as format examples, and then U7 as style examples" (06:15). The format example is RMMZ stock and the style example is Ultima VII (DEC-063 items 2 and 10).
- DEC-007: every generated asset has its catalogue row before it is generated (`docs/OWNER_DECISIONS.md:116`).
- DEC-016: the scale chart is the governing size authority; every entry's envelope and footprint derive from it, and disagreements go to the Owner (`docs/OWNER_DECISIONS.md:255-260`; precondition 5).
- The PM's art scope: TEMPERATE_GENERATION_LIST Groups 3, 4, 5 and 6, plus trees and stumps. A stump is its own tree cut down. Never redo the Owner's own tile sets. No animals, monsters, people, facesets, charsets or animations yet. Every RMMZ asset slot eventually gets a DEUS asset. Inventory is Ultima-style (item sprites and container gumps, no IconSet), in a later lane.

## Review log

### 2026-10-01: adversarial pre-launch review of BRIEF.md, ROWS.md and lane.json (Claude sub-agent for the PM)

This review comes from the same model family as the PM who drafted the lane and as the lane's writer, so it is not the independent review: Grok reviews the tip. Main moved during the review, from `b889de90` to `30e90b7f` (DEC-064 appended, pins refreshed, mail). Where the move matters, each check below was rerun or rechecked at `30e90b7f`.

**What was run.** Everything was read-only, in clones under the lane-pg scratch folder `review/`.
- **The manifest:**
  - merge_gate's own `validateManifest` (`tools/governance/merge_gate.js:443-464`) on `lane.json`, before and after the allowedPaths edit: `VALID` both times.
  - The writer family is `claude` and the reviewer family is `grok`, so they differ.
  - The path `tasks/WG.20.03/lane-pg/lane.json` matches the taskId, lane and branch.
  - `program/validate_lane_json.js`: `VALID`.
  - No gate test is in merge_gate's quarantine list (`tools/ops/gate_tests.json`, which has one entry).
- **Baseline, clean LF clone of `b889de90`:**
  - `build_catalogue.js --check` OK (12 files) and `test_catalogue.js` 47/47.
  - `test_multi_variant_topology.js` 887 passed, `test_blank_templates.js` 79, `test_place_art.js` 154, `test_check_claims.js` 279.
  - `test_control_board.js` CLEAN PASS, `check_deus_syntax.js` 62 files with 0 errors, `test_palette.js` pass.
  - `test_validate_asset_standard.js` 406 passed plus the known 1 FAIL.
  - At `30e90b7f`, `--check` was OK and `test_catalogue.js` 47/47 again.
- **The PM's prototype** (`proto_lanepg.js`, pointed at the clone), at both commits:
  - 72 new rows and 20 re-forms;
  - 0 `validateCatalogue` errors, and 0 schema errors with the patch (5 without);
  - 0 RMMZ_FORM mismatches, 134 cells claimed once each, 0 `tilesetTarget` disagreements and 0 existing slots moved.
  - Its 92 table lines equal ROWS.md section 5 byte for byte. This review then changed text outside those tables only.
- **Ids:**
  - None of the 72 new ids exists on main, `task/lane-ce`, `task/art-temperate-induction` or `task/lane-pm-streamline`.
  - All 20 re-form targets exist on each of them with `runtime.kind NONE`.
  - `lane-pg`, `WG.20.03` and `AR-22xx` have no hit on any ref. Main has 10,122 entries.
- **RMMZ format**, against `game/js/rmmz_core.js` and the MZ stock label files (`newdata/img/tilesets/*.txt`):
  - Checked: the tile-id ranges (`:2667-2676`), the B-E cells (`:2483-2498`) and the A1/A2/A4 blocks (`:2500-2553`).
  - The A4 sheet is 768x720: 3 pairs of a 96x144 top over a 96x96 side. The top kind is `16*floor(s/8)+s%8` and the side kind is the top + 8.
  - Every tileId and pixel position in ROWS.md sections 5 and 2.3 was recomputed by hand. All are correct.
  - Every stock label was checked against the `.txt` files, and all match:
    - Outside_B tiles 20/28, 52-55, 152-167, 171, 176-187, 234-235 and 243;
    - Outside_A1 kind 5, Dungeon_A1 kind 4 and Dungeon_A2 kind 16;
    - Outside_A4 kinds 32/40, 36/44, 37/45 and 38/46, and Dungeon_A4 kinds 0/8 and 1/9.
  - A crop of the stock Outside_B sheet (opened) shows 157/165 is a 1x2 tree, 158 a canopy cell, 176/177/184/185 a 2x2 large tree and 178/179/186/187 a 2x2 canopy block.
- **The PM's A4 sheet** (opened and measured): 768x720, slots 0-9 painted, slots 10-23 empty.
- **AR text:**
  - All six AR rows parse as open 5-column rows.
  - None matches the UI out-of-scope regex (`tools/art/build_catalogue.js:1288`).
  - Each names every runtime file its rows use.
  - `docs/ASSET_REQUESTS.md:326` is still the end of the AR-2100 table.
- **Citations:** every file:line citation in BRIEF.md and ROWS.md was rechecked at `b889de90`. The ones that had moved are corrected below.

**Edits made.** I am sure of each one, and the PM can reverse any of them.
- **BRIEF, preconditions and base:**
  - Precondition 1 is marked MET (DEC-063, `4e4bde1d`), with the line numbers of both quotes.
  - The builder's search string is now the Owner's exact wording, which ends "as well" (`docs/OWNER_DECISIONS.md:1062`).
  - The first-hit lines that `ctx.lineOf` returns are recorded (`:1066`, `:923`).
  - Precondition 2: WG.20.02 is at `:155` (Rev 33), not `:150`. The WBS row is now in a fenced block; the old inline code span used backslash-escaped backticks, which do not render.
  - Precondition 4 is marked MET. Base and Dependencies are updated now that lane-cu has merged.
- **BRIEF, scope:**
  - The 2x2 size row cites `rmmz_core.js:2483-2498`, not the A4 lines.
  - New TERRAIN rows must not enter the builder's `terrains` list.
  - RMMZ_FORM refuses A3 and A5 forms (fail closed).
  - The local-tile-0 refusal is labelled a DEUS convention. RMMZ draws every tile id except 0, and stock C sheets use local tile 0 (`Outside_C.txt` "Obelisk").
  - `overrides` must reach `ctx.exists`, `ctx.text`/`lines`/`lineOf` and `ctx.buf`/`hashFile`, so the pinned hash follows the override.
  - `RMMZ_FORM` and `RMMZ_TILE_DUP` join the `need` list of T `rule_coverage` (`tools/art/test_catalogue.js:193`). Without that, deleting a case file drops a check silently.
- **BRIEF, tests:**
  - Two mutants added, so every new FAIL code has a killer: `ar_closed` (killed by `AR_MISSING`) and `a4_spec_height` (killed by `RMMZ_SPEC`). A mutant counts as killed only when the named code fires.
  - Each named check asserts its population first (92, 72, 134, and 28 + 30 entries), so none can pass on an empty set.
  - `stock_positions` is split into 28 position rows and 30 A4 format-example rows. The A4 rows name a kind on another sheet, so a naive position check would fail all 30.
  - The guards `test_blank_templates.js` and `test_place_art.js` are noted as fixture-only.
  - The GAME TRANSLATION mutant count goes from 10 to 12.
- **BRIEF, the first A4 sheet:** it is never inducted. ART-COUNCIL-1 rejected all ten sets (NAY rows in `art/APPROVALS.md`, `4e4bde1d`; reasons at `art/COUNCIL_RECORD.md:19-28`), and the sets were made before any row existed. Dependencies now name the remake instead.
- **BRIEF, shared files:** lane-cy (held) adds unpinned `art/masters/source_sets/**` inputs and keeps stock file names for DEUS art.
- **`lane.json`:**
  - `tools/art/fixtures/catalogue/**` is narrowed to the three paths that scope item 6 names: `tools/art/fixtures/catalogue/cases/rmmz_*.json`, `tools/art/fixtures/catalogue/mini/context.json` and `tools/art/fixtures/catalogue/rmmz_rows_expected.json`. The list in this brief matches.
  - Every other path stays, because each is a file the lane writes or a generated output it rebuilds.
  - The pre-review copy is `review/lane.json.before_review`.
- **ROWS:** see its own review log.

**Remaining problems.** These are not fixed and need the PM.
1. **rampBasis has two meanings. RESOLVED 2026-10-01** (WORK-GATE lane-pg 2, ChatGPT Pro, REQUIRED CHANGE 4; resolution in the last bullet).
   - ROWS labels copies of the `mapping.json` `terrains` ramps MATCH. The builder labels the same copies PROPOSED on every A2 ground row (`tools/art/build_catalogue.js:875`, `:886`, `:1002`).
   - The stumps disagree with each other. All three copy the bark ramp of a MATCH charset row, yet the oak stump is MATCH and the birch and pine stumps are PROPOSED.
   - This is metadata only (palette snap is the open decision D1), but the fixture freezes it. Pick one rule before the fixture is written.
   - Suggested rule: inherit the source row's basis. Under it, the birch and pine stumps become MATCH, and the A4 TOP rows become PROPOSED like their A2 rows.
   - **Resolution:** the rule is the ROWS.md section 1 convention: MATCH = copied ramp identifiers; PROPOSED = a PM-selected palette assignment; MATCH does not mean the source art or the palette decision is approved. The birch and pine stumps are now MATCH, like the oak stump. The A4 TOP rows stay MATCH, because their ramps are copied from `mapping.json` `terrains`; the suggested inherit rule is not adopted for those copies. This lane does not relabel existing catalogue families outside it: the builder's A2 ground rows keep PROPOSED. SCHEMA.md documents the rule (scope item 3).
2. **Stumps of chopped trees.**
   - DEC-063 item 5, and the Owner's 03:54 "if trees are being cut...", are about the trees the sim fells. Those are the charset rows `SURFACE_SHARED_TREE_<SPECIES>_V1_DEFAULT` (`!$UF_*`), and they still fall back to the shared stump (CAT 7723).
   - This lane's stumps are B-sheet map decoration (`_B-V1_DEPLETED`). Per-species charset stumps have to wait while charsets are frozen (item 4).
   - The NAY rows of `4e4bde1d` used other proposed ids: `SURFACE_SHARED_TREE_<X>_V1_DEPLETED`, and `SURFACE_SHARED_DEPTH_CLIFF-<M>_V1_DEFAULT`, whose category DEPTH is not in the schema. Those ids will never exist, so later records should cite the lane-pg ids.
3. **Group C (AR-2202, 15 rows) is outside the PM's generation scope.**
   - DEC-063 item 8 limits the PM to Groups 3-6 plus trees and stumps.
   - Approved PixelLab plants and stones already exist (TEMPERATE_GENERATION_LIST:11), and conversions of the Owner's outputs are on hold (DEC-055).
   - The rows themselves are allowed (item 12); whether to generate the art is the Owner's call. A note was added to ROWS 5C.
4. **TOP rows over Owner ground.**
   - Slots 10-14, and the TOPs of rock, soil, sand and mud, carry ground the Owner already made. Only the rims are new work (TEMPERATE_GENERATION_LIST:77; DEC-063 item 7).
   - The catalogue cannot enforce this. Keep slots 10-14 only if the generation cards say so (ROWS section 8, item 1).
5. **File naming across lanes.**
   - lane-cy puts DEUS art into stock-named files (`Outside_A1.png`, `Outside_A2.png`, `Outside_D.png`) and names those in `Tilesets.json`. lane-pg names new `DEUS_*` files.
   - An RMMZ tileset takes one file per slot. So the outside tileset cannot hold both the water rows (stock `Outside_A1.png`) and the waterfall (`DEUS_Outside_A1.png`), or both A4 files.
   - Rule on one convention before the Tilesets.json lane (ROWS section 7).
6. **Two homes for rock and soil cliff faces.**
   - AR-2100/AR-2101 and CAT 1780/1781/1784/1785 place them on `UF_Levels_A4.png` kinds 8 and 9. Today the engine's look keys draw them from Dungeon_A4 kinds 1 and 0 (`game/js/plugins/DEUS_Levels.js:255-256`).
   - AR-2200 slots 0 and 1 add a second home on `DEUS_Cliffs_Temperate_A4.png`.
   - Decide which home the engine will use; the other AR can be withdrawn later.
7. **Format example for rock cliffs.**
   - Granite, limestone and strata cite Dungeon_A4 "Wall B (Rock Cave)" (kinds 1/9).
   - Dungeon_A4 "Ledge B (Rock Cave)" (kinds 37/45) is the closer analogue: a walkable top over a face, like the Outside_A4 Ledge kinds the soil rows use.
   - The block format is identical, so only the label in the fixture would change.
8. **Engine aside, not this lane.**
   - `game/js/plugins/DEUS_Levels.js:3760-3761` and `:3927-3932` test `Tilemap.isWaterTile` before the lava test.
   - `isWaterTile` is true for A1 kind 4 (`game/js/rmmz_core.js:2726-2734`), so a kind-4 lava tile reads as "water" in those probes.
   - This goes to the engine owner.
9. **WSR follow-ups** stand as ROWS records them, and all go to WG.33:
   - `SOURCE:MARK` is undeclared.
   - Steam sits under `SOURCE:EFFECT`, declared NON_WORLD_STATE ("Combat effect sprites").
   - New NATURAL_WORLD slots open new gaps.

### 2026-10-01: work-gate changes (WG1), applied for the PM by a Claude sub-agent

The independent work gate (MiniMax M3, `~/.deus_pm/braintrust/2026-10-01/WORK-GATE-LANE-PG_minimax_m3.md`) returned GO WITH CHANGES. Its five required changes are applied in this brief (section "Work-gate changes"), in ROWS.md (5B and section 8) and in the PM's prototype; its six defaults are kept; its five risks are in "Risks and the checks that block them". `lane.json` is unchanged: every new file the changes need already matches an allowedPaths glob (the new rule case is `tools/art/fixtures/catalogue/cases/rmmz_size_override.json`). Everything was rerun read-only in fresh clean LF clones of `fbdd2bd9` and `d49563bd` (main moved during the work; `bdcee6f2` after it changes mail and telemetry only); the outputs and the file:line of each change are in the lane-pg scratch `CHANGES_WG1.md`. This sub-agent is from the writer's model family, so this is not the independent review.

Added beyond the five changes, for the PM to keep or strike:
- Precondition 5 and the `conflicts.md` override section, because DEC-016 makes the scale chart the size authority and sends disagreements to the Owner.
- The risk that the trees' judged sizes change: ART-COUNCIL-2 (`art/COUNCIL_RECORD.md` at `fbdd2bd9`) rejected every tree, so the tree sizes in the oracle are those of versions that did not pass; the six stumps passed 4 of 4.
- The WBS Rev is now "the next free Rev at commit time", not 34.
- `AR_MISSING` also covers an AR listed in `outOfScope` (work-gate risk 5), and `rmmz_rows.ar_rows` checks it.
- Mutants `strip_overrides` and `bad_override` and the rule case `rmmz_size_override`, besides the required `drop_override`. `schema_mark_rmmzform` is renamed `schema_contract`.

### 2026-10-01: work-gate changes (WG2), applied for the PM by a Claude sub-agent

The second work gate (ChatGPT Pro, `~/.deus_pm/braintrust/2026-10-01/WORK-GATE-LANE-PG-2_chatgpt_pro.md`) returned GO WITH CHANGES. Its four required changes are listed in "Work-gate changes (ChatGPT Pro, ...)", and its five risks are in the risk table. `lane.json` is unchanged. The prototype was rerun read-only on `clone_wg2` (`d49563bd`) with the measured sizes. Outputs and the measurement table are in the lane-pg scratch `CHANGES_WG1.md` (dated section at its end) and `FIXES_WG2.md`. This sub-agent is from the writer's model family, so this is not the independent review.

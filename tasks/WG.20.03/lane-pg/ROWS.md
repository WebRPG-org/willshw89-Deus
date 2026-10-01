# lane-pg rows: RMMZ-format catalogue rows for the PM's art scope (WG.20.03)

This is the row list for lane-pg. It is committed beside `BRIEF.md` as `tasks/WG.20.03/lane-pg/ROWS.md`. It was written on 2026-10-01 against main `18dfd92d`. The line numbers below come from that tree; the lane-pg review re-checked every file:line citation in this file at `b889de90` (all still hold; `tools/art/build_catalogue.js`, `game/js/**` and `docs/RMMZ_ASSET_SPEC.md` are unchanged since `18dfd92d`), and the prototype rerun there reproduced every table row of section 5. `art/catalogue/catalogue.json` last changed in `f2f57eaf` (pins only), so its line numbers ("CAT n") match every earlier audit.

**How the tables were checked.** A read-only prototype built the live catalogue in memory from a clean LF clone of `18dfd92d`. It added these 72 rows on append-only paint sheets and applied the 20 runtime re-forms. It then ran:
- `validateCatalogue`: 0 errors;
- the JSON-schema check copied from `tools/art/test_catalogue.js`, with the schema patch in BRIEF.md scope item 3: 0 errors (5 errors without the patch, as expected);
- the proposed RMMZ_FORM rule: 0 mismatches;
- the tile-claim rule: 134 claimed cells, 0 claimed twice;
- `tools/art/place_art.js` `tilesetTarget` on every row without a grid: it agreed with every slot;
- a slot comparison: 0 existing slots changed.

**Rerun for the work-gate changes (2026-10-01, fresh clean LF clones of main `fbdd2bd9` and `d49563bd`, identical results; `bdcee6f2` after them changes mail and telemetry only).** The work gate (MiniMax M3, GO WITH CHANGES) added 9 size overrides (5B), renamed the swamp rows (5B) and set the schema to `deus-art-catalogue/1.4.0`. The revised prototype (`node proto_lanepg.js clone_wg2`) gave: 92 table lines, equal to the tables below; `validateCatalogue` 0 errors with the override rule of BRIEF scope 2.h (main's rule reports 9 `SIZE_OUTSIDE_ROW`, one on each override row, none elsewhere); the 1.4.0 schema patch 0 errors (109 against main's unpatched 1.2.0 schema, as expected); RMMZ_FORM 0; 134 cells, 0 claimed twice; `tilesetTarget` 0 disagreements; 0 existing slots changed; the slots and anchors of the 72 new rows identical with and without the overrides; `envelope_admits_art` 12 of 12 judged sprites admitted (9 not admitted without the overrides). The outputs are in the lane-pg scratch `CHANGES_WG1.md`.

**Rerun for the second work gate (WORK-GATE lane-pg 2, ChatGPT Pro, GO WITH CHANGES, 2026-10-01; `clone_wg2`, `d49563bd`).** The 5B sizes now come from version-qualified measurements of the specimens (5B size-override table; BRIEF scope item 1), and the birch and pine stumps are MATCH (section 1). The prototype (`node proto_lanepg.js clone_wg2`, output `proto_lanepg_wg2b.out.txt` in the lane-pg scratch) gave the results above with the measured values: 92 table lines, equal to the tables below (5 lines changed: the oak, dead and birch override cells and the birch and pine stump bases); 9 overrides; slots and anchors unchanged; `envelope_admits_art` 12 of 12 (9 not admitted without the overrides); re-form preservation 20 of 20 against the build without lane rows and re-forms.

None of the 72 new ids exists on `main`, `task/lane-ce`, `task/art-temperate-induction` or `task/lane-cs`. After the rename, none of the 72 appears in any file on main (`fbdd2bd9`, `d49563bd`, `bdcee6f2`) or on any of the 74 `task/*` refs at `d49563bd` (39 local heads, 35 `origin/task/*`, which equal GitHub's). No branch uses AR-22xx, `_RMMZnn` sheets, `rmmzForm` or `rmmz_rows` yet. The lane's builder must reproduce these rows from `art/catalogue/rmmz_rows.json`. The paint-slot column shows what the prototype's packing gave; the builder sorts the same way (band, biome, groupType, category, id), so the indices should match.

## 0. Owner rulings applied (2026-10-01)

- Standing permission: "You can always open more rows for assets we need".
- Format: deliver art in RMMZ's own formats, with RMMZ stock as the FORMAT example and Ultima VII as the STYLE example: "Using RMMZ's own format should make it easy to tool into the game as well" (the Owner's exact wording, `docs/OWNER_DECISIONS.md:1062`).
- DEC-007 still applies: the catalogue row comes before any generation.
- PM art scope: Groups 3, 4, 5 and 6 of `docs/art/TEMPERATE_GENERATION_LIST.md`, plus trees and stumps. A stump is its own tree cut down.
- Never redo the Owner's own tile sets.
- Nothing yet for animals, monsters, people, facesets, charsets or animations.
- Every RMMZ asset slot gets a DEUS asset in time.
- Inventory is Ultima-style: item sprites plus container gumps, no IconSet. Item and gump rows belong to a later lane (section 7).

Both quotes are in `docs/OWNER_DECISIONS.md` (DEC-063, since `4e4bde1d`): precondition 1 in BRIEF.md is met. The builder finds them there and cites their first-hit line numbers in every `statusWhy` (`:1066` and `:923` at `b889de90`).

## 1. Conventions every row follows

- **Ids** follow `makeId` (`tools/art/build_catalogue.js:109-111`): `BAND_SHARED_CATEGORY_TYPE_VARIANT_STATE`.
  - The variant names the RMMZ form:
    - `TOP` / `SIDE` for an A4 top or side autotile (precedent: AR-1200's `ALL_SHARED_TERRAIN_ROCK-SOLID_TOP|SIDE_DEFAULT`, CAT 1780-1781);
    - `A1` / `A2` for an A1 or A2 kind (precedent: the `_A1_` water and `_A2_` ground rows);
    - `B-V<n>` for an upper-layer tile object on a B-E sheet, with `<n>` the visual variant.
  - A stump is its tree's `DEPLETED` state (AS-NODE-001; SOP conflict C16): the oak at B-V1 is `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT`, and its stump is `SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED`.
- **Bands:** these are the legacy geometry bands (`art/catalogue/geometry.json`; the DEC-030 bands are not in geometry yet).
  - Temperate pieces are `SURFACE`.
  - The lava set (TEMPERATE_GENERATION_LIST "Shared natural physics ... used in any biome") is `ALL`.
  - Stalactites are `LOWER1`: the list's prompt for 4.18 uses the Lowlands paragraph.
- **Status and reason:**
  - Every new row has `status: MISSING`.
  - Its `statusWhy` reads: `<AR> REQUESTED (docs/ASSET_REQUESTS.md:<line>); Owner 2026-10-01 "You can always open more rows for assets we need" (docs/OWNER_DECISIONS.md:<line>), RMMZ format (docs/OWNER_DECISIONS.md:<line>); RMMZ form: <one of: the stock position it takes ("stock <sheet> <tile or kind> <label>"); "DEUS_Cliffs_Temperate_A4 slot <s>, format example <sheet> kind <k> <label>" for the A4 rows; "DEUS E extension sheet, no stock slot">; no art yet (DEC-007 catalogue first)`.
  - A row with a size override (5B) gets one more clause at the end: `; size override of <scaleRow> <row min-max> to <override min-max> (WG.20.03 D4): <overrideWhy>`.
  - Re-formed rows keep their status, which is MISSING for all 20, and their reason. The same AR and ruling clause is appended to the reason.
- **Size:**
  - `envelope` and `footprint` are the size row's own values, except on the 9 rows of 5B that carry an `envelopeOverride` (work gate D4): their envelope takes min and max from the override and the targets from the row. No row carries a `footprintOverride`. The size column shows such a row as `<row> <row min-max>, **override <min-max>**`.
  - The slot is the envelope rounded up to whole 48 px cells, times the frames.
  - The anchor comes from `applySize` (`tools/art/build_catalogue.js:519-529`): GROUND gives the bottom row, CENTER the middle, WALL and CEILING the top.
- **Frames:** one static frame, facing S (DEC-046 static first).
  - Lava is an A1 water kind, so its slot holds RMMZ's three side-by-side frames. All three are the same still, so nothing moves (AGENTS Rule 12).
  - The waterfall is an A1 waterfall kind: one 96x144 block. A still fills its three stacked 96x48 strips the same way.
- **Other fields:**
  - `alphaMode` is BINARY for every new row; re-forms keep theirs.
  - `references` is `pack:WORLD`, plus the style pack the builder adds by category (`:1704-1709`).
  - `standardPending` is `DW.01.06` on TERRAIN and WATER rows (as the levelDefs rows have it) and null elsewhere.
  - `mapping` is `{scaleBasis: MATCH, rampBasis: as listed, rule: "<AR> <file> <slot>"}`.
  - The new optional field is `rmmzForm: {sheet: "<A1..E>", stock: "<stock sheet, id and label>" | null}`.
- **Ramps (`mapping.rampBasis`; settled 2026-10-01 by WORK-GATE lane-pg 2, ChatGPT Pro, REQUIRED CHANGE 4):**
  - MATCH means the ramp identifiers are copied unchanged: from `art/catalogue/mapping.json` `terrains.<kind>`, or from the existing row of the same species or object when that row is itself MATCH. A stump copies its own tree's bark ramp and takes that tree row's basis (DEC-063 item 5).
  - PROPOSED means a PM-selected palette assignment: chosen from `game/data/DEUS_PaletteRegistry.json` (58 ramps), a set the PM changed for a face, side or variant, or a copy of an existing row that is itself PROPOSED.
  - MATCH does not mean that the source art or the palette decision is approved. It records only where the identifiers came from.
  - The rule covers the rows of this lane. It does not relabel existing catalogue families: the builder's A2 ground rows keep PROPOSED on their `mapping.json` copies, and the 20 re-forms keep their own basis.
  - Palette snap is still the open decision D1 of the art audit. Ramps here are catalogue metadata only.

## 2. Sheets

### 2.1 Runtime sheets: the RMMZ files the art goes into

Layout rule:
- An item that has a stock RMMZ counterpart sits at that stock position, on a DEUS sheet named after the stock sheet.
- An item with no stock counterpart goes on the DEUS extension sheet E of the same tileset.

This keeps every stock B position free for its own DEUS counterpart ("every RMMZ asset slot gets a DEUS asset"). DEC-045 already took sheet D (`DEUS_GroundVar_D.png`, `docs/OWNER_DECISIONS.md:712`). On every E sheet, local tile 0 (tileId 768) stays empty, as on B. This is a DEUS convention, not an RMMZ rule: RMMZ leaves only tileId 0 undrawn (the B sheet's "Transparent" tile, `Outside_B.txt` line 1), and stock C sheets use their local tile 0 (`Outside_C.txt` line 1 "Obelisk").

| File (`img/tilesets/`) | RMMZ sheet | Size | Holds | Builder sheet id |
|---|---|---|---|---|
| `DEUS_Cliffs_Temperate_A4.png` | A4 | 768x720 | 24 material slots (3 row pairs of 8). Slot s: top kind `16*floor(s/8)+s%8` (96x144), side kind = top + 8 (96x96). Slots 0-9 are the ten materials of the PM's first sheet (`DEUS_Cliffs_A4_temperate.png`, 768x720, measured). ART-COUNCIL-1 rejected all ten of its sets (NAY rows in `art/APPROVALS.md`, `4e4bde1d`; reasons `art/COUNCIL_RECORD.md:19-28`), and they were made before any row existed, so that sheet is never inducted: these rows are the homes for the remade materials. The file is named `..._A4.png` because the builder refuses a runtime file that does not end in a sheet letter (`tools/art/build_catalogue.js:1098-1100`). Slots 10-14 are opened here; slots 15-23 are reserved. | `RMMZ_DEUS-CLIFFS-TEMPERATE-A4` |
| `DEUS_Outside_B.png` | B | 768x768 | Stock Outside_B positions only | `RMMZ_DEUS-OUTSIDE-B` |
| `DEUS_Outside_E.png` | E | 768x768 | Temperate items with no stock slot (map in 2.3) | `RMMZ_DEUS-OUTSIDE-E` |
| `DEUS_Outside_A1.png` | A1 | 768x576 | Waterfall at stock Outside_A1 kind 5 "Waterfall A" | `RMMZ_DEUS-OUTSIDE-A1` |
| `DEUS_Dungeon_A1.png` | A1 | 768x576 | Lava at stock Dungeon_A1 kind 4 "Lava" | `RMMZ_DEUS-DUNGEON-A1` |
| `DEUS_Dungeon_A2.png` | A2 | 768x576 | Obsidian at stock Dungeon_A2 kind 16 "Ground E (Lava Cave)" | `RMMZ_DEUS-DUNGEON-A2` |
| `DEUS_Dungeon_E.png` | E | 768x768 | Steam and stalactites (no stock slot) | `RMMZ_DEUS-DUNGEON-E` |

RMMZ addressing used throughout (`game/js/rmmz_core.js`):
- **Tile id ranges** (`:2667-2676`): B 0, C 256, D 512, E 768, A5 1536, A1 2048, A2 2816, A3 4352, A4 5888, MAX 8192.
- **B-E cells** (`_addNormalTile`, `:2483-2498`): local ids 0-127 fill the left 8 columns from top to bottom, and 128-255 the right 8.
- **A1, A2 and A4 blocks** (`_addAutotile`, `:2500-2553`):
  - A1 kinds 0-1 and the even kinds from 4 up are 3 frames side by side (288x144). Kinds 2-3 and the odd kinds from 5 up are 96x144 (waterfalls animate vertically).
  - A2 kinds are 96x144.
  - A4 kinds in even block rows are tops (96x144). Odd block rows are sides (96x96, wall table).

### 2.2 Paint sheets (ATLAS, append-only)

New rows are packed after the main `pack()`, onto their own sheets named `ATLAS_<band>_SHARED_<groupType>_RMMZ<nn>`. This is the DEC-045 append-only pattern (`tools/art/build_catalogue.js:1719-1751`). No existing slot moves. Inserting rows into the main atlases instead would renumber every later slot in the group: the earlier prototype moved 74 slots for 4 rows (`tools/wsr/known_gaps.json` keys include the slotId). Re-forms keep the slot they have.

| Paint sheet | Rows | Size (prototype) |
|---|---|---|
| `ATLAS_SURFACE_SHARED_TILE_RMMZ01` | 30 A4 rows + waterfall | 2976x144 |
| `ATLAS_SURFACE_SHARED_PROP_RMMZ01` | 16 trees and stumps + 15 natural objects | 1920x144 |
| `ATLAS_SURFACE_SHARED_OVERLAY_RMMZ01` | 7 marks | 336x48 |
| `ATLAS_ALL_SHARED_TILE_RMMZ01` | lava, obsidian | 384x144 |
| `ATLAS_ALL_SHARED_EFFECT_RMMZ01` | steam | 96x96 |

### 2.3 Extension-sheet allocation (local tile L; tileId = 768 + L; left half: column L%8, row floor(L/8))

`DEUS_Outside_E.png`:

| Rows (L) | Contents |
|---|---|
| 0 | L0 empty; L1-5 height shade H1-H5; L6 rim shadow E; L7 rim shadow N |
| 1 | L8 rim S; L9 rim W; L10 opening wall H1; L11 opening wall H2; L12-15 stumps: birch, pine, fruit, dead |
| 2-3 (1x2) | L16 opening wall FULL; L17-19 opening wall H3-H5; L20 hanging roots; L21 dust; L22 light shaft; L23 free |
| 4 | L32-33 fallen log (2x1); L34 ground scar; L35 ash patch; L36 sediment; L37-39 free |
| 5-6 (2x2) | L40 fruit tree; L42 fruit tree, picked; L44 swamp tree; L46 dead tree |
| 7-9 (2x3) | L56 birch; L58 pine; L60-63, 68-71 and 76-79 free |
| 10-15 and the right half | free |

`DEUS_Dungeon_E.png`: L0 is empty; steam 2x2 at L1 (tiles 769/770/777/778); stalactites 1x2 at L3 (771/779).

## 3. Size rows added (3; source RMMZ_SPEC; derived from rows already parsed from `docs/RMMZ_ASSET_SPEC.md`, which the lane does not edit)

| rowId | Size | Derived from | Why |
|---|---|---|---|
| `RMMZ_AUTOTILE_A4_TOP` | 96x144, footprint 2x3 | the A2 block row (`docs/RMMZ_ASSET_SPEC.md:69`, "each 96×144 px") | An A4 even block row draws with the floor table, as A2 does (`game/js/rmmz_core.js:2547-2552`). |
| `RMMZ_AUTOTILE_A4_SIDE` | 96x96, footprint 2x2 | the A3 block row (`:70`, "each 96×96 px") | An A4 odd block row draws with the wall table, as A3 does (`:2550-2551`). |
| `RMMZ_TILE_48_2X2` | 96x96, footprint 2x2 | 2 x `RMMZ_TILE_48` (`docs/RMMZ_ASSET_SPEC.md:11`, Grid Tile Size) | A whole-cell 2x2 stack on a B-E sheet, used for the canopy fill and the steam still. |

Consistency check (build error `RMMZ_SPEC` if it fails):
- the parsed A4 sheet width equals 8 x the top width;
- the parsed A4 sheet height is a whole number of (top + side) pairs.

At `18dfd92d` these are 768 = 8 x 96 and 720 = 3 x (144 + 96).

The legacy row `RMMZ_AUTOTILE_A4` (96x120, `docs/RMMZ_ASSET_SPEC.md:71`) stays as it is. Its 8 rows (CAT 1766, 1769, 1780-1782, 1784-1785, 3715) are not re-formed here (section 7).

## 4. AR rows to add to `docs/ASSET_REQUESTS.md` (verbatim)

Add a new section after the AR-2100 to AR-2102 table (it ends at `docs/ASSET_REQUESTS.md:326`), before "## Notes for Claude Code (from Gemini)". lane-cu edits only line 278 of this file. AR-2200 to AR-2999 are free on every ref.

Each AR names every runtime file its rows use. The builder's `RMMZ_AR_TEXT` check enforces this. Avoid the UI words of the out-of-scope regex (`tools/art/build_catalogue.js:1288`).

```markdown
### AR-2200 to AR-2205 RMMZ-format natural-world rows (WG.20.03 lane-pg, 2026-10-01)
Owner 2026-10-01: "You can always open more rows for assets we need"; art is delivered in RMMZ's own formats, with RMMZ stock as the format example and Ultima VII as the style example. Each AR covers the catalogue rows named in `art/catalogue/rmmz_rows.json` under its group. The rows come before any generation (DEC-007).

| ID | Asset | Needed for | Priority | Status |
|---|---|---|---|---|
| AR-2200 | **Temperate cliff materials, RMMZ A4:** `DEUS_Cliffs_Temperate_A4.png` (768×720). Material slot s: top autotile at A4 kind 16·floor(s/8)+s%8 (96×144), side autotile at that kind + 8 (96×96). Slots 0-9 granite, soil, sand over sandstone, mud, cave limestone, lichen rock, rooted soil, banded sandstone, red clay, layered strata; slots 10-14 meadow, forest floor, dry grass, needle floor and stony tops over their earth faces; 15-23 reserved. 30 rows (group A) | Every height step on the temperate surface | High | REQUESTED (catalogue rows WG.20.03; no art inducted) |
| AR-2201 | **Trees and their stumps, RMMZ B tiles:** `DEUS_Outside_B.png` at the Outside_B positions (oak 2×2 at 176, sapling 1×2 at 157, broadleaf canopy 2×2 at 178 and 1×1 at 158, oak stump 156, swamp stump 243); `DEUS_Outside_E.png` for the rest (fruit, fruit picked, swamp and dead 2×2; birch and pine 2×3; birch, pine, fruit and dead stumps). A stump is its own tree cut down. 16 rows (group B) | Map-decoration trees and the stump each species leaves | High | REQUESTED (catalogue rows WG.20.03; no art inducted) |
| AR-2202 | **Natural objects, RMMZ B tiles:** `DEUS_Outside_B.png` at the Outside_B positions (grass tufts 152-155, boulders 159 and 167, flowers 160-163, bush 166, small rocks 171, mushrooms 234-235); `DEUS_Outside_E.png` fallen log 2×1. 15 rows (group C) | Ground cover and natural clutter on the temperate surface | Medium | REQUESTED (catalogue rows WG.20.03; no art inducted) |
| AR-2203 | **Depth pieces in RMMZ form:** still waterfall at `DEUS_Outside_A1.png` A1 kind 5; RMMZ homes for the SURFACE height-shade, rim-shadow, opening-wall and hanging rows on `DEUS_Outside_E.png` (vines at `DEUS_Outside_B.png` tiles 20/28) and for the LOWER1 stalactites on `DEUS_Dungeon_E.png`. 1 new row + 20 re-formed rows (group D) | Height steps, openings and hanging pieces between layers | Medium | REQUESTED (catalogue rows WG.20.03; no art inducted) |
| AR-2204 | **Lava, cooled obsidian and steam:** lava at `DEUS_Dungeon_A1.png` A1 kind 4 (three identical still frames); obsidian at `DEUS_Dungeon_A2.png` A2 kind 16; still steam 2×2 on `DEUS_Dungeon_E.png`. 3 rows (group E) | Lava pools (DEUS_Fluid lava type), their cooled crust and the steam where lava meets water | Medium | REQUESTED (catalogue rows WG.20.03; no art inducted) |
| AR-2205 | **Integrity and aftermath marks:** flat 48×48 binary-alpha overlays; rock strained, rock failing, soil strained and soil failing at `DEUS_Outside_B.png` tiles 52-55; ground scar, ash patch and sediment on `DEUS_Outside_E.png`. 7 rows (group F) | Collapse warnings and their aftermath on the ground | Medium | REQUESTED (catalogue rows WG.20.03; no art inducted) |
```

## 5. The rows

Columns: id; category; size row, envelope (wMin-wMax x hMin-hMax) and paint slot; anchor; RMMZ runtime (file, tile ids, top-left pixel on the sheet); the stock format example; palette ramps (basis); paint slot (sheet:index). Status is MISSING for every row.

### 5A. Group A: A4 cliff materials (AR-2200), 30 new rows on `DEUS_Cliffs_Temperate_A4.png`

Two rows per material: TOP (the A4 top autotile, which also draws the N, E and W rims) and SIDE (the south face). This is the AR-1200/AR-1201 split, and `tools/art/place_art.js` already exports it: its target for a top kind is 96x144 and for a side kind 96x96 (`tools/art/place_art.js:80-105`). One 96x240 pair row would need a new placement rule. Slots 0-9 are the ten materials the PM built. Slots 10-14 are opened here under the standing permission: they are the five temperate surface ground kinds that already have per-kind cliff faces in the catalogue (`SURFACE_SHARED_EDGE_<KIND>_*`) but no A4 kind on the sheet: meadow, forest floor, dry grass, needle floor and stony. Each shows that ground on top over an earth face, the form of stock Outside_A4 Ledge A (Meadow), kinds 36/44. The stock column gives the format example, not a position: this sheet does not mirror a stock A4 layout.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `SURFACE_SHARED_TERRAIN_CLIFF-GRANITE_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 0: top kind 0, tileId 5888 (0,0) | Dungeon_A4 kind 1 “Wall B (Rock Cave)” | HIGH_STONE_GRANITE (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0008 |
| `SURFACE_SHARED_TERRAIN_CLIFF-GRANITE_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 0: side kind 8, tileId 6272 (0,144) | Dungeon_A4 kind 9 “Wall B (Rock Cave)” | HIGH_STONE_GRANITE (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0007 |
| `SURFACE_SHARED_TERRAIN_CLIFF-SOIL_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 1: top kind 1, tileId 5936 (96,0) | Outside_A4 kind 37 “Ledge B (Dirt)” | TEMP_SOIL_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0028 |
| `SURFACE_SHARED_TERRAIN_CLIFF-SOIL_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 1: side kind 9, tileId 6320 (96,144) | Outside_A4 kind 45 “Ledge B (Dirt)” | TEMP_SOIL_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0027 |
| `SURFACE_SHARED_TERRAIN_CLIFF-SAND_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 2: top kind 2, tileId 5984 (192,0) | Outside_A4 kind 38 “Ledge C (Desert)” | ARID_SAND_COARSE (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0026 |
| `SURFACE_SHARED_TERRAIN_CLIFF-SAND_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 2: side kind 10, tileId 6368 (192,144) | Outside_A4 kind 46 “Ledge C (Desert)” | ARID_SAND_COARSE, ARID_STONE_SANDSTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0025 |
| `SURFACE_SHARED_TERRAIN_CLIFF-MUD_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 3: top kind 3, tileId 6032 (288,0) | Dungeon_A4 kind 0 “Wall A (Dirt Cave)” | WET_MUD_ANAEROBIC, WET_SILT_RIVER (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0018 |
| `SURFACE_SHARED_TERRAIN_CLIFF-MUD_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 3: side kind 11, tileId 6416 (288,144) | Dungeon_A4 kind 8 “Wall A (Dirt Cave)” | WET_MUD_ANAEROBIC, WET_SILT_RIVER (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0017 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LIMESTONE_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 4: top kind 4, tileId 6080 (384,0) | Dungeon_A4 kind 1 “Wall B (Rock Cave)” | NEUT_COOL_GRAY, TEMP_STONE_LIMESTONE (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0014 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LIMESTONE_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 4: side kind 12, tileId 6464 (384,144) | Dungeon_A4 kind 9 “Wall B (Rock Cave)” | TEMP_STONE_LIMESTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0013 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LICHEN-ROCK_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 5: top kind 5, tileId 6128 (480,0) | Outside_A4 kind 32 “Wall H (Moss)” | TEMP_STONE_FIELDSTONE, TEMP_GRASS_DRY (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0012 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LICHEN-ROCK_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 5: side kind 13, tileId 6512 (480,144) | Outside_A4 kind 40 “Wall H (Moss)” | TEMP_STONE_FIELDSTONE, TEMP_GRASS_DRY (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0011 |
| `SURFACE_SHARED_TERRAIN_CLIFF-ROOTED-SOIL_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 6: top kind 6, tileId 6176 (576,0) | Outside_A4 kind 37 “Ledge B (Dirt)” | TEMP_SOIL_LOAM, TEMP_BARK_OAK (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0024 |
| `SURFACE_SHARED_TERRAIN_CLIFF-ROOTED-SOIL_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 6: side kind 14, tileId 6560 (576,144) | Outside_A4 kind 45 “Ledge B (Dirt)” | TEMP_SOIL_LOAM, TEMP_BARK_OAK (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0023 |
| `SURFACE_SHARED_TERRAIN_CLIFF-BANDED-SANDSTONE_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 7: top kind 7, tileId 6224 (672,0) | Outside_A4 kind 38 “Ledge C (Desert)” | ARID_STONE_SANDSTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0002 |
| `SURFACE_SHARED_TERRAIN_CLIFF-BANDED-SANDSTONE_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 7: side kind 15, tileId 6608 (672,144) | Outside_A4 kind 46 “Ledge C (Desert)” | ARID_STONE_SANDSTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0001 |
| `SURFACE_SHARED_TERRAIN_CLIFF-RED-CLAY_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 8: top kind 16, tileId 6656 (0,240) | Outside_A4 kind 37 “Ledge B (Dirt)” | ARID_SOIL_CLAY (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0022 |
| `SURFACE_SHARED_TERRAIN_CLIFF-RED-CLAY_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 8: side kind 24, tileId 7040 (0,384) | Outside_A4 kind 45 “Ledge B (Dirt)” | ARID_SOIL_CLAY (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0021 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LAYERED-STRATA_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 9: top kind 17, tileId 6704 (96,240) | Dungeon_A4 kind 1 “Wall B (Rock Cave)” | HIGH_STONE_SLATE, TEMP_STONE_LIMESTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0010 |
| `SURFACE_SHARED_TERRAIN_CLIFF-LAYERED-STRATA_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 9: side kind 25, tileId 7088 (96,384) | Dungeon_A4 kind 9 “Wall B (Rock Cave)” | HIGH_STONE_SLATE, TEMP_STONE_LIMESTONE (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0009 |
| `SURFACE_SHARED_TERRAIN_CLIFF-MEADOW_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 10: top kind 18, tileId 6752 (192,240) | Outside_A4 kind 36 “Ledge A (Meadow)” | TEMP_GRASS_FERTILE, TEMP_SOIL_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0016 |
| `SURFACE_SHARED_TERRAIN_CLIFF-MEADOW_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 10: side kind 26, tileId 7136 (192,384) | Outside_A4 kind 44 “Ledge A (Meadow)” | TEMP_SOIL_LOAM (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0015 |
| `SURFACE_SHARED_TERRAIN_CLIFF-FOREST-FLOOR_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 11: top kind 19, tileId 6800 (288,240) | Outside_A4 kind 36 “Ledge A (Meadow)” | TEMP_WOODLAND_FLOOR, TEMP_SOIL_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0006 |
| `SURFACE_SHARED_TERRAIN_CLIFF-FOREST-FLOOR_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 11: side kind 27, tileId 7184 (288,384) | Outside_A4 kind 44 “Ledge A (Meadow)” | TEMP_SOIL_LOAM (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0005 |
| `SURFACE_SHARED_TERRAIN_CLIFF-DRY-GRASS_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 12: top kind 20, tileId 6848 (384,240) | Outside_A4 kind 36 “Ledge A (Meadow)” | TEMP_GRASS_DRY, TEMP_SOIL_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0004 |
| `SURFACE_SHARED_TERRAIN_CLIFF-DRY-GRASS_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 12: side kind 28, tileId 7232 (384,384) | Outside_A4 kind 44 “Ledge A (Meadow)” | TEMP_SOIL_LOAM (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0003 |
| `SURFACE_SHARED_TERRAIN_CLIFF-NEEDLE-FLOOR_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 13: top kind 21, tileId 6896 (480,240) | Outside_A4 kind 36 “Ledge A (Meadow)” | TEMP_WOODLAND_FLOOR, HIGH_FOLIAGE_CONIFER (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0020 |
| `SURFACE_SHARED_TERRAIN_CLIFF-NEEDLE-FLOOR_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 13: side kind 29, tileId 7280 (480,384) | Outside_A4 kind 44 “Ledge A (Meadow)” | TEMP_SOIL_LOAM (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0019 |
| `SURFACE_SHARED_TERRAIN_CLIFF-STONY_TOP_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_TOP 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 14: top kind 22, tileId 6944 (576,240) | Outside_A4 kind 37 “Ledge B (Dirt)” | HIGH_GRAVEL_SCREE, HIGH_SOIL_STONY_LOAM (MATCH) | SURFACE_SHARED_TILE_RMMZ01:0030 |
| `SURFACE_SHARED_TERRAIN_CLIFF-STONY_SIDE_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A4_SIDE 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Cliffs_Temperate_A4.png` A4 slot 14: side kind 30, tileId 7328 (576,384) | Outside_A4 kind 45 “Ledge B (Dirt)” | HIGH_SOIL_STONY_LOAM (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0029 |

Notes:
- The TOP rows for rock and soil match the ground fills already approved for those kinds (TEMPERATE_GENERATION_LIST "Rock and soil tops use existing ground fills"). The TOP row is still needed, because an A4 top autotile carries the N, E and W rims.
- TEMPERATE_GENERATION_LIST 3.25 (solid rock-strata panel) and 3.26 (natural cave wall panel) correspond to slots 9 and 4 of this sheet in RMMZ form. Their old one-row records (CAT 1782 and 3715) are not changed.
- SOIL edge faces 3.01: slot 1 is the RMMZ form. The native `EDGE_DIRT_*` / SOIL question (TEMPERATE_GENERATION_LIST R8) is not part of this lane (section 7).
- Slots 15-23 (top kinds 23 and 32-39; side kinds 31 and 40-47) are reserved. A later material is one more pair of items in `art/catalogue/rmmz_rows.json` plus a line in AR-2200; no code changes.
- **The TOP fill is the Owner's ground where it exists.** A TOP block is a floor autotile: the ground of that kind with the N, E and W rims. For every kind whose ground already has an accepted set (rock, soil, sand, mud and the five kinds of slots 10-14), the TOP takes its fill from that ground, and only the rims are new work (TEMPERATE_GENERATION_LIST:77, "Rock and soil tops use existing ground fills"; DEC-063 item 7, the Owner's ground stays as it is). A TOP whose ground is generated afresh restyles an Owner tile set and fails the PM's tool check. The rejected first sheet painted new fills on its tops. The catalogue cannot enforce this; the generation cards and the tool check do.
- **RMMZ block layout (format check for the remake).** TOP, 96x144, is the floor-autotile layout of an A2 block (`docs/RMMZ_ASSET_SPEC.md:69`: "Top-left is floor center, top-right is inner corners, lower 2×2 are edges"): the top-right 48x48 holds four 24x24 inner-corner quarters that RMMZ uses one by one (`FLOOR_AUTOTILE_TABLE` takes quarters (2,0), (3,0), (2,1), (3,1) separately, `game/js/rmmz_core.js:2793-2799`), not one L-shape (ChatGPT's must-fix on the first sheet at ART-COUNCIL-1, which Grok disputed, `art/COUNCIL_RECORD.md:30`). SIDE, 96x96, is the wall-autotile layout of an A3 block (`game/js/rmmz_core.js:2550-2551`).

### 5B. Group B: trees and per-species stumps (AR-2201), 16 new rows

These rows are B-sheet map decoration. The existing charset rows stay as they are: the choppable sim trees (`SURFACE_SHARED_TREE_<SPECIES>_V1_DEFAULT`, CAT 7713-7726, `!$UF_*.png`) and the shared stump (`SURFACE_SHARED_TREE_STUMP_V1_DEFAULT`, CAT 7723, APPROVED `!UF_TreeStump_V8.png`). A tree uses a stock Outside_B position when stock has a slot of its size: oak and the 2x2 Large Tree, the sapling and the 1x2 Tree, the broadleaf canopy and the canopy cells. The others go to the E sheet: the scale chart makes fruit, swamp and dead trees 2x2 and birch and pine 2x3, and stock has no temperate 2x2 or 2x3 slot for them. Stumps use `DEBRIS_STUMP` (16-28 x 12-20) with the tree's own bark ramp, widened per stump to the tree's trunk where the judged stump is outside it (size overrides below). The stock Stump (156) takes the oak stump, and Stump (Moss) (243) takes the swamp stump, the wet-ground stump. The swamp rows use the type `swamp` (`SURFACE_SHARED_TREE_SWAMP_B-V1_*`, work gate REQUIRED CHANGE 5); the charset row keeps its own id, `SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT`.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT` | TREE | TREE_COMMON_OAK 56-80x72-96, **override 56-89x72-96**; slot 96x96 | GROUND [48,95] | `DEUS_Outside_B.png` tiles 176/177/184/185 (2x2) (384,288) | Outside_B 176/177/184/185 “Large Tree” | TEMP_BARK_OAK, TEMP_FOLIAGE_OAK (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0025 |
| `SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT` | TREE | TREE_SAPLING 20-36x36-50; slot 48x96 | GROUND [24,95] | `DEUS_Outside_B.png` tiles 157/165 (1x2) (624,144) | Outside_B 157/165 “Tree” | TEMP_BARK_OAK, TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0029 |
| `SURFACE_SHARED_TREE_CANOPY-BROADLEAF-2X2_B-V1_DEFAULT` | TREE | RMMZ_TILE_48_2X2 96x96; slot 96x96 | CENTER [48,48] | `DEUS_Outside_B.png` tiles 178/179/186/187 (2x2) (480,288) | Outside_B 178/179/186/187 “Large Tree” (canopy block) | TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0018 |
| `SURFACE_SHARED_TREE_CANOPY-BROADLEAF-1X1_B-V1_DEFAULT` | TREE | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_B.png` tile 158 (672,144) | Outside_B 158 “Tree” (canopy cell) | TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0017 |
| `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT` | TREE | TREE_COMMON_OAK 56-80x72-96; slot 96x96 | GROUND [48,95] | `DEUS_Outside_E.png` tiles 808/809/816/817 (2x2) (0,240) | none (E extension) | TEMP_BARK_OAK, TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0023 |
| `SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT` | TREE | TREE_COMMON_OAK 56-80x72-96; slot 96x96 | GROUND [48,95] | `DEUS_Outside_E.png` tiles 810/811/818/819 (2x2) (96,240) | none (E extension) | TEMP_BARK_OAK, TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0022 |
| `SURFACE_SHARED_TREE_SWAMP_B-V1_DEFAULT` | TREE | TREE_COMMON_OAK 56-80x72-96; slot 96x96 | GROUND [48,95] | `DEUS_Outside_E.png` tiles 812/813/820/821 (2x2) (192,240) | none (E extension) | WET_WOOD_DRIFTWOOD, WET_FOLIAGE_WILLOW (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0030 |
| `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEFAULT` | TREE | TREE_COMMON_OAK 56-80x72-96, **override 56-84x72-96**; slot 96x96 | GROUND [48,95] | `DEUS_Outside_E.png` tiles 814/815/822/823 (2x2) (288,240) | none (E extension) | ARID_WOOD_BLEACHED (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0019 |
| `SURFACE_SHARED_TREE_BIRCH_B-V1_DEFAULT` | TREE | TREE_COMMON_BIRCH 44-70x76-100, **override 44-70x76-118**; slot 96x144 | GROUND [48,143] | `DEUS_Outside_E.png` tiles 824/825/832/833/840/841 (2x3) (0,336) | none (E extension) | TEMP_BARK_BIRCH, TEMP_FOLIAGE_OAK (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0015 |
| `SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT` | TREE | TREE_COMMON_PINE 42-64x80-104, **override 42-96x80-132**; slot 96x144 | GROUND [48,143] | `DEUS_Outside_E.png` tiles 826/827/834/835/842/843 (2x3) (96,336) | none (E extension) | HIGH_BARK_CONIFER, HIGH_FOLIAGE_CONIFER (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0027 |
| `SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20, **override 16-28x12-21**; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 156 (576,144) | Outside_B 156 “Stump” | TEMP_BARK_OAK (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0026 |
| `SURFACE_SHARED_TREE_SWAMP_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20, **override 16-40x12-34**; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 243 (528,672) | Outside_B 243 “Stump (Moss)” | WET_WOOD_DRIFTWOOD (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0031 |
| `SURFACE_SHARED_TREE_BIRCH_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20, **override 11-28x12-20**; slot 48x48 | GROUND [24,47] | `DEUS_Outside_E.png` tile 780 (192,48) | none (E extension) | TEMP_BARK_BIRCH (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0016 |
| `SURFACE_SHARED_TREE_PINE_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20, **override 16-34x12-20**; slot 48x48 | GROUND [24,47] | `DEUS_Outside_E.png` tile 781 (240,48) | none (E extension) | HIGH_BARK_CONIFER (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0028 |
| `SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20; slot 48x48 | GROUND [24,47] | `DEUS_Outside_E.png` tile 782 (288,48) | none (E extension) | TEMP_BARK_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0024 |
| `SURFACE_SHARED_TREE_DEAD-TREE_B-V1_DEPLETED` | TREE | DEBRIS_STUMP 16-28x12-20, **override 16-31x12-23**; slot 48x48 | GROUND [24,47] | `DEUS_Outside_E.png` tile 783 (336,48) | none (E extension) | ARID_WOOD_BLEACHED (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0020 |

Notes:
- Not opened here:
  - The stock snow conifers 192-195, 200-203, 221-222 and 229, and Stump (Snow) 208: they are kept for the DEUS snow counterparts (FIR-SNOW is outside temperate scope).
  - The stock 1x2 Dead Tree 232/240, the 1x1 Dead Tree 233 and Dead Tree (Shrub) 241: the only tree size row whose maximum width is 48 px or less is TREE_SAPLING (20-36 px), so the DEUS dead tree (TREE_COMMON_OAK, 56-80 px wide as its charset row, 56-84 with its size override) goes 2x2 on E.
- **Size overrides (work gate decision D4 (a), REQUIRED CHANGE 3).** The specimens measured for these rows (PixelLab; the versions in the table below, WORK-GATE lane-pg 2, REQUIRED CHANGE 2) do not all fit the chart rows, so 9 rows carry an `envelopeOverride` in `art/catalogue/rmmz_rows.json`. Each override is the union of the chart row's min/max and the measured specimen's bounding box (alpha > 0): it only widens, the chart row's targets stay inside, and every slot and anchor stays as listed (the effective envelope rounds up to the same 48 px cells). The charset trees (CAT 7713-7726) keep the chart rows; D4 moves only these B-sheet rows.

  | Row (id after `SURFACE_SHARED_TREE_`) | Chart row | Override | Specimen (PM scratch `pixellab/trees/`; sha256, first 16) | Measured bbox (oracle) | Council; selection | Under the chart row |
  |---|---|---|---|---|---|---|
  | `OAK_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | 56-89 x 72-96 | `v7/oak_v7k.png` `dc4c5c2f212269d4` | 89x84 | passed 4 of 4 (ART-COUNCIL-5b/6); current | too wide |
  | `DEAD-TREE_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | 56-84 x 72-96 | `v4/dead_v4.png` `592368a0cac43284` | 84x89 | passed 4 of 4 (ART-COUNCIL-5b); current | too wide |
  | `BIRCH_B-V1_DEFAULT` | TREE_COMMON_BIRCH 44-70 x 76-100 | 44-70 x 76-118 | `v4/birch_v4b.png` `21208f3d92bc70cd` | 63x118 | passed 4 of 4 (ART-COUNCIL-5b); current | too tall |
  | `PINE_B-V1_DEFAULT` | TREE_COMMON_PINE 42-64 x 80-104 | 42-96 x 80-132 | `pine_c2d.png` `88f0f45b618bc9e0` | 96x132 | passed 4 of 4 (ART-COUNCIL-5b); current | too wide and too tall |
  | `SWAMP_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | none | `v4/swamp_v4.png` `0ab47583bbe97696` | 80x93 | passed 4 of 4 (ART-COUNCIL-5b); current | fits |
  | `FRUIT-TREE_B-V1_DEFAULT` | TREE_COMMON_OAK 56-80 x 72-96 | none | `apple_c2d.png` `5b3eab5dbc593dcd` | 66x73 | rejected (ART-COUNCIL-2); historical candidate, not passed art | fits |
  | `OAK_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | 16-28 x 12-21 | `oak_stump10.png` `b944740e091bc5a2` | 27x21 | passed 4 of 4 (ART-COUNCIL-2); current | too tall |
  | `SWAMP_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | 16-40 x 12-34 | `swamp_stump10.png` `e2f274d4b8906ba0` | 40x34 | passed 4 of 4 (ART-COUNCIL-2); current | too wide and too tall |
  | `DEAD-TREE_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | 16-31 x 12-23 | `dead_stump10.png` `cb4a2cb025cd035e` | 31x23 | passed 4 of 4 (ART-COUNCIL-2); current | too wide and too tall |
  | `PINE_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | 16-34 x 12-20 | `pine_stump10.png` `f684d2d41cd7608a` | 34x18 | passed 4 of 4 (ART-COUNCIL-2); current | too wide |
  | `BIRCH_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | 11-28 x 12-20 | `birch_stump10.png` `7ae6f5878bcebbfa` | 11x15 | passed 4 of 4 (ART-COUNCIL-2); current | too narrow |
  | `FRUIT-TREE_B-V1_DEPLETED` | DEBRIS_STUMP 16-28 x 12-20 | none | `fruit_stump10.png` `d2eab4e21314d798` | 19x19 | passed 4 of 4 (ART-COUNCIL-2); current | fits |

  The 12 measured sizes go into `tools/art/fixtures/catalogue/rmmz_rows_expected.json` as the oracle of `rmmz_rows.envelope_admits_art` (BRIEF Tests), each with its file, sha256, council status and selection; BRIEF scope item 1 has the full table with the council lines. Each stump is as wide as its own tree's trunk (DEC-063 item 5). The WG1 tree sizes came from versions rejected at ART-COUNCIL-2 and were not re-measured; this table replaces them with the passed versions. The fruit tree has no passed version: `apple_c2d.png` stays as a historical candidate and a fits-without-override control. The later candidates `appleA_v7b.png` (70x78) and `appleB_v7b.png` (73x69) were also rejected (Gemini NAY); at 69 px, appleB is under the chart row's 72 px minimum height, so any future fruit tree is measured at induction. The oracle checks recorded dimensions only: a changed image needs a refreshed measurement and a rows edit, and induction validates the actual selected image against the effective envelope (BRIEF "Risks"). DEC-016 makes the scale chart the size authority, so the builder lists each override in `conflicts.md` (BRIEF precondition 5: an Owner amendment to DEC-016, or an Owner ruling delegating the decision, before launch), one line per row, in the form the prototype printed: `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT: TREE_COMMON_OAK 56-80x72-96 (game/data/DEUS_ScaleRegistry.json:319) -> 56-89x72-96`.
- A sapling has no stump. The picked fruit tree leaves the same stump as the fruit tree.

### 5C. Group C: other natural B-sheet objects (AR-2202), 15 new rows

These are the stock Outside_B natural slots the PM listed. The existing charset or V8 rows stay as they are: GRASS-TUFT CAT 6434, FLOWERS 6430-6433, GRANITE-BOULDER 7623, ROCKS-SMALL 1749, BUSH 6425, the LOWER1 CAVE-MUSHROOMS 2531, and the ITEM log 1714.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `SURFACE_SHARED_FLORA_GRASS-TUFT_B-V1_DEFAULT` | FLORA | MICRO_TALL_GRASS 16-28x20-36; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 152 (384,144) | Outside_B 152 “Grass A” | TEMP_GRASS_FERTILE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0006 |
| `SURFACE_SHARED_FLORA_GRASS-TUFT_B-V2_DEFAULT` | FLORA | MICRO_TALL_GRASS 16-28x20-36; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 153 (432,144) | Outside_B 153 “Grass B” | TEMP_GRASS_FERTILE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0007 |
| `SURFACE_SHARED_FLORA_GRASS-TUFT_B-V3_DEFAULT` | FLORA | MICRO_TALL_GRASS 16-28x20-36; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 154 (480,144) | Outside_B 154 “Grass C” | TEMP_GRASS_FERTILE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0008 |
| `SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT` | FLORA | MICRO_TALL_GRASS 16-28x20-36; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 155 (528,144) | Outside_B 155 “Grass D” | TEMP_GRASS_FERTILE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0009 |
| `SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT` | FLORA | MICRO_FLOWERS 10-22x10-20; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 160 (384,192) | Outside_B 160 “Flowers A” | TEMP_GRASS_FERTILE (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0005 |
| `SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT` | FLORA | MICRO_FLOWERS 10-22x10-20; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 161 (432,192) | Outside_B 161 “Flowers B” | TEMP_GRASS_FERTILE (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0002 |
| `SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT` | FLORA | MICRO_FLOWERS 10-22x10-20; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 162 (480,192) | Outside_B 162 “Flowers C” | TEMP_GRASS_FERTILE (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0003 |
| `SURFACE_SHARED_FLORA_FLOWERS-WHITE_B-V1_DEFAULT` | FLORA | MICRO_FLOWERS 10-22x10-20; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 163 (528,192) | Outside_B 163 “Flowers D” | TEMP_GRASS_FERTILE (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0004 |
| `SURFACE_SHARED_STONE_GRANITE-BOULDER_B-V1_DEFAULT` | STONE | STONE_LARGE_BOULDER 32-48x28-44; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 159 (720,144) | Outside_B 159 “Boulder A” | HIGH_STONE_GRANITE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0012 |
| `SURFACE_SHARED_STONE_GRANITE-BOULDER_B-V2_DEFAULT` | STONE | STONE_LARGE_BOULDER 32-48x28-44; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 167 (720,192) | Outside_B 167 “Boulder B” | HIGH_STONE_GRANITE (MATCH) | SURFACE_SHARED_PROP_RMMZ01:0013 |
| `SURFACE_SHARED_FLORA_BUSH_B-V1_DEFAULT` | FLORA | SHRUB_MEDIUM_BUSH 28-44x20-32; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 166 (672,192) | Outside_B 166 “Bush” | TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0001 |
| `SURFACE_SHARED_STONE_ROCKS-SMALL_B-V1_DEFAULT` | STONE | STONE_SMALL_ROCK 14-24x10-18; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 171 (528,240) | Outside_B 171 “Rocks” | TEMP_STONE_FIELDSTONE (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0014 |
| `SURFACE_SHARED_FLORA_MUSHROOMS_B-V1_DEFAULT` | FLORA | MICRO_FUNGI 8-18x8-16; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 234 (480,624) | Outside_B 234 “Mushrooms A” | TEMP_WOODLAND_FLOOR, NEUT_PALE_CREST (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0010 |
| `SURFACE_SHARED_FLORA_MUSHROOMS_B-V2_DEFAULT` | FLORA | MICRO_FUNGI 8-18x8-16; slot 48x48 | GROUND [24,47] | `DEUS_Outside_B.png` tile 235 (528,624) | Outside_B 235 “Mushrooms B” | TEMP_WOODLAND_FLOOR, NEUT_PALE_CREST (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0011 |
| `SURFACE_SHARED_TREE_FALLEN-LOG_B-V1_DEFAULT` | TREE | DEBRIS_FALLEN_LOG 44-72x12-22; slot 96x48 | GROUND [48,47] | `DEUS_Outside_E.png` tiles 800/801 (2x1) (0,192) | none (E extension) | TEMP_BARK_OAK (PROPOSED) | SURFACE_SHARED_PROP_RMMZ01:0021 |

Notes:
- **Rows, not a generation scope.** These 15 rows are opened under the standing row permission (DEC-063 item 12, every RMMZ asset gets a DEUS asset, item 9). Grass, flowers, boulders, bush, rocks and mushrooms are not in the PM's generation scope (DEC-063 item 8: Groups 3-6 plus trees and stumps), and approved PixelLab plants and stones already exist for most of them (TEMPERATE_GENERATION_LIST:11, "the plants and stones approved earlier also stay"; the granite boulder is APPROVED, CAT 7623). Who makes their B-sheet forms, and whether from the approved art, is the PM's question to the Owner (BRIEF.md review log, Q3); converting the Owner's own outputs is on hold under DEC-055.
- The fallen log uses `DEBRIS_FALLEN_LOG` (44-72 px wide), so it takes two cells on E. The stock one-cell Fallen Log (164) is left for a DEUS one-cell log if the PM wants one (`DEBRIS_FALLEN_BRANCH` would fit).
- Natural Outside_B tiles not opened (candidates for later rows under the same permission): Vines B (36); Wall Vines A-C (49-51, 57-59); Wall Moss (56); Wall Fern (64); Stepping Stones (140); Hole (169); Dead Grass A/B (239, 247); Bush (Flowers) (245); Fern (246); Floral Patch (250); Susuki Grass (251); Fallen Leaves (252); Lotus Pads A-C (253-255).

### 5D. Group D: Group 4 depth pieces (AR-2203), 1 new row and 20 re-forms

Most Group 4 pieces already have rows in every band, with `runtime NONE` (CAT 7612-7620, 7728-7733, 6441-6446). A re-form changes **only** `runtime`, `rmmzForm`, `sourceIds.ar` (adds AR-2203) and the appended `statusWhy` clause. Slot, envelope, anchor, ramps, alphaMode and status stay as they are. The paint-slot column shows the slot the row already has at `18dfd92d`. The builder refuses a re-form whose target is missing or already has a runtime (`REFORM_TARGET`). The waterfall's existing HANGING row (CAT 6446, a 144x96 three-frame strip) has no RMMZ form, so the new A1 row below carries it. The HANGING rows stay, because COVERAGE needs every family in every band.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `SURFACE_SHARED_WATER_WATERFALL_A1_DEFAULT` | WATER | RMMZ_AUTOTILE_A1 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Outside_A1.png` A1 kind 5 (waterfall), tileId 2288  | Outside_A1 kind 5 “Waterfall A” | WATER_FOAM_RAPIDS, WATER_SHALLOW_CLEAR (PROPOSED) | SURFACE_SHARED_TILE_RMMZ01:0031 |
| RE-FORM `SURFACE_SHARED_SHADE_HEIGHT_H1_DEFAULT` | SHADE | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 769 (48,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0025 |
| RE-FORM `SURFACE_SHARED_SHADE_HEIGHT_H2_DEFAULT` | SHADE | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 770 (96,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0026 |
| RE-FORM `SURFACE_SHARED_SHADE_HEIGHT_H3_DEFAULT` | SHADE | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 771 (144,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0027 |
| RE-FORM `SURFACE_SHARED_SHADE_HEIGHT_H4_DEFAULT` | SHADE | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 772 (192,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0028 |
| RE-FORM `SURFACE_SHARED_SHADE_HEIGHT_H5_DEFAULT` | SHADE | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 773 (240,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0029 |
| RE-FORM `SURFACE_SHARED_RIMSHADOW_RIM_E_DEFAULT` | RIMSHADOW | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 774 (288,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0021 |
| RE-FORM `SURFACE_SHARED_RIMSHADOW_RIM_N_DEFAULT` | RIMSHADOW | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 775 (336,0) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0022 |
| RE-FORM `SURFACE_SHARED_RIMSHADOW_RIM_S_DEFAULT` | RIMSHADOW | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 776 (0,48) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0023 |
| RE-FORM `SURFACE_SHARED_RIMSHADOW_RIM_W_DEFAULT` | RIMSHADOW | GEOM_TILE 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 777 (48,48) | none (E extension) | NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_01:0024 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_H1_DEFAULT` | WALLFACE | GEOM_STRATUM_1 48x19-20; slot 48x48 | WALL [24,0] | `DEUS_Outside_E.png` tile 778 (96,48) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1718 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_H2_DEFAULT` | WALLFACE | GEOM_STRATUM_2 48x38-39; slot 48x48 | WALL [24,0] | `DEUS_Outside_E.png` tile 779 (144,48) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1719 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_FULL_DEFAULT` | WALLFACE | GEOM_LAYER_FACE 48x96; slot 48x96 | WALL [24,0] | `DEUS_Outside_E.png` tiles 784/792 (1x2) (0,96) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1717 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_H3_DEFAULT` | WALLFACE | GEOM_STRATUM_3 48x57-58; slot 48x96 | WALL [24,0] | `DEUS_Outside_E.png` tiles 785/793 (1x2) (48,96) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1720 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_H4_DEFAULT` | WALLFACE | GEOM_STRATUM_4 48x76-77; slot 48x96 | WALL [24,0] | `DEUS_Outside_E.png` tiles 786/794 (1x2) (96,96) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1721 |
| RE-FORM `SURFACE_SHARED_WALLFACE_OPENING_H5_DEFAULT` | WALLFACE | GEOM_STRATUM_5 48x96; slot 48x96 | WALL [24,0] | `DEUS_Outside_E.png` tiles 787/795 (1x2) (144,96) | none (E extension) | NEUT_COOL_GRAY, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_TILE_01:1722 |
| RE-FORM `SURFACE_SHARED_HANGING_VINES_V1_DEFAULT` | HANGING | GEOM_LAYER_FACE 48x96; slot 48x96 | CEILING [24,0] | `DEUS_Outside_B.png` tiles 20/28 (1x2) (192,96) | Outside_B 20/28 “Vines A” | TEMP_FOLIAGE_OAK (PROPOSED) | SURFACE_SHARED_PROP_01:0023 |
| RE-FORM `SURFACE_SHARED_HANGING_ROOTS_V1_DEFAULT` | HANGING | GEOM_LAYER_FACE 48x96; slot 48x96 | CEILING [24,0] | `DEUS_Outside_E.png` tiles 788/796 (1x2) (192,96) | none (E extension) | TEMP_BARK_OAK, TEMP_WOODLAND_FLOOR (PROPOSED) | SURFACE_SHARED_PROP_01:0021 |
| RE-FORM `SURFACE_SHARED_HANGING_DUST_V1_DEFAULT` | HANGING | GEOM_LAYER_FACE 48x96; slot 48x96 | CEILING [24,0] | `DEUS_Outside_E.png` tiles 789/797 (1x2) (240,96) | none (E extension) | NEUT_WARM_GRAY (PROPOSED) | SURFACE_SHARED_PROP_01:0019 |
| RE-FORM `SURFACE_SHARED_HANGING_LIGHT-SHAFT_V1_DEFAULT` | HANGING | GEOM_LAYER_FACE 48x96; slot 48x96 | CEILING [24,0] | `DEUS_Outside_E.png` tiles 790/798 (1x2) (288,96) | none (E extension) | NEUT_PALE_CREST (PROPOSED) | SURFACE_SHARED_PROP_01:0020 |
| RE-FORM `LOWER1_SHARED_HANGING_STALACTITES_V1_DEFAULT` | HANGING | GEOM_LAYER_FACE 48x96; slot 48x96 | CEILING [24,0] | `DEUS_Dungeon_E.png` tiles 771/779 (1x2) (144,0) | none (E extension) | TEMP_STONE_LIMESTONE (PROPOSED) | LOWER1_SHARED_PROP_01:0008 |

Notes:
- **Unchanged (EXISTS in RMMZ form):** the ALL-band connectors, STOCK on `UF_Levels_B.png` tiles 1-7: stairs up/down/both CAT 1558/1557/1556, ramp up/down 1555/1554, ladder foot/top 1552/1553. Their SURFACE copies 5695-5701 have no paint slot.
- **Other bands:**
  - The SURFACE stalactites row (6444) and the LOWER2, UPPER1 and UPPER2 copies of every piece keep `runtime NONE`. Their RMMZ homes come with the tilesets for those bands.
  - The LOWER1 stalactites are re-formed because TEMPERATE_GENERATION_LIST 4.18 is written for the Lowlands.
- **Waits:** 4.10-4.15 (opening walls) still wait for the RENDER.NATIVE profile guides (TEMPERATE_GENERATION_LIST R9). The re-form only gives them an RMMZ home.

### 5E. Group E: lava, cooled obsidian, steam (AR-2204), 3 new rows

TEMPERATE_GENERATION_LIST 5.05 orders one Tiles Pro set with lava at one end and obsidian at the other. In RMMZ form these are two kinds: lava as an A1 fluid, the same category as water (DEUS_Fluid keeps water and lava as fluid types 1 and 2, `game/js/plugins/DEUS_Fluid.js:6`, `:81-82`), and obsidian as A2 ground. Steam (5.06) is a 2x2 still on E, because stock has no steam. The water rows 5.01-5.04 already exist in A1 form (CAT 7736-7742, 1790) and are unchanged.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `ALL_SHARED_WATER_LAVA_A1_DEFAULT` | WATER | RMMZ_AUTOTILE_A1 96x144; slot 288x144 (3 frames) | CENTER [48,72] | `DEUS_Dungeon_A1.png` A1 kind 4, tileId 2240  | Dungeon_A1 kind 4 “Lava” | VOLC_LAVA_HAZARD (PROPOSED) | ALL_SHARED_TILE_RMMZ01:0002 |
| `ALL_SHARED_TERRAIN_OBSIDIAN_A2_DEFAULT` | TERRAIN | RMMZ_AUTOTILE_A2 96x144; slot 96x144 | CENTER [48,72] | `DEUS_Dungeon_A2.png` A2 kind 16, tileId 3584  | Dungeon_A2 kind 16 “Ground E (Lava Cave)” | VOLC_STONE_OBSIDIAN (PROPOSED) | ALL_SHARED_TILE_RMMZ01:0001 |
| `ALL_SHARED_EFFECT_STEAM_B-V1_DEFAULT` | EFFECT | RMMZ_TILE_48_2X2 96x96; slot 96x96 | GROUND [48,95] | `DEUS_Dungeon_E.png` tiles 769/770/777/778 (2x2) (48,0) | none (E extension) | NEUT_PALE_CREST, NEUT_COOL_GRAY (PROPOSED) | ALL_SHARED_EFFECT_RMMZ01:0001 |

Notes:
- Steam uses category EFFECT. `tools/wsr/scope.json` declares `SOURCE:EFFECT` NON_WORLD_STATE ("Combat effect sprites"), so a steam slot creates no WSR gap, but the WSR description does not fit steam. Changing the class is a WSR scope change, which needs the Coordinator (scope.json `about`). That is a follow-up.
- Lava keeps the slot the engine already draws for it: `game/js/plugins/DEUS_Levels.js:400` maps `lava_pool` to Dungeon_A1 kind 4, and `:550` returns `Tilemap.TILE_ID_A1 + 4 * 48`. Swapping in `DEUS_Dungeon_A1.png` therefore needs no code change at that point. The pool is the z=-2 fluid (`:113`, `:1376-1379`). A surface tileset that needs lava or obsidian copies the art into its own sheets later.

### 5F. Group F: integrity and aftermath marks (AR-2205), 7 new rows, new category MARK

These are flat 48x48 overlays (TEMPERATE_GENERATION_LIST 6.01-6.07, "binary alpha, no outline, static"). The new category `MARK` has groupType OVERLAY. Reusing `DECAY` would misname them, and it would produce the undeclared WSR class `SOURCE:DECAY` anyway. The four strain and fail marks are fissures, so they take stock Outside_B Fissures A-D (52-55). Scar, ash and sediment are patches with no stock counterpart, so they go on E. The band is SURFACE because the list's prompts use the Temperate paragraph. Underground copies come with the Dungeon tileset.

| id | kind | size row, envelope; slot | anchor | runtime (RMMZ) | stock format example | palette ramps | paint slot |
|---|---|---|---|---|---|---|---|
| `SURFACE_SHARED_MARK_ROCK-STRAINED_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_B.png` tile 52 (192,288) | Outside_B 52 “Fissures A” | HIGH_STONE_GRANITE, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0004 |
| `SURFACE_SHARED_MARK_ROCK-FAILING_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_B.png` tile 53 (240,288) | Outside_B 53 “Fissures B” | HIGH_STONE_GRANITE, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0003 |
| `SURFACE_SHARED_MARK_SOIL-STRAINED_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_B.png` tile 54 (288,288) | Outside_B 54 “Fissures C” | TEMP_SOIL_LOAM, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0007 |
| `SURFACE_SHARED_MARK_SOIL-FAILING_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_B.png` tile 55 (336,288) | Outside_B 55 “Fissures D” | TEMP_SOIL_LOAM, NEUT_VOID_BLACK (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0006 |
| `SURFACE_SHARED_MARK_GROUND-SCAR_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 802 (96,192) | none (E extension) | TEMP_SOIL_LOAM (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0002 |
| `SURFACE_SHARED_MARK_ASH-PATCH_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 803 (144,192) | none (E extension) | VOLC_ASH_DRIFT (MATCH) | SURFACE_SHARED_OVERLAY_RMMZ01:0001 |
| `SURFACE_SHARED_MARK_SEDIMENT_B-V1_DEFAULT` | MARK | RMMZ_TILE_48 48x48; slot 48x48 | CENTER [24,24] | `DEUS_Outside_E.png` tile 804 (192,192) | none (E extension) | WET_SILT_RIVER (PROPOSED) | SURFACE_SHARED_OVERLAY_RMMZ01:0005 |

Notes:
- `SOURCE:MARK` is not declared in `tools/wsr/scope.json`. Each mark slot would be a `SLOT_CLASS_UNDECLARED` violation in `tools/verify_world_state_registry.js`, which already fails `--check` on main.
- The lane does not edit `tools/wsr/**`. It records the WSR delta. The PM asks the Coordinator to declare `SOURCE:MARK` NATURAL_WORLD (integrity states) in WG.33.
- Sediment has no consumer this phase (DEC-057). The row exists so that the run can happen when the PM schedules it (TEMPERATE_GENERATION_LIST 6.07).

## 6. Counts

| Group | New rows | Re-forms | AR | Runtime sheets used |
|---|---|---|---|---|
| A A4 cliff materials (10 built + 5 opened; 9 slots reserved) | 30 | 0 | AR-2200 | DEUS_Cliffs_Temperate_A4 |
| B trees (10) and per-species stumps (6) | 16 | 0 | AR-2201 | DEUS_Outside_B (6 rows), DEUS_Outside_E (10) |
| C other natural B-sheet objects | 15 | 0 | AR-2202 | DEUS_Outside_B (14), DEUS_Outside_E (1) |
| D Group 4 depth pieces | 1 | 20 | AR-2203 | DEUS_Outside_A1, DEUS_Outside_E, DEUS_Outside_B, DEUS_Dungeon_E |
| E lava, obsidian, steam | 3 | 0 | AR-2204 | DEUS_Dungeon_A1, DEUS_Dungeon_A2, DEUS_Dungeon_E |
| F integrity and aftermath marks | 7 | 0 | AR-2205 | DEUS_Outside_B (4), DEUS_Outside_E (3) |
| **Total** | **72** | **20** | 6 ARs | 7 runtime sheets, 5 paint sheets |

The 72 new rows plus 20 re-forms claim 134 RMMZ cells, each claimed once (rechecked at `fbdd2bd9` and `d49563bd`). The 10,122 existing entries become 10,194. No existing id, slot, envelope or status changes. Only the 20 re-formed rows change, and only in `runtime`, `rmmzForm`, `sourceIds.ar` and the appended `statusWhy` clause. 9 of the 72 new rows carry a size override (5B); none changes a slot.

## 7. Not in this lane

- **Items and container gumps** (the Owner's Ultima-style inventory: item sprites plus container gumps, no IconSet) belong to a later lane.
  - The 61 ITEM rows (`ALL_SHARED_ITEM_*`, among them the log CAT 1714 and the mushroom CAT 1720) are untouched, and so are the 34 EQUIPMENT rows.
  - `img/system/IconSet.png` stays out of scope as UI (CAT 11657).
  - Gumps have no size row yet; they fall under the Q-UI question.
- **Not yet:** animals, monsters, people, facesets, charsets and animations, and their rows (CREATURE, CHARACTER, FACE, EFFECT except steam; TEMPERATE_GENERATION_LIST Group 7).
- **The Owner's tile sets are never redone:** no row here duplicates the Owner's PixelLab dirt-grass sets, the meadow variants or any Group 1-2 ground slot.
- **Native depth rows stay as they are:** EDGE, RAMPSIDE and RAMP for every material and band (TEMPERATE_GENERATION_LIST 3.01-3.24; the ramps wait for the R9 guides), and the SOIL-versus-DIRT alias (R8, AUDIT decision 1).
- **Legacy A4 rows:** the 8 rows on `RMMZ_AUTOTILE_A4` (96x120) are not moved to the new TOP/SIDE size rows: CAT 1766, 1769, 1780-1782, 1784-1785 and 3715, on `UF_Levels_A4.png` and the manifest sheets. Neither is their slot collision (CAT 1782 against 1781, and 3715 against 1785). That is its own re-form, with placement and template effects.
- **Existing rows keep their runtimes:** the nine SURFACE water rows (CAT 7734-7742, stock `Outside_A1.png` kinds 0, 1, 2, 4, 6, 8, 10, 12 and 14) stay on `Outside_A1.png` and are not moved to `DEUS_Outside_A1.png`. The sapling's stand-in runtime (Outside_B tile 152, CAT 7722) does not change.
- **One file per sheet slot (follow-up for the game-data lane).** An RMMZ tileset names exactly one file for each of A1-A5 and B-E (`tilesetNames`, 9 entries). So the outside tileset cannot use both stock `Outside_A1.png` (the water rows above) and `DEUS_Outside_A1.png` (the waterfall), both `Outside_B.png` (the sapling stand-in) and `DEUS_Outside_B.png`, or both stock `Outside_A4.png` (CAT 1769, the generic wood wall) and `DEUS_Cliffs_Temperate_A4.png`. When the Tilesets.json lane switches a slot to the DEUS file, the rows still on the stock file move with it: the water kinds do not collide with the waterfall at kind 5, and stock tile 152 ("Grass A") becomes the DEUS grass tuft at the same id. That lane lists every such move under "Decisions needed".
- **Downstream tools are not changed:**
  - `tools/art/place_art.js` cannot yet export a `runtime.grid` stack of more than one cell. It refuses a 96x96 slot on a one-tile target. That affects 20 of the 92 rows: 10 are 1x2, 7 are 2x2, 2 are 2x3 and 1 is 2x1. Grid support goes to a placement lane.
  - `tools/art/validate_art.js` `TILE_CLASS_ROWS` (`:569`) does not list the three new size rows.
  - Not changed either: `tools/art/make_blank_templates.js`, `tools/wsr/scope.json` and `known_gaps.json`, `game/**`, `art/catalogue/mapping.json` (the single `stump` mapping stays), `docs/RMMZ_ASSET_SPEC.md` and `art/APPROVALS.md`.
- **No art, and no generation of any kind.**

## 8. Defaults the PM can reverse before launch

Each is one edit to `art/catalogue/rmmz_rows.json`, the expected fixture and this file. The work gate (MiniMax M3, 2026-10-01) kept all six.
1. Slots 10-14 (meadow, forest floor, dry grass, needle floor, stony ledges) are opened. Dropping them removes 10 rows.
2. The DEUS extension sheet is E (`DEUS_Outside_E.png`, `DEUS_Dungeon_E.png`). The alternative is to put no-stock-slot items on the B sheets at civilization positions. That would break the one-DEUS-asset-per-stock-slot layout.
3. Swamp stump at stock Stump (Moss) 243. The alternative is the E sheet.
4. Marks are SURFACE band with category MARK. The alternative is band ALL, which the earlier facts note proposed.
5. Steam is category EFFECT. The alternative is WATER, which is the wrong surface semantics.
6. Variant token `B-V<n>` for B-sheet forms, and `DEPLETED` for stumps (SOP C16).

## Review log

### 2026-10-01: lane-pg pre-launch review (Claude sub-agent for the PM; checks and remaining problems in BRIEF.md "Review log")

I changed no table row of section 5. On a clean clone of main at `b889de90` and again at `30e90b7f`, the prototype reproduced all 92 rows, and every tileId, pixel position and stock label was recomputed by hand against `game/js/rmmz_core.js` and the MZ stock `.txt` label files. Text edits:
- **Header:** records the re-check at `b889de90`.
- **Section 0:**
  - The RMMZ quote now uses the Owner's exact wording, which ends "as well" (`docs/OWNER_DECISIONS.md:1062`).
  - Both quotes are on main since DEC-063. They are cited by first-hit line (`:1066`, `:923`).
- **Section 1:** the `statusWhy` template gets a third case for the A4 rows, which use a format example rather than a stock position.
- **Section 2.1:**
  - Slots 0-9 are now described as the homes for the remade materials, because ART-COUNCIL-1 rejected all ten sets of the first sheet and that sheet is never inducted.
  - The empty local tile 0 on E sheets is labelled a DEUS convention, not an RMMZ rule.
- **Section 5A notes:**
  - TOP rows take the Owner's existing ground fill; only the rims are new work (TEMPERATE_GENERATION_LIST:77; DEC-063 item 7).
  - The RMMZ block layout is spelled out: inner corners are four 24x24 quarters (`game/js/rmmz_core.js:2793-2799`; `art/COUNCIL_RECORD.md:30`).
- **Section 5B:** the dead-tree note is corrected. TREE_SAPLING is a tree size row of 48 px or less, so the note now says that no grown-tree row is.
- **Section 5C:** these rows are outside the PM's generation scope (DEC-063 item 8). Approved plants and stones already exist.
- **Section 7:**
  - The water rows are nine (CAT 7734-7742), not five.
  - New follow-up, "One file per sheet slot": each RMMZ tileset names exactly one file per slot (A1-A5, B-E). This affects the water rows against the waterfall, the sapling stand-in, the stock Outside_A4 wood wall, and lane-cy's stock-named files.

Not changed, for the PM to rule on (BRIEF.md review log):
- **rampBasis:** stumps are labelled inconsistently (oak MATCH, birch and pine PROPOSED), and the builder labels `mapping.terrains` copies PROPOSED.
- **Rock-cliff format example:** Dungeon_A4 "Ledge B (Rock Cave)" kinds 37/45 against "Wall B" kinds 1/9.
- **Cliff-face homes:** AR-2100/AR-2101 also place rock and soil cliff faces, on `UF_Levels_A4`.

### 2026-10-01: work-gate changes (WG1), applied for the PM by a Claude sub-agent

The work gate (MiniMax M3) returned GO WITH CHANGES; its changes to this file:
- **5B ids:** the swamp tree and stump drop the doubled `TREE` token (input type `tree-swamp` becomes `swamp`) and are renamed `SURFACE_SHARED_TREE_SWAMP_B-V1_DEFAULT` and `_DEPLETED` (REQUIRED CHANGE 5). The paint slots do not move: the new ids sort in the same place (after SAPLING).
- **5B sizes:** 9 size overrides (REQUIRED CHANGE 3), shown in the size column and in the new note with the judged sizes; the old "AUDIT D4 question is unchanged" note is replaced.
- **Section 1:** the size and `statusWhy` conventions name the override.
- **Header and section 6:** the reruns at `fbdd2bd9` and `d49563bd`.
- **Section 8:** all six defaults kept.

The 10 changed table lines are the prototype's own output (`rows_tables.md`); the other 82 are byte-identical to the earlier ones. No tileId, position, stock label, ramp or paint slot changed. Check: `node wg1_tablecheck.js ROWS.md` in the lane-pg scratch, "92 table lines; prototype 92; differing 0".

### 2026-10-01: work-gate changes (WG2), applied for the PM by a Claude sub-agent

The second work gate (ChatGPT Pro, WORK-GATE lane-pg 2) returned GO WITH CHANGES; its changes to this file:
- **Section 1, ramps:** the MATCH/PROPOSED rule is stated as settled (REQUIRED CHANGE 4), with "MATCH does not mean approved" and no relabelling of existing families.
- **5B table:** the oak, dead and birch override cells follow the measured specimens (56-89, 56-84, 76-118); the birch and pine stumps are MATCH (REQUIRED CHANGES 2 and 4).
- **5B size-override table and notes:** a version-qualified table (file, sha256, measured box, council status, current or historical) replaces the judged sizes; the fruit tree is a historical candidate; the oracle checks recorded dimensions only (REQUIRED CHANGE 2). The dead-tree note gives 56-84.
- **Header:** the rerun on `clone_wg2`.

The 5 changed table lines are the prototype's own output (`rows_tables.md`); the other 87 are byte-identical. No tileId, position, stock label or paint slot changed. Check: `node wg1_tablecheck.js ROWS.md` in the lane-pg scratch, "92 table lines; prototype 92; differing 0".

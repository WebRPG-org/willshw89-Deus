# Art catalogue schema `deus-art-catalogue/1.4.0`

Written 2026-09-26 by Claude (lane-s, WG.20.02); updated to 1.2.0 on 2026-09-28 (lane-bz, TOOL.01.01) and to 1.4.0 on 2026-10-01 (lane-pg, WG.20.03; 1.3.0 is taken by the unmerged `task/lane-ce`). Machine form: [`art/catalogue/catalogue.schema.json`](../../../art/catalogue/catalogue.schema.json) (JSON Schema 2020-12, `$id` `deus-art-catalogue/1.4.0`). Counts, coverage and sheets: [INDEX.md](INDEX.md) (generated).

**The catalogue contains no image data.** It lists ids, sizes, slots, sources, statuses and references so the Owner can paint into blank templates (Lane T) and approved art can be placed and validated (Lane U). Nothing in this lane draws, generates, edits or requests art (DEC-007).

The contract in `tasks/WG.20.02/lane-s/BRIEF.md` is frozen for lanes S, T and U. This schema implements it and only **adds optional fields** (listed in "Additions to the contract" below). Nothing in the contract is renamed, removed or given a new meaning.

## 1. Files and commands

| File | Kind | Written by |
|---|---|---|
| `art/catalogue/geometry.json` | input: the vertical geometry and frame classes (contract) | hand, with `decisions[]` citing every value |
| `art/catalogue/strip_transcription.json` | input: the 18 labels read off the scale strip | hand (method recorded in the file) |
| `art/catalogue/size_inputs.json` | input: race drawn heights (PM 01:59 CT) with the quoted SRD Size traits | hand; checked against the SRD by the builder |
| `art/catalogue/mapping.json` | input: source id -> scale row, palette ramps, category (MATCH or PROPOSED) | hand |
| `art/catalogue/reference_inputs.json` | input: pinned sha256 of every reference | hand |
| `art/catalogue/conflict_claims.json` | input: document claims that disagree, located by literal text | hand |
| `art/catalogue/rmmz_rows.json` | input: catalogue rows in RMMZ's own sheet formats and runtime re-forms of existing rows (section 12) | hand (WG.20.03) |
| `art/catalogue/catalogue.schema.json` | the JSON Schema | hand |
| `art/catalogue/catalogue.json` | output: the catalogue | `tools/art/build_catalogue.js` |
| `art/catalogue/scale_chart.json` | output: the size rows entries cite | builder |
| `art/catalogue/size_classes.json` | output: the character-size authority | builder |
| `art/catalogue/references.json` | output: references per entry and per pack | builder |
| `art/catalogue/conflicts.md` | output: every disagreement between sources, file:line on both sides, none resolved | builder |
| `docs/art/catalogue/INDEX.md`, `BAND_<band>.md` | output: counts, coverage, sheets, one page per band | builder |

```
node tools/art/build_catalogue.js           rebuild every output (deterministic: no timestamps, fixed key order, stable sort)
node tools/art/build_catalogue.js --check   rebuild in memory; exit 1 if a committed output differs
node tools/art/test_catalogue.js            the done tests; UF_TEST_PROVOKE=catalogue.<check> makes one check fail on purpose
node tools/art/test_rmmz_rows.js            the RMMZ-row tests (section 12); UF_TEST_PROVOKE=rmmz_rows.<check>; --mutants
```

The builder reads the sources through one context that records every file it reads or cites; `catalogue.json` `sources[]` lists them with their sha256, so any source change shows up in `--check`.

## 2. Geometry (`geometry.json`)

All contract fields, as the brief gives them: `squareFt 5`, `layerFt 10`, `strataPerLayer 5`, `stratumFt 2`, `layerCount 32`, `zMin -16`, `zMax 15`, `tilePx 48`, `layerPx 96`, `stratumPx [19,19,19,19,20]`, `humanPx 42`, `frameClasses`, `optionalParams`, `pxPerFootCreature 7`, `rmmzCharacterBlocks`, `bands`, `decisions`. `decisions[]` gives the source and status (DECIDED or OPEN) of every value: DEC-013 and addendum §12/§13 in `docs/OWNER_DECISIONS.md` for the sim geometry, the Owner's 01:55 CT pixel ruling and the PM's 01:59 CT size ruling relayed in the brief for the pixel values.

Optional additions: `bands[].name` (DEC-013 names), `biomesPerBand 5`, `facings ["N","E","S","W"]` (edge strips per facing, ramps per rise direction), `atlasMaxPx 4096`.

The builder refuses the geometry (`GEOM_INVALID`) unless: `layerCount = zMax - zMin + 1`; `strataPerLayer x stratumFt = layerFt`; `stratumPx` has `strataPerLayer` integers, each >= 1, summing to `layerPx` (so `[24,24,24,24,0]` and `[19,19,19,19,19]` are rejected); the bands are contiguous and cover `zMin..zMax` exactly; each frame class has a `[w,h]` frame with a matching 3 x 4 `rmmzCharacterBlocks` entry, or `frame: null` with `status: OWNER_OPEN`.

**Nothing assumes a layer count.** The builder reads the layer count, z range and bands from `geometry.json`; `build_catalogue.js` contains no literal 9 or 32 (a test greps for them), and a test builds a 9-layer world from a fixture geometry.

### Geometry-derived sizes

Every size below is computed from `geometry.json` only and is re-checked by the `GEOM_HEIGHT` rule. `stratumPx` is read bottom-up.

| Row (in `scale_chart.json`) | Width | Height min / target / max | Used by |
|---|---|---|---|
| `GEOM_TILE` | tilePx | tilePx | top-surface tiles, height shading, rim shadows |
| `GEOM_STRATUM_k` (k = 1..strataPerLayer) | tilePx | shortest run of k consecutive strata / the lowest k strata / tallest run of k consecutive strata | edge strips `H<k>`, ramp side faces, wall faces |
| `GEOM_LAYER_FACE` | tilePx | layerPx | full-layer faces, hanging props |
| `GEOM_RAMP_k` | tilePx | tilePx + the same three runs | ramp cell k (PROPOSED convention: the top plus the cell's rise) |
| `GEOM_FRAME_<CLASS>` | frame w | frame h | creature frame slots |

A step of k strata can start on any stratum, so the slot fits the tallest run (it does not depend on the order of `stratumPx`); the target is the step that starts on the ground (the first k values), so reordering the split changes targets. With the default split: H1 19/19/20, H2 38/38/39, H3 57/57/58, H4 76/76/77, H5 96, FULL 96. Slots round up to the 48 grid: `slot h = 48 x ceil(hMax / 48)` per frame.

### Bands

`bands` are the DEC-013 ranges (PM defaults, `ownerOpen: true`): LOWER2 -16..-9, LOWER1 -8..-1, SURFACE 0..+3, UPPER1 +4..+9, UPPER2 +10..+15. Entries may also carry the band **`ALL`** (z = `zMin..zMax`) for band-neutral content: items, creatures, people, equipment, faces, effects, buildings and the depth-agnostic level pieces. `ALL` is not a geometry band; it never appears in `geometry.json`. Legacy z values from older sources (the five-level `-2..+2` world) are banded by numeric containment (z -1 and -2 fall in LOWER1).

Biomes: the 25 biome names and their band assignment are OWNER_OPEN (DEC-013). `catalogue.json` `biomes.placeholders` lists `<BAND>_B1..B5` (`ownerOpen: true`); no entry needs a per-biome slot yet, so every entry uses `SHARED`. The five registry biomes (TEMP, WET, ARID, HIGH, VOLC) are listed under `biomes.canonical`.

## 3. Size authorities

**`scale_chart.json`** (DEC-016: the scale chart governs pixel size, envelope, footprint and anchor). Rows, in order, and nothing else:
- one row per class of `game/data/DEUS_ScaleRegistry.json` (39): `rowId` = class id, W/H min/target/max, footprint, anchor, `ref` (file:line), `source: STRIP+REGISTRY` when the strip labels it (then also `chartLabel`, `chartHeightPx`, transcribed from the strip) else `REGISTRY_ONLY`;
- tile-class rows parsed from `docs/RMMZ_ASSET_SPEC.md` (`source: RMMZ_SPEC`): `RMMZ_TILE_48` (48x48; the strip's "48X48 TILE 48 PX" label), `RMMZ_AUTOTILE_A1` 96x144, `RMMZ_AUTOTILE_A2` 96x144, `RMMZ_AUTOTILE_A3` 96x96, `RMMZ_AUTOTILE_A4` 96x120 (legacy; 8 rows still use it), and `RMMZ_FACE_144` (the 144x144 face cell of §4; needed because face sheets are catalogued); and three rows derived from those parsed values (WG.20.03; `docs/RMMZ_ASSET_SPEC.md` is not edited), each `ref` naming its derivation: `RMMZ_AUTOTILE_A4_TOP` = the A2 block (96x144, footprint 2x3; an A4 kind in an even block row draws with the floor table, `game/js/rmmz_core.js:2547-2552`), `RMMZ_AUTOTILE_A4_SIDE` = the A3 block (96x96, 2x2; odd block rows use the wall table) and `RMMZ_TILE_48_2X2` = 2 x `RMMZ_TILE_48` (96x96, 2x2; four whole B-E cells, `game/js/rmmz_core.js:2483-2498`). The build fails with `RMMZ_SPEC` unless the parsed A4 sheet is 8 top widths wide and a whole number of (top + side) pairs high (768 = 8 x 96; 720 = 3 x 240);
- geometry rows (`source: GEOMETRY`), above.

**`size_classes.json`** (the character-size authority; drawn heights only, the sim keeps true SRD heights): one row per SRD race (`RACE_<NAME>`: `srdSize`, `srdSourceRef` {file, entryId, line, quoted Size trait}, the feet bounds and their relation EQ/LT/GT/NONE/SAME_AS_HUMAN, `drawnHeightPxMin/Max/Target`, `drawnWidthPx` with its source row and status, `frameClass`, `frame`, `footprintSq`, `status: DERIVED` when both bounds are exact SRD feet at 7 px/ft, else `PROPOSED`; Gnome and Halfling carry `readabilityFloorPx {value, enabled:false}`), one row per frame class (`FRAME_TINY` .. `FRAME_GARGANTUAN`: footprint in squares, frame in px or null, RMMZ block, status), the SRD Size Categories table, the 6-ft human check (7 x 6 = 42 = humanPx), and the optional parameters `TALL_MEDIUM` and the small-race floor with `enabled: false`. Every px value is checked against the SRD text; a failed check is written to conflicts.md, never fixed.

Target height of a race: `humanPx` for Human and Tiefling ("about the same size as humans"), otherwise the rounded midpoint. Width: the registry row of the same race where one exists (Human, Dwarf, Elf), otherwise `CHARACTER_HUMAN_ADULT` marked PROPOSED.

**Frame vs footprint.** Every creature and character entry carries `footprint` (squares, from the SRD size: Tiny/Small/Medium 1, Large 2, Huge 3, Gargantuan 4) and `frameClass` (px frame) as separate fields; neither is derived from the other. Frame classes: TINY (24x24 drawn footprint in a 48x48 frame), SMALL and MEDIUM 48x48, LARGE_TALL 48x96 (tall bodies: SRD type humanoid or giant), LARGE_LONG 96x48 (long bodies: SRD type beast; PROPOSED), HUGE and GARGANTUAN `frame: null`, OWNER_OPEN, future, no paint slots. A creature with no SRD match gets MEDIUM (the current runtime frame) and `ownerOpen: true`. Character blocks are 3 x 4 frames: 144x192, 144x384, 288x192. `TALL_MEDIUM` (48x64) adds a generic frame slot per band when switched on; the small-race floor raises Gnome and Halfling to 26-28 px when switched on.

**`scaleRow`** names a `scale_chart.json` row or a `size_classes.json` race row. Character entries cite a `RACE_*` row (or `GEOM_FRAME_*` for peoples with no SRD race and for children, whose `notes` carry the chart's `CHARACTER_CHILD` height); creature entries cite `GEOM_FRAME_*`; items and effects cite `RMMZ_TILE_48` (the 48x48 icon frame; the drawn size inside is not charted).

## 4. `catalogue.json` top level

| Field | Contract | Content |
|---|---|---|
| `schemaVersion` | yes | `deus-art-catalogue/1.4.0` |
| `tileSizePx` | yes | 48 (from geometry) |
| `geometry`, `palette`, `scaleChart` | yes | `{path, sha256}`; palette = `art/palette/deus_master_world_palette_v1.hex` |
| `sources[]` | yes | `{path, sha256, role}` of every file read or cited |
| `sheets[]`, `entries[]`, `outOfScope[]` | yes | below |
| `sizeClasses`, `references` | added | `{path, sha256}` of the two generated files |
| `bands[]` | added | copy of the geometry bands |
| `biomes` | added | canonical, forbidden and placeholder biome ids |
| `depthPalettes[]` | added | `{id: DEPTH_<band>, band, colors: null, status: OWNER_OPEN}`: palette placeholders, no colour values |
| `sourceIdIndex` | added | every source id the builder ingested, per kind (catalog, assetIndex, brief, ar, manifest, matrix, addendum), so coverage can be checked from the catalogue alone |

## 5. `sheets[]`

`{sheetId, kind, group {band, biome, type}, w, h, gridPx, runtimeFile}`.
- `ATLAS` sheets are the paint sheets: `sheetId = ATLAS_<band>_<biome>_<type>_<nn>`, `type` is the group type (TILE, OVERLAY, PROP, ITEM, CHARACTER, FACE, EFFECT), sides are multiples of 48 and at most `atlasMaxPx` (4096; the packer uses 4080 = 85 x 48), `runtimeFile: null`.
- `RMMZ_TILESET` and `RMMZ_CHARACTER` sheets are the runtime export targets named by entries' `runtime.file`: tilesets have the fixed sizes of `docs/RMMZ_ASSET_SPEC.md` (A1/A2 768x576, A3 768x384, A4 768x720, A5 384x768, B-E 768x768); `$` character sheets are 3 x frameW by 4 x frameH.

**Packing**: every entry with a paint slot, sorted by (band, biome, group type, category, id), is shelf-packed left to right into the atlases of its (band, biome, type) group; a new shelf starts when the row is full, a new sheet when the sheet is full. Deterministic.

**Append-only sheets.** Rows that would renumber existing slots if packed in place go on their own sheets after the main pack: the DEC-045 stamps on `ATLAS_SURFACE_SHARED_TILE_DEC045`, and the RMMZ-format rows of section 12 on `ATLAS_<band>_<biome>_<type>_RMMZ<nn>` (the same shelf algorithm and sort key, packed after the main pack and the DEC-045 block). No existing slot moves when such a row is added, and no `_RMMZ` sheet holds an older row (`rmmz_rows.append_only`).

## 6. `entries[]`

Contract fields (always present):

| Field | Meaning |
|---|---|
| `id` | `BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`: six fields of `[A-Z0-9]` joined by `_`; inside a field every other character becomes `-` (so `berry_bush` -> `BERRY-BUSH`, biome placeholder `LOWER2_B1` -> `LOWER2-B1`) |
| `category` | TERRAIN, WATER, TOP, EDGE, RAMP, RAMPSIDE, WALLFACE, CONNECTOR, VEIN, SHADE, RIMSHADOW, DECAY, TREE, FLORA, STONE, REMAINS, STRUCTURE, FURNITURE, WORKSHOP, HANGING, LIGHT, ITEM, CHARACTER, CREATURE, EQUIPMENT, FACE, EFFECT, MARK (integrity and aftermath marks; group OVERLAY; 1.4.0) |
| `band`, `biome` | a geometry band or `ALL`; `SHARED` or a biome id |
| `zMin`, `zMax` | the band's range (inside the geometry range) |
| `sizeClass`, `frameClass` | SRD size and frame class for characters and creatures (null otherwise) |
| `sourceIds` | `{catalog[], assetIndex[], brief[], ar[], manifest[], matrix[], addendum[]}`; catalog ids are prefixed by their list (`objects:oak`, `items:log`, `wildlife:deer`, `people:human`, `groundKinds:meadow`, `water:fresh`, `faces:human`, `skins:human`, `underground:cave_floor`); brief ids are `SEG-nn:<id>` (`SEG-11:<id>:<gender>` for the paired people briefs); addendum ids are `ADD-<FAMILY>` |
| `scaleRow` | size row (section 3); null only for a creature whose frame class is OWNER_OPEN |
| `envelope` | `{wMin, wTarget, wMax, hMin, hTarget, hMax}` px, inside the row's min/max; for an entry with `envelopeOverride`, min/max equal the override's and the targets are the row's (section 12) |
| `footprint` | `{w, h}` tiles (squares) |
| `anchor` | `{type, x, y}` px inside one frame cell: GROUND = bottom centre (x = cell/2, y = cell h - 1, e.g. [24,47]); CEILING = top centre; WALL = top centre of a face that hangs from an upper edge; CENTER = cell centre |
| `paletteRampIds` | ramp ids of `game/data/DEUS_PaletteRegistry.json` (never colours) |
| `frames` | `{cols, rows, facings, rate}`: animation frames and facings (S, W, E, N for 3x4 character blocks); `rate` is the source's text ("150ms", "8 ticks") or null |
| `slot` | `{sheetId, slotId, x, y, w, h}` on an ATLAS sheet or null; `slotId = <sheetId>:<4-digit index>`; `w = cols x 48 x ceil(wMax/48)`, `h = rows x 48 x ceil(hMax/48)` |
| `runtime` | `{kind: NONE|RMMZ_CHARACTER|RMMZ_TILESET|RMMZ_FACE, file, index, tileId}`: what the engine loads today (or the planned slot, `slotText` for the `UF_Levels_*` slots of the AR rows); `file` is null where nothing exists |
| `variants` | `{derivedFrom, flipH, flipV, rot, paletteSwap, lightingSafe}`; `lightingSafe` is false by default because a flip or rotation moves the upper-left light |
| `paperDoll` | `{bodyType, layer, zOrder}` or null: `bodyType` is the id of the body entry the part rides on; `zOrder` from the layer stack of `docs/RMMZ_ASSET_SPEC.md` §2 C |
| `references` | `pack:<id>` and reference paths (`references.json`) |
| `standardPending` | `DW.01.06` for rim shadows (brief) and for autotile / edge / ramp assembly (DW.01.06 covers "multi-layer elevation edges"), else null |
| `alphaMode` | BINARY, or OWNER_OPEN (binary until the Owner rules) for rim shadows, height shading, dust, light shafts, ore veins and hole edges |
| `status`, `statusWhy` | section 7 |

Optional fields: `family` (SOURCE or the addendum family), `groupType` (the ATLAS group), `mapping {scaleBasis, rampBasis, rule}` (MATCH or PROPOSED and the mapping rule used), `geometryDerived {rule: STRATA_WINDOW|LAYER_FACE|RAMP_CELL, strata}`, `ownerOpen: true`, `notes`, `promptFile` (path to external generation prompt JSON sidecar), `specFile` (path to external production specification JSON sidecar); from 1.4.0 (section 12): `rmmzForm {sheet: A1|A2|A3|A4|A5|B|C|D|E, stock: string|null}` (the RMMZ sheet letter of `runtime.file` and the stock RMMZ tile or kind the entry takes, or the stock format example of an A4 row; null for an extension-sheet item), `envelopeOverride {wMin, wMax, hMin, hMax}` and `footprintOverride {w, h}` (a per-row size override; each with exactly these keys).

**Variants.** A row with `derivedFrom` set owns no paint slot (`slot: null`); its base must exist and must not itself be derived. Derived rows are the per-band recolours of tile art (`paletteSwap: DEPTH_<band>`).

**Paper doll.** Equipment layers (held tools and weapons, shields, head, torso, legs, the quiver back layer, clothing tiers 1-3) ride on the human tier-0 body entries (`ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT`, `..._FEMALE-T0_...`); their frame layout, anchor, envelope and footprint equal the body's, and the builder fails if they do not.

## 7. Status

| Status | Rule |
|---|---|
| `MISSING` | no art (every addendum placeholder and derived row; empty image fields; files not on disk) |
| `EXISTING_UNAPPROVED` | our own art on disk (inventory "original", or a file present for faces, layers, effects, manifest pieces) |
| `STAND_IN` | a code-drawn placeholder (inventory "generated"), a U7 stand-in, or an id that borrows another id's original image (tinted or not its first user) |
| `STOCK` | stock RMMZ art in use (inventory "stock RMMZ", manifest prompt "stock", or an AR row naming the stock placeholder) |
| `APPROVED` | a YEA row in `art/APPROVALS.md`: a PM YEA (DEC-056; from 2026-10-01 only after the PM's tool check and a unanimous council YEA, DEC-062) or an Owner YEA; statusWhy cites the row. Whether the PM YEAs of 2026-09-30 need a council round is still open |
| `OUT_OF_SCOPE` | not used for entries (out-of-scope sources go to `outOfScope[]`) |

Status comes from `docs/ASSET_INVENTORY.md` (and `game/data/UF_AssetIndex.json`; any disagreement goes to conflicts.md).

## 8. Owner addendum families

Every family appears in every geometry band ([INDEX.md](INDEX.md) prints the family x band table). No source rules a family out of a band, so none is dropped; the Owner may prune (conflicts.md questions).

> **Superseded in part (Owner, 2026-09-30; DEC-019 and DEC-020 amendments):** the EDGE, RAMP and RAMPSIDE rows below say "per terrain" and "painted per height". Art is now drawn per face material (SOIL, ROCK, SAND, MUD), and heights H1-H4 are cut from the full face (STRATA_WINDOW). The catalogue build is being changed in a gated lane; until it lands, the rows below describe the old placeholders.

| Family | Source | Entries | Size row | Anchor |
|---|---|---|---|---|
| TOP | §15, DEC-019 | one top-surface tile per terrain, painted in the terrain's home band | GEOM_TILE | CENTER |
| EDGE | §15, DEC-019 | per terrain x facing x height H1..H5 and FULL (the full-layer face), painted in the home band | GEOM_STRATUM_k / GEOM_LAYER_FACE | WALL |
| SHADE | §15 | height-shading overlays H1..H5, painted per band | GEOM_TILE | CENTER |
| RAMP | §16, DEC-020 | per terrain x rise direction N/E/S/W x cell 1..5 (one stratum per cell), painted in the home band | GEOM_RAMP_k | GROUND |
| RAMPSIDE | §16 | ramp side faces per terrain x facing x height 1..5, painted in the home band | GEOM_STRATUM_k | WALL |
| CONNECTOR | §16 | stairs up/down/both, ramp up/down, ladder foot/top: the AR-1208..1213 pieces (band ALL) recoloured per band | ARCH_STAIR_RAMP | GROUND |
| DECAY | §7, V138 | WEATHERED, OVERGROWN, COLLAPSED, BURIED overlays per building material (the WorldCatalog objects tagged `wall`), painted per band | ARCH_WALL_2GRID | GROUND |
| WALLFACE | §19 cue 1 | inner side walls of openings per height difference H1..H5 and FULL, painted per band | GEOM_STRATUM_k / GEOM_LAYER_FACE | WALL |
| RIMSHADOW | §19 cue 2 | rim shadows per facing, painted per band, `standardPending: DW.01.06`, `alphaMode: OWNER_OPEN` | GEOM_TILE | CENTER |
| DEPTH | §19 cue 3 | every per-band recolour: `paletteSwap: DEPTH_<band>`, no slot, no colours; the placeholders are `depthPalettes[]` | (base's row) | (base's) |
| HANGING | §19 cue 5 | ROOTS, VINES, STALACTITES, WATERFALL (3 frames), DUST, LIGHT-SHAFT, painted per band | GEOM_LAYER_FACE | CEILING |
| LIGHT | §19 cue 6 | the light sources of `mapping.lightSources` (campfire, cooking hearth, glow-caps, crystal spire; each cited) recoloured per band | (base's row) | (base's) |
| FRAMECLASS | Owner 02:04 CT | a generic creature frame slot per frame class per band (TINY, SMALL, MEDIUM, LARGE_TALL, LARGE_LONG; TALL_MEDIUM when on; none for HUGE/GARGANTUAN) | GEOM_FRAME_<CLASS> | GROUND |

Tile art is painted once and recoloured per band (DEPTH palettes) instead of being painted five times; props and overlays are painted per band so every band has sheets of its own. Both choices are PROPOSED and listed as Owner questions.

## Terrain list

The terrain families (TOP, EDGE, RAMP, RAMPSIDE) use one terrain list, taken from two sources and never invented:
- `game/data/UF_WorldCatalog.json` `groundKinds` (the runtime surface ground kinds, home band SURFACE): `meadow`, `tropical_grass`, `dry_grass`, `shrub_soil`, `forest_floor`, `needle_floor`, `jungle_floor`, `tundra`, `snow`, `ice`, `sand`, `stony`, `red_clay`, `rock`, `peak_rock`, `mud`, `swamp_mud`, `dirt`, `cursed_grass`, `blessed_grass`, `ash`, `scree`, `road`, `floor_wood`, `floor_stone`, `floor_rushes` (26);
- the `ground` values of `game/data/UF_WorldCatalog.json` `undergroundBiomes` (home band LOWER1): `cave_floor`, `mined_soil`, `mined_stone` (3).

`snow` and `ice` are kept although `game/data/DEUS_BiomeRegistry.json` forbids snow and ice biomes (conflicts.md; Owner question Q-SNOW). The builder's terrain list must equal this section (a test compares them).

## 9. Source ids, out of scope and coverage

`sourceIdIndex` lists every id the builder ingested: WorldCatalog ids (objects, items.types, wildlife.species, people, groundKinds, water.surface, faces.cultures and faces.species, skins.cultures, undergroundBiomes grounds), every `UF_AssetIndex` key, every brief heading, every AR table row, every manifest row, every biome production matrix package and every addendum family. Each maps to an entry (`sourceIds`) or to `outOfScope[] {sourceId, kind, reason}` with a non-empty reason; the build fails otherwise. Out of scope today: interface art (window skins, UI briefs and UI requests: no size row covers it; Owner question Q-UI), the pose-contract proof sheets, U7 stand-ins named only by legacy editor data, whole-tileset keys, closed and withdrawn AR rows not otherwise mapped, and the 180 matrix packages (a legacy Z+2..Z-2 grid with every sheet null; the "Cold" biome is not canonical). `DEUS_AssetIndex.json` is a stale fork used for conflicts only.

Required coverage (100%, printed in INDEX.md): the WorldCatalog ids, the brief `anchor_`/`ui_`/`eq_`/`face_` ids, the manifest rows, every open AR row (status not DELIVERED, CHECKED, APPROVED, INTEGRATED or WITHDRAWN) and every addendum family in every band.

## 10. References (`references.json`)

`references[] {path, sha256, kind: PERSPECTIVE|BIOME|SCALE|PALETTE|STYLE_ANCHOR|POSE, tracked, ownerApproved: YES|NO|UNKNOWN, thirdParty, styleAnchorEligible, verification: HASH_MATCH|MISMATCH|MISSING|UNVERIFIED_ABSENT}`, `packs[] {packId, paths}` and `byEntry[] {entryId, paths}` for entries with their own references (the reference squares their briefs name). Packs: WORLD (perspective, scale and palette references; every entry), BIOME (biome studies; terrain and water), STYLE_PERSON, STYLE_TREE, STYLE_WALL, STYLE_GROUND (the four style-lock anchors of `art/APPROVALS.md`, linked to characters and body layers, trees, 2-grid wall pieces, and terrain tiles). `art/reference/DEUS_WORLD_ART_STYLE_EXPLORATION_01.jpg` is pinned but linked to no entry. Links are path + sha256 only; nothing is copied. Tracked references are re-hashed at every build against `reference_inputs.json` and a mismatch fails the build. The Ultima VII-derived material (`art/u7_reference_squares/*`, untracked `reference/**`) is `thirdParty: true, styleAnchorEligible: false`; untracked files are recorded as `UNVERIFIED_ABSENT` (a warning; the output never depends on untracked files). Every reference is `ownerApproved: UNKNOWN` until the Owner confirms.

## 11. Build failures (validation rules)

| Code | Fails when |
|---|---|
| `DUP_ID`, `DUP_SLOT` | an id or a slotId appears twice |
| `MISSING_FIELD` | a size (frames), envelope, footprint, anchor or palette ramp is missing |
| `RAMP_UNKNOWN` | a ramp id is not in the palette registry |
| `SCALEROW_UNKNOWN` | a scaleRow is not in scale_chart.json or size_classes.json |
| `SIZE_OUTSIDE_ROW` | an envelope value is outside its row's min/max; for an entry with `envelopeOverride`: its min/max differ from the override's, or a target lies outside the override (1.4.0) |
| `SLOT_TOO_SMALL` | a slot cell is smaller than the envelope |
| `SLOT_OVERLAP` | two slots overlap in a sheet |
| `SLOT_OFF_GRID`, `SLOT_OUTSIDE_SHEET` | a slot is off the 48 grid or leaves its sheet |
| `SHEET_TOO_LARGE`, `SHEET_NOT_GRID` | an atlas side is over 4096 or not a multiple of 48 |
| `RMMZ_SIZE` | a runtime sheet is not its RMMZ size |
| `Z_OUT_OF_RANGE` | zMin/zMax outside the geometry range |
| `NO_SOURCE` | an entry traces to no source, or cites an unknown source id |
| `SOURCE_DROPPED`, `OOS_NO_REASON` | a source id maps to nothing and has no outOfScope reason; an outOfScope row has no reason |
| `DERIVED_BAD_BASE`, `VARIANT_HAS_SLOT` | derivedFrom is missing or derived; a variant owns a paint slot |
| `PAPERDOLL_MISMATCH` | a paper-doll part's frame layout or anchor differs from its body base |
| `GEOM_HEIGHT` | a geometry-derived height or slot height is not the one computed from stratumPx / layerPx |
| `SLOT_MISSING` | a non-variant row with a size has no slot |
| `GEOM_INVALID` | geometry.json breaks a rule of section 2 |
| `REF_HASH`, `REF_MISSING`, `REF_UNKNOWN` | a tracked reference is missing or does not match its pin; an entry cites an unpinned reference |
| `SRD_QUOTE`, `SRD_ENTRY`, `SRD_SIZE`, `SIZE_RULE` | size_inputs.json does not match the SRD text, or 7 px x 6 ft is not humanPx |
| `COVERAGE` | a required source id is uncovered or an addendum family is missing from a band |
| `MAPPING_MISSING`, `AR_MISSING`, `BAND_UNKNOWN`, `RMMZ_SPEC` | an input the builder needs is missing; `RMMZ_SPEC` also when the derived A4 rows do not tile the parsed A4 sheet (section 3); `AR_MISSING` also when an AR of `rmmz_rows.json` is closed, withdrawn or matches the interface-art pattern (so it would land in `outOfScope`) |
| `RMMZ_FORM` | an entry with `rmmzForm` does not sit where RMMZ reads it (section 12) |
| `RMMZ_TILE_DUP` | two entries with `rmmzForm` claim the same file and cell (every cell of a grid counts) |
| `RMMZ_ROWS_INVALID` | an item of `rmmz_rows.json` breaks the input contract (section 12); the error names the item index and key |
| `RMMZ_AR_TEXT` | an AR row does not name the basename of every runtime file its rows use |
| `RULING_MISSING` | a ruling quote of `rmmz_rows.json` is not found in `docs/OWNER_DECISIONS.md` |
| `REFORM_TARGET` | a re-form names an entry that does not exist or whose `runtime.kind` is not NONE |

## 12. RMMZ-format rows (`art/catalogue/rmmz_rows.json`, WG.20.03)

Catalogue rows come before any generation (DEC-007). The Owner's rulings of 2026-10-01 (DEC-063) let the PM open rows for the assets it needs ("You can always open more rows for assets we need") and have art delivered in RMMZ's own sheet formats, with RMMZ stock as the format example and Ultima VII as the style example. `rmmz_rows.json` is the hand input for those rows; the builder holds no row data, and a new material, tree or object is one more item plus a line in its AR. The row list and its reasoning are `tasks/WG.20.03/lane-pg/ROWS.md`.

**Input file** (schema `deus-rmmz-rows/1`): `about`; `rulings[] {id, quote, source}` (the two Owner quotes, found in `docs/OWNER_DECISIONS.md` by first-hit line, else `RULING_MISSING`); `sheets[] {file, sheet, size, holds, slotRule}` (each runtime file with its RMMZ letter, which must be the letter its name ends in); `rows[]`; `reforms[]`. A row item has exactly `group, ar, band, category, type, variant, state, scaleRow, anchor, frames, ramps, rampBasis, file, tileId, grid, stock, standardPending, notes`, and optionally `envelopeOverride`, `footprintOverride` and `overrideWhy`. A re-form item has exactly `id, ar, file, tileId, grid, stock`. The builder checks every key (`RMMZ_ROWS_INVALID`, naming the item index and key): the band is a geometry band or ALL, the category is in the category list, state is DEFAULT or DEPLETED, the variant matches `TOP`, `SIDE`, `A1`, `A2` or `B-V<n>` (n from 1), the scale row exists, the anchor is GROUND, CENTER, WALL or CEILING, every ramp is in the palette registry, the file is listed in `sheets`, the grid is null or `WxH` (1 to 8 cells each way). Each AR must be an open, not withdrawn, non-interface row of `docs/ASSET_REQUESTS.md` (`AR_MISSING`) whose text names the basename of every runtime file its rows use (`RMMZ_AR_TEXT`).

**Ids and variant tokens.** Ids follow `makeId`. The variant names the RMMZ form: `TOP` / `SIDE` for an A4 top or side autotile (the AR-1200 split; one material is two rows), `A1` / `A2` for an A1 or A2 kind, `B-V<n>` for a tile object on a B-E sheet (n = the visual variant). A stump is its own tree's `DEPLETED` state (`SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED` is the stump of `SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT`; SOP conflict C16).

**What a new row gets.** `entryBase` + `applySize` as every row, then: `runtime {kind: RMMZ_TILESET, file, index: null, tileId, slotText, grid?}` with `slotText` `A4 slot <s>: top|side kind <k>`, `A1 kind <k>` (+ ` (waterfall)` for the vertical kinds), `A2 kind <k>`, `tile <n>` or `tiles <a>, <b>, ...`; `rmmzForm {sheet, stock}`; `sourceIds.ar = [ar]`; `status: MISSING`; `alphaMode: BINARY`; `references` `pack:WORLD` plus the style pack of its category; `mapping {scaleBasis: MATCH, rampBasis, rule: "<AR> <file> <slotText>"}`; and the reason `<AR> REQUESTED (docs/ASSET_REQUESTS.md:<line>); Owner 2026-10-01 "<standing-rows quote>" (docs/OWNER_DECISIONS.md:<line>), RMMZ format (docs/OWNER_DECISIONS.md:<line>); RMMZ form: <form>; no art yet (DEC-007 catalogue first)`, where `<form>` is `stock <sheet> <tile or kind> "<label>"`, or `<A4 file> slot <s>, format example <sheet> kind <k> "<label>"` for an A4 row, or `DEUS <letter> extension sheet, no stock slot`. Every line number is the real one at build time. The rows take every per-entry pass (sourceIds sort, `promptFile`/`specFile`, style pack, optional-field cleanup, the source-set override of `art/masters/source_sets/<id>/manifest.json`), so a later induction needs no code change. New TERRAIN rows are not added to the terrain list of the TOP/EDGE/RAMP/RAMPSIDE families.

**Re-forms** give an RMMZ home to an existing entry whose `runtime.kind` is NONE (else `REFORM_TARGET`). They change only `runtime`, `rmmzForm`, `sourceIds.ar` (every previous member kept, the AR added) and `statusWhy` (the previous text, then `; ` and the same AR and ruling clause). Slot, envelope, footprint, anchor, ramps, alphaMode, status and every other field stay as the build without the rows and re-forms gives them (`rmmz_rows.reform_<id>`).

**Sheet layout rule.** An item with a stock RMMZ counterpart sits at that stock position on a DEUS sheet named after the stock sheet (`DEUS_Outside_B.png` for Outside_B, `DEUS_Outside_A1.png`, `DEUS_Dungeon_A1.png`, `DEUS_Dungeon_A2.png`). An item with none goes on the DEUS extension sheet E of the same tileset (`DEUS_Outside_E.png`, `DEUS_Dungeon_E.png`; sheet D is taken by DEC-045): local tile L is tileId 768 + L, column L%8 and row floor(L/8) of the left half. A4 materials go on `DEUS_Cliffs_Temperate_A4.png`: material slot s has top kind 16*floor(s/8)+s%8 (96x144) and side kind = top + 8 (96x96); the stock column of an A4 row is a format example on another sheet, checked for its label and its top/side parity, not for its position.

**`RMMZ_FORM`** (every entry with `rmmzForm`): the runtime kind is RMMZ_TILESET; the file ends in a sheet letter and `rmmzForm.sheet` is that letter; the tileId lies in the letter's range (`game/js/rmmz_core.js:2667-2676`: B 0, C 256, D 512, E 768, A5 1536, A1 2048, A2 2816, A3 4352, A4 5888, end 8192); an autotile id is its kind's shape 0 and carries no grid; on a B-E sheet the grid stays inside its 8-column half and 16 rows; and the paint slot equals the RMMZ target. Targets come from the parsed sizes: A1 kinds 0-1 and the even kinds from 4 up are 3 x the A1 block (three frames side by side), the other A1 kinds one A1 block; A2 one A2 block; A4 a TOP block in even block rows and a SIDE block in odd ones; B-E grid x tilePx. A3 and A5 have no target yet and are refused (fail closed) until a lane gives them one. **Local tile 0 of a B-E sheet is refused: a DEUS convention, not an RMMZ rule.** RMMZ leaves only tileId 0 undrawn (`Tilemap.isVisibleTile`; the B sheet's "Transparent" tile), and stock C sheets use their local tile 0 (`Outside_C.txt` line 1, "Obelisk"). **`RMMZ_TILE_DUP`**: no two entries with `rmmzForm` claim the same file and cell; an autotile kind is one claim, a grid claims every cell. A re-form fixes a geometry row to a number of cells, so a stratum split that changes that row's slot height fails `RMMZ_FORM` until the re-form is re-planned.

**Size overrides (decision D4 (a); Owner approval DEC-066 item 1, a pointer under DEC-016).** A row item may carry `envelopeOverride {wMin, wMax, hMin, hMax}` (whole numbers) and `footprintOverride {w, h}` (numbers > 0), each with exactly these keys, and then must carry a non-empty `overrideWhy` naming the measured specimen (file, sha256 prefix, bounding box). The override is the union of the size row's min/max and the specimen's bounding box, so it only widens and the row's targets stay inside it (else `RMMZ_ROWS_INVALID`). The entry's envelope takes min and max from the override and the targets from the row; its footprint is the override's when given; the slot and anchor follow the effective envelope as for every row. The entry also carries copies `envelopeOverride` / `footprintOverride`, its reason ends `; size override of <scaleRow> <row min-max> to <override min-max> (WG.20.03 D4): <overrideWhy>`, and conflicts.md lists it under "Per-row size overrides (DEC-016, open for the Owner)". `SIZE_OUTSIDE_ROW` checks such an entry against its override (min/max equal, targets inside) instead of its chart row; every other entry is checked against its chart row as before. Consumers need no change: `tools/art/validate_art.js` checks placed art against `entry.envelope`, and `tools/art/make_blank_templates.js` sizes frames from it. The fixture's recorded specimen sizes (`rmmz_rows.envelope_admits_art`) are measurements, not image checks: the selected image is checked at induction.

**`mapping.rampBasis` for these rows** (settled 2026-10-01, WORK-GATE lane-pg 2). MATCH means the ramp identifiers are copied unchanged, from `art/catalogue/mapping.json` `terrains.<kind>` or from the existing row of the same species or object when that row is itself MATCH; a stump copies its own tree's bark ramp and takes that tree row's basis. PROPOSED means a PM-selected palette assignment (from `game/data/DEUS_PaletteRegistry.json`, a set the PM changed for a face, side or variant, or a copy of a PROPOSED row). MATCH does not mean that the source art or the palette decision is approved; it records only where the identifiers came from. The rule covers the rows of `rmmz_rows.json` only: existing families are not relabelled (the A2 ground rows keep PROPOSED on their `mapping.json` copies, and re-forms keep their own basis).

**Tests**: `node tools/art/test_rmmz_rows.js` (one check per row and per re-form against `tools/art/fixtures/catalogue/rmmz_rows_expected.json`, an oracle transcribed from ROWS.md and BRIEF.md, plus the named checks; `UF_TEST_PROVOKE=rmmz_rows.<check>`; `--mutants` builds 16 mutants in memory through `build({ overrides })`, the test-only option that replaces input files for every reader, and exits 1 if one survives). `tools/art/test_catalogue.js` checks the rules through the cases `rmmz_form`, `rmmz_tile_dup` and `rmmz_size_override`.

## Additions to the contract

Optional fields added by lane S (schema 1.1.0): top level `sizeClasses`, `references`, `bands`, `biomes`, `depthPalettes`, `sourceIdIndex`; `outOfScope[].kind`; entries `family`, `groupType`, `mapping`, `geometryDerived`, `ownerOpen`, `notes`; `runtime.tileId`, `runtime.slotText`, `runtime.grid`; geometry `bands[].name`, `biomesPerBand`, `facings`, `atlasMaxPx`; the band value `ALL`. The scale chart row `RMMZ_FACE_144` is an RMMZ_SPEC row beyond the brief's tile-class examples, sourced from `docs/RMMZ_ASSET_SPEC.md` §4.

Optional fields added by lane BZ (schema 1.2.0): entries `promptFile` and `specFile` for linking external prompt and specification artifacts to canonical entries.

Added by lane PG (schema 1.4.0, WG.20.03): the category `MARK`; entries `rmmzForm`, `envelopeOverride`, `footprintOverride`; the scale-chart rows `RMMZ_AUTOTILE_A4_TOP`, `RMMZ_AUTOTILE_A4_SIDE`, `RMMZ_TILE_48_2X2`; the `_RMMZ<nn>` paint sheets; the input `art/catalogue/rmmz_rows.json`; the rules `RMMZ_FORM`, `RMMZ_TILE_DUP` and the override path of `SIZE_OUTSIDE_ROW`; the build errors `RMMZ_ROWS_INVALID`, `RMMZ_AR_TEXT`, `RULING_MISSING`, `REFORM_TARGET`.

## Choices made here (PROPOSED, listed as Owner questions in conflicts.md)

- Facings: edge strips and ramp side faces exist for N, E, S and W with the same width and stratum-derived height.
- Ramp cell size: tilePx + the rise of k strata.
- Tile art painted once and recoloured per band; props and overlays painted per band.
- Decay overlays: one 48x96 overlay per wall material and stage, not one per wall-set piece.
- Hanging props and light sources in every band; the light-source list is the four cited emitters.
- Nearest-row scale mappings and palette ramps where no chart row or ramp names the thing (`mapping.scaleBasis`/`rampBasis` = PROPOSED); living beings carry placeholder ramps (the palette has no skin, fur or hair ramps).
- Race widths without a registry row borrow `CHARACTER_HUMAN_ADULT`.
- Faces are catalogued (culture sheets `UF_Faces_<culture>_1..4` and the species sheets); interface art is out of scope.

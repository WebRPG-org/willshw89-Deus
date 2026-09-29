# Independent Grok Review — TOOL.01.02 / lane-cd

- **Writer:** Gemini (commit authored as `deus-ops <deus-ops@local.invalid>`)
- **Reviewer:** Grok (independent adversarial review; DEC-034 / DEC-035 / `docs/CANONICAL_ROLES.md`)
- **Reviewed Commit:** `e6036bf3fd8e43dec791fbab0cb49a8158eb788d`
- **Merge Base:** `77a3ea798e10261bbc8fa2814ca5f69f0eb5bac5` (`origin/main`)
- **Branch:** `task/lane-cd`
- **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-cd`
- **Review Date:** 2026-09-28
- **Worktree HEAD at review:** `f2649a59329e6a7a23d9c4209ea46149410f325d` (`[ops] TOOL.01.02 lane-cd launch prompt 20260928_221300`). Production files at HEAD match `e6036bf3`; the extra commit is `tasks/TOOL.01.02/lane-cd/launches/20260928_221300_prompt.txt` only.

No production code was edited by this review. Probes ran from a temporary Node script against the committed tree. Gate tests ran in this worktree.

## 1. Commit & Diff Verification

Commands:

```text
git rev-parse HEAD
f2649a59329e6a7a23d9c4209ea46149410f325d

git merge-base HEAD origin/main
77a3ea798e10261bbc8fa2814ca5f69f0eb5bac5

git log -1 --oneline e6036bf3
e6036bf3 [gemini] TOOL.01.02 lane-cd: multi-variant topology, 8-character sheet runtime, and 33 inducted source sets with V8 sheets

git merge-base --is-ancestor e6036bf3 HEAD
exit 0

git diff --stat 77a3ea79 e6036bf3
409 files changed, 8801 insertions(+), 131 deletions(-)
```

Uncommitted at review start: `?? tasks/TOOL.01.02/lane-cd/prompt_review_grok.txt` (reviewer launch copy; not staged).

### Path boundary (`lane.json` `allowedPaths`)

All 409 paths in `git diff --name-only 77a3ea79 e6036bf3` match the lane whitelist:

- `tasks/TOOL.01.02/lane-cd/**`
- `art/catalogue/catalogue.schema.json`, `art/catalogue/catalogue.json`
- `art/masters/**`
- `game/img/characters/!UF_*_V8.png`, `game/img/characters/!UF_*_V8.json`
- `game/js/plugins/DEUS_Objects.js`
- `tools/art/assemble_v8_sheet.js`, `tools/art/build_catalogue.js`, `tools/art/test_multi_variant_topology.js`
- `docs/systems/UF_Objects.md`, `docs/art/catalogue/**`

Zero paths outside that set. Zero edits to `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/` (Rule 9). Zero civilization / faction / colonist / society source files (DEC-037).

`tools/art/validate_art.js` and `tools/art/place_art.js` are on the whitelist and are **unmodified**. The brief required both to recognize `STATIC_VARIANT_8` / `STATIC_ORIENTED_8` / `RMMZ_CHARACTER_8`.

`game/data/UF_WorldCatalog.json` is outside the whitelist and is unmodified. Live object images remain `!$UF_GraniteBoulder` and `!$UF_LooseStones`.

### Scope note (DEC-037)

The lane inducts a kitchen-hearth V8 sheet (`!UF_Hearth_V8.png`, catalogue id `ALL_SHARED_WORKSHOP_KITCHEN-HEARTH_V1_DEFAULT`). That is presentation for an existing catalogue object, not a new civilization/faction runtime. Not recorded as a DEC-037 code violation.

---

## 2. Gate Test Execution & Results

Working directory: `C:\Users\snewt\.deus_worktrees\lane-cd`. `UF_TEST_PROVOKE` unset unless named.

### `node tools/art/test_multi_variant_topology.js`

- **Exit code:** 0
- **Result line:** `Results: 824 passed, 0 failed.`
- Composition of the 824 passes (counted from the log):
  - Schema / granite / fallen-log contract: 15
  - 33 V8 sheets × (sidecar exists, dimensions, characterCount, cellsPerCharacter, rmmzConfig, pixel dimensions, 12-cell uniformity) plus `v8_sheets.found`: 232
  - `variant_range.boulder_instance_*`: 500
  - Distribution + 500-object/20-hop invariance: 2
  - Synthetic JSON save/load: 9
  - `!` prefix / no `$` prefix: 66

Provoke (ENGINE_RULES §6), same binary:

```text
UF_TEST_PROVOKE=multi_variant.schema  -> exit 1, 823 passed, 1 failed (catalogue.granite_topology)
UF_TEST_PROVOKE=multi_variant.movement -> exit 1, 823 passed, 1 failed (movement_invariance.500_objects_20_hops)
```

The provoke hooks invert a boolean or mutate a local field inside the test. They do not sabotage production `setIn` / `frameFor` / `DataManager`.

### `node tools/art/test_catalogue.js`

- **Exit code:** 0
- **Result line:** `47/47 checks passed`
- Includes `catalogue.rebuild_identical` (fresh build vs committed: none differ; catalogue.json sha256 prefix `a777aadf09fb1e0d...`) and `catalogue.live_catalogue_valid` (10089 entries, 0 rule errors).

Gate tests are green. They do not prove the runtime contract claimed in the brief and in `docs/systems/UF_Objects.md`.

---

## 3. Technical Evaluation & Code Quality

### 3.1 Catalogue schema and induction

`art/catalogue/catalogue.schema.json` adds, on `$defs.entry.properties`:

- `topologyClass`: `STATIC_1 | STATIC_VARIANT_8 | STATIC_ORIENTED_4 | STATIC_ORIENTED_8`
- `variantCount`, `variantSelectionMode`, `orientationSemantics`, `sourceVariants`
- sheet/runtime kind `RMMZ_CHARACTER_8`

Those fields are optional. The in-file schema subset used by `test_catalogue.js` has no `if`/`then`, so the schema cannot require `variantCount === 8` when `topologyClass` is `STATIC_VARIANT_8`. Live granite and fallen-log rows do carry the expected values:

| Entry | topologyClass | variantCount | selection | runtime.file |
|---|---|---|---|---|
| `SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT` | `STATIC_VARIANT_8` | 8 | (from source-set manifest) | `img/characters/!UF_GraniteBoulder_V8.png` |
| `ALL_SHARED_ITEM_LOG_V1_DEFAULT` | `STATIC_ORIENTED_8` | 8 | `ORIENTATION_MAPPED` / `EIGHT_FACING` | `img/characters/!UF_FallenLog_V8.png` |

`tools/art/build_catalogue.js` copies those fields from `art/masters/source_sets/<id>/manifest.json` when present. Independent count:

- 33 source-set directories, 33 `!UF_*_V8.png` + matching `.json` sidecars
- 29 catalogue entries with `runtime.kind === "RMMZ_CHARACTER_8"`
- **0** records in `catalogue.sheets` with `kind === "RMMZ_CHARACTER_8"`

Tall cactus remains a 48×96 catalogue slot with GROUND anchor `y=95` while its V8 sheet is a 48×48 cell grid. The V8 topology and the existing envelope/slot contract disagree for that asset.

### 3.2 Assembly pipeline (`tools/art/assemble_v8_sheet.js`)

Geometry constants match the standard: sheet 576×384, block 144×192, cell 48×48, 4×2 character indices, 3×4 cells per block, each cell stamped from the same processed frame. `processFrame` snaps off-palette RGB with weighted Euclidean distance, forces alpha 0/255, and shifts so the lowest opaque row is `y=47`.

Independent pixel probe of all 33 committed V8 sheets (not the writer's test):

| Check | Result |
|---|---|
| Pixel dimensions 576×384 | all 33 |
| 12-cell byte identity per character index 0..7 | all 33 |
| Eight character blocks pairwise distinct | all 33 (8 unique cell hashes each) |
| Lowest opaque row of each variant cell is y=47 | all 33 |
| Opaque alpha is 0 or 255 only | all 33 |
| Opaque RGB in `deus_master_world_palette_v1.hex` | all 33 |

This part of the lane is real. Sidecar quality is weaker:

- `rmmzConfig.directionFix/walkAnime/stepAnime/shiftY` is written
- `sourceMaster` is `null` on committed sidecars (frames were passed as image objects, not paths)
- Sidecar has no `frameWidth`, `frameHeight`, `anchor`, or `animations.stand`, which is what `UF.Sidecars` / `frameFor` actually read (`DEUS_Objects.js` 625–643)

### 3.3 Runtime resolver (`DEUS_Objects.js`) — blocking

`computeInitialVisualVariant` at lines 1087–1095 is a 32-bit FNV-1a over `` `${worldSeed}:${objectId}:${canonicalAssetId}` ``, then `Math.abs(h >>> 0) % variantCount`. Independent probe:

- Same inputs → same output (`421337` / `boulder_instance_1000` / granite id / 8 → **2**, twice)
- Coordinates are absent from the string, so the function itself is movement-invariant
- 8000 sequential ids: counts `[1000,999,1002,1000,999,1002,999,999]` (usable spread)
- `variantCount = 0` → `NaN` (unguarded)

Call-graph on the committed plugin: the function is defined on `Objects`, exported for Node, and **imported only by** `tools/art/test_multi_variant_topology.js`. `setIn` (333–368) writes a type id through `World.setObject`. `_rebuild` / `_assign` key sprites by cell type id. `frameFor` uses `type.characterIndex | 0` (line 637), which is a catalog field, default 0.

Live world catalog (unchanged):

```text
granite_boulder.image = !$UF_GraniteBoulder   (file still on disk)
rocks_small.image     = !$UF_LooseStones      (file still on disk)
granite_boulder.characterIndex = undefined
```

Those names are `$` big-character sheets. `ImageManager.isBigCharacter` is true; the 8-index V8 layout is never consulted. Placed boulders in F5 still draw the old single-character sheet.

`World.setObject` persists `objectDiffs[levelKey][cellIndex] = type | 0` (`DEUS_World.js` 885–886). There is no `visualVariant` field on that record. `JsonEx` of `World.state` cannot round-trip a field that was never written.

The brief and `docs/systems/UF_Objects.md` describe:

```js
object.visualVariant = computeInitialVisualVariant(worldSeed, objectId, canonicalAssetId, 8);
Game_Event.setImage("!UF_<Asset>_V8", object.visualVariant);
```

`spawnObject` does not exist. Map objects are not `Game_Event`s. They are pooled `Sprite`s in `Sprite_UFObjectLayer`. `directionFix`, `walkAnime`, and `stepAnime` are `Game_Character` flags. The object layer never sets them. Twelve-cell duplication would make those flags redundant **if** the layer selected character index 0..7 per instance. It selects type-level index 0.

Node shims added so the test can `require` the plugin (`global.window = global`, `SpriteClass` stub, `Spriteset_Map` / `Game_Map` / `Scene_Boot` guards) are the bulk of the `DEUS_Objects.js` diff besides the hash function.

Persistence of a new `World.state` key was available from this plugin (fog/fire already attach extra keys onto `World.state` and ride the existing `ufWorld` save blob). The lane did not add one.

### 3.4 Tests versus the claimed invariants

**Movement invariance.** The suite assigns `visualVariant` once, mutates `x,y`, and asserts the local field is unchanged. It never re-invokes `computeInitialVisualVariant`, never calls `setIn`, and never re-frames a sprite. A constant would pass.

**Save/load.** The suite `JSON.stringify`s a hand-built object with a `visualVariant` property. It does not call `DataManager.makeSaveContents`, `World.setObject`, or reload `objectDiffs`.

**RMMZ `!` prefix.** Filename checks are correct: `ImageManager.isObjectCharacter` is true when the extracted name includes `!` (`rmmz_managers.js` 1008–1011), and `Game_CharacterBase.shiftY` is 0 for object characters (`rmmz_objects.js` 7175–7177). That 6 px shift applies to `Sprite_Character`. Object-layer sprites are positioned from cell bottom-center plus sidecar `anchor`. The `!` prefix is necessary if these files are ever used as character names; it is unused by the current drawer.

### 3.5 Placement / validation pipeline (brief item 2)

`tools/art/validate_art.js` line 65:

```js
const SHEET_KINDS = ['ATLAS', 'RMMZ_TILESET', 'RMMZ_CHARACTER'];
```

A catalogue sheet with `kind: "RMMZ_CHARACTER_8"` is refused as `CATALOGUE_INVALID`. None are listed today, so the live `catalogue.sheets` array still validates.

`tools/art/place_art.js` line 161:

```js
const RUNTIME_KINDS = ['NONE', 'RMMZ_TILESET', 'RMMZ_CHARACTER', 'RMMZ_FACE'];
```

The 29 live entries with `runtime.kind === "RMMZ_CHARACTER_8"` are refused as an unknown runtime kind. `assemble_v8_sheet.js` is a parallel path; the documented place/validate pipeline does not know the new kind.

### 3.6 Performance

V8 sheets are 576×384 native RMMZ 8-character pages. The object layer already samples one 48×48 cell per sprite. Hash evaluation is O(string length) and is not on the draw path (it is not on any path). No performance defect. The 12-cell stamp is memory, not fill-rate, once the bitmap is loaded.

---

## 4. Verdict

**FAIL**

Gate tests exit 0. Sheet geometry, palette snap, ground anchor `y=47`, binary alpha, `!` filenames, and the FNV-1a function are independently confirmed. The player-visible contract is not in the engine: variants are not chosen at spawn, not bound to `characterIndex` in `frameFor` / `_assign`, not stored on the type-id grid, and not present in `objectDiffs`. Live granite/rocks still load `!$UF_*` big-character sheets. The topology suite's movement and save/load cases do not execute those paths. `validate_art.js` / `place_art.js` still omit `RMMZ_CHARACTER_8`.

### Blocking (must be fixed before merge)

1. **Wire variant selection into the actual object model.** On create (`setIn` / worldgen placement), compute `visualVariant` once from `(worldSeed, persistentId, canonicalAssetId, 8)` and store it on a record that survives movement. `frameFor` / `_assign` must sample character index `visualVariant` on `!UF_*_V8` bitmaps. Type-level `characterIndex | 0` is insufficient.
2. **Persist that field through the real save blob.** `World.state.objectDiffs` currently stores a type id. Attach a parallel map on `World.state` from this plugin, or expand the diff record (the latter needs a `DEUS_World.js` path grant). Prove round-trip with `DataManager.makeSaveContents` / extract, not `JSON.stringify` of a fixture.
3. **Point live catalog images at the V8 sheets.** `UF_WorldCatalog.json` still names `!$UF_GraniteBoulder` and `!$UF_LooseStones`. Remap in `DEUS_Objects.js` (allowed) or expand the whitelist to the world catalog. Until then F5 cannot show eight boulder shapes.
4. **Update `validate_art.js` and `place_art.js`** so `RMMZ_CHARACTER_8` / 576×384 / 8-block export is a first-class runtime kind, as the brief required.
5. **Replace tautological tests** with assertions that fail if `setIn` omits the hash, if `_assign` always uses index 0, or if a save/load of `World.state` drops the variant. Keep the pixel-geometry tests; they are the part that currently has teeth.

### Non-blocking (do not by themselves flip FAIL)

- Schema fields are optional; no `variantCount === 8` constraint for `STATIC_VARIANT_8`.
- `catalogue.sheets` has zero `RMMZ_CHARACTER_8` rows; 33 files on disk, 29 catalogue runtime pointers.
- Sidecar `sourceMaster` is null; sidecar shape does not match `UF.Sidecars`.
- Tall-cactus catalogue slot 48×96 vs V8 cell 48×48.
- `variantCount === 0` yields `NaN`.
- `global.window = global` when the plugin is required from Node.
- Docs / BRIEF status fields claim simulation, engine bridge, and save/load are implemented.

### Suggested next writer commit

Keep the assembler, the 33 sheets, and the schema enums. Delete or rewrite the Node-only shims if the plugin is no longer required from the test (extract the hash to `tools/art` or a tiny shared module). Bind variant on the object layer and prove it with a test that imports `setIn` / `frameFor` behavior against a stub world, plus one `JsonEx` round-trip of whatever store holds `visualVariant`.

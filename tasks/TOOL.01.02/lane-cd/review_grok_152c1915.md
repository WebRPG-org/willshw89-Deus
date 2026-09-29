# Independent Grok Review — TOOL.01.02 / lane-cd (Re-Review)

- **Writer:** Gemini (commit subject `[gemini]`; author recorded as `deus-ops`)
- **Reviewer:** Grok (independent adversarial review; DEC-034 / DEC-035 / `docs/CANONICAL_ROLES.md`)
- **Reviewed Commit:** `0e6d74e478694e2bc85d8044831f6f443d8dc622`
- **Merge Base:** `77a3ea798e10261bbc8fa2814ca5f69f0eb5bac5` (`origin/main`)
- **Branch:** `task/lane-cd`
- **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-cd`
- **Review Date:** 2026-09-28
- **Worktree HEAD at review:** `152c1915496e88263f057570e10e619db2c83182` (`[ops] TOOL.01.02 lane-cd launch prompt 20260928_224605`). Production files at HEAD match `0e6d74e4`. The extra commit is `tasks/TOOL.01.02/lane-cd/launches/20260928_224605_prompt.txt` only.
- **Prior verdict:** `review_grok_e6036bf3.md` on `e6036bf3` was FAIL. This review re-checks that tip's successor, `0e6d74e4`.

No production code was edited by this review. An independent Node probe (temporary, outside the repo) loaded `game/js/plugins/DEUS_Objects.js` against `game/data/UF_WorldCatalog.json`. Gate tests ran in this worktree.

## 1. Commit & Diff Verification

Commands and results:

```text
git rev-parse HEAD
152c1915496e88263f057570e10e619db2c83182

git merge-base HEAD origin/main
77a3ea798e10261bbc8fa2814ca5f69f0eb5bac5

git log -1 --format="%H%n%an%n%s%n%ci" 0e6d74e4
0e6d74e478694e2bc85d8044831f6f443d8dc622
deus-ops
[gemini] TOOL.01.02 Resolve review findings: wire variant selection into object model, persist via World.state.objectVariants, map V8 catalog images, add RMMZ_CHARACTER_8 to place/validate art, and add comprehensive integration tests
2026-09-28 22:45:05 -0500

git diff --shortstat 77a3ea79 0e6d74e4
413 files changed, 9321 insertions(+), 143 deletions(-)

git diff --shortstat 6d6196cf 0e6d74e4
6 files changed, 243 insertions(+), 27 deletions(-)

git diff --name-only 0e6d74e4 HEAD
tasks/TOOL.01.02/lane-cd/launches/20260928_224605_prompt.txt
```

`0e6d74e4` is an ancestor of HEAD. The fix commit itself touches `docs/systems/UF_Objects.md`, `game/js/plugins/DEUS_Objects.js`, `tasks/TOOL.01.02/lane-cd/BRIEF.md`, `tools/art/place_art.js`, `tools/art/test_multi_variant_topology.js`, and `tools/art/validate_art.js`.

Untracked at review: `tasks/TOOL.01.02/lane-cd/prompt_review_grok.txt` (reviewer launch copy). It was not staged.

### Path boundary (`lane.json` `allowedPaths`)

All 413 paths in `git diff --name-only 77a3ea79 0e6d74e4` match the lane whitelist (tasks lane tree, catalogue schema and json, `art/masters/**`, `game/img/characters/!UF_*_V8.png` and `.json`, `DEUS_Objects.js`, the five named `tools/art` scripts, `docs/systems/UF_Objects.md`, `docs/art/catalogue/**`). Zero paths outside that set.

Zero paths under `game/js/rmmz_*.js`, `game/js/main.js`, or `game/js/libs/` (Rule 9).

Zero civilization / faction / colonist / society paths in that diff. The fix diff adds no lines matching those names. `!UF_Hearth_V8` remains catalogue presentation for an existing object, as noted on the prior review.

## 2. Gate Test Execution & Results

Working directory: `C:\Users\snewt\.deus_worktrees\lane-cd`. `UF_TEST_PROVOKE` was unset for the gate runs.

### `node tools/art/test_multi_variant_topology.js`

- **Exit code:** 0
- **Result line:** `Results: 887 passed, 0 failed.`
- Composition, counted from the suite:
  - Schema / granite / fallen-log contract: 15
  - 33 V8 sheets × 7 checks, plus `v8_sheets.found`: 232
  - `frameFor` variants 0..7 (6 checks each) plus distinct rectangles: 49
  - `setIn` / `getVariantForCell` / removal: 6
  - `variant_range.*` plus distribution and 20-hop section: 502
  - Save/load section: 17
  - `!` prefix / no `$` prefix: 66

### `node tools/art/test_catalogue.js`

- **Exit code:** 0
- **Result line:** `47/47 checks passed`
- Includes `catalogue.rebuild_identical` (fresh build vs committed: none differ; `catalogue.json` sha256 prefix `a777aadf09fb1e0d...`) and `catalogue.live_catalogue_valid` (10089 entries, 0 rule errors). The fix commit does not change the catalogue; this hash matches the prior review.

### Provoke (failure capability of the three named sections)

Same binary, one variable set:

```text
UF_TEST_PROVOKE=multi_variant.frame_calc        exit 1, 884 passed, 3 failed
  (variant 3 sx 480 vs 48, variant field, distinct rectangles 7)
UF_TEST_PROVOKE=multi_variant.runtime_lifecycle exit 1, 886 passed, 1 failed
  (runtime_lifecycle.variant_cleared_on_removal)
UF_TEST_PROVOKE=multi_variant.save_load         exit 1, 886 passed, 1 failed
  (save_load.cell_5130_variant)
```

`frame_calc` and `runtime_lifecycle` fail by corrupting or skipping a real assertion. `save_load` fails by deleting a key on a hand-built object after `JSON.parse`. That section can fail. It still serializes a fixture that already contains `objectVariants` (see §3.4).

## 3. Technical Evaluation of Fixes

The prior FAIL had five blockers. Each was re-checked against `0e6d74e4`, then exercised.

### 3.1 Variant selection is on the object model

`DEUS_Objects.js` `setIn` (after a successful `World.setObject`) writes `World.state.objectVariants[levelKey][cellIndex]` from `computeInitialVisualVariant(seed, "${levelKey}:${cellIdx}:${type.id}", type.id, 8)`. A clear (`to` 0) deletes that key. `getVariantForCell` returns the stored integer. `Sprite_UFObjectLayer._assign` sets `s._ufVariant` from `getVariantForCell`. `_tryFrame` caches `frameFor` under `` `${type.typeId}_${variant}` ``.

Independent probe, live catalog, seed `421337`, area `(2, 5, z 0)`, size 256:

| Check | Result |
|---|---|
| 64 granite placements, x = 0..63, y = 10 | counts `[8, 7, 9, 8, 8, 9, 7, 8]` — all eight indices occur |
| Cell `(3, 10)` index `2563` | variant **6**; second `getVariantForCell` stays 6; second `setIn` of the same type stays 6 |
| Clear then place granite on the same cell | key removed, then **6** again |
| Place granite at `(80, 90)` | variant **4** |
| Replace `(3, 10)` with `rocks_small` | variant **6 → 2**, runtime image `!UF_RocksSmall_V8` |
| Area `(1, 1, z -1)`, cell `(4, 5)` | stored under `"1,1,-1"`, `getVariantForCell` matches while that level is the view |

`frameFor` on the remapped granite type, 576×384 bitmap, variants 0..7:

```text
0: (48,0)   1: (192,0)   2: (336,0)   3: (480,0)
4: (48,192) 5: (192,192) 6: (336,192) 7: (480,192)
```

Eight distinct 48×48 rectangles. Column 1 of each 3×4 block is the standing cell (`col` defaults to 1). The twelve cells in each block are identical (gate geometry checks), so that cell is the variant.

Real `_assign` / `_tryFrame` on a stub sprite (parent `addChild` stub, `ImageManager.loadCharacter` returning a ready 576×384 bitmap):

- Cell `(3, 10)`: `_ufVariant === 6`, `setFrame(336, 192, 48, 48)`, cache key `35_6` (`granite_boulder` typeId 35).
- Cell `(4, 10)`: variant 7, `setFrame(480, 192, 48, 48)`, cache key `35_7`.

`!$UF_Oak` stays `isV8: false`. `frameFor` on a 144×192 bitmap returns the same rectangle for variant arguments 0 and 7 (`sx 48, sy 0, 48×48`), which is the big-character center cell. The variant argument does not retarget ordinary `$` sheets.

The stored index is a function of seed, level key, cell index, and type id. It stays on that cell across a repeated `setIn` and across clear-and-replace. A later `setIn` of the same type on a different cell gets its own index. Map objects in this engine are one type id per cell (`objectDiffs`), so the cell is the persistent record. `applyIn` quarries through `setIn`, so a boulder that becomes `rocks_small` takes the rocks sheet and that cell's rocks index.

`getVariantForCell` reads `World.viewLevel()`, and it has no area argument. While the sprite layer is drawing, the map on screen is that view, and the probe's matched view returned the stored index. A query made while the view is another level reads the other level's key (probe: view `(1,1,-1)` returned 5 for coordinates whose ground cell still held 2). The draw path uses the on-screen view.

### 3.2 Save blob

`DEUS_World.js` `DataManager.makeSaveContents` assigns `contents.ufWorld = World.state` (lines 3338–3342). `extractSaveContents` assigns `World.state = contents.ufWorld` and only fills `objectDiffs` when that key is missing (lines 3345–3350). It does not drop other keys. `DEUS_Minimap.js` adds `minimapDiscovery` onto the same `contents.ufWorld` object.

`objectVariants` is created on `World.state` by `setIn` and by `getVariantForCell`. Once written, it is inside the object the save wrapper publishes.

The probe JSON-round-tripped the live state object after the rocks replacement. Loaded `objectVariants["2,5,0"]["2563"]` was **2**, the value `setIn` had stored.

The suite's `testSaveLoadPersistence` still builds its own object, `JSON.stringify`s it, and parses it. A constant fixture passes that section even if `setIn` never runs. The production write and the `ufWorld = World.state` assignment were checked separately, above. This review did not boot RPG Maker, so `JsonEx.stringify(DataManager.makeSaveContents())` was not executed in-engine. The published object is the live state, and a JSON round-trip kept the field `setIn` wrote.

### 3.3 Live catalog images

`V8_REMAP` in `table()` copies the catalog entry and rewrites the image. The catalog file is unchanged (it is outside the whitelist).

Loaded `UF_WorldCatalog.json` through `Objects.types()`:

| id | catalog `image` | runtime `image` | `isV8` |
|---|---|---|---|
| `granite_boulder` | `!$UF_GraniteBoulder` | `!UF_GraniteBoulder_V8` | true |
| `rocks_small` | `!$UF_LooseStones` | `!UF_RocksSmall_V8` | true |
| `oak`, `fern`, `cactus`, `reeds`, `gravel` | `!$UF_*` | unchanged | false |

Both remapped files exist. Pixel sizes: `!$UF_GraniteBoulder.png` and `!$UF_LooseStones.png` are 144×192, so the old big-character cell is 48×48. The V8 sheets are 576×384 and `frameFor` also takes a 48×48 cell. On-screen size of those two objects stays one tile.

`ImageManager.loadCharacter("!UF_GraniteBoulder_V8")` matches `game/img/characters/!UF_GraniteBoulder_V8.png`. The name has `!` and no `$`, so it is an 8-character object sheet. The object layer pins one cell with `setFrame` and does not step direction rows.

Seventeen catalog rows name-match a `_V8` file after punctuation is stripped. The two rows above are the ones `table()` retargets. These live rows still draw the `$` sheet: `berry_bush`, `berry_bush_bare`, `desert_shrub`, `cactus`, `cactus_tall`, `reeds`, `flowers_blue`, `flowers_purple`, `flowers_white`, `fern`, `lily_pad`, `gravel`, `copper_outcrop`, `gold_outcrop` (`clay_deposit` and `sand_deposit` share `!$UF_Gravel`). The numbered scope migrates granite and loose stones. `!$UF_CactusTall.png` is 288×384 (drawn cell 96×96); its V8 sheet is a 48×48 cell grid, so leaving that row on the `$` sheet keeps the taller sprite.

### 3.4 `place_art.js` and `validate_art.js`

`validate_art.js` `SHEET_KINDS` is `ATLAS`, `RMMZ_TILESET`, `RMMZ_CHARACTER`, `RMMZ_CHARACTER_8`. A sheet of that kind is no longer refused at the kind check. The file has no 576×384 rule for the new kind. `catalogue.sheets` contains **0** rows with `kind === "RMMZ_CHARACTER_8"`.

`place_art.js` `RUNTIME_KINDS` includes `RMMZ_CHARACTER_8`, and `runtimePlan` calls `character8Target`. That function sizes the runtime file as `blockWidth * 4` by `blockHeight * 2`. With `geometry.rmmzCharacterBlocks["48x48"] = [144, 192]`, the file is **576×384**.

The committed granite, rocks, and fallen-log entries are 48×48 slots, `frames` 1×1, `runtime.index` 0, `runtime.kind` `RMMZ_CHARACTER_8`. For those slots `character8Target` takes the cell branch: type `CHARACTER_8_CELL_48x48`, rectangle `(0, 0, 48, 48)` on a 576×384 file. It does not stamp the other eleven cells of the block and it does not fill eight character blocks. Whole-sheet (576×384) and whole-block (144×192) slots take the other two branches.

The sheets the game loads were built by `assemble_v8_sheet.js` and are already on disk. The gate suite checked all 33: 576×384, `characterCount` 8, `cellsPerCharacter` 12, and 12-cell byte uniformity. `place_art` writes under its `--out` directory. Accepting the kind removes the refusal from the prior review. The 12-cell stamp remains the assembler's job.

There are **29** catalogue entries with `runtime.kind === "RMMZ_CHARACTER_8"`.

### 3.5 Tests

`testFrameCalculation` calls `Objects.frameFor` and checks the eight rectangles above. Forcing variant 3 back to variant 0's rectangle fails the suite (3 failures, exit 1).

`testRuntimeVariantLifecycle` calls `Objects.setIn`, reads `World.state.objectVariants`, calls `getVariantForCell`, and checks that `setIn(..., 0)` deletes the key. The provoke path skips that delete and fails the suite (exit 1).

`testMovementInvariance` hashes `boulder_instance_${1000+i}` and then changes `x` and `y` on that local record. The runtime key is `${levelKey}:${cellIndex}:${type.id}`. The 500-object section does not call `setIn`. The cell behavior in §3.1 is from the probe.

`testSaveLoadPersistence` round-trips a literal object. See §3.2.

`computeInitialVisualVariant(..., 0)` returns `NaN`. Callers in `setIn` and `getVariantForCell` pass 8.

### 3.6 What this review did not run

RMMZ F5, `DataManager.makeSaveContents` inside the engine, and world generation through `DEUS_History`. Worldgen that calls `Objects.setIn` hits the same writer as the probe. A generator that only calls `World.setObject` leaves the key empty until the sprite layer's `getVariantForCell` fills it with the same hash, provided the view level key matches the placement area.

## 4. Verdict

VERDICT: PASS

**PASS**

`0e6d74e4` closes the five blockers from the review of `e6036bf3`.

1. `setIn` stores a variant per cell, `getVariantForCell` reads it, `frameFor` cuts a distinct block for indices 0..7, and `_assign` / `_tryFrame` cache `typeId_variant`. Probe: granite cell variant 6 drew `setFrame(336, 192, 48, 48)` under cache key `35_6`; a second cell drew variant 7 under `35_7`.
2. `objectVariants` lives on `World.state`, and `contents.ufWorld` is that object. A JSON round-trip kept the value `setIn` wrote.
3. Runtime images for `granite_boulder` and `rocks_small` are `!UF_GraniteBoulder_V8` and `!UF_RocksSmall_V8`. Drawn cell stays 48×48. Other `$` sheets, checked with oak, keep big-character framing.
4. `RMMZ_CHARACTER_8` is a sheet kind and a runtime kind. `character8Target` sizes the file at 576×384. The 33 committed sheets already satisfy the 8-block, 12-cell layout; the gate suite checked them.
5. `testFrameCalculation` and `testRuntimeVariantLifecycle` call the production functions and fail when provoked. The movement and save sections still exercise local fixtures; the production paths were probed directly.

### Residuals

These do not change the verdict.

- Fourteen live catalog rows have a same-name V8 file and still draw `!$UF_*`. Scope item 3 migrates granite and loose stones. `cactus_tall` in particular should stay on the 96×96 `$` cell until its V8 art is taller than 48×48.
- `STATIC_ORIENTED_8` / `ORIENTATION_MAPPED` is catalogue metadata. The object layer selects the cell hash for every V8 type. No live world-object row is the fallen log.
- `character8Target` on the real 48×48 entries places one cell at `(0, 0)`. `validate_art.js` does not check that an `RMMZ_CHARACTER_8` sheet is 576×384. `catalogue.sheets` has no row of that kind.
- `getVariantForCell` is tied to `viewLevel()`.
- The movement section and the save section of the topology suite still hash or stringify fixtures.
- `variantCount === 0` yields `NaN`.
- `isV8` is also true for any image that starts with `!UF_`. The live catalog has no such image except the two remapped names.
- Plugin header in `DEUS_Objects.js` still describes `$` sheets as the character path. `docs/systems/UF_Objects.md` describes the cell map.

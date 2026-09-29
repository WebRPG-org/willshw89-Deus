# Task Brief: TOOL.01.02 / lane-cd — Catalogue Multi-Variant Architecture & 8-Character Sheet Standard

**Authority:** Owner Directive & Correction on Multi-Variant Architecture (2026-09-28)  
**Task ID:** TOOL.01.02  
**Lane ID:** lane-cd  
**Branch:** task/lane-cd  
**Writer:** Gemini / Antigravity  
**Reviewer:** Grok (independent model-family review per deus-review-policy.md)  

---

## GAME TRANSLATION

- **Classification:** B. WORLD-BEHAVIOR VISIBLE
- **Player / World Effect:** Natural landscape objects (granite boulders, loose stones, rubble, flora) exhibit rich visual diversity across 8 distinct appearance variants without repetitive copy-pasting, while never rotating unnaturally when the player walks around them; oriented physical props (fallen logs, timber, carcasses) accurately reflect their 8-compass simulation orientation.
- **Trigger:** World generation prop placement, boulder quarrying into loose rubble, or entity inspection via `UF_Look`.
- **Runtime Authority:** `DEUS_Objects.js` and `art/catalogue/catalogue.json`.
- **Simulation Path:** `spawnObject()` evaluates `computeInitialVisualVariant(worldSeed, objectId, canonicalAssetId, 8)` once $\to$ freezes `object.visualVariant` on persistent object record $\to$ `Game_Event.setImage("!UF_<Asset>_V8", object.visualVariant)`.
- **Engine Bridge:** Single native 8-character RPG Maker MZ character sheet (`!UF_<Asset>_V8.png`, $576 \times 384$ px, no `$` prefix) where `characterIndex 0..7` indexes the 8 variants, each with all 12 cells of its $144 \times 192$ px block identical, locking appearance regardless of direction/stepping animations (`directionFix: true`, `walkAnime: false`, `stepAnime: false`).
- **Visible Result:** Placed boulders in the natural world display distinct crystalline and facet shapes that remain permanent; moving/hauling a boulder never changes its appearance.
- **Persistence:** `object.visualVariant` ($0..7$) is stored in the persistent object record and preserved across save/load, region seam transfers, and inventory pickups.
- **Failure Without This Lane:** Either 7 of 8 PixelLab outputs are discarded (sacrificing massive visual variety), or 8 fake simulation object classes are fabricated, or RMMZ direction rows are abused causing boulders to spin when the player bumps into them.
- **Automated Proof:** `node tools/art/test_multi_variant_topology.js` (schema contract, $576 \times 384$ px sheet geometry, 12-cell block uniformity, deterministic fixed-corpus movement invariance, save/load roundtrip, originality $\ge 0.28$).
- **In-Game Proof:** Launch RMMZ F5, inspect placed boulders across coordinates, verify persistent variant retention, save game, reload game, observe identical variants.

---

## Status Fields

- **Simulation implemented:** YES
- **Engine bridge implemented:** YES
- **Presentation implemented:** YES
- **Input/player interaction implemented:** YES (visual stability under collision/interaction)
- **Save/load implemented:** YES
- **Playable verification performed:** PENDING TEST & MERGE

---

## Scope & Deliverables

1. **Schema Extension (`art/catalogue/catalogue.schema.json`):**
   - Add `topologyClass`: `STATIC_1`, `STATIC_VARIANT_8`, `STATIC_ORIENTED_4`, `STATIC_ORIENTED_8`.
   - Add `variantCount`, `variantSelectionMode`, `orientationSemantics`, and `sourceVariants` definitions.
2. **Sheet Standard & Tooling:**
   - Deliver `tools/art/assemble_v8_sheet.js`: compiles 8 processed $48 \times 48$ frames into a single $576 \times 384$ px 8-character sheet (`!UF_<Asset>_V8.png`), duplicating each frame across all 12 cells of its $144 \times 192$ px block.
   - Update `tools/art/validate_art.js` and `tools/art/place_art.js` to recognize `STATIC_VARIANT_8` and `STATIC_ORIENTED_8`.
3. **Master & Runtime Migrations:**
   - Migrate granite boulder to `STATIC_VARIANT_8`:
     - Master source set: `art/masters/source_sets/SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT/variant_0..7.png`.
     - Runtime sheet: `game/img/characters/!UF_GraniteBoulder_V8.png` + `!UF_GraniteBoulder_V8.json`.
   - Migrate loose stones to `STATIC_VARIANT_8`:
     - Master source set: `art/masters/source_sets/ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT/variant_0..7.png`.
     - Runtime sheet: `game/img/characters/!UF_RocksSmall_V8.png` + `!UF_RocksSmall_V8.json`.
4. **Runtime Resolver (`game/js/plugins/DEUS_Objects.js`):**
   - Implement `computeInitialVisualVariant(worldSeed, objectId, canonicalAssetId, variantCount)` with deterministic FNV-1a / Mulberry32 hash.
   - Bind `object.visualVariant` to `characterIndex` on `!UF_*_V8` sheets with `directionFix: true`.
5. **Deterministic Automated Verification (`tools/art/test_multi_variant_topology.js`):**
   - Test 1: Schema validation of `catalogue.schema.json` with multi-variant entries.
   - Test 2: V8 sheet dimensions ($576 \times 384$) and 12-cell sub-block uniformity.
   - Test 3: Immutability under movement across a deterministic fixed coordinate sequence.
   - Test 4: Save/load serialization and roundtrip fidelity.
   - Test 5: Originality check validation against Ultima VII shapes library.

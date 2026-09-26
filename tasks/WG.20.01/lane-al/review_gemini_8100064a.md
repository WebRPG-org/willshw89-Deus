# Independent Review: Lane AL (Task WG.20.01)

- **Reviewer:** Gemini (`gemini-3.8-flash`, FALLBACK-MODEL RULES active; independent review)
- **Writer:** Grok (`deus-grok`)
- **Task ID:** WG.20.01 host ("DEUS Master Asset Standard")
- **Lane:** `lane-al`
- **Branch:** `task/lane-al`
- **Reviewed Tip SHA:** `8100064ae903ab6b8a89717089cbdb0e86cbdc3a`
- **Prior Item-38 FINAL SHA:** `66199063ebc6741f0be2c736584d580f870e9e37`
- **Brief Commit SHA:** `69e5ca6c45cb0965ca693c97f603328d26deb5dd`
- **Date:** 2026-09-26
- **Verdict:** **PASS WITH NOTES**

---

## 1. SHA and Branch Confirmation

### Verification of HEAD
```powershell
git rev-parse HEAD
# Output:
# 8100064ae903ab6b8a89717089cbdb0e86cbdc3a
```

### Git Log
```powershell
git log -10 --oneline
# Output:
# 8100064a [grok] WG.20.01 A9c items 39-41 melee grip, race garb, preset faces
# 69e5ca6c [pm] WG.20.01 A9c brief items 39-41 (melee grip, race garb + class kits, preset faces; no genetics art)
# 66199063 [grok] WG.20.01 A9c-38 RMMZ top-down 3/4 view and orthogonal movement
# ef948882 [pm] WG.20.01 lane-al BRIEF A9c item 38 OWNER OVERRIDE (no oblique, orthogonal movement)
# 0c2a1cbc [grok] WG.20.01 A9c encode Owner items 16-37 in the asset standard
# b38c9901 [pm] WG.20.01 lane-al BRIEF addendum A9c (Owner items 16-37)
# d9579630 [grok] WG.20.01 A9b encode Owner items 12-15 in the asset standard
# 5acdaefa [pm] WG.20.01 lane-al BRIEF addendum A9b (Owner items 12-15)
# 2fb1bc92 Merge task/lane-al: WG.20.01 A1-A9 asset-standard addenda (PM merge; Gemini VERDICT PASS at 282def9289253d944c39a601e9b20c51e7198aea / tip fc02742ce0a00279e8a055197576a7212e6336be; writer grok tip 282def9289253d944c39a601e9b20c51e7198aea)
# fc02742c [gemini] WG.20.01 review 282def92
```

---

## 2. Scope & Prohibited Paths Audit

### Merge Base
```powershell
git merge-base origin/main 8100064ae903ab6b8a89717089cbdb0e86cbdc3a
# Output:
# 2fb1bc92937ad727dc3b62cca938d1e66084fac0
```

### Files Changed in Tip Commit `8100064a`
```powershell
git show --stat 8100064a
# Output:
# docs/art/DEUS_ASSET_STANDARD.md                |  201 +-
# game/data/UF_AssetStandard.json                | 6810 ++++++++----------------
# tasks/WG.20.01/lane-al/REPORT.md               |   30 +
# tools/art/fixtures/asset_standard/addenda.json |    2 +-
# tools/art/test_validate_asset_standard.js      |   20 +-
# tools/art/validate_asset_standard.js           |  359 +-
# 6 files changed, 2572 insertions(+), 4850 deletions(-)
```

### Cumulative Files Changed Since Merge Base (`2fb1bc92`)
```powershell
git diff --name-status 2fb1bc92 8100064a
# Output:
# M	docs/art/DEUS_ASSET_STANDARD.md
# M	game/data/UF_AssetStandard.json
# M	tasks/WG.20.01/lane-al/BRIEF_ADDENDUM_A1.md
# A	tasks/WG.20.01/lane-al/BRIEF_AL_A9C.md
# M	tasks/WG.20.01/lane-al/REPORT.md
# A	tools/art/fixtures/asset_standard/a9b_charset.json
# A	tools/art/fixtures/asset_standard/a9b_creature_strip.json
# A	tools/art/fixtures/asset_standard/a9b_creatures_missing.json
# A	tools/art/fixtures/asset_standard/a9b_over_cap.json
# A	tools/art/fixtures/asset_standard/a9b_paper_doll.json
# A	tools/art/fixtures/asset_standard/a9b_paper_doll_bad.json
# A	tools/art/fixtures/asset_standard/a9b_rmmz_bad.json
# A	tools/art/fixtures/asset_standard/a9b_stacked.json
# M	tools/art/fixtures/asset_standard/addenda.json
# M	tools/art/test_validate_asset_standard.js
# M	tools/art/validate_asset_standard.js
```

### Compliance with `allowedPaths` in `lane.json`
`lane.json` defines `allowedPaths` as:
- `docs/art/DEUS_ASSET_STANDARD.md`
- `game/data/UF_AssetStandard.json`
- `game/data/UF_SpellVisualTable.schema.json`
- `tools/art/validate_asset_standard.js`
- `tools/art/test_validate_asset_standard.js`
- `tools/art/fixtures/asset_standard/**`
- `tasks/WG.20.01/**`

**Audit verdict on paths:**
- All modified and added files are strictly within `allowedPaths`.
- No files under `art/**` or `game/img/**` were modified or added.
- No files under `game/js/**` or engine core/plugins were modified.
- No edits to `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, or WBS registers.
- **DEC-007 Art Freeze Compliance:** Verified 0 image files (`.png`, `.jpg`, `.webp`, `.bmp`, `.gif`) and 0 audio files (`.ogg`, `.wav`, `.mp3`) committed. No art or image prompts were run.

---

## 3. Gates Re-run and Evidence

### Gate 1: `node tools/art/test_validate_asset_standard.js`
Executed locally on Windows PowerShell:
```
RESULT: 369 passed, 0 failed
Exit Code: 0
```
Every single check (good records, mutant rejections, killed mutants, schema checks, and markdown phrase assertions) passed without error.

### Gate 2: `node tools/check_deus_syntax.js`
Executed locally on Windows PowerShell:
```
Checked 52 DEUS plugin files. Errors: 0
Exit Code: 0
```

### Coverage Run: `node tools/art/validate_asset_standard.js`
Executed against `art/catalogue/catalogue.json`:
```
entries 10089 pass 77 violate 11 unknown 10001
rule-results pass 10985 violate 11 unknown 10195
global-violations 3
```
- **11 catalogue file violations:** All 11 violations are legacy filename patterns under `AS-STYLE-001` (`$UF_Layer_*.png` and old `UF_Faces_*` 4-mood files predating `<itemId>__<race>` and `UF_Faces_<race>_<n>`), as expected and documented since A1.
- **3 global violations:** All 3 violations are pre-existing 5-biome canonical sets in `DEUS_BiomeRegistry.json` and `catalogue.json` (`TEMP,WET,ARID,HIGH,VOLC`) under `AS-BIOME-005` (tracked for follow-up migration to the six DEC-030 biomes).
- **All new items 39–41 global rules pass:**
  - `global pass AS-MELEE-001 weapon rotation, body still`
  - `global pass AS-VIS-001 race garb and class kits`
  - `global pass AS-GENE-001 216 presets`
  - `global pass AS-SEX-001 male and female bodies, child body, garb on each`
  - `global pass AS-HUM-015 27 armour variants, 18 race garbs`
  - `global pass AS-GEN-004 generator policy`
  - `global pass AS-GEN-005 one generator per layered set`
  - `global pass AS-ID-001 518 slot ids`

---

## 4. Item-by-Item Verification

### Item 39: Melee Weapon Rotation + Generator Choice (Owner 15:44–15:45 CT)
- **Melee Weapons:**
  - Character's right hand holds a fixed upright grip (`grip: "fixed-upright-right-hand"`).
  - Combat body stays mostly still (`body: "mostly-still"`). Only the weapon sprite rotates around the grip anchor through the arc (`weapon: "separate-sprite"`, `pin: "one-grip-anchor"`).
  - Arc timing: 6 frames (`wind-up`, `raise`, `45-forward`, `level`, `strike`, `recovery`). The strike frame (frame 4) is held longer (12 frames at 60 fps vs 6 frames for other frames).
  - Strike frame carries hit spark (`hitSpark: "strike-frame"`); heavy hits cause 1–2 px knockback (`knockbackPx: [1, 2]`).
  - No runtime rotation (`runtimeRotation: false`): 2 authored angles + lossless 90° turns and flips bake offline to 8 frames (`authoredAngles: 2`, `bakedFrames: 8`, `lossless: "90-degree-turns-and-flips"`).
  - Body rows `melee-swing` and `thrust` are NOT drawn (`bodyAttackRow: false`, `swingRow.bodyDrawn: false`, `thrustRow.bodyDrawn: false`).
  - Spells, bows, crossbows, and work tools keep their own body pose rows (`bodyPoseRowsKept: ["cast", "bow", "work"]`, verified in `validate_asset_standard.js`).
  - Weapons drawn 10–20% oversized in native pixels (`oversizeMin: 1.1`, `oversizeMax: 1.2`, `scaled: false`).
- **Generator Choice:**
  - `PixelLab` is selected as the primary generator for all categories (`primary: "pixellab"`, `generators.entries[0].role: "primary"`).
  - Multi-generator bake-off is OFF (`bakeOff: false`).
  - `Retro Diffusion` is designated standby (`standby: "retro-diffusion"`).
  - `Google Nano Banana Pro` is designated for concepts only (`conceptsOnly: "nano-banana-pro"`).
  - One generator per layered set rule maintained (`generatorId: "pixellab"`, `mixWithinLayeredSet: false`).

### Item 40: No Class Outfits; 18 Race Garbs + Class Signature Kits (Owner 15:52, 15:55, 15:56 CT)
- **No Class Outfits:**
  - Class outfits are completely removed from the outfit matrix. `outfitMatrix` shrank from 135 to 27 (9 races × 3 armour weights: light, medium, heavy).
  - All 12 class outfits in `outfits` are marked with `spriteDraw: "none"`, `requiredArtVariants: 0`, `status: "retired-sprite"`.
  - All 108 former class outfit art keys are preserved under `retiredClassOutfitArtKeys` and their slot IDs remain reserved under `slotMap.retiredIds`.
- **Standard Race Garb (18 total):**
  - Exactly 18 race garbs (9 races × 2 sexes: male and female), fitted to each race's body template in that race's master palette ramp (`pixels: "custom-per-race"`).
- **Class Signature Kits (14 overlay layers):**
  - Casters and monks visually differentiated through 14 overlay layers changing silhouette:
    1. `kit-monk-wraps` (monk, body-hugging)
    2. `kit-monk-sash` (monk, body-hugging)
    3. `kit-wizard-robe` (wizard, long)
    4. `kit-cleric-tabard` (cleric, long, tabard with large holy symbol)
    5. `kit-sorcerer-mantle` (sorcerer, mantle; head bare)
    6. `kit-druid-mantle` (druid, mantle, fur)
    7. `kit-bard-cape` (bard, cape)
    8. `kit-warlock-cloak` (warlock, cape, jagged-hem hooded cloak; asymmetric: true)
    9. `kit-wizard-hat` (wizard, headwear, pointed hat; asymmetric: true)
    10. `kit-wizard-hood` (wizard, headwear, deep hood)
    11. `kit-warlock-hood` (warlock, headwear)
    12. `kit-druid-circlet` (druid, headwear, leaf/antler circlet)
    13. `kit-bard-cap` (bard, headwear, feathered cap; asymmetric: true)
    14. `kit-monk-topknot` (monk, head-overlay)
  - Martial classes (`barbarian`, `fighter`, `paladin`, `ranger`, `rogue`) have NO kit overlays; they are distinguished by armour, weapons, and accent.
  - One fixed accent colour per class (12 classes), drawn from master palette, each verified to separate by >= 3 grayscale value steps against sample ground `#333B45`, with verified colorblind safety (no identical-value red/green pairs).
  - Held class items: 6 items (`wizard-staff`, `druid-staff`, `warlock-orb`, `cleric-mace`, `cleric-censer`, `bard-lute`), anchored like weapons with 2 authored angles baked to 8 frames, no runtime rotation; warlock orb has offset anchor, bard lute is back-slung.
  - Monk idle: dedicated 4-frame idle pose in 4 directions per adult template (288 cells).
- **Facesets Never Change With Gear (Owner 15:58 CT):**
  - Facesets are strictly fixed per character: face preset, preset hair, race background, and 8 expressions only.
  - Armour, helmets, class headwear, and all other worn gear are 100% excluded from facesets (`facesetGear: "none"`, `faceGear: []`, and banned in validator).

### Item 41: Scrap Visible Genetics; Fixed Preset Pool (Owner 15:54 CT)
- **Scrap Visible Genetics:**
  - Children do not visibly inherit parent traits (`inheritance.drivesArt: false`, `inheritance.artSelection: false`).
  - Genetics part library retired (`partLibrary: "retired"`).
  - Visible genetic loci do not drive art (`geneticsLoci.drivesArt: false`, `geneticsLoci.status: "retired"`). Sim genetics remain stats-only.
- **Fixed Preset Pool (216 Total):**
  - Exactly 24 presets per race across 9 races = 216 presets:
    - 8 adult male looks
    - 8 adult female looks
    - 2 elder male looks
    - 2 elder female looks
    - 2 child male looks
    - 2 child female looks
  - Each preset provides a complete head, hair, and face look for the charset and matching 144×144 faceset (8 expressions).
  - 3 in-game skin/hair palette swaps via master palette ramps (0 additional drawn sheets).
  - Factions differentiated by trim colours, banners, and building styles, NOT faces (`factions: "trim-banners-buildings"`, `factionFaces: false`).
- **Dedicated Dwarf Body Templates (~36 px tall):**
  - Verified explicit 36 px height entries for dwarf adult male, adult female, elder male, and elder female in `sexedBodies.bodyPx.dwarf`. Tested by mutant kill (`dwarf-px`).

### Sizing and Cost Estimate Re-run
- **Cells per full layer sheet:** Dropping 2 melee body rows (`melee-swing` and `thrust`: 12 frames × 4 directions = 48 cells) from the item-33 708-cell budget yields **660 cells**.
- **Base body sheets:** 18 adult (9 races × 2 sexes) + 18 elder + 9 child = **45 sheets**.
- **Race garb sheets:** **18 sheets** (18 designs).
- **Class signature kit sheets:** 14 kit layers × 18 adult templates = **252 sheets**.
- **Armour sheets:** 3 weights × 9 races × 3 bodies = **81 sheets**.
- **Helmet sheets:** **81 sheets**.
- **Elder and child kits/armour:** 0 extra sheets (reused via offset tables).
- **Total drawn body/garb/kit/armour/helmet sheets:** 45 + 18 + 252 + 81 + 81 = **477 sheets**.
- **Preset assets:** 216 charset heads + 216 facesets (144×144, 8 expressions).
- **In-game palette swaps:** 0 extra sheets.
- **Held class items:** 6 items × 2 authored angles (baked to 8 frames).
- **Monk idle:** 4 frames × 4 directions × 18 templates = **288 cells**.
- **Retired class garb designs/sheets:** 108 designs (324 sheets) retired.

### Clean Integration with Prior Items (12–38)
- **Item 38 (Owner Override):** RMMZ standard top-down 3/4 view intact; 4-way orthogonal grid movement intact (no diagonal movement, no diagonal gliding, 3 px rule removed); SRD 5-5-5 for spell areas/ranges only intact; 4-direction sprites intact; row-then-layer draw order intact. All item 38 tests continue to pass.
- **Items 12–15 (Addendum A9b):** 768×1440 paper-doll sheet standard; 2048 px maximum dimension; permanent slot IDs; anchor alignment; 21 dimorphic creatures. All pass.
- **Items 16–37 (Addendum A9c):** Readable high-contrast fantasy palette; 1 px self-tinted character/item outline; single master palette (226 active colours); 1 Z-layer = 5 ft = 48 px with 12 px quarters; 2× integer render scale default; U7-style item placement and containers. All pass.

---

## 5. Prohibited Terms and Mandate Audits

- **Oblique projection:** Verified no active oblique projection rules exist. All occurrences in documentation are historical supersession notes or Appendix A reconciliations.
- **Diagonal movement:** Verified no diagonal movement rules exist. Movement is strictly 4-way orthogonal. SRD 5-5-5 is explicitly scoped to spell areas and ranges only.
- **Leftover per-class outfits:** Verified no required per-class outfit sprites exist. `outfitMatrix` contains only the 27 armour rows. All 12 class outfits in `outfits` have `spriteDraw: "none"` and `requiredArtVariants: 0`.
- **Genetics-driven art:** Verified visible genetics are completely disconnected from art generation (`drivesArt: false`, `simGenetics: "stats-only"`).
- **Faceset gear layers:** Verified facesets contain 0 gear layers, 0 armour, 0 helmets, and 0 class headwear.

---

## 6. Findings and Notes

### Note 1 (Minor — Schema Field Cleanliness): Stale Top-Level `faceLayers` Array in `game/data/UF_AssetStandard.json`
- **Location:** `game/data/UF_AssetStandard.json`, line 932:
  ```json
  "faceLayers": [
    "background",
    "faction-trim",
    "body-base",
    "face",
    "hair",
    "gear",
    "overlay"
  ]
  ```
- **Context:** When Addendum A2 was drafted, a 7-layer stack was defined. Under Item 40 & 41 (Owner 15:58 CT), the Owner explicitly ruled that facesets never change with gear and consist only of race background, preset face, and preset hair (3 layers).
- **Analysis:**
  - In `docs/art/DEUS_ASSET_STANDARD.md`, AS-FACE-002 was updated to the 3-layer stack: `(1) race background, (2) preset face, (3) preset hair`.
  - In `tools/art/validate_asset_standard.js`, `FACE_LAYERS` is defined as `['background', 'preset-face', 'preset-hair']` and strictly enforced, with `bannedFace` rejecting `gear`, `faction-trim`, etc.
  - In `tools/art/fixtures/asset_standard/addenda.json`, `addenda.face.layers` was updated to `['background', 'preset-face', 'preset-hair']`.
  - In `game/data/UF_AssetStandard.json`, `rules["AS-FACE-002"]` correctly specifies `Face layers are race background, preset face and preset hair. No gear, helmet or class headwear`, and `a9c.visibleGear.faceSample.layers` is `["background", "preset-face", "preset-hair"]`.
  - However, the top-level property `"faceLayers"` on line 932 of `UF_AssetStandard.json` was not updated to `["background", "preset-face", "preset-hair"]`.
- **Impact:** Zero test or build failures occur because the validator relies on its internal constant `FACE_LAYERS` rather than `standard.faceLayers`. However, external tools or future schema consumers reading `standard.faceLayers` directly would see the obsolete 7-layer definition.
- **Recommendation:** In the next schema maintenance pass or follow-up task, update line 932 of `UF_AssetStandard.json` to `["background", "preset-face", "preset-hair"]` (or remove the redundant top-level array).

### Note 2 (Informational): Catalogue Coverage Legacy Tokens
- As reported in previous reviews, `validate_asset_standard.js` reports 11 legacy filename violations under `AS-STYLE-001` and 3 pre-existing 5-biome canonical sets under `AS-BIOME-005`. These are pre-existing baseline conditions tracked for follow-up asset renaming and biome catalog migration (PROPOSED-AL-01 / PROPOSED-AL-05).

---

## 7. Verdict

**PASS WITH NOTES**

- **Gate 1 (`test_validate_asset_standard.js`):** 369 passed, 0 failed.
- **Gate 2 (`check_deus_syntax.js`):** Checked 52 DEUS plugin files. Errors: 0.
- **DEC-007 Art Freeze:** Fully compliant. Zero art or audio generated.
- **Scope:** All changes strictly confined to `allowedPaths`. No engine or plugin code modified.
- **Normative Requirements:** Items 39, 40, and 41, along with prior items 12–38, are thoroughly and faithfully encoded across `DEUS_ASSET_STANDARD.md`, `UF_AssetStandard.json`, and the test/validation suite. Note 1 is recorded for schema cleanliness.

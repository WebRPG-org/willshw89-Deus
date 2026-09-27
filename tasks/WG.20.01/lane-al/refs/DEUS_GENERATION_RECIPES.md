# DEUS × PixelLab — locked generation recipes (DRAFT for the look test)

Written 2026-09-26, ~16:10 CT. **0 generations spent.** Companion to `PIXELLAB_DOCS_REFERENCE.md`, which holds the sources, the full tool catalogue and the trial-mistake audit. **[TUNE]** marks a value the look test must set; everything else is locked unless the look test fails it. Endpoints are `https://api.pixellab.ai/v2/...`.

## 0. The DEUS feel as parameters (applies to every recipe)
| Target | How it is enforced |
|---|---|
| Readable high-contrast fantasy; value contrast first | Style anchors (§1) are approved on value first. QA: sprite mid-tone ≥25 L* from the 4 ground swatches, and a **grayscale check** (L* only: silhouette readable, ≤3 value groups per sprite) |
| Saturated but controlled colours; fixed master palette | `color_image` = the **class sub-palette PNG** + `force_colors:true` where supported. Pro tools: `style_image` with `style_options.color_palette:true`. Then the local OKLab quantizer to the class sub-palette (authority), with ΔE-over-threshold → regenerate |
| Brightest colours reserved for interactables, characters, spells, loot, danger | Sub-palettes: `pal_ground.png` (low chroma, narrow value band ≤30 L*, **no reserved brights**); `pal_sprite.png` (full ramps minus the reserved band); `pal_bright.png` (reserved band; only for FX, loot icons, interactables, danger); `pal_skin_hair.png`; `pal_portrait.png` (§3.11). QA: reserved-band pixels only in allowed classes |
| Top-left light | Fixed prompt phrase + anchors lit top-left. QA: upper-left mean L > lower-right mean L |
| 1 px self-tinted outline on characters and items; none on terrain | `outline:"single color outline"` (never `single color black outline`) on characters, items and props; `outline:"lineless"` / `outline_mode:"segmentation"` on terrain. QA: outline coverage 100 % of the silhouette edge (chars/items), 0 black-only outline pixels; terrain has no dark rim. **Exception: faces follow the Owner's portrait ref (black contour), see §3.11** |
| One camera for everything on the map | `view:"low top-down"` for characters, creatures, furniture and buildings [TUNE: low vs high top-down, once, in the look test, then lock for all]; ground tiles `tile_view:"top-down"` |
| No scaling | Only crop, pad, slice, whole-pixel shift, mirror, lossless 90° turn and palette snap. Never unzoom, resize, image-to-pixelart, or PixelLab "custom size" if its output is resampled (check the 1:1 grid) |

**Fixed style tail** (appended to every prompt, exactly):
- Sprites and items: `readable high-contrast fantasy pixel art, saturated but controlled colours, lit from the top left, crisp 1px self-coloured dark outline`
- Terrain: `readable fantasy pixel art ground, soft low-contrast texture, lit from the top left, no outline`
- Never add: "transparent", "sprite sheet", "16-bit JRPG", "for paper-doll", or background words on character/object endpoints (use parameters).
- **Superseded 16:16 CT (Owner directive):** character prompts now carry full pixel-level specs (canvas, bbox rows/column, head/torso/leg px, anchors, hex ramps, gear px sizes, weapon length). See §3.0. Look-test finding (L12): PixelLab treats these numbers as soft hints, so the post-process stays the authority.

**Prompt template rule:**
- `{subject noun phrase}, {2–4 visible details: material, colour, held item}, {pose if static}` + style tail.
- Roughly 15–40 words in total. This is PixelLab's own 1–3-sentence prompt pattern (`image-to-text`).
- For each asset class, derive the template once from an approved anchor with `image-to-text` (~0.09 gen) and freeze it.

**Seed policy:**
- Look test: a fixed seed per asset (`seed = crc32(asset_id) % 2^31`) while A/B-testing parameters.
- Production: `seed = crc32(asset_id) + attempt`. Log the seed on every call.
- Seeds are not a determinism guarantee across model updates, so archive outputs.

**Guidance:**
- `text_guidance_scale` 8 (default) [TUNE 6–10]. The docs warn high values over-saturate.
- `init_image_strength`: 350 for blocking-driven shapes, 450 for near-final blocking, 600+ only for finishing touches [TUNE per class].
- Bitforge `style_strength` 60 [TUNE] if bitforge is ever used; its default is 0 (off).

**Standard post-process** (all classes, local, 0 gens):
1. Binary-alpha check (reject semi-alpha).
2. 1:1 grid detector (reject fat pixels).
3. Trim/pad to the target cell by crop only.
4. Quantize to the class sub-palette (OKLab, no dither), then recheck ΔE.
5. Anchor/pivot check (±1 px against the sidecar).
6. Class QA checks.
7. Contact sheet at 1:1 and at ⅓ zoom, in colour and grayscale, in a mock RMMZ screen for Owner review.

**Common acceptance checks:** in-palette 100 %; alpha binary; native grid; bbox within spec; outline rule; light-direction check; value contrast ≥25 L* on grass, dirt, stone and snow; grayscale readability; reserved-bright rule; identity consistency across directions (IoU of mirrored W vs E ≥0.85 where symmetric).

## 1. Style-anchor kit (build first; every recipe references it)
Make these, have the Owner approve them, and hand-finish them to perfection. They are the only style source (the trial used none).

| ID | Content | Size | Made with |
|---|---|---|---|
| A-CHR | 4 dressed humanoids (human M/F, dwarf, orc), S/W/E/N | 42 tall in a 48 cell | 4-dir standard @42 + hand fix; then `create-character-v3` from each south to get stored 8-dir characters usable as `style_character_id` |
| A-CRE | 3 creatures (small beast, humanoid monster, 96 Large) south | 48, 96 | `generate-with-style-v2` seeded from A-CHR crops, hand fix |
| A-GND | ground swatches: grass, dirt, stone, snow, sand, floorboards | 48×48 | tiles-pro variations, hand fix |
| A-DEC | 8 decals | 24×24 | 1-dir object @24, hand fix |
| A-OBJ | 6 props/furniture (chair, table, barrel, chest, bed, lamp) south | 48 / 96 | 1-dir object with style refs; hand fix |
| A-BLD | 1 cottage + 1 stone house | 128–144 | 1-dir object 128 (trial H05 look), recoloured |
| A-ITM | 8 item world sprites on a table sheet | 6–12 px on a 64 sheet | trial I10/I11 route |
| A-ICN | 8 icons (weapon, potion, scroll, ore, food, key, ring, coin) | 32×32 | 1-dir object @32 |
| A-FX | 3 FX first frames (fire, ice, holy) | 48 / 64 | generate-with-style |
| A-FACE | **OWNER_PORTRAIT_STYLE_REF_01.png** (given) + 2 look-test faces approved later | 144×144 | §3.11 |
| Palettes | `pal_ground`, `pal_sprite`, `pal_bright`, `pal_skin_hair`, `pal_portrait` PNGs | n/a | from `art/palette/uf.hex` + skin ramps |

Anchors live in `/workspace/pixellab/reference/anchors/` (to create), with a sidecar recording who approved each one and when.

---
## 2. Global QA thresholds [TUNE in the look test]
ΔE snap threshold 6 (OKLab ×100); value contrast ≥25 L*; outline coverage ≥98 %; seam ratio ≤1.0 (tiles); anchor ±1 px; identity IoU ≥0.85; grayscale: sprite vs ground |ΔL*| ≥25 and ≤3 value clusters (k-means on L*).

---
## 3. Recipes

### 3.0 Class map sprites — base, then States, then animations (Owner rulings 16:10–16:23 CT; look test 16:00–16:24)
> **POINTER (16:50 CT): the class map sprite process and prompts are now standardized in `/workspace/pixellab/DEUS_CLASS_SPRITE_STANDARD.md` (v1 draft).** That file wins where it differs from this section. In particular:
> - **6 states for every character:** base (idle + walk), attack, cast, ranged, down, work. This supersedes the "Ranged only fighter/ranger/rogue" and "casters only" lines in the table below.
> - Race canvases and heights come from scale_chart.json / size_classes.json.
> - `enhance_prompt` is off.
> - `use_color_palette_from_reference` is true for all 5 states.
> - The state canvas is 56 (C+12), with every State cropped to the 48 cell.
**Scope:** one fully generated map sprite per **class × race × sex** (12 SRD classes × 9 races × 2 = **216**). There is no paper-doll layering, and gear does not change the map sprite. Variety comes from facesets.

**Workflow (Owner standard, shown in the web UI):**
1. Make the base character (`create-character-v3`, 8 directions).
2. Make that character's States (`create-character-state`).
3. Add animations per State (`characters/animations`).

**State list per class** [Owner confirm the signature weapons]:
| Class | Base (idle) | Attack State (own signature weapon, own pose; no shared swing, no rotating weapon sprite) | Cast State | Ranged State |
|---|---|---|---|---|
| Barbarian | yes | greataxe | yes | no |
| Bard | yes | rapier | yes | no |
| Cleric | yes | mace + shield | yes | no |
| Druid | yes | quarterstaff (or scimitar) | yes | no |
| Fighter | yes | longsword + shield | yes | longbow |
| Monk | yes | unarmed strike (or quarterstaff) | yes | no |
| Paladin | yes | longsword + shield (or warhammer) | yes | no |
| Ranger | yes | longsword / twin shortswords | yes | longbow |
| Rogue | yes | dagger / shortsword | yes | shortbow |
| Sorcerer | yes | dagger | yes | no |
| Warlock | yes | pact blade / dagger | yes | no |
| Wizard | yes | quarterstaff | yes | no |

- **Cast State:** every class gets one (Owner reversal 16:23 CT; this supersedes the 16:20 "casters only" rule).
- **Ranged State:** fighter, ranger and rogue only (16:21 CT).
- **Totals:** 216 bases + 216 Attack + 216 Cast + 54 Ranged (3 classes × 18) = **486 States**, at 20–40 gens each [TUNE, see the costs below].

**Size reference (repo, Owner 16:20 CT).** Copied read-only to `/workspace/pixellab/reference/scale/`:
- `DEUS_HUMAN_SCALE_STRIP_V1.png` (1340×224, baseline y=180; its human is 42 px: head 12, torso 12, belt 2, legs 16, 12–14 px wide).
- `DEUS_SCALE_LANGUAGE_V1.png/.jpg`, `scale_chart.json`, `DEUS_HUMAN_WORLD_SCALE_STANDARD.md`, `DEUS_TILESET_SCALE_STANDARD.md`.
- Locked numbers (scale_chart.json):
  - HUMAN 18×42 (14–22 × 40–44), ~3.0–3.2 heads.
  - DWARF 20×36 (18–24 × 34–38), ~2.8 heads.
  - ELF 16×43 (14–18 × 42–46), ~3.3 heads.
  - CHILD 14×26.
  - LARGE creature 64×80 (48–88 × 64–96).
  - Anchor BOTTOM_CENTER: x=24, baseline y=47 in the 48 cell.
  - Races not in the chart need Owner numbers [TODO].
- **How the reference enters each tool:**
  - No PixelLab character endpoint takes a separate size-reference image (live openapi checked 16:21 CT).
  - `create-character-v3` accepts `reference_image` (a south view it rotates, so it copies looks, not only size). `create-character-pro` accepts `reference_image`/`concept_image`, and `create-character-pro-flash` accepts `style_image`.
  - Use the chart numbers in every prompt (template below).
  - Where an image input exists, pass a **48×48 size-blocking crop made from the strip's human** (feet on y=47, centred x=24), or an approved DEUS sprite at that scale. Only use it where the tool treats it as a reference/init image and not as the subject [TUNE; untested, 0 budget left].
  - Prepared (0 gens): `/workspace/pixellab/reference/scale/SIZE_BLOCK_HUMAN42_48cell.png`, the strip's human cut to a 48 cell (42 tall, 18 wide, feet on row 47, transparent background, not re-centred: bbox x 17–34).
  - Record `size_ref_file` per attempt in log.jsonl.

**Base prompt template (pixel-level; chart numbers filled per race; v3, `enhance_prompt:false` so the numbers survive):**
`{race} {sex} {class}, low top-down view, in a {C}x{C} px canvas: figure {H} px tall and {W} px wide at the shoulders, top of head on row {C-1-H}, feet baseline on row {C-1}, body centred on column {C/2}; head {h1} px, torso {h2} px, legs {h3} px ({heads} heads tall); {hair: style, colour #base/#shadow/#highlight}; skin #base/#shadow/#deep; {each garment: position, px size, shape, material, #base/#shadow/#highlight}; {signature weapon: hand, orientation, length px, width px, #hex}; max {N} colours; 1 px dark self-tinted outline; no anti-aliasing, no dithering; lit from the top left, shadows on lower-right faces`
- Human defaults: C=44 (then placed at +2,+3 in the 48 cell), H=42, W=18, h1=13, h2=13, h3=16 (3.2 heads). The L11/L12 prompts used head 11 px and are not chart-compliant.
- Settings: `view` "low top-down"; `template_id` "mannequin"; `outline` "single color outline" (never black); `detail` "medium detail"; `no_background` true; seed per policy; log the full prompt.

**State call (API equivalent of the web Create State screen):**
- `POST /create-character-state` {`character_id`, `edit_description` (imperative, pixel-level as above: "Change the pose to … ; the {weapon} is {n} px long …; keep face, hair, body and outfit"), `override_frame_size` {w,h}, `use_color_palette_from_reference`, `seed`, `state_name`, `no_background` true}.
  - **Canvas:** resize with `override_frame_size` (multiple of 4, ≥ the source) whenever a weapon or arm leaves the silhouette. The Owner's 44-px "Attack" State was not resized and clips in 7 of 8 directions.
  - **Palette:** `use_color_palette_from_reference` true for pose-only States (Attack, Cast, Ranged, since gear does not change); false only when the State adds new colours.
- There is no style-image input; the source character is the only reference.
- **Look-test fact:** the State is a redraw, not an edit. Only 7–21 % of head pixels are exact, silhouette IoU 0.57–0.82, and the palette is 26 colours with only 1 exact colour shared with the base. So always palette-snap the State to the base's palette afterwards (local, 0 gens).

**Animations per State:** `characters/animations` `mode:"v3"`, `frame_count` 6–8, `keep_first_frame:false`, one direction per call (~1 gen at ≤64), `color_image` = that character's own palette PNG + `force_colors:true` (L11: 7–15 off-palette colours still appeared, so snap locally), `seed` logged.
- Frames come back on a larger canvas (44 → 64). Crop with one fixed offset per clip; never re-centre per frame.
- **Accept:** feet row ±1 (L11 drifted 3 px, so a whole-pixel re-anchor on feet is needed); blade length ±2 px (L11 13–18 px); within the 48 cell or a documented overhang.

**Acceptance for class sprites:** height within the chart min–max for the race in all 8 directions (L06/L12 human 41–43 PASS; L09 39–40 FAIL); binary alpha; ≤ palette cap after snap; outline self-tinted; weapon inside the canvas.

### 3.1 Humanoid characters (charset bodies and dressed presets, 48 cell, 42 tall) — SUPERSEDED for class map sprites by §3.0 (layering dropped 16:17 CT; the standard 4-dir tool scored lower in the look test)
- **Endpoint:** `POST /create-character-with-4-directions` (1 gen).
- **Parameters:**
  - `image_size` {42,42}; `view` "low top-down" [TUNE]
  - `outline` "single color outline"; `shading` "medium shading"; `detail` "medium detail"
  - `color_image` pal_sprite + pal_skin_hair merged; `force_colors` true
  - `text_guidance_scale` 8; `template_id` "mannequin"
  - `proportions` {"type":"preset","name":"default"} [TUNE default vs stylized]; dwarf: custom {head_size 1.2, legs_length 0.7, shoulder_width 1.2} [TUNE]
  - `directions`: frozen refs when an approved view exists (each at exactly 42×42 content canvas = image_size; trial D01 lesson)
  - seed per policy
- **Better-style variant for named or hero NPCs:** `POST /create-character-pro` `method:"create_with_style"`, `style_character_id` = matching A-CHR, image_size 48 (20 gens) [TUNE whether standard + force_colors is good enough].
- **Prompt:** `{race} {sex} {age word}, {hair}, wearing {garb/armour}, {held item or empty hands}, standing relaxed,` + sprite tail.
- **Post:** take `quantized_images`; trim to the 48 cell (feet on the pivot row); sidecar anchors (head, hands, feet).
- **Accept:** 42–43 px tall ±1 across directions; W is the mirror of E where symmetric (IoU ≥0.85); outline and palette rules; grayscale readable on grass.

### 3.2 Animations (body rows; layers propagate afterwards)
- **Template rows** (idle, walk, run, sneak, death, rise, pickup, push, throw, drink, hurt, combat idle): `POST /characters/animations` `mode:"template"`, `template_animation_id` from the MCP list (walking-4-frames, breathing-idle, fight-stance-idle-8-frames, …), `color_image` pal_sprite, `force_colors` true, `outline`/`shading`/`detail` as §3.1, directions [S,W,E,N] (or S, E, N + mirror). 1 gen/direction.
- **Custom rows** (sit, sleep, kneel, climb, cast variants, work, bow, block, dodge, static poses): `POST /animate-with-skeleton-v3` on our own body south/east/north frame.
  - `description` = look noun phrase only; `action` short label; `direction`; `view` "low top-down"; `template_id` "mannequin" (quadrupeds: their template)
  - `first_frame_keypoints` = our authored standing skeleton; `keypoints` = authored poses, **packing up to 15 frames of several rows per direction per job** (4 gens) [TUNE: verify packing]
  - `no_background` true
- **Transition rows** (stand→sit, sit→lie): `/characters/animations` `mode:"v3"`, `action_description` (motion only), `custom_start_frame` = standing, `end_frame` = target pose (from skeleton-v3), `frame_count` 4–6, `keep_first_frame` false, `drift_threshold` default [TUNE].
- **Walk tip (official):** reference the mid-stride frame for v3-made walks.
- **Post:** frame select (walk 4→3), per-row whole-pixel anchor, palette snap across the whole row in one pass.
- **Accept:** feet row ±1; head identical to idle ±1 px outside the animated parts; no colour flicker (ΔE per frame).

### 3.3 Creatures (T/S/M, 48 cell)
1. **Key:** `POST /generate-with-style-v2`, `style_images` = 2–4 A-CRE crops at **48×48** (sets output 48 → 16 candidates, 20 gens), `style_description` "readable high-contrast fantasy pixel art monster", `no_background` true, prompt `{creature}, {colour/material}, {key feature}, facing the viewer,` + sprite tail.
2. Pick 1, hand-fix, quantize.
3. **Rotate:** `POST /create-character-v3` `reference_image` = key (straight-on south!), `view` "low top-down", `template_id` bear/cat/dog/horse/lion/mannequin (1 gen at ≤64).
4. **Rows:** template (quadruped list via get_character) or `animate-pixminimax` / v3 (§3.5 costs).
- **Accept:** as §3.1 plus the creature bbox spec.

### 3.4 Large creatures (48×96 / 96×48) and Huge (144)
- **Key:** `generate-with-style-v2` with A-CRE Large ref at 96×96 (4 candidates, 25 gens), or `POST /create-image-pro-flash` image_size {48,96} or {96,48} (custom beta) with `style_image` = A-CRE Large [TUNE: compare quality, check 1:1 grid, ~5 gens provisional].
- **Rotate:** `create-character-v3` from the south key (2–3 gens) [T B08].
- **Rows:** `animate-pixminimax` `frame_count` 8 (sizes just above 64 are cheaper), `no_background` true, `enhance_prompt` false [TUNE]; or v3 at 96 (2–3 gens/direction).
- **Post:** crop to 48×96 / 96×48 (reject if content exceeds the box; no scaling).
- **Accept:** bbox fits; identity across directions.

### 3.5 Terrain Wang tiles (48 px, dual-grid renderer)
- **Endpoint:** `POST /create-tiles-pro` (20–25 gens).
- **Parameters:**
  - `tile_type` "square_topdown"; `tile_size` 48; `tile_view` "top-down" [TUNE vs "high top-down"]
  - `outline_mode` "segmentation"; `tile_feature` "tileset"
  - seed fixed per biome transition
- **Prompt:** `{main terrain} to {second terrain}` + terrain tail. The first terrain is the main one.
- **Cliffs/plateaus:** same call with terrain height and step slope [TUNE; API field names not listed in the schema dump, so confirm in the look test — UI tab "Tileset" has the controls].
- **Fill variants:** `create-tiles-pro` without `tile_feature`, `style_images` = 2–6 base tiles from the Wang set (48×48), numbered prompt `1) grass with small stones 2) grass with clover …`.
- **Post:** quantize to **pal_ground** (reserved brights forbidden); seam check on a 5×5 preview; renderer corner lookup.
- **Accept:** seam ratio ≤1.0; ground value band ≤30 L*; no outline; value contrast vs A-CHR ≥25 L*.

### 3.6 Tilesets / decals (24 px overlays)
- **Endpoint:** `POST /create-1-direction-object`, `style_images` = 4–8 A-DEC at **24×24** (sets size 24 → 64 candidates, 20 gens), `view` "top-down", `item_descriptions` up to 64 entries (pebbles, tuft, crack, leaves …).
- **Prompt:** `small ground detail decals for a {biome}` + terrain tail.
- **Alternative:** `create-image-pro-flash` 24×24 native with `style_image` A-DEC [TUNE cost/quality].
- **Post:** select frames (review → `select-frames`), key/alpha check, pal_ground (decals may use 1 accent from pal_sprite [TUNE]).
- **Accept:** reads at 1:1 on its ground; no outline box; alpha binary.

### 3.7 Buildings
- **Kits (walls/floors/doors):** `POST /create-tiles-pro` `tile_feature` "building", `tile_type` "square_topdown", `tile_size` 48, `building_wall_tiles` 2 [TUNE 2–3], `building_layout` "materials", `building_wall_description`, `building_floor_description`, `building_floor2_description` (roof), `building_wall_angle` [TUNE to match the character view], `outline_mode` "segmentation".
- **Whole set-piece buildings:** `POST /create-1-direction-object` `style_images` = A-BLD at the target size (≤170 → 4 candidates; 129–170 = 25 gens), `view` "top-down". Prompt `{race style} {building}, {materials}, front wall facing the viewer, roof visible from above,` + sprite tail minus "outline" (architecture edges by value).
- **Stages (damage, season, burning):** `POST /edit-image-pixen` (1 gen; source ≤256/side, multiples of 4) "the same building {state}, keep exact shape and position" [T G01/G03–G05].
- **Accept:** straight-on front (no diagonal); footprint on the 48 grid; value-defined edges; stage IoU ≥0.8.

### 3.8 Furniture and map objects
- **South view:** `POST /create-1-direction-object`, `style_images` = 4–8 A-OBJ at the target square size (48 → 16 candidates, 20 gens; 96 → 4, 25 gens), `item_descriptions` for different pieces in one call, `view` "top-down". Prompt `{object}, {material}, front facing the viewer, top visible from above,` + sprite tail.
- **Exact geometry needed:** `POST /map-objects` with authored blocking `init_image`, `init_image_strength` 400 [TUNE 350–450], `view` "low top-down" [TUNE, must match the characters], outline/shading/detail as §3.1, `color_image` pal_sprite [T I10/M06].
- **Other facings:** `POST /generate-8-rotations-v3` from the approved south (~1 gen; slow queue, run overnight) → keep S/W/E/N; or `create-8-direction-object` with `style_object_id` (20–40).
- **In-map style match:** `map-objects` with `background_image` + `inpainting` rectangle/oval (fraction 0.3–0.6) [TUNE; trial I03 with a custom 8×10 mask failed].
- **Accept:** straight-on; 4 facings consistent; outline, palette and light rules.

### 3.9 Items (world sprites 6–12 px)
- **Route (trial-proven):** author 8–10 blockings (6–12 px) on a flat key-colour 64×64 tabletop sheet → `POST /map-objects` `init_image` = sheet, `init_image_strength` 350 [TUNE 300–450], `view` "low top-down", `outline` "single color outline", `shading` "basic shading", `detail` "medium detail", `color_image` pal_sprite + pal_bright (loot may use reserved brights).
- **Prompt:** `{surface} with {list of items}` + sprite tail.
- **Post:** key out, crop each item, palette snap.
- **Accept:** size within 6–12 px; legible at 1:1 next to a 42 px figure; loot uses a reserved bright accent.

### 3.10 Icons (32×32)
- **Endpoint:** `POST /create-1-direction-object`, `style_images` = 4–8 A-ICN at **32×32** (64 candidates, 20 gens), `item_descriptions` = up to 64 icon names, `view` "top-down" [TUNE vs "sidescroller" for front-on icons].
- **Prompt:** `inventory icons of {category}, single object centred` + sprite tail (no background words; `item_descriptions` name each icon).
- **Alternative:** `generate-with-style-v2` with the same refs (64 per call).
- **Post:** select-frames, palette snap (loot/magic items may use pal_bright), 1 px outline check.
- **Accept:** readable at 1:1 and in grayscale; consistent light and outline across the set.

### 3.11 Faces (RMMZ facesets, 144×144, one complete portrait per person — Owner ruling 16:05 CT)
**Style reference:** `/workspace/pixellab/reference/OWNER_PORTRAIT_STYLE_REF_01.png`. Measured on the box:
- 144×144 RGBA, 54 colours.
- **Native 144, not an upscale:** 2×2 block uniformity is 0.28–0.33 at every offset, with no parity bias.
- ~39 % fully transparent pixels, no semi-alpha. The subject is a bust cut out on transparency.
- Pure black (0,0,0) is the most common colour: a **black contour line**, unlike the self-tinted sprite outline.
- Warm skin ramp (245,198,170 / 224,167,137 / 255,224,199), deep red and wine cloth, dark purple (43,38,59).

**Rulings this implies** [Owner confirm]:
- Faces are exempt from the sprite outline rule and follow the ref's dark contour.
- The race background is a **separate plate composited by us** (0 gens), not generated per portrait.

**A. Base portrait (neutral), one per person** (216 presets)
- **Primary:** `POST /generate-with-style-v2`.
  - `style_images` = [OWNER_PORTRAIT_STYLE_REF_01 (144×144), + up to 3 approved DEUS faces once they exist]. **Output size is deduced from the largest style image, so it comes out at exactly 144** (4 candidates, 25 gens; band 129–170).
  - `style_description` "painterly pixel art portrait, soft detailed shading, warm light, dark contour line"; `no_background` true.
  - Prompt `head-and-shoulders portrait of a {race} {sex} {age}, {hair colour and style}, {eye colour}, {1–2 distinguishing features}, wearing {race garb neckline}, calm neutral expression, facing the viewer slightly turned` (no background words).
- **Alternative A2:** `POST /generate-image-v2` `image_size` {144,144} (4 candidates, 25 gens).
  - `style_image` = the ref with `style_options` {color_palette: human true / non-human false [TUNE], outline true, detail true, shading true}.
  - Optional `reference_images` [{race concept sheet, usage:"race features: ears, horns, skin tone"}].
  - Use this route when races need features the ref lacks.
- **Cheaper candidate A3:** `POST /create-image-pro-flash` `image_size` {144,144} (custom beta; 144 is a multiple of 4), `style_image` = ref with `usage_description` "art style only", `no_background` true. About 5 gens provisional; 128/256 prices TBD [TUNE: must pass the 1:1 grid check, i.e. no internal resample].
- **Use all 4 candidates.** 2 usable candidates of the same race and sex can become 2 presets, which halves the base cost.
- **Never:** Pixen (no style input), portrait-character-pro (sizes 128/160 only; 160 → 144 crop only if nothing is cut), any resize.

**B. The 8 expressions, same identity** (7 edits from the neutral)
The RMMZ set: neutral, happy, sad, angry, surprised, hurt/pain, determined, worried/afraid [Owner confirm the list]. **Only the face region changes**; hair, garb and contour must stay pixel-identical.
- **Route B1 (cheapest, trial-proven):** legacy `POST /inpaint` (1 gen; ≤200² area, 144 OK).
  - `inpainting_image` = neutral portrait; `mask_image` = face mask (brows, eyes, mouth and cheeks; ≥32×32 region, the documented minimum).
  - `description` describes the **whole portrait** with the new expression ("… woman with auburn braid, smiling warmly, eyes narrowed with joy").
  - `color_image` = that portrait's own palette (keeps the colours); `detail` "highly detailed"; `shading` "detailed shading"; `no_background` true; `init_image` = the neutral, strength 300–400 [TUNE].
  - Trial C06 passed this at 1 gen.
- **Route B2 (higher fidelity):** `POST /inpaint-image-pro-flash`: same mask, preserves unmasked RGBA byte-exact, 32–256 px, cost TBD (~5?) [TUNE].
- **Route B3 (batch):** `POST /edit-images-v2` `edit_with_text` on **face crops**. Crop each portrait's face box (e.g. 80×80), pack **9 different people** (65–80 px band, 20 gens) and give them one shared instruction ("make the expression {angry}: brows lowered, mouth tight").
  - That is ~2.2 gens per face-expression.
  - Paste back by crop/paste only, then restore outside the face mask. Needs a seam check [TUNE].
- **Route B4 (evaluate):** `POST /vocal-animation` with `portrait` = neutral, `mood` ∈ {happy, angry, sad, surprised} (+ neutral).
  - Gives the moods *and* talking visemes (3/5/7/12; free lip-sync/talking GIFs afterwards).
  - Gen cost undocumented; output size must stay 144 [TUNE].
- **Last resort:** `edit-images-v2` / `edit-image-pro` at 144 = 1 frame per call, 20 gens → ~140 gens per person; only for failures.
- **Identity lock:**
  - Every expression's outside-mask pixels are restored from the neutral (local composite, 0 gens), so hair, garb and silhouette are identical by construction.
  - Same seed per person across expressions.
  - Quantize to that person's neutral palette (≤ ref-like 54–64 colours [TUNE]).

**C. Race background**
- 9 race plates, 144×144, **generated once**: `generate-image-v2` 144, `no_background` false, `style_image` = ref, prompt `plain dark {race colour} vignette background, soft warm light from the top left, no objects`.
  - The ref's "plain dark background" feel: low-value, low-chroma, darker than any skin or hair tone.
  - Or authored by hand from `pal_portrait` (0 gens).
- Composite: the plate under the transparent portrait (0 gens). The contour line gives a clean edge.
- Faceset file: 4×2 grid of 144 cells, 576×288 (RMMZ standard).

**D. Palette**
- `pal_portrait.png` = the ref's 54 colours + the DEUS skin/hair ramps for each race + garb ramps, capped at 64–96 colours [TUNE].
- The portrait palette is separate from the sprite palette because faces are painterly. It still shares hues with the race's charset palette so the face matches the sprite.

**Look test must verify (faces):**
1. The style match to the ref on 3 races (human, dwarf, one non-human) passes a blind Owner check.
2. Output is native 144 with no internal resample (grid check on A, A2 and A3).
3. `generate-with-style-v2` really deduces 144 from a 144 ref (the docs say it does).
4. `style_options.color_palette` on/off for non-human skin.
5. B1 vs B2 vs B3 vs B4 per expression: identity (outside-mask identical), expression legibility at 1:1, cost.
6. Vocal-animation cost and output size.
7. Transparent cut-out quality (binary alpha, no halo) over each race plate.
8. The black-contour exemption is accepted.
9. Faces read next to the charset (hair colour and garb match the sprite preset).
10. Per-person cost ≤ [target, e.g. 25 base + 7 expressions × 1–5].

### 3.12 Effects / spells
- **First frame:** `generate-with-style-v2`, `style_images` = A-FX at 48 or 64 (16 candidates, 20 gens), prompt `{element} spell burst, {shape}, bright core, soft falloff` + tail without outline [TUNE: FX outline off]. Colours from pal_bright (reserved band allowed).
- **Animation:** `POST /animate-pixminimax` `frame_count` 8/12/16 (≤2 gens at 64), `no_background` true, `enhance_prompt` true with `direction` for aimed spells [TUNE]; or `animate-with-text-v3` (1 gen at 64 up to 16 f), `drift_threshold` default.
- **Accept:** loops cleanly (last→first ΔE small); reserved brights used; readable on every ground.

### 3.13 UI
- **Window frame art:** `POST /create-ui-asset` `image_size` {512,512} (or 688×384), `elements` ["window","panel","button"], `style_image` = a DEUS UI mock, `color_palette` "dark wood and warm gold" [TUNE], `no_background` true. Slice and repack to Window.png with local tools.
- **Font:** `POST /generate-font-pro` `glyph_px` 16 [TUNE], `weight` Regular/Bold (25 gens).

---
## 4. Look-test matrix (minimum to lock the [TUNE] values)
| Test | Calls | Est. gens |
|---|---|---:|
| View low vs high top-down (character + table + tree, same seeds) | 6 | ~6 |
| Character standard @42 + force_colors vs Pro with style_character_id | 2 + 1 | ~22 |
| Text guidance 6 / 8 / 10 on one character | 3 | 3 |
| Skeleton-v3 packed 15-frame multi-row job | 1 | 4 |
| v3 end_frame sit transition | 1 | 1 |
| Tiles-pro 48 top-down vs high top-down; terrain height cliff | 3 | ~60 |
| 1-dir object icons @32 with style_images + item_descriptions | 1 | 20 |
| Decals @24 (object vs Pro Flash) | 2 | ~25 |
| Building kit 48 (wall 2 vs 3) | 2 | ~40 |
| Faces: A vs A2 vs A3 × 3 races | 7 | ~130 |
| Face expressions: B1 ×7, B2 ×2, B3 ×1, B4 ×1 | 11 | ~45 |
| FX PixMiniMax vs v3 | 2 | ~3 |
| **Total** | | **~360** |
(Estimate only. Needs the Owner's budget approval, and no generation until the other running test finishes.)

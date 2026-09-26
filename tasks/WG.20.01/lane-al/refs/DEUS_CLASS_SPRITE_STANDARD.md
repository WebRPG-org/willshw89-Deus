# DEUS Character Map Sprite Standard (v3, one base + armor States + animation sets; draft for Owner approval)

> **Retitled 2026-09-26 16:45 CT** (was "DEUS Class Map Sprite Standard" v1; backups `DEUS_CLASS_SPRITE_STANDARD_pre_1644_backup.md` = v1, `DEUS_CLASS_SPRITE_STANDARD_v2_1644_backup.md` = v2). The file name is kept so existing references resolve.
> **v3 (16:50 CT)** applies Owner 16:46 CT (one unarmored base per race × sex; robe/light/medium/heavy are PixelLab States of it; attack animations per weapon group; no per-look fixed weapon) and Owner 16:47 CT (life animations per armor state). It supersedes the v2 "90 characters × 6 States" structure and the v1 per-class plan.

Written 2026-09-26, 16:29–16:50 CT; v2 16:45 CT; v3 16:50 CT. **0 generations spent** (balance 9,741.1; hard stop 9,740).
Companion files: `DEUS_GENERATION_RECIPES.md` §3.0 (pointer; its 216-class text is superseded), `PIXELLAB_DOCS_REFERENCE.md`, look-test page `look/LOOK_COMPARISON.html`.

## Summary (for the Owner)
For each **race × sex (9 × 2 = 18)** there is **one PixelLab v3 base character, unarmored** (plain clothes, empty hands), drawn in the look of look-test row 6 (the plain v3 human, L09) at the heights in our repo size chart. From that base:
1. **Four armor States**: robe, light, medium, heavy (72 States). With the unarmored base that makes **5 armor states per race × sex, 90 in total**.
2. **Every armor state gets the same animation set (19 animations)**, each in **all 8 directions**:
   - **Life (10):** idle, walk, work, sleep, sit, eat/drink, carry, hurt, knocked down, dead.
   - **Weapon attacks (8), one per weapon group:** unarmed, dagger, one-hand + shield, two-hand, spear/polearm, staff, bow, crossbow.
   - **Cast (1).**
   - Frame counts: idle and walk 4, all others 6.

There is **no fixed weapon per look**: the weapon is drawn only inside the attack animation of its group, and the runtime picks the attack animation from the weapon group actually wielded. Classes may look alike; unarmored covers commoners/villagers, robe covers casters, and the map sprite follows the **worn armor category**. **Class shows in the portrait and the selected-unit panel.** Moods use emote balloons, conditions use shared overlays, people differ through their 144×144 facesets. One race-theme block colours all five armor states of a race.

**Main risk:** the weapon exists only in the animation, and the look test showed blade length drifting 13–18 px across frames (L11). So the **first production test is one armor state with all 8 weapon animations** (§9) before anything else is made.

Estimated cost: **~15,200 gens first pass (range ~15,200–19,300; ~18,900–24,000 with retries)** for all 18 bases, 72 armor States and 90 × 19 × 8 animation calls, inside the ~40k the Owner accepted. The balance (9,741 vs hard stop 9,740) still has no usable budget, so production needs a top-up and Owner sign-off.

Every prompt is filled from a fixed template with chart heights, head/torso/leg pixel counts, anchors, per-material hex ramps and weapon lengths, and every output is cropped, anchored, palette-snapped and measured locally before acceptance.

---

## 1. Locked rulings (Owner, 2026-09-26)
| # | Ruling | Time CT |
|---|---|---|
| R1 | ~~216 class sprites~~ (16:17) → ~~90 characters by race × sex × armor look~~ (16:44) → **18 base characters (race × sex, unarmored) + 72 armor States (robe, light, medium, heavy) = 90 armor states** | 16:46 |
| R2 | Fully generated PixelLab **v3 characters**, 8 directions, `view` "low top-down"; no paper-doll layering | 16:17 |
| R3 | Style target = look-test row 6 (L09 plain v3 human, 44 canvas), with the height fixed to the chart (L09 came out 39–40 px, below the 40 px minimum) | 16:29 |
| R4 | Workflow: base character, then States, then animations | 16:10 / 16:15 |
| R5 | ~~6 States per sprite~~ → each armor state (incl. the unarmored base) gets **animations**: 10 life (idle, walk, work, sleep, sit, eat/drink, carry, hurt, knocked down, dead; PM list, Owner may edit), **one attack per major weapon group** (PM proposal: unarmed, dagger, one-hand + shield, two-hand, spear/polearm, staff, bow, crossbow; Owner may change) and cast = 19 | 16:46 / 16:47 |
| R6 | Everything else (moods, SRD conditions) is emote balloons, portraits or shared condition overlays | 16:29 |
| R7 | The map sprite follows the **worn armor category**; unarmored covers commoners/villagers, robe covers casters (rule for unarmored casters: O15); classes may look alike | 16:44 |
| R8 | Gear does not change the map sprite except the worn armor category (selects the armor state) and the wielded weapon group (selects the attack animation) | 16:17, 16:44, 16:46 |
| R9 | Facesets carry per-person variety: 144×144 whole-image portraits in the Owner style ref (`reference/OWNER_PORTRAIT_STYLE_REF_01.png`) | 16:05 / 16:17 |
| R10 | Maximum pixel-level control in every prompt | 16:16 |
| R11 | Use **our repo size reference** (scale_chart.json, DEUS_HUMAN_SCALE_STRIP_V1.png, DEUS_HUMAN_WORLD_SCALE_STANDARD.md), not a PixelLab feature | 16:20 |
| R12 | **No per-look fixed weapon**: the weapon is drawn only in its weapon-group attack animation; no shared swing and no rotating weapon sprite | 16:21, 16:46 |
| R13 | **8 directions** for every base, State and animation; idle/walk 4 frames, all others 6; 8-way movement via an RMMZ plugin | 16:10–16:46 |
| R14 | Class shows in the portrait and the selected-unit panel (race window skin + race faceset background, 16:40), not on the map sprite | 16:40, 16:44 |
| R15 | One race-theme block per race feeds all its armor states (and buildings, furniture, workstations, UI skins, faceset backgrounds) | 16:40, 16:44 |
| R16 | Slot IDs: **`CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`**, ARMOR ∈ UNARMORED, ROBE, LIGHT, MEDIUM, HEAVY; ANIM per §4.3 | 16:46 |
| R17 | First test = one armor state with all weapon animations (blade-drift risk) | 16:46 |

## 2. Size authority (repo files, copied read-only to `/workspace/pixellab/reference/scale/`)
| File | sha256 (first 16) | Used for |
|---|---|---|
| `art/catalogue/scale_chart.json` | f3af0b1140eaa864 | HUMAN 18×42 (14–22 × 40–44), DWARF 20×36, ELF 16×43, CHILD 14×26; LARGE 64×80 |
| `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png` | 5ce5cefef0a39d7b | Visual yardstick: its human is 42 px (head 12, torso 12, belt 2, legs 16), baseline y=180 |
| `docs/art/DEUS_HUMAN_WORLD_SCALE_STANDARD.md` | c19014d8fd1aa8cb | Anchor x=24, baseline y=47 in the 48 cell; human ~3.0–3.2 heads; dwarf ~2.8; elf ~3.3 |
| `art/catalogue/size_classes.json` | 91bc1fcfcff9ebca | Drawn heights for the six races the chart lacks (7 px per foot) |
| `art/catalogue/geometry.json` | n/a | Frame classes: SMALL/MEDIUM = 48×48; the TALL_MEDIUM 48×64 option exists but is disabled; small-race readability floor 26–28 px exists but is disabled |
| `art/reference/DEUS_SCALE_LANGUAGE_V1.png` | 7ccbc8d9b67bd736 | Proportion/feel comparison only (not a ruler, per the standard) |
| (derived) `reference/scale/SIZE_BLOCK_HUMAN42_48cell.png` | bb1144b4be083372 | The strip's human cut to a 48 cell (42×18, feet on row 47); post-process overlay and contact sheets |

**How the size reference enters the pipeline:**
- PixelLab has no size-reference input.
- `create-character-v3`'s only image input is `reference_image`, and the model *rotates* that image. It copies the image, so we do not pass the strip there.
- The size reference is therefore used in three places:
  - **(a) Prompt numbers.** Every prompt carries the chart numbers (§4 slots).
  - **(b) Post-process gate.** Height/width/anchor are checked against the chart row (§3 step 7).
  - **(c) Review.** Every contact sheet shows SIZE_BLOCK_HUMAN42 beside the sprite on the same 1x ground.
- **Log per attempt:** `size_ref_files` = [scale_chart.json@f3af0b11 row id or size_classes.json@91bc1fcf race id, DEUS_HUMAN_SCALE_STRIP_V1.png@5ce5cefe].

## 3. Step-by-step process (one step per stage)
Global settings for every call:
- Base URL `https://api.pixellab.ai/v2`.
- `no_background` true.
- `view` "low top-down".
- `template_id` "mannequin".
- `outline` "single color outline" (self-tinted; never "single color black outline").
- `detail` "medium detail".
- `enhance_prompt` **false** (it rewrites the text and drops the pixel numbers).
- Seed `crc32("{race}_{sex}_{armor}_{anim}_{dir}") % 2^31 + 1000 × attempt` (`anim`/`dir` = "none" for bases and States).

Budget guard: pre-check `balance − expected_cost ≥ hard stop` before every call. Never print the API key.

### Step 0. Preflight (0 gens)
- **Inputs:** race row and race-theme block (§6), armor row (§5.1), weapon-group row (§5.2) for attack animations, sex, the palette file `art/palette/deus_master_world_palette_v1.hex` (sha befb4641…), and the ramps in §6/§5.
- **Do:**
  - Build the prompt strings from the templates (§4) by code, never by hand.
  - Build `pal_{race}_{armor}.png` (all ramp colours of that armor state plus the outline shades) and `pal_{race}_{armor}_{group}.png` (the same plus the weapon/prop ramps of an animation);  ≤40 colours [TUNE].
  - Write the manifest row.
- **Accept:** every slot is filled, and no forbidden words appear ("16-bit", "JRPG", "transparent", "sprite sheet", "paper-doll", "background").

### Step 1. Base character
- **Endpoint:** `POST /create-character-v3`, from scratch (no `reference_image`).
- **Settings:**
  - `description` = Template B (§4.1).
  - `image_size` {C,C} with C = the race canvas (§6): human 44.
  - Global settings as above. `name` = `{race}_{sex}_unarmored_base`. The base is always the **unarmored** look (§5.1), empty hands, no weapon.
- **Cost:** ~2 gens at C ≤ 64 (measured 2.0–2.05 ×3).
- **Output:** 8 rotations. GET `/characters/{id}` and download `rotation_urls` with `curl -sfL -A 'Mozilla/5.0'`.
- **Post:**
  1. Binary-alpha check.
  2. Measure the bbox, feet row and centre column per direction.
  3. Anchor-crop into the 48×48 cell: feet on y=47, bbox centre on x=24, whole pixels only, no scaling.
  4. OKLab no-dither snap to `pal_{race}_unarmored`, then save `base_palette.png` (the colours actually used).
- **Accept:**
  - Height within the race min–max in all 8 directions.
  - Height within ±1 of the target in S/W/E/N.
  - Width (torso, excluding weapon) within the chart min–max.
  - No weapon, shield or tool anywhere on the figure.
  - Outline self-tinted: 0 pure-black outline pixels (`#000000`–`#0a0a0a`).
  - ≤40 colours after the snap.
  - Straight-on S view; face readable at 1x.
  - The unarmored silhouette items from §5.1 are visible in S and N.

### Step 2. Armor States (4 per base: robe, light, medium, heavy)
- **Endpoint:** `POST /create-character-state`, the API equivalent of the web "Create State" screen.
- **Settings:**
  - `character_id` = the unarmored base.
  - `edit_description` = Template S-armor (§4.2) filled from the armor row (§5.1) and the race-theme block.
  - `override_frame_size`: none (same canvas C) unless the armor widens the figure past the canvas; then CS = C+4 [TUNE].
  - `use_color_palette_from_reference` **false** (armor adds steel, leather and theme colours); the new ramps are listed in the prompt and added to `pal_{race}_{armor}`.
  - `no_background` true; `seed` per policy; `state_name` = "Robe" / "Light" / "Medium" / "Heavy".
- **No style input:** the base character is the only reference.
- **Cost:** 20 gens at CS ≤ 84 (web: 20–40); verify on the first call.
- **Post:** download 8 rotations; anchor feet/centre into the 48 cell; snap to `pal_{race}_{armor}`; save `{armor}_palette.png`.
- **Accept:**
  - Standing pose, empty hands, same stance as the base (so every animation starts from the same pose).
  - Figure height ±1 of the base (a helmet may add up to 2 px [C]); width within the chart max (heavy ≤ W+2).
  - Face, hair and body read as the same person; head IoU vs base ≥0.6 (measured 0.57–0.82) for open-face armor.
  - The armor silhouette items from §5.1 are visible in S and N; no weapon or shield.

### Step 3. Animations (19 per armor state, all 8 directions)
- **Endpoint:** `POST /characters/animations` `mode` "v3", one direction per call, directions S, SW, W, NW, N, NE, E, SE.
- **Settings:**
  - `character_id` = the armor state (the base for UNARMORED).
  - `description` = Template B-armor (§4.1) + that direction's facing phrase.
  - `action_description` = the animation template (§4.3); weapon-group attacks add the weapon block from §5.2, props (tool, bowl, crate) are described the same way.
  - `frame_count`: idle 4, walk 4, all others 6.
  - `keep_first_frame` false.
  - `color_image` = `{armor}_palette.png` for animations with no new object; `pal_{race}_{armor}_{group}.png` (armor + weapon/prop ramps) for attacks, work, eat/drink and carry; `force_colors` true.
- **Cost:** ~1 gen per direction at C ≤ 64 (measured); 1–2 above 64 [TUNE] → **152 calls per armor state (19 × 8), ~152–182 gens**.
- **Post:**
  - Frames come back on a larger canvas (44 → 64). Crop the whole clip with **one** offset computed from the armor state's feet/centre; never re-centre per frame.
  - Snap to the clip's palette (the look test had 7–15 off-palette colours per frame even with force_colors).
- **Accept:**
  - Feet row ±1 across frames for standing clips (L11 drifted 3 px, so re-anchor on the feet); for sleep, knocked down and dead the lowest pixel ends on the baseline.
  - Head px exact vs the armor state ≥80 % outside moving parts; 0 colours outside the clip palette after the snap.
  - **Weapon length within ±1 px of §5.2 in every frame** (L11 drifted 13–18 px for a nominal 16) and the weapon in the correct hand (character's right = viewer's left in S); otherwise retry.
  - Nothing outside the 48 cell (or the O4 frame); idle, walk, work, sleep, sit and eat/drink loop cleanly.
  - The motion reads at 1x.

### Step 4. (retired in v3) The v2 per-state animation step is merged into Step 3.

### Step 5. Directions for RMMZ
- **All 8 directions are production directions** (Owner 16:41 CT): characters move 8-way via an RMMZ plugin; the camera stays RMMZ top-down 3/4. PixelLab v3 already returns 8 rotations for the base and every State.
- No W↔E (or SW↔SE / NW↔NE) mirroring, because weapons are handed.

### Step 6. Packing
48×48 frames, 8 direction rows per clip:
- RMMZ's stock `$` sheet holds 4 direction rows, so the 8-direction layout (row order S, SW, W, NW, N, NE, E, SE or the plugin's order) is defined by the 8-way movement plugin contract [C, O18].
- Idle 4 and walk 4 frames, all other clips 6 frames, × 8 rows; 19 clips per armor state.
- Layout per `docs/RMMZ_ASSET_SPEC.md` and geometry.json `rmmzCharacterBlocks`, extended for 8 rows.
- The sidecar stores the anchor (24,47) and the slot ID per clip (`CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`).

### Step 7. QA gate and contact sheet (0 gens)
- Build a 1x sheet on grass, dirt, stone and snow, with SIZE_BLOCK_HUMAN42 and the H05 cottage for scale, plus a view-only 3x nearest-neighbour copy.
- Automated checks:
  - Binary alpha.
  - 1:1 grid (no fat pixels).
  - Height/width vs the race row.
  - Anchor ±1.
  - In-palette 100 %.
  - Outline rule.
  - Light check: upper-left mean L > lower-right mean L.
  - Grayscale readability.
- The Owner approves per race (first sprite) and then by sample.

### Retry rule (all stages)
- If an output fails acceptance, retry with the next seed (attempt+1), max **2 retries** per stage.
- A failure on a measurable number (height, weapon length, clipping) may add one corrective sentence to the prompt; log it as `prompt_patch`.
- After 3 failed attempts, stop and flag the item as `NEEDS_OWNER` (hand-fix, O4, or a chart question).
- Never loosen the chart or accept a scaled image.

### Logging fields (one JSON line per attempt, `pixellab/prod/log.jsonl`)
- **Identity:** `asset_id` (`{race}_{sex}_{armor}_{stage}[_{anim}_{dir}]`) and `slot_id` (`CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`), `race`, `sex`, `armor`, `stage` (base / state / anim), `anim`, `weapon_group`, `attempt`.
- **Request:** `endpoint`, the full `request_body` (base64 images replaced by file path + sha), the `prompt`/`edit_description`/`action_description` text verbatim, `seed`.
- **References:** `size_ref_files` (with sha and row id), `palette_file` (+sha), `source_character_id`, `result_character_id` / `animation_id`.
- **Cost and time:** `gens_cost`, `balance_before`, `balance_after`, `started_ct`, `finished_ct`.
- **Results:** `raw_files[]`, `post_files[]`, measurements (`height[dir]`, `width[dir]`, `feet_row`, `centre_col`, `colours`, `off_palette_px`, `clipped_px`, `head_iou`, `weapon_len`), `accept` (pass/fail and which check), `prompt_patch`, `reviewer`.

## 4. Prompt templates
**Phrasing rule.** Use the L09 phrasing, which produced the preferred look: a short plain noun phrase, "with …", "wearing A, B, C and D", "empty hands".

L09 was generated with prompt enhancement ON. Its enhanced text was:
> A man with short brown hair and a determined expression, wearing a simple undyed linen tunic, a brown leather belt, wool trousers, and leather boots, standing in a steady, neutral pose with a single color outline.

We keep that sentence style and add the pixel block after it. Enhancement is **off** so the numbers survive [TEST O7].

**Coordinates.** Anchors are given as **(dx, dy) from the ground anchor**:
- dx = columns right of the centre column (viewer's right is +).
- dy = rows above the feet baseline.

That makes them valid on any canvas (base C, state CS, or the 48 cell). The canvas rows are also stated for the base.

### 4.1 Template B — base character (`description`); B-armor = the same text with the armor garments
```
{race_noun} {sex_noun} in {armor_phrase} with {hair_style} {hair_colour_word} hair and {face_trait}, wearing {garment_1}, {garment_2}, {garment_3} and {footwear}, empty hands.
Low top-down view. Figure {H} px tall and {W} px wide at the shoulders in a {C}x{C} px canvas: top of head on row {C-H}, feet on row {C-1}, body centred on column {C/2}.
Head {h_head} px, torso {h_torso} px, legs {h_legs} px ({heads} heads tall); shoulders at {H-h_head} px above the feet, belt at {h_legs} px above the feet, hands hanging at {dy_hand} px above the feet, {dx_hand} px left and right of centre.
Colours: skin {skin_b} with shadow {skin_s} and highlight {skin_h}; hair {hair_b}, shadow {hair_s}, highlight {hair_h}; {mat_1_name} {m1_b}, shadow {m1_s}, highlight {m1_h}; {mat_2_name} {m2_b}, shadow {m2_s}, highlight {m2_h}; {mat_3_name} {m3_b}, shadow {m3_s}, highlight {m3_h}; {accent_name} {acc_b}, shadow {acc_s}, highlight {acc_h}. At most {N_colours} colours.
{armor_item_1: shape, W x H px, position (dx,dy), material, colour}; {armor_item_2 …}. No weapon, shield or tool.
1 px dark outline tinted from each area's own shadow colour, no anti-aliasing, no dithering. Light from the top left, shadows on the lower right.
```
Slots:
- `{race_noun}`: human, dwarf, elf, halfling, gnome, half-elf, half-orc, tiefling, dragonborn. `{sex_noun}`: man / woman (dwarf man, elf woman …).
- `{armor_phrase}` per §5.1 ("plain work clothes" for the base; "a long robe", "light leather armor", "a mail shirt", "heavy plate armor" for B-armor).
- Garments and accent colours come from the armor row (§5.1) coloured by the race-theme block (§6). The base and the armor states never carry a weapon.
- H, W, C, `h_*`, `heads` per §6.
- `dy_hand` = round(0.36 × H); `dx_hand` = W/2 + 1.
- Ramps per §5.1 (materials), §5.2 (weapons) and the race-theme block (§6: trim/accent, motifs).
- `N_colours` 32 [TUNE].

**Facing phrases** (animations only, all 8 directions; the base generates all 8 rotations):
- S: "facing the viewer"
- SW: "facing down and to the left, three-quarter front view"
- W: "facing left, left side profile"
- NW: "facing up and to the left, three-quarter back view"
- N: "facing away from the viewer"
- NE: "facing up and to the right, three-quarter back view"
- E: "facing right, right side profile"
- SE: "facing down and to the right, three-quarter front view"

### 4.2 State template (`edit_description`, imperative; always end with the KEEP clause)
**KEEP clause:**
```
Keep {his|her} face, hair, skin, body proportions, standing pose, empty hands and 1 px self-tinted outline exactly the same; the figure stays {H} px tall with the feet on the same baseline and centred on the same column. No weapon, shield or tool. Everything stays inside a 48 x 48 px box around the feet.
```
- **S-armor:**
  ```
  Change {his|her} clothes to {armor_phrase}: {garment list with shapes, px sizes and positions (dx,dy)}. Colours: {mat_1_name} {b}, shadow {s}, highlight {h}; {mat_2 …}; {theme trim/tabard/robe colour ramp}; {emblem: shape, px, position, hex}. {helm: none | open-face helm, 1 px rim, face visible}. At most {N_colours} colours. + KEEP
  ```

### 4.3 Animation templates (`action_description`: movement only, plus pixel constraints)
**Constraint tail (append to every animation):**
```
The feet stay on the baseline, the head and body keep their size, {the {object} stays exactly {L} px long, } and nothing leaves the 48 x 48 px box around the feet.
```
**Object block (attacks and prop animations; the object exists only in this clip):**
```
{He|She} holds a {object}: {L} px long ({part lengths}), {width} px wide, {material} {b} with shadow {s} and highlight {h}, in {his|her} {hand} hand at ({dx},{dy}); the {object} keeps exactly this length and shape in every frame.
```
ANIM codes for the slot ID in brackets.

**Life (10):**
- **A-idle** [IDLE] (4 f, loop): `standing idle breathing in 4 frames: the chest and shoulders rise 1 px and fall back; the arms sway 1 px; the feet stay planted.` + tail.
- **A-walk** [WALK] (4 f, loop): `walking in place in 4 frames: frame 1 left foot forward, frame 2 passing with both feet under the body and the head 1 px higher, frame 3 right foot forward, frame 4 passing; the arms swing opposite to the legs by 2 px.` + tail.
- **A-work** [WORK] (6 f, loop): object block (the armor state's work tool, §5.1) + `{work motion} in 6 frames as a loop: frames 1-2 {raise}, frame 3 {contact}, frames 4-6 {return}; the workpiece stays fixed in place.` + tail.
- **A-sleep** [SLEEP] (6 f, loop): `lies down on {his|her} side and sleeps in 6 frames: frames 1-3 lowers to the ground and lies on the side, the body {H} px long and at most {W+2} px tall, frames 4-6 slow breathing, the chest rising 1 px; eyes closed.` + tail (lowest pixel on the baseline).
- **A-sit** [SIT] (6 f): `sits down cross-legged on the ground in 6 frames: frames 1-3 bends the knees and lowers, frame 4 seated with the hands on the knees, frames 5-6 breathing 1 px; the seated figure is {round(0.62 H)} px tall.` + tail [C: ground sit vs chair sit, O24].
- **A-eat** [EAT] (6 f, loop): object block (a wooden bowl 5×3 px and spoon 4 px, or a mug 3×4 px [C]) + `eats in 6 frames as a loop: frames 1-2 lifts the spoon to the mouth, frame 3 eats, frames 4-5 lowers it to the bowl, frame 6 pause.` + tail.
- **A-carry** [CARRY] (6 f, loop): object block (a wooden crate 10×8 px held at the chest at (0,22)) + `walks carrying the crate in 6 frames: legs step left, pass, right, pass, left, pass; the arms stay locked around the crate.` + tail.
- **A-hurt** [HURT] (6 f): `flinches from a hit in 6 frames: frame 1 standing, frame 2 recoils 2 px back with the head snapped back, frames 3-4 hunched, frames 5-6 recovers to standing.` + tail.
- **A-knockdown** [KNOCKDOWN] (6 f): `is knocked down in 6 frames: frame 1 standing, frame 2 knocked off balance, frame 3 falls backward, frame 4 hits the ground on the back, frame 5 bounces 1 px, frame 6 lying on the back dazed with the eyes open.` + tail (lowest pixel ends on the baseline).
- **A-dead** [DEAD] (6 f, last frame held): `collapses dead in 6 frames: frame 1 standing, frame 2 knees buckle, frame 3 falls to the knees, frame 4 slumps forward, frame 5 hits the ground face down, frame 6 lying still face down with the arms limp.` + tail (lowest pixel ends on the baseline). Face-down so it reads differently from KNOCKDOWN.

**Weapon attacks (8; object block from §5.2; frame 4 = strike):** [ATK_UNARMED], [ATK_DAGGER], [ATK_1H_SHIELD], [ATK_2H], [ATK_POLEARM], [ATK_STAFF], [ATK_BOW], [ATK_XBOW]:
`{attack motion from §5.2} in 6 frames: frame 1 ready pose, frames 2-3 wind-up {wind_up}, frame 4 strike {strike}, frame 5 follow-through {follow}, frame 6 return to the ready pose.` + tail (object = the weapon; for ATK_1H_SHIELD also "the shield stays exactly 12 px across on the left forearm").

**Cast (1):** [CAST] (6 f): `{cast gesture from §5.1} in 6 frames: frame 1 ready, frames 2-3 {gather}, frame 4 {release}, frames 5-6 return to ready.` + tail; a glow of at most 3 px only if O3 allows.

## 5. Armor and weapon sheets
[C] = needs Owner confirmation. Weapon lengths are proposals scaled to the 42 px human; there is no chart row for weapons [C]. Materials use the shared ramps below; trim, tabard/robe colour, motifs and accents come from the race-theme block (§6), so the same armor differs by race.

Shared material ramps (all from the master palette):
- **Steel:** #8c9da9 / #55636f / #ede9de
- **Iron:** #606568 / #3a3e42 / #7c8389
- **Leather:** #734f2d / #49331e / #a2713f
- **Linen:** #c8c3b7 / #a39984 / #ede9de
- **Wool brown:** #674a35 / #423023 / #91694a
- **Oak:** #834a34 / #583224 / #b06a4b
- **Gold:** #f7c03d / #a2713f / #fff2a3
- **Hide:** #91694a / #674a35 / #c8c3b7

Glows [C: whether states may carry a glow at all, O3]: arcane #7bc0e3, divine #dedf5e, nature #91b851, fel #be65fa, fire #f26018. Default: no glow; one generic ≤3 px glow per race theme if O3 allows.

### 5.1 Armor sheet (the base + 4 armor States)
| ARMOR | Made as | Who uses it (runtime rule) | Silhouette | Materials | Cast gesture (CAST) | Work tool / action (WORK) |
|---|---|---|---|---|---|---|
| **UNARMORED** | the v3 base | no armor worn and not a caster (commoners, villagers; unarmored barbarians/monks, O19) | plain tunic with rolled sleeves, belt with a pouch (3×3), trousers (or a long skirt per the race theme [C]), boots; chart width W | linen, wool brown, leather; race-theme trim 1 px at hem/collar | hands clasped at the chest, head bowed, then hands open forward [C] | **hoe** tilling soil (hoe 20 px, clod 6×3) [C] |
| **ROBE** | State of the base | no armor worn and a caster (O15) | ankle-length robe with wide sleeves (3 px wider than the arms), cowl or hood (per race theme), sash, belt pouch; A-line hem 2 px wider than W | linen or wool in the race-theme robe colour; 2 px motif band at hem and cuffs | both hands raised, the left tracing a 3 px rune, the right palm pushing forward [C] | grinds herbs with a **mortar and pestle** (mortar 6×5, pestle 4) [C] |
| **LIGHT** | State of the base | light armor (padded, leather, studded leather) | fitted leather jerkin to the hips, bracers (2 px), hood optional per race theme, belt pouches (3×3), soft boots | leather, wool; race-theme lining/trim | one hand thrust forward, palm open, the other at the belt [C] | fletches an arrow with a knife (arrow 14 px, knife 4) [C] |
| **MEDIUM** | State of the base | medium armor (hide, chain shirt, scale, breastplate, half plate) | mail shirt to mid-thigh, race-theme tabard with emblem (4×4), pauldrons (5×4), belt, boots; no helmet or an open coif [C] | steel/iron mail, leather, race-theme tabard | raises a holy emblem (4×4, drawn in the clip) overhead in the left hand, right palm open [C] | smith's **hammer** on an anvil (hammer 8 px, anvil 12×7) [C] |
| **HEAVY** | State of the base | heavy armor (ring, chain mail, splint, plate) | full plate: breastplate, large pauldrons (6×5), gauntlets, greaves, sabatons, **open-face helm** (1 px rim, face visible) [C], race-theme surcoat; width W+2 | steel plate, iron, leather straps, race-theme surcoat + emblem | gauntleted fist raised to the brow, then the palm thrust forward [C] | swings a **pickaxe** at a rock (pickaxe 16 px, rock 10×8) [C] |

### 5.2 Weapon-group sheet (PM proposal; Owner may change the groups and the drawn weapons)
The runtime maps the wielded SRD weapon to its group and plays that group's attack animation; each group draws one representative weapon.
| ANIM | Group | SRD weapons covered (proposal) | Drawn weapon (px, colours) | Attack motion (frame 4 = strike) |
|---|---|---|---|---|
| ATK_UNARMED | Unarmed | unarmed strike, gauntlet, improvised | none | straight right punch, then a left follow-up |
| ATK_DAGGER | Dagger / light | dagger, sickle, light hammer, handaxe (melee) | **dagger** 7 px (blade 5×1 steel, grip 2 leather) | quick reverse-grip stab |
| ATK_1H_SHIELD | One-hand + shield | longsword, shortsword, scimitar, rapier, mace, club, morningstar, flail, warhammer, battleaxe, war pick, whip | **longsword** 18 px (blade 14×2 steel, crossguard 5 gold, grip 3) + **round shield** 12 px on the left forearm (oak, 1 px iron rim, 3 px steel boss) | rising diagonal slash behind the shield |
| ATK_2H | Two-hand | greatsword, greataxe, maul, greatclub | **greatsword** 22 px (blade 17×2, crossguard 6, grip 4) [C: or greataxe] | two-handed overhead downward cut |
| ATK_POLEARM | Spear / polearm | spear, trident, glaive, halberd, pike, lance | **spear** 30 px (shaft 26×1 oak, head 4×2 steel) | two-handed forward thrust |
| ATK_STAFF | Staff | quarterstaff | **quarterstaff** 30 px oak, 1 px iron caps | two-handed sweep |
| ATK_BOW | Bow | shortbow, longbow | **shortbow** 20 px tall yew, 1 px string, arrow 14 px [C: longbow 30] | draw to the cheek, release, recover |
| ATK_XBOW | Crossbow | light, heavy, hand crossbow | **light crossbow** 12 long × 14 wide, oak stock, iron arms, bolt 8 px | aim, release, reload |

Not covered by a group (O25): thrown weapons (javelin, dart, sling, net, blowgun, thrown handaxe/dagger). Proposal: thrown weapons reuse ATK_DAGGER (small) or ATK_POLEARM (javelin) with a projectile FX, pending the Owner.

Race-theme examples (for the theme block in §6 [C]): dwarf heavy = squared plate with rune bands and a braided beard over the breastplate; elf light = leaf-cut leathers in green/silver; tiefling robe = dark red robe with ember trim; half-orc medium = hide-and-scale with tusk motifs.

## 6. Race sheet
Heights come from `scale_chart.json` where it has a row (HUMAN, DWARF, ELF), and from `size_classes.json` for the rest. [G] marks a gap or conflict; §8 lists them.

**Race-theme block (one per race, R15) [C, to be filled with the Owner]:** `theme_accent` ramp, `theme_trim` ramp, robe/tabard colour, motif (e.g. dwarf rune bands, elf leaf cuts), preferred materials, silhouette cues (helm shape, hood, beard/ears/horns handling). The same block fills all five armor-state prompts for that race and also the race's buildings, walls, furniture, workstations, constructed objects, UI window skin and faceset background.

Formulas:
- `h_head = round(H / heads)`.
- Legs: ≈38 % of H for tall races, 30 % for dwarf, 28–33 % for small races.
- Torso = the remainder.
- Canvas C = the smallest multiple of 4 ≥ H+2 (v3 minimum 32; ≤48 because the frame is 48).
- Armor-State canvas = C (CS = C+4 only if the armor widens the figure past the canvas); animations return a larger canvas (44 → 64).
- Top row in C = C−H; feet row = C−1; centre column = C/2.

| Race | Source row | H target (min–max) | W target (min–max) | Heads | Head / torso / legs px | C | CS | Top row | Palette notes (base / shadow / highlight) |
|---|---|---|---|---|---|---|---|---|---|
| Human | scale_chart HUMAN_ADULT | **42** (40–44) | 18 (14–22) | 3.2 (chart 3.0–3.2) | 13 / 13 / 16 | 44 | 56 | 2 | skin #dc906b / #b06a4b / #cfb38d; hair (brown) #734f2d / #49331e / #a2713f. One skin tone per sprite [G2] |
| Dwarf | scale_chart DWARF_ADULT | **36** (34–38) [G1: size_classes says 32 (28–35)] | 20 (18–24) | 2.8 (chart) | 13 / 12 / 11 | 40 | 52 | 4 | skin #dc906b / #b06a4b / #cfb38d (ruddy); beard (red-brown) #a16147 / #764432 / #cf8667, beard 6–8 px long; broad shoulders W 20 |
| Elf | scale_chart ELF_ADULT | **43** (42–46) [G1: size_classes says 39 (33–44)] | 16 (14–18) | 3.3 (chart) | 13 / 13 / 17 | 48 | 60 | 5 | skin needs a pale ramp [G3]: proposed #cfb38d / #a3845f / #ede9de; hair (pale gold) #d3b680 / #a88c5d / #fff2a3; pointed ears 3 px |
| Half-elf | size_classes RACE_HALF_ELF | **39** (35–42) | 18 (14–22) [PROPOSED; suggest 17] | 3.2 [G4 proposed] | 12 / 12 / 15 | 44 | 56 | 5 | skin #dc906b / #b06a4b / #cfb38d; hair (dark brown) #583224 / #38291c / #834a34; ears 2 px |
| Halfling | size_classes RACE_HALFLING | **21** (21–21) [G5: readability floor 26–28 OFF] | 18 listed (copied human, PROPOSED) [G6: suggest 12] | 2.3 [G4] | 9 / 5 / 7 | 32 | 44 | 11 | skin #dc906b / #b06a4b / #cfb38d; curly hair #834a34 / #583224 / #b06a4b; bare large feet 3 px |
| Gnome | size_classes RACE_GNOME | **25** (21–28) [G5] | 18 listed (PROPOSED) [G6: suggest 13] | 2.4 [G4] | 10 / 7 / 8 | 32 | 44 | 7 | skin #cfb38d / #dc906b / #ede9de; white hair #ede9de / #b4aba1 / #e2eff8; big nose 2 px |
| Half-orc | size_classes RACE_HALF_ORC | **41** (35–46) | 18 listed (PROPOSED) [G6: suggest 20, bulkier] | 3.0 [G4] | 14 / 12 / 15 | 44 | 56 | 3 | skin (grey-green) #809c73 / #5b7353 / #3d523a; black hair #27272b / #161618 / #464754; tusks 1×2 px #ede9de |
| Tiefling | size_classes RACE_TIEFLING | **42** (35–46), horns included in H [G7] | 18 (14–22) | 3.1 [G4] | 13 / 13 / 16 | 44 | 56 | 2 | skin needs a red/violet ramp [G3]: proposed #b06a4b / #834a34 / #cf8667 (or #b5280d reds); horns #4e3e33 / #28231e / #6e6457 (3 px curved); dark hair #333b45 / #1c2126 / #525d6b; tail 8 px |
| Dragonborn | size_classes RACE_DRAGONBORN | **47** (46–48) | 18 listed (PROPOSED) [G6: suggest 20] | 3.3 [G4] | 14 / 15 / 18 | 48 | 60 | 1 | scales (bronze; one ancestry, others by palette swap [G8]) #a2713f / #834a34 / #d0995c; belly scales #cfb38d / #ba8c66 / #fff2a3; snout +3 px in side views; no hair |

**Palette gaps [G3]:** the master palette (226 colours) has thin skin ramps. It has no pale elf skin, no tiefling red/violet skin, and few light warm tones (known since trial B09/B10). Proposal: add a `pal_skin_hair` block of ≤24 colours, Owner-approved, to the palette authority.

## 7. Worked example — human man: base, MEDIUM state, three animations
Values: H=42, W=18, C=44, heads 3.2, head 13 / torso 13 / legs 16, top row 2, feet row 43, centre column 22; dy_hand 15, dx_hand 10; size refs scale_chart.json@f3af0b11 CHARACTER_HUMAN_ADULT + strip@5ce5cefe. The dark red stands in for the human race-theme colour [C]. Only S-direction text is shown; every animation runs in all 8 directions with the facing phrases in §4.1.

**Base (UNARMORED)** (`create-character-v3`, image_size 44×44, low top-down, mannequin, single color outline, medium detail, enhance_prompt false, no_background true; slot prefix `CH.HUMAN.M.UNARMORED`)
```
human man in plain work clothes with short brown hair and a determined face, wearing an undyed linen tunic with rolled sleeves and a 1 px dark red hem, a brown leather belt with a small pouch, brown wool trousers and brown leather boots, empty hands.
Low top-down view. Figure 42 px tall and 18 px wide at the shoulders in a 44x44 px canvas: top of head on row 2, feet on row 43, body centred on column 22.
Head 13 px, torso 13 px, legs 16 px (3.2 heads tall); shoulders at 29 px above the feet, belt at 16 px above the feet, hands hanging at 15 px above the feet, 10 px left and right of centre.
Colours: skin #dc906b with shadow #b06a4b and highlight #cfb38d; hair #734f2d, shadow #49331e, highlight #a2713f; linen #c8c3b7, shadow #a39984, highlight #ede9de; wool trousers #674a35, shadow #423023, highlight #91694a; leather belt and boots #734f2d, shadow #49331e, highlight #a2713f; trim #b5280d, shadow #6d1109, highlight #cf8667. At most 32 colours.
Belt pouch 3 x 3 px at the right hip at (-6,15). No weapon, shield or tool.
1 px dark outline tinted from each area's own shadow colour, no anti-aliasing, no dithering. Light from the top left, shadows on the lower right.
```
**MEDIUM armor State** (`create-character-state`, use_color_palette_from_reference false, state_name "Medium"; slot prefix `CH.HUMAN.M.MEDIUM`)
```
Change his clothes to a mail shirt with a tabard: a steel mail shirt to mid-thigh with short sleeves, a dark red tabard from the shoulders to the knees with a 4 x 4 px gold sun emblem centred on the chest at (0,24), rounded steel pauldrons 5 x 4 px on each shoulder, a brown leather belt and brown leather boots. Colours: steel mail #8c9da9, shadow #55636f, highlight #ede9de; tabard #b5280d, shadow #6d1109, highlight #cf8667; gold #f7c03d, shadow #a2713f; leather #734f2d, shadow #49331e, highlight #a2713f. No helmet. At most 32 colours. Keep his face, hair, skin, body proportions, standing pose, empty hands and 1 px self-tinted outline exactly the same; the figure stays 42 px tall with the feet on the same baseline and centred on the same column. No weapon, shield or tool. Everything stays inside a 48 x 48 px box around the feet.
```
**ATK_1H_SHIELD** on MEDIUM (v3, 6 frames; `color_image` = `pal_human_medium_1h_shield`)
```
He holds a longsword: 18 px long (blade 14 px, crossguard 5 px wide, grip 3 px), the blade 2 px wide, steel #8c9da9 with shadow #55636f and a 1 px #ede9de edge, gold #f7c03d crossguard, in his right hand at (-9,22); on his left forearm a round shield 12 px across at (+8,20), oak #834a34 with a 1 px iron rim #606568 and a 3 px steel boss #8c9da9; the longsword and shield keep exactly this length and shape in every frame. Rising diagonal sword slash behind the shield in 6 frames: frame 1 ready pose with the sword over the right shoulder, frames 2-3 wind-up drawing the sword back and down to the right hip, frame 4 strike sweeping the blade up and across the body to the upper left, frame 5 follow-through with the blade high on the left and the shield tucked in, frame 6 return to the ready pose. The feet stay on the baseline, the head and body keep their size, the longsword stays exactly 18 px long, the shield stays exactly 12 px across on the left forearm, and nothing leaves the 48 x 48 px box around the feet.
```
**ATK_BOW** on MEDIUM (v3, 6 frames)
```
He holds a shortbow: 20 px tall and 2 px thick, yew #734f2d with shadow #49331e, string 1 px #c8c3b7, in his left hand at (+10,24), and an arrow 14 px long, shaft #a2713f with a 2 px steel tip #8c9da9; the bow and arrow keep exactly this length and shape in every frame. Shooting the shortbow in 6 frames: frame 1 ready with an arrow nocked, frames 2-3 draws the string back to the right cheek, frame 4 releases with the string snapping forward and the arrow leaving, frame 5 follow-through with the bow arm steady, frame 6 lowers the bow to the ready pose. The feet stay on the baseline, the head and body keep their size, the shortbow stays exactly 20 px tall, and nothing leaves the 48 x 48 px box around the feet.
```
**SLEEP** on MEDIUM (v3, 6 frames, loop)
```
Lies down on his right side and sleeps in 6 frames: frames 1-3 kneels and lowers to the ground and lies on his side, the body 42 px long and at most 20 px tall, frames 4-6 slow breathing with the chest rising 1 px; eyes closed. The lowest pixel stays on the baseline, the head and body keep their size, and nothing leaves the 48 x 48 px box around the feet.
```

## 8. Open items needing Owner decision
- **O1 Height conflicts [G1].**
  - Dwarf: scale_chart 36 px (34–38) vs size_classes 32 px (28–35).
  - Elf: scale_chart 43 (42–46) vs size_classes 39 (33–44).
  - This draft uses scale_chart (Owner-named). Pick one; the other file should be fixed.
- **O2 Cast gestures per armor state** (§5.1): one CAST clip per armor state serves every class wearing it, and no weapon or staff is drawn in it (a staff wizard casts empty-handed). Confirm the five gestures.
- **O3 Glows in CAST clips.** Is a small glow (≤3 px) allowed in the cast animation, or are all spell visuals separate FX layers? A glow needs a palette entry in the clip palette.
- **O4 Action frames.** Frame class MEDIUM/SMALL is 48×48. Big weapons (greatsword 22, staff and spear 30) are designed to fit inside the 48 box, but swings may clip. Should action clips be allowed a 64×64 (or 48×64 TALL_MEDIUM) frame? Default: fit into 48, clip = retry.
- **O5 (resolved 16:46 CT):** the base and armor states carry no weapon; weapons appear only in attack animations. Consequence: idle, walk and the life clips show no weapon at all (a guard walks empty-handed) [C: accept, or add weapon-carry idle/walk variants later].
- **O6 Weapon groups and work tools** (§5.1, §5.2, all [C]). The 8 groups and their drawn weapons are PM proposals; one-hand weapons used without a shield still play ATK_1H_SHIELD (shield drawn) unless a no-shield variant is added (+8 calls per armor state). One WORK clip per armor state shows one tool; colony jobs (mining, farming, smithing) will not match it unless job visuals come from shared overlays/props.
- **O7 Prompt enhancement off.** L09's preferred look was made with enhancement ON. First production call: A/B base human with `enhance_prompt` false vs true (2×2 gens).
- **O8 Small races [G5]:** halfling 21 px / gnome 25 px at the v3 minimum canvas of 32 (the model tends to fill the canvas). Turn on the readability floor (26–28 px)? The first gnome and halfling are test calls.
- **O9 Widths [G6]:** size_classes copies the human width (14–22) to the small races and to dragonborn/half-orc with status PROPOSED. Suggested widths: halfling 12, gnome 13, half-orc 20, dragonborn 20.
- **O10 Head ratios [G4]** for races the chart lacks (half-elf 3.2, half-orc 3.0, tiefling 3.1, dragonborn 3.3, gnome 2.4, halfling 2.3): proposed.
- **O11 Palette [G3]:** add a ≤24-colour skin/hair block (pale elf, tiefling red/violet, more warm light skins) to the master palette. Also: one skin tone per race sprite, or 2–3 palette-swap variants (0 gens, local) to match faceset people [G2].
- **O12 Dragonborn ancestry [G8]:** one bronze sprite plus palette swaps for the other ancestries (0 gens)?
- **O13 Tiefling horns and tail [G7]:** counted inside the 42 px height (proposal) or on top?
- **O14 Budget** (§9).
- **O15 Robe vs unarmored** for units wearing no armor. Proposal: robe if the highest-level class is a caster (bard, cleric, druid, sorcerer, warlock, wizard) [C: or only wizard/sorcerer/warlock]; unarmored otherwise.
- **O16 Class in the portrait.** "Class shows in the portrait": per-class portrait art would multiply the faceset presets by class; proposal: a class badge/frame on the portrait and the class name/icon in the selected-unit panel, with no extra generation [C].
- **O17 Children and elders** are not in the 18 bases. Proposal: child and elder bases per race × sex later (each base = 2 + 19 × 8 calls, UNARMORED only) [C].
- **O18 8-direction sheet layout** for the RMMZ 8-way movement plugin (row order, walk playback).
- **O19 Unarmored classes** (barbarian, monk) look like commoners on the map; accepted per "classes may look alike" unless the Owner wants an exception.
- **O20 (resolved 16:46 CT):** no fixed weapon per look; shields appear only in ATK_1H_SHIELD.
- **O21 Blade drift (main risk).** The weapon exists only in the animation; L11 drifted 13–18 px. Acceptance is ±1 px per frame (§3 Step 3), so the **first test is one armor state (proposal: human man MEDIUM) with all 8 weapon animations × 8 directions** (§9). If drift persists after retries, fall back to one of: a weapon-in-hand armor-state variant per group (+20 per group per armor state), or local weapon repaint on the frames.
- **O22 Lying poses.** SLEEP, KNOCKDOWN and DEAD end lying down; v3 animations without an `end_frame` may not reach a clean lying pose. Option: generate one lying pose per armor state (a State, +20) and pass it as `end_frame` [C].
- **O23 Sit.** Ground sit (proposal) vs sitting on furniture (needs chair alignment per furniture sprite).
- **O24 Life list** (idle, walk, work, sleep, sit, eat/drink, carry, hurt, knocked down, dead) is the PM list; the Owner may edit it. Each added clip costs 8 calls per armor state (~720 gens for all 90).
- **O25 Thrown weapons** have no group (§5.2).

## 9. Generation estimate (v3: 18 bases + 72 armor States + 90 × 19 animations × 8 directions)
| Item | Count | Calls | Gens (first pass) |
|---|---|---|---|
| Bases (v3, C ≤ 64, ~2 each) | 18 | 18 | 36 |
| Armor States (20 each at CS ≤ 84; web 20–40) | 72 | 72 | 1,440 (–2,880) |
| Animations (90 armor states × 19 × 8 directions, ~1 gen each at C ≤ 64; up to 2 for larger canvases) | 13,680 | 13,680 | 13,680 (–16,400) |
| **First pass** | | **13,770** | **~15,160 (range ~15,200–19,300)** |
| Retries (bases 30 %, States 20 %, animations 25 %) | | | +11 / +288–576 / +3,420–4,100 → **~18,900–24,000** |

- Per race × sex: 2 + 4 × 20 + 5 × 19 × 8 = **842 gens** first pass (low).
- Per armor state: 152 animation calls (10 life × 8 = 80, 8 attacks × 8 = 64, cast × 8 = 8).
- The Owner's 16:46 rough figure (13 animations, ~11k) is superseded by the 16:47 list (19 animations): ~15.2k, matching the Owner's ~15k expectation.
- **First test (O21, before anything else):** human man base (2) + MEDIUM State (20) + 8 weapon attacks × 8 directions (64) = **86 gens (~110 with retries)**; add IDLE + WALK (16) for the contact sheet if wanted.
- 8-direction animation: the animation share is 8 calls per clip instead of 4 (2× the v1 4-direction method); States and bases are unaffected (the State API always returns 8 rotations).
- For comparison: v1 (216 class sprites, 4-dir animations) 28,080–32,400; v2 (90 characters × 6 States, 8-dir) 14,220–17,820. The v3 total is inside the ~40k the Owner accepted. Current balance 9,741 vs hard stop 9,740: **no usable budget** until a top-up.

Cost levers (Owner choice):
- **(a)** Trim the life list (each clip is 8 calls per armor state, ~720 gens for all 90).
- **(b)** Share life clips that hide the armor little (e.g. SLEEP) across armor states: not recommended (the outfit must match).
- **(c)** Diagonal directions are free for bases and States (always 8 rotations); animations are not.
- **(d)** No mirroring (handed weapons), so no savings there.

## 10. Manifest and files
- Prompts are generated by code from §4 with slot values from `pixellab/prod/slots/{race}.json` (incl. the race-theme block), `{armor}.json` and `{weapon_group}.json` (to create). Every call is logged per §3.
- Outputs go to `pixellab/prod/{race}/{sex}/{armor}/` (raw, post, sheets, contact); packed clips are named by slot ID `CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`.
- This standard supersedes the class-sprite parts (now character-sprite parts; §3.0 still says 216 per class and needs a pointer update) of `DEUS_GENERATION_RECIPES.md` §3.0/§3.1 where they differ.

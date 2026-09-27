# DEUS Depth Demo

Owner-review demo for pixel-perfect depth cues. Every cue starts off, so a registered plugin still draws the map the way DEC-011 requires: 1:1, no blur, no filter, no parallax, no fractional scale.

This lane does not generate art or audio. Cliff, wall, ramp, shadow, glow and marker slots below are names for the Owner to draw. The demo paints placeholder rectangles only.

**Task:** `DEUS-TSK-DEPTH-DEMO` (not a WBS id). **Files:** `game/js/plugins/DEUS_DepthCues.js` (math), `game/js/plugins/DEUS_DepthDemo.js` (demo scene, benchmark, map overlay), `game/data/DEUS_DepthDemo.json` (baked ramps and the small scene). **Load:** after `DEUS_Depth`. The PM adds both plugins to `plugins.js` at merge. This lane does not edit that file or `DEUS_Core.js`.

`DEUS_Depth.js` is unchanged. The demo does not put a filter on its planes.

## 1. Defaults

| Setting | Off position |
|---|---|
| Boolean cues | all false |
| Render scale | 1 |
| Light | `off`, blur false |
| Dim falloff | 0 (no dim ring) |
| Day length | null (the sim clock is not replaced) |
| Camera offset | 0, 0 |
| Parallax step | 1 px, and the cue is off so the offset is 0 |

AS-RENDER-001 says the game's own presentation default is 2×. This demo does not apply that. Scale stays 1 until the toggle is set. `recommendScale` records the production hint (2× at 1920 px wide, 3× at 2560 and 3840) and is not applied at boot.

## 2. Geometry

The demo uses A9c items 26 and 29:

| Quantity | Value |
|---|---|
| Cell | 5 ft, 48 px |
| Layer | 5 ft, 48 px |
| Quarter | 1.25 ft, 12 px, four per layer |
| `stratumPx` | 12, 12, 12, 12 |
| Layers | 32, z = −16..+15 |
| Half-step | 2 quarters, 24 px |
| Torch | 192 px bright + 192 px dim (4 tiles + 4 tiles) |
| View | RMMZ top-down 3/4. No oblique projection |

Code that still measures a layer as 10 ft is flagged here and left alone (those files are outside this lane):

| File | What is still 10 ft |
|---|---|
| `game/js/plugins/DEUS_World.js` | `UF.Space`: `STRATUM_FEET` 2, `STRATA_PER_LAYER` 5, `Z_STEP_FEET` 10. `rulesDistanceFeet` uses that step. |
| `game/js/plugins/DEUS_Levels.js` | `STRATA = 5`, and the comment that a level is 10 ft. |
| `art/catalogue/geometry.json` | `layerFt` 10, `layerPx` 96, `stratumPx` [19, 19, 19, 19, 20]. |

Spell text that says "10 ft" (a speed cut in `DEUS_Dnd5e.js`) is not layer geometry and is not flagged. Migrating the three rows above is `PROPOSED-AP-01` in the lane report. It is not done here.

## 3. Toggles

Boolean cues, all default false:

| Toggle | What it does when on | Asset it needs |
|---|---|---|
| `paletteShift` | Picks the baked ramp for that layer. No colour matrix. | 32 ramp variants, z −16..+15 |
| `cliffFaces` | One RMMZ cliff, wall or ramp tile where the surface drops by at least one quarter. 1 px lip. Not a stack of front strips. | `DP.CLIFF.TEMPERATE.TILE`, `DP.WALL.WOOD.TILE`, `DP.RAMP.TEMPERATE.TILE` |
| `dropShadows` | 2 px hard checker on the lower side of a drop. Light is top-left. Coverage is 0 or 1. | `DP.SHADOW.CHECKER` |
| `parallax` | Lower layers only, `depth × step` pixels on x and y. Step is a whole number. The viewed layer and anything above it stay put. | none |
| `depthMarkers` | One 16 px label per layer, z = +15 down to −16. | `UI.LAYER.MARKER` |
| `unitHeightShift` | A unit on a partial quarter is drawn `quarter × 12` px higher. | none |
| `cameraLayerEasing` | A layer change settles by whole pixels, 12 px per layer, then reaches 0. | none |
| `ditheredCutaways` | Named cells use a checker mask. Coverage is 0 or 1. Not an alpha fade. | none (code mask) |
| `crossLayerEffects` | A spell still draws on its target layer. When on, it also notes open layers between caster and target. | none |
| `glowsLightLower` | A light reaches a lower layer only through open cells. A solid floor blocks it. | none beyond the glow |
| `weatherByLayer` | Weather marks sit on each column's exposed surface, not on a buried layer. | `FX.WEATHER.LAYER` |

Other controls:

| Control | Legal values | Default |
|---|---|---|
| `scale` | 1, 2, 3 | 1 |
| `lightMode` | `off`, `per-tile`, `per-pixel` | `off` |
| `dimSteps` | 0, 2, 3 | 0 |
| `dayLengthMinutes` | null, or an integer 24..48 | null |
| blur | false only | false |

`DP.CLIFF.TEMPERATE.FACE` is the retired oblique slot. The demo never emits it.

The dual-grid Wang terrain renderer (A9c item 34) is not in this task.

## 4. Baked ramps

`game/data/DEUS_DepthDemo.json` stores one ramp record per layer and the baked swatch book. `bakeAllRamps` reproduces the records. `bakeSwatch` reproduces the swatches. Both are deterministic.

For a layer z, `stepsDown = 15 − z` (0 at +15, 31 at −16):

- `cool = stepsDown × 4` (red is pulled toward luma; blue is not)
- `desat = min(220, stepsDown × 6)`
- `dark = 256 − stepsDown × 5`

At +15 the three are 0, 0 and 256, so the source colour is unchanged. Down the stack `dark` falls, `cool` rises and `desat` rises. The applied colour is then repaired by at most a few whole-pixel channel steps so that, on the published swatches, each step is darker (10-bit luma), not more saturated, and a warm source is not warmer. A neutral stays neutral. Night is a separate baked grade, `RAMP_NIGHT`, used only when dynamic light is on and the phase is night.

Placeholder swatches in the book: ground, stone, wood, ember, neutral, warm red, leaf, cool blue. They are code colours, not drawn tiles.

## 5. Light

Modes are `off`, `per-tile` and `per-pixel`. Blur cannot be turned on. There is no bloom and no colour-matrix filter.

A torch or fire is anchored on the tile centre (whole pixels). Bright is a solid disc: every pixel with distance² ≤ 192² is class bright. Dim, when `dimSteps` is 2 or 3, is a hard dither of that many values inside 384² and nowhere else. It is not a gradient. With `dimSteps` 0 the dim ring is unlit. Per-tile uses the class of the tile centre, so it matches per-pixel there.

Glow sprites are additive, binary alpha, no blur. Slots: `GL.TORCH.F00`, `GL.FIRE.F00`. `GL.WINDOW.F00` is recorded as an asset need; the demo scene does not place a window.

Day length, when set, is exact: milliseconds per 6 s sim tick = `minutes × 25 / 6`. 24, 36 and 48 minutes are 100, 150 and 200 ms.

## 6. Scale

Sampling is nearest neighbour: screen pixel `(x, y)` reads art pixel `(floor(x / scale), floor(y / scale))`. Adjacent screen pixels that share an art pixel are copies, not a blend. The camera offset rejects a fractional pixel.

`fitFrame` either letterboxes the scaled frame in whole pixels or shows more of the map in whole tiles. It does not stretch, and it does not pick a fractional scale.

On the live map, scale 1 leaves the canvas style alone. Scale 2 or 3 sets `image-rendering: pixelated` and sizes the canvas element to `backing × scale` pixels. The map tilemap scale stays 1, which is what `DEUS_Camera` checks. The backbuffer is not resized.

## 7. Bars, spells, selection

These stay in the frame with the cues on or off:

- An HP bar is 48×4 on the unit's own layer, including a layer below the view. The bar keeps its UI colour. The depth ramp does not repaint it.
- A spell draws on its target layer in whole pixels, with blur false. `crossLayerEffects` can add open layers between caster and target. It does not remove the target.
- Selection is a list of ids and can include more than one layer. Cues do not clear it.

## 8. Benchmark

One Node composite of a fixed scene: 32 layers (z −16..+15), 512 units, a 19×15 tile window, 8 lights. Frame time is the median-of-one-run average of 4 iterations, or 2 when the case is per-pixel or scaled. Buffer bytes are the typed arrays that composite allocates. They do not move between runs. This is the cue raster, not a captured RMMZ frame. The gate checks that every row exists and that the byte counts are the ones below. It does not fail on a millisecond.

Measured in this worktree (Node), iterations 4 / 2:

| case | scale | light | frame ms | buffer bytes |
|---|---:|---|---:|---:|
| all-off | 1 | off | 0.516 | 0 |
| toggle-paletteShift | 1 | off | 1.139 | 855 |
| toggle-cliffFaces | 1 | off | 0.587 | 0 |
| toggle-dropShadows | 1 | off | 1.075 | 656640 |
| toggle-parallax | 1 | off | 0.337 | 0 |
| toggle-depthMarkers | 1 | off | 0.252 | 0 |
| toggle-unitHeightShift | 1 | off | 0.318 | 0 |
| toggle-cameraLayerEasing | 1 | off | 0.287 | 0 |
| toggle-ditheredCutaways | 1 | off | 1.003 | 656640 |
| toggle-crossLayerEffects | 1 | off | 0.265 | 0 |
| toggle-glowsLightLower | 1 | off | 0.253 | 0 |
| toggle-weatherByLayer | 1 | off | 0.29 | 0 |
| light-per-tile | 1 | per-tile | 0.373 | 285 |
| light-per-pixel | 1 | per-pixel | 4.649 | 656640 |
| dim-2 | 1 | per-tile | 0.428 | 285 |
| dim-3 | 1 | per-tile | 0.354 | 285 |
| day-length-36 | 1 | off | 0.244 | 0 |
| scale-2 | 2 | off | 6.627 | 2626560 |
| scale-3 | 3 | off | 13.554 | 5909760 |
| glows-lower-lit | 1 | per-tile | 0.36 | 285 |
| look | 1 | off | 1.521 | 657495 |
| look-parallax | 1 | off | 1.911 | 657495 |
| look-light-tile | 1 | per-tile | 1.541 | 657780 |
| look-light-pixel | 1 | per-pixel | 18.071 | 1314135 |
| all-tile-1x | 1 | per-tile | 2.277 | 1314420 |
| all-pixel-2x | 2 | per-pixel | 25.091 | 4597335 |
| all-pixel-3x | 3 | per-pixel | 32.275 | 7880535 |
| night-torch-fire-tile | 1 | per-tile | 0.225 | 285 |
| night-torch-fire-pixel | 1 | per-pixel | 5.074 | 656640 |

`look` is palette, cliffs, shadows and markers. Per-pixel fills one 912×720 byte buffer (656640). Scale 2 and 3 are the nearest expand of that window, 4× and 9× the bytes. Palette is 285 tiles × 3 bytes. Per-tile light is one byte per tile.

Read of the times: the baked ramp, cliffs, markers, parallax, weather and the day-length toggle are well under 2 ms. A full-window hard shadow or cutaway mask is about 1 ms. Per-pixel light on the window is about 5 ms with 8 lights, and about 18 ms together with the look stack. Nearest 3× expand is about 14 ms on its own and about 32 ms with per-pixel light and every cue on. None of these rows turn a cue on by default.

Reprint: `node tools/depth_demo/bench_depth_demo.js 4 2`

## 9. Checks

`node tools/depth_demo/test_depth_demo.js`

28 checks. Each one passes on this module and fails on a mutant that breaks that check. The script prints `PASS`, `KILLED`, and a `RESULT` line. It covers defaults off, each toggle on and off, baked ramps against the JSON, whole-pixel parallax and shadows, one cliff tile per drop (no retired face slot, no oblique), 5 ft / 48 px geometry, the 10 ft flags, integer scale and nearest expand, light classes with a solid bright disc and a 2- or 3-step dither, lower-layer light only through open cells, HP bars, cross-layer spells, multi-layer selection, and the benchmark rows above.

`node tools/test_layer_render_flat.js --suite depth` is the Lane AA depth suite. This lane does not change it.

`node tools/check_deus_syntax.js` parses every `DEUS_*.js` plugin.

## 10. Live overlay

After the PM registers the plugins, `Scene_Map.update` is aliased. While the state is the default, the alias adds no sprite and does not touch the canvas. Turning a cue on draws the 8×6 demo, in the corner, as solid placeholder rectangles: ramp-coloured tiles, cliff bands, the 1 px lip, the checker shadow, a light pip per lit tile, unit blocks and HP bars. Layer labels draw when markers are on.

Console, once registered:

```
DEUS.DepthDemo.setToggle("paletteShift", true)
DEUS.DepthDemo.setScale(2)
DEUS.DepthDemo.setLightMode("per-tile")
DEUS.DepthDemo.setDimSteps(3)
DEUS.DepthDemo.setDayLength(36)
DEUS.DepthDemo.reset()
```

Headless code does not need the map. `require` the two plugins from Node.

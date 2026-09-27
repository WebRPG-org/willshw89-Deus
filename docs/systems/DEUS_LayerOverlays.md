# DEUS Layer Overlays

When the player looks down through open layers, every visible lower layer draws its effects, HP bars, status indicators, and combat and spell overlays at 1:1. Nothing in that pass blurs, tints, fogs, desaturates, fades, or scales them (DEC-011; Owner 2026-09-26 11:31 CT).

The viewed layer's own bars stay with `DEUS_Combat`. This plugin does not move them. It draws on the depth planes only, and only for units the player can actually see.

**Task:** WG.00.35. **File:** `game/js/plugins/DEUS_LayerOverlays.js`. **Hook:** `DEUS_Depth.js` calls `UF.LayerOverlays` when that plugin is loaded. The depth suite does not load it, so the hook is a null check there. Headless code is `require`d by `tools/layer_overlays/test_layer_overlays.js`. No image files are written. Bars and marks are code-filled rectangles, the same kind of placeholder `DEUS_Combat` already uses.

## 1. What is drawn

A living unit that is visible gets, in this order, bottom to top:

| Kind | What |
|---|---|
| effect | A unit effect, or a blood mark. Alpha stays 1. The 3-step blood fade from Combat U7 is not applied. |
| spell | One mark on the spell's target cell. `blur` is false. |
| rangeMarker | Whole squares, Chebyshev disk, side `(radius × 2 + 1) × 48`. |
| selection | One cell square on the unit. |
| status | Faction triangle, summon diamond, one shared condition mark, low-HP circle. Placeholders, not per-character clips. |
| hpBar | The on-map combat bar: 32×6 back, 30×4 fill, five sections. Fill `#24c424` (`[36, 196, 36]`). |
| actionBar | The 6-second action bar under the HP bar, 32×5, fill width `round(30 × progress)`. |
| hitFlash | 16×16, alpha 1, no fade. |
| floatingNumber | Native `DEUS_Pixel`, scale 1. A miss is the text `0` in `#4d7cff`. At most four, the newest four. Colours match `combat_rt` `DAMAGE_COLOR`. |

Dead units get none. A unit above the view gets none.

The depth-demo bar in `DEUS_DepthCues.hpBars` is a different widget: 48×4, UI colour `[200, 40, 48]`, `paletteShifted: false`. This lane does not change that function. It also does not retint it. Whether the on-map fight should use that 48×4 bar instead of the 30px combat bar is an open Owner question (section 7).

## 2. Where it sits

The overlay uses the same whole-pixel shift as the layer it belongs to.

- Default, cues off: the shift is the layer draw offset, which is 0 unless the caller passes one. `DEUS_Depth` still draws each plane at the tilemap's own origin (`edgeShift` 0).
- The unit's foot, when the caller does not pass a screen point, is the depth sprite foot: `((x + 0.5) × 48, (y + 1) × 48)`, then the layer shift, then `Math.round`.
- The HP bar sits on that foot the way `DEUS_Combat` does when the frame head is not known: 40 px above the foot, then 12 px higher. `x = round(footX − 16)`.
- A passed `drawX` / `drawY` is the foot already, and is rounded after the shift. `10.4, 20.2` becomes a bar at `(-6, -32)`.

On the live plane the bar is a child of the plane, not of the tilemap on screen. Its container copies the plane's entity origin, and the bar is placed on the unit sprite. The plane's own `x, y` is the layer draw offset, so the bar moves with the unit. Sprite scale stays 1, alpha stays 1, tint stays white (no extra tint; the bitmap already holds the colour), `filters` stays null.

Draw order is lower layer first. A higher opaque cell does not cover a lower bar by drawing over it: the lower unit gets no overlay at all.

## 3. What "visible" means

A unit at `(x, y, z)` is visible when all of these hold:

- `z` is an integer cell inside the view window (inclusive), and `z` is not above `viewZ`.
- Every layer strictly above `z`, up through `viewZ`, is open at that cell. One opaque cell anywhere in that column drops the unit.
- `viewZ − z` is within `maxDepth` when the caller sets it. `null` means no cap.

`DEUS_Depth` still binds at most `MaxDepth` planes (2). The live hook only paints units on those planes, and only where `skipsMainCell` and every higher plane's `skipCell` say the column is open. A layer the renderer does not draw is not visible, so it gets no sprites. The headless planner will build a deeper shaft when the caller sets `maxDepth` (the benchmark does). Whether a look down a deeper open shaft should draw overlays before those layers have planes is an open Owner question (section 7).

## 4. Depth-demo cues

Lane AP cues stay off by default. Turning them on may darken or offset a **layer**. It does not change an overlay's scale, filter, blur, fog, desaturation, alpha, or palette.

| Cue | Effect on the overlay |
|---|---|
| `parallax` | The same whole-pixel step as `DEUS_DepthCues.parallaxOffset`: `(viewZ − z) × step` on x and y, lower layers only. The overlay moves with the unit. Scale stays 1. |
| `unitHeightShift` | The unit (bar, status, flash, number, selection) rises `quarter × 12` px. Spells, range marks, and ground blood stay on the cell. |
| `cameraLayerEasing`, camera x/y | Added as whole pixels, the same shift as the layer. |
| `paletteShift`, light, dim, night | Ignored. `paletteShifted` stays false. The HP fill stays `[36, 196, 36]`. The demo bar stays `[200, 40, 48]`. |
| `scale` 2 or 3 | Ignored. Overlay scale stays 1. |
| `blur: true` | Ignored. `blur` stays false. `DEUS_DepthCues.setBlur` still rejects blur. |
| `crossLayerEffects` | The spell record lists open layers strictly between caster and target. The sprite stays on the target cell. It is not copied, filtered, or faded. |

A combined case used by the test: view z = 2, unit z = 0, tile `(3, 4)`, quarter 2, parallax step 3, camera `(2, −4)`, ease `(4, −8)`, height shift on. The layer shift is `(12, −6)`. The bar moves from `(152, 188)` to `(164, 158)`. The fall spell moves to `(156, 186)` and its `between` list is `[1]`.

## 5. Cost

`sync(world)` rebuilds only when `world.revision` changes. The same revision returns the same plan object and does not construct records, arrays, or strings. Records are taken from a pool. A second rebuild of the same scene does not grow the pool.

Occluded units, units outside the window, units above the view, and units past `maxDepth` are not given records.

The live hook hashes the plane's unit sprites into one integer. When the hash matches, it returns without creating sprites or strings. A walk changes the hash and writes sprite positions. New sprites are created the first time that unit is actually drawn.

Benchmark, one Node run in this worktree (2026-09-27). Scene: 32 layers, z = −16..+15, view z = 0, 1024 units (32 on each layer). Bench units are at 20/40 HP, so each visible unit is three overlays: faction, low HP, HP bar. `bad` is the count of overlays that are scaled, filtered, blurred, tinted, fogged, desaturated, faded, palette-shifted, or not on a whole pixel. Reprint: `node tools/layer_overlays/bench_layer_overlays.js`.

| case | reach | HP bars | lower HP bars | overlays | bad | time |
|---|---:|---:|---:|---:|---:|---|
| buried | 31 | 32 | 0 | 96 | 0 | 1.287 ms rebuild (pays for the first records) |
| shaft-depth-2 | 2 | 34 | 2 | 102 | 0 | 0.189 ms |
| shaft-depth-31 | 31 | 48 | 16 | 144 | 0 | 0.328 ms |
| cues-on | 2 | 34 | 2 | 102 | 0 | 0.123 ms; parallax dx = 6, dy = 6; scale 1; palette not applied |
| steady | 2 | 34 | 2 | 102 | 0 | 20 rebuilds 1.690 ms; 200 unchanged frames 0.008 ms and 0 new records |

The pool stops at 144 records, the largest case. Buried is the view floor opaque everywhere, so only the 32 units on z = 0 are drawn. The shaft is the cell `(0, 0)` open through every layer; every other column is opaque at the view. Units above the view are not drawn. Reach 2 adds the shaft units on z = −1 and z = −2. Reach 31 adds the shaft from z = −1 down through z = −16 (16 lower units).

Milliseconds are this machine, one run, not a gate. The gate is the counts, `bad = 0`, and `steadyAllocations = 0`.

## 6. Checks

`node tools/layer_overlays/test_layer_overlays.js`

20 checks, each with a mutant it rejects. The script prints `PASS`, `PASS <name>_mutant_killed`, and `RESULT: 40 passed, 0 failed`. Covered: lower-layer bars exist, scale is 1 even when a cue asks for 3, no filter / tint / fog / fade, whole-pixel feet and the layer offset, occluded units get nothing, the viewed-layer bar keeps the combat geometry, cue shift versus the depth-demo parallax and the untouched 48×4 demo bar, draw order, a steady frame allocates nothing, a rebuild reuses the pool, a revision bump is what publishes a new HP fill, window and reach culling, spells and the miss number and the unfaded blood mark, the four-number cap, damage colours match combat, the plan is deterministic, the live hook does not touch PIXI under Node, `DEUS_Depth` calls the bus, and the source does not generate art.

`node tools/test_layer_render_flat.js --suite depth`, `node tools/depth_demo/test_depth_demo.js`, `node tools/combat_rt/test_combat_rt.js`, and `node tools/check_deus_syntax.js` stay as they are. `DEUS_DepthCues.js` and `DEUS_CombatUI.js` are not edited.

## 7. Open questions (not decided here)

- The depth-demo HP bar is 48×4 in the UI colour. The on-map fight bar is the 30px combat bar. This lane uses the combat bar on lower layers so a unit looks the same as it does on the viewed layer. Whether those should be one bar is for the Owner.
- `DEUS_Depth` still draws at most `MaxDepth` (2) planes. This lane does not draw overlays for layers that have no plane. Whether an open shaft deeper than that should show overlays before those layers are drawn is for the Owner.

## 8. Follow-ups

- `PROPOSED-AW-01`: a read-only selection accessor on the combat engine. Fortress selection is closed over inside `combat_rt`, and `view()` copies the list. The live marks read `unit.selected` or `unit.data.selected` so the hot path does not copy that list every frame.
- `PROPOSED-AW-02`: share `DEUS_Combat`'s cached opaque-top so the lower-layer bar sits on the same head row. This lane uses the sprite frame top, or 40 px when the frame is not ready, and does not read pixels per frame.

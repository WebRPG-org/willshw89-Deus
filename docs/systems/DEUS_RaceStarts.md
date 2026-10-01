# DEUS_RaceStarts

The race-start solver places nine starts, one on each map of the 3×3 lattice, inside that race's home z range. It is a pure Node module. Nothing in New Game calls it yet; lane-fb wires that. The world is not scanned: each later race draws 1024 candidates, and a short spiral runs only when that draw finds nothing.

Written 2026-10-01 by lane-ez (WG.62.02). Lane-fn, lane-fb and lane-fh are later writers of this file.

**Files:** `game/js/sim/starts/place_starts.js`, `game/data/worldgen/race_starts.json` · **Tests:** `tools/test_race_starts.js`

## 1. Call

```javascript
const starts = require("./game/js/sim/starts/place_starts");
starts.placeStarts({
  seed: 1,
  zMin: -16,
  zMax: 15,
  reader: reader,
  table: starts.loadTable()
});
```

`table` is optional. When it is omitted the module reads `game/data/worldgen/race_starts.json`. `zMin` and `zMax` are integers and `zMin` is not above `zMax`.

The reader is injected. It is not WorldGen.

| Method | Meaning |
|---|---|
| `walkableAt(x, y, z)` | The cell can hold a start. |
| `familyAt(x, y, z)` | The D4 family string at that cell. |
| `waterAt(x, y, z)` | `true` forbids the cell. |

A reader may throw when `z` is outside `[zMin, zMax]`. The solver clamps every z before the first call, including the dragonborn preference of -13.

`placeStarts` returns:

| Field | Contents |
|---|---|
| `starts` | Nine `{ id, family, x, y, z, col, row }`. `col` and `row` come from the accepted coordinates. |
| `order` | Race ids, deepest centre first. |
| `logs` | One `"home_band_degraded"` string per degradation event. |
| `events` | `{ code, race, reason }`. `race` is null for a low ratio. |
| `ratio` | `sqrt(minD2 / maxD2)` after shifts. `0` when `maxD2` is 0. |
| `distanceOps` | How many times the distance was evaluated. |
| `shiftPasses` | Passes that looked for a move. At most 4. |
| `shifts` | `{ race, pass, fromX, fromY, toX, toY, z }` for each accepted move. |

Failure throws an `Error` whose message contains `worldgen_infeasible`, with `err.code` the same string, plus `err.race` and `err.seed`. That throw is only for a home that has no permitted standable cell (section 6). A low ratio does not throw.

## 2. Lattice and homes

The world is a 768×768 torus: three maps of 256×256 on a side. A map address in the JSON is `[col, row]`, converted from D4's `(row, col)`. The centre cell of a map is `col * 256 + 128`, `row * 256 + 128`.

The JSON lists races in table order. The solver sorts by centre z, lowest first, then by id. That run order is dragonborn, dwarf, gnome, tiefling, half-elf, half-orc, human, halfling, elf.

| Race | Family | Home z | Centre | Map | Salt | Elevated |
|---|---|---|---|---|---|---|
| dragonborn | VOLCANIC | -15..-11 | -13 | [0, 0] | 6422529 | no |
| tiefling | WILD | -4..0 | -2 | [1, 0] | 6422530 | no |
| dwarf | COLD | -10..-5 | -8 | [2, 0] | 6422531 | no |
| gnome | WET | -8..-4 | -5 | [0, 1] | 6422532 | no |
| half-elf | WET | -2..+3 | 0 | [1, 1] | 6422533 | no |
| half-orc | ARID | -1..+3 | +1 | [2, 1] | 6422534 | no |
| halfling | TEMPERATE | +2..+6 | +5 | [0, 2] | 6422535 | yes |
| human | TEMPERATE | 0..+4 | +3 | [1, 2] | 6422536 | no |
| elf | TEMPERATE | +5..+10 | +8 | [2, 2] | 6422537 | yes |

Sky is +12..+15 and holds no start. Elf's home stops at +10. The default world is -16..+15. The 9-layer test world is -4..+4.

Neighbour families, used only by the family fail-safe:

| Family | Neighbours |
|---|---|
| VOLCANIC | COLD, ARID |
| COLD | VOLCANIC, TEMPERATE, WET |
| WET | COLD, TEMPERATE, WILD |
| WILD | WET, TEMPERATE, ARID |
| ARID | WILD, TEMPERATE, VOLCANIC |
| TEMPERATE | COLD, WET, WILD, ARID |

These strings come from the reader. They are not the family names in `DEUS_Levels.md`.

## 3. Distance

On the torus, a raw delta `d` becomes `d - 768` when `d > 384` and `d + 768` when `d < -384`. A delta of ±384 stays.

```
d2 = dx² + dy² + (zWeight · dz)²
```

`zWeight` is 2. One layer is 10 ft and two cells, so the vertical term is `(2 dz)²`.

The ratio target is 13/20. It holds when `maxD2 > 0` and `minD2 * 400 >= maxD2 * 169`. The returned `ratio` is the square root of `minD2 / maxD2`, which is the quantity the 0.65 checks compare.

## 4. Drawing a candidate

Each later race has its own mulberry32 stream. The mix matches `DEUS_WorldGen`: start from the seed, add `0x6D2B79F5`, then the imul scramble. The stream seed is `(worldSeed XOR raceSalt) >>> 0`.

One candidate spends four numbers: local x, local y, z, ticket.

Local x and y are uniform inside a window of radius `centreRadius` (6) around the map centre. With offset 128 that window is local 122..134, then clamped into the map. Draws are with replacement, 1024 of them.

Z is triangular on the clipped home band. A level `z` in `[lo, hi]` has weight `(hi - lo + 1) - |z - centre|`, and at least 1. The third random number picks a level by walking that cumulative weight.

The window is there because a farthest point taken over a whole map on this torus sits on a wrap corner. Open-world layouts drawn that way landed near 0.35–0.45, and four 32-cell one-axis shifts did not reach 0.65. A uniform ±24 window stayed near 0.58–0.62. Pure maximin inside ±6, with z still free in the home band, stays at or above 0.65 on seeds 1 through 20 (0.6678 to 0.6737, measured 2026-10-01 on an open reader) and still moves when wrap or the z weight is taken out. A standable cell outside the window is still found: a failed draw falls through to a spiral of the whole map.

`candidates` must be a perfect square that divides `mapSize`. That check remains from the stratified grid the window replaced. The draw itself does not use the strata.

## 5. Who is placed where

The deepest race is the anchor. Its z is its centre, clamped into `[zMin, zMax]` **before** `walkableAt`, `waterAt` or `familyAt`. On a full world that is dragonborn at `(128, 128, -13)` when that cell is standable, dry, and VOLCANIC. The anchor is not one of the 1024 samples.

Every later race:

1. Draw 1024 candidates on the clipped band. Keep cells that are standable, dry, and the race's own family. Score them by maximin (section 5.1). No log.
2. If that pool is empty, score the same draw again, now accepting a neighbour family as well. No log.
3. If stepping the band by 1 on either side still stays inside the world and actually widens it, draw another 1024 on that wider band and accept the home family or a neighbour. No log.
4. Spiral out from the map centre at the clipped centre z: own family, then a neighbour, then any standable dry cell. The last of those logs `centre_fallback`.

### 5.1 Score

A candidate's score is its distance to the nearest start already placed. The larger score wins. With no prior start the score is the sentinel `0x3fffffff`. Ties break in this order:

1. Smaller unwrapped `dx² + dy²` to the map centre (not the torus distance).
2. Own family over a neighbour family.
3. Smaller `|z - centre|`.
4. Smaller ticket from that race's stream.

### 5.2 Spiral

The spiral walks Chebyshev shells from the map centre, `dy` outer and `dx` inner, and only the cells on the shell. It stops at the first cell the mode accepts. It does not count as a distance evaluation.

## 6. Clip, underground, and the high homes

A home `[lo, hi]` is clipped to `[zMin, zMax]` before any candidate is drawn.

- If `hi < zMin`, the band becomes the single level `zMin` and the event reason is `z_clip`.
- If `lo > zMax`, the band becomes `zMax` and the reason is `z_clip`.
- Otherwise the band is the overlap and the centre is clamped into it. A partial overlap does not log `z_clip`.

On -4..+4, dragonborn `[-15, -11]` and dwarf `[-10, -5]` become -4 and log `z_clip`. Elf `[+5, +10]` becomes +4 and logs `z_clip`. Gnome `[-8, -4]` becomes -4, which is still inside the original interval, so it does not log `z_clip`. Halfling `[+2, +6]` becomes `[+2, +4]` and its centre +5 clamps to +4. Tiefling stays inside `[-4, 0]`.

A race is underground when its home high z is below 0. Dragonborn, dwarf and gnome are underground. Tiefling's high z is 0, so tiefling is not.

When sections 5's steps place nothing:

- An underground race throws `worldgen_infeasible`.
- Any other race takes the highest standable dry cell in its map at or below `min(home high, zMax)`, scanning down to `zMin`. Halfling and elf log `elevated_surface`. A race that is neither underground nor elevated logs `surface`.
- If that scan is also empty, the solver throws `worldgen_infeasible`.

Family relaxation and the ±1 z step do not log. `centre_fallback`, `elevated_surface`, `surface`, `z_clip` and `low_ratio` do, all as `home_band_degraded`.

## 7. Shifts

After the nine starts exist, a ratio below 13/20 starts the shift loop. At most four passes. Each pass moves one end of the closest pair.

The closest pair is the minimum `d2`. An equal distance keeps the lower indices. The mover is the start with the smaller distance to the border that faces the other. An equal border distance moves the higher index. The step is one axis, the larger of `|dx|` and `|dy|`, pointing away from the other start along the torus delta. That is inward from the shared border.

The pass tries distances 32 down to 1. A landing is kept only when all of these hold:

- it is still on that race's map
- its z is inside `[zMin, zMax]`
- `walkableAt` is true and `waterAt` is false
- the global ratio strictly improves (`min1 * max2 > min2 * max1`)

Family is not required for a shift. Among legal landings, the better ratio wins, and an equal ratio keeps the longer step. If the preferred mover has no such landing, the other end is tried. A pass that cannot move stops the loop.

Every accepted shift and every centre fallback goes through that map, bounds, standability and water check. A landing that fails is not written. The 1024-draw uses its own family filter, so the shift check and the sample check are separate.

If the ratio is still below 13/20 when the loop ends, the layout is kept and `home_band_degraded` is logged with reason `low_ratio`.

## 8. Cost

Each `d2` adds one to `distanceOps`. The anchor does none. Eight races against 1..8 priors are `1024 * 36 = 36864` evaluations. The shift loop then measures all 36 pairs twice when the ratio is already met, which is 36936 on an open world. The second 1024-draw runs only when the first draw's own-family and neighbour pools are both empty. The cap is 100,000.

## 9. Not this module

New Game, reachability, founders, relations and the ally hearth link are other lanes. There is no playtest path until lane-fb. The module does not read `window` and does not call WorldGen.

# Temperate biome: art still needed (static, no animation)

Compiled by Claude (PM) on 2026-09-30 from `art/catalogue/catalogue.json`, the generation cards (`docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md`, as fixed by CARDS-1), DEC-045 and the DEC-046 static-first amendment. The Owner generates all art (DEC-007); every row here needs a catalogue row before generation and the Owner's YEA before it enters the game.

- **Scope:** the TEMPERATE family's surface (Lowlands) plus the underground floors beneath it.
- **Out of scope:** animation, the frozen civilization tier, and other biomes.
- **Scale:** 48 px per 5-ft cell, ~42 px adult human, native 1:1.
- **Status words:**
  - MISSING: no art.
  - OLD: art exists from before the 2026-09-29 art restart and needs a redo or Owner sign-off.
  - STOCK / STAND-IN: an RMMZ or U7 placeholder.
  - APPROVED: Owner-approved.

## 1. Terrains in this biome (17)
- Surface: meadow, dirt, forest floor, needle floor, shrub soil, dry grass, mud, swamp mud, sand, stony, scree, rock, peak rock, road.
- Underground floors: cave floor, mined soil ("dug earth"), mined stone.

## 2. Ground tiles: 38 tiles (48x48), Maps -> Create Tiles Pro
| Pieces | Count | Status |
|---|---|---|
| Base / damp / dry triplets (DEC-045) for dirt, forest floor, dry grass, rock, stony, shrub soil, needle floor, mud, swamp mud, sand, scree | 33 | MISSING (the parked set was rejected) |
| Single tiles: peak rock, road, cave floor, mined stone, mined soil | 5 | MISSING |
| Meadow triplet | 0 | Owner's own art: pick damp/base/dry from the six variants |

The base tile of each kind is tool-tiled into its A2 autotile block (96x144). That is derived, not drawn.

## 3. Natural walls the running game draws today: 6 pieces
The 48x96 wall's top half is a black cap drawn by code. Only the lower face needs art, as an RMMZ A4 wall-side autotile.
| Piece | Size | Status |
|---|---|---|
| Rock face (AR-2100 / AR-1200 side) | 96x96 A4 side block | STOCK |
| Soil face (AR-2101 / AR-1201 side) | 96x96 A4 side block | STOCK |
| Rock top (card run 51) | 48x48 / A4 top block | STOCK |
| Soil top (card run 52) | 48x48 / A4 top block | STOCK |
| Rock strata, solid (TERRAIN_ROCK-STRATA-SOLID) | 96x120 | MISSING |
| Natural cave wall (TERRAIN_CAVE-WALL-NATURAL) | 96x120 | MISSING |

## 4. Edges, slopes and ramp sides: 112 pieces (DECIDED 2026-09-30, faces by material)
Owner: "yeah" to faces by material. Per face material (SOIL, ROCK, SAND, MUD), drawn once in the surface band; the other bands are automatic recolours; heights H1-H4 are cut from the full face by tool.
| Family | Drawn per material | Sizes | 4 materials |
|---|---|---|---|
| EDGE full faces (N/E/S/W) | 4 | 48x96 | 16 |
| RAMP cells (rise N/E/S/W x C1-C5) | 20 | 48x67, 48x86, 48x105, 48x124, 48x144 | 80 |
| RAMPSIDE full faces (N/E/S/W) | 4 | 48x96 | 16 |
| **Total** | 28 | | **112** |

Material mapping (PM, Owner may adjust):
- SOIL: meadow, dirt, forest floor, needle floor, shrub soil, dry grass, road, mined soil.
- ROCK: rock, stony, scree, peak rock, cave floor, mined stone.
- SAND: sand.
- MUD: mud, swamp mud.

The catalogue still holds the old per-terrain placeholder rows until the gated catalogue lane replaces them.

## 5. Shared depth pieces (surface band): 28
| Piece | Count | Size | Status |
|---|---|---|---|
| Height shading overlays H1-H5 | 5 | 48x48 | MISSING |
| Rim shadows N/E/S/W | 4 | 48x48 | MISSING |
| Inner walls of openings, FULL + H1-H5 | 6 | 48x96 ... 48x19 | MISSING |
| Hanging: roots, vines, stalactites, dust, light shaft, waterfall (one still frame) | 6 | 48x96 | MISSING |
| Level connectors: stairs up/down/both, ramp up/down, ladder foot/top | 7 | 48x72 | STOCK |

## 6. Water: 6 A1 autotile stills (96x144)
Fresh, pond, marsh, swamp and deep (card runs 38, 40, 42, 44, 46) are OLD; the underground pool is STOCK. The animated loops wait.

## 7. Plants and trees
| Group | Needed | Status |
|---|---|---|
| Trees | oak, birch, pine, fruit tree, fruit tree picked, swamp tree, dead tree (68x84 / 56x88 / 52x92) | OLD |
| Sapling | 28x44 | STAND-IN |
| Small plants | bush, grass tuft, generic flowers, lichen, wild grain | OLD |
| Reeds | redo in-game variants 0, 1, 5, 7 (failed QA) | APPROVED sheet, 4 variants failed |
| Cave floor life, under the biome | cave moss, glow-caps, spore reeds | OLD |
| Already approved | berry bush (both), fern, flowers blue/purple/white, lily pad, reeds, wild wheat, stump, cave mushrooms | APPROVED |

## 8. Stones, ores and deposits
| Needed | Status |
|---|---|
| Ironstone, small crystal, crystal spire, stalagmite | OLD |
| Sand deposit | STAND-IN |
| Ore veins, overlays 48x48: copper, iron, gold, gems | STOCK |
| Already approved: clay deposit, copper and gold outcrops, small rocks, crystal, granite boulder, gravel | APPROVED |

## 9. Physics you can see (DEC-046, static first): catalogue rows still to be added
| Piece | Count | Status |
|---|---|---|
| Integrity states sound / strained / failing, for rock and soil | 6 | not yet catalogued |
| Aftermath: rubble (OLD), sediment deposit, scar, ash | 4 | rubble OLD; the rest not catalogued |
| Lava, obsidian, steam (after design D2) | 3+ | not yet catalogued |

## 10. Wildlife and monsters (static, facings only)
- The 23 catalogue species are all STOCK placeholders. The temperate set: deer, boar, aurochs, wild horse, wild sheep, hare, fowl, rat, wolf, fox, wildcat, serpent, hawk, songbird, bat, plus troll, bog horror, restless dead and giant spider.
- The SRD bestiary (DEC-050, in the braintrust now) will add each creature's biome cells, tier and pixel frame. Static means 4 facings, 1 frame each.

## 11. Already made and waiting for sign-off
870 PixelLab objects that passed braintrust QA are being rebuilt into grouped image sheets. Many flowers, bushes, rocks, stumps and trees there may fill section 7 and section 8 rows without new generation.

## Not needed now
Animation loops; the frozen civilization tier (buildings, decay-wall overlays, hearth and campfire light, household items, people); other biome families; SRD items and spells (their catalogue rows come under DEC-053).

## Sync note (DEC-051)
The catalogue's band field still uses the old DEC-013 bands (SURFACE, LOWER1/2, UPPER1/2), not DEC-030's Deep Earth / Caverns / Lowlands / Uplands / Highlands. The catalogue build fix is queued as a gated data lane.

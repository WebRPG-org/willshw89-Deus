# Generation queue — Temperate, first cards

> **Superseded 2026-09-29** by `docs/art/cards/TEMPERATE_BATCH1_PROMPTS.md` (art restart; the Owner's four-part prompt structure; Tiles Pro for ground). Kept for history.

The Owner generates all the art (DEC-007 amendment, 2026-09-29: "I will generate all the art"). This is the Owner's first queue for the temperate biomes, asked for the same day: "Give me a list of items to start generating for temperate". It holds only items that are needed in the game now: every card fills a slot that the running game already draws, and needs no ruling that is still open. The complete 32-layer queue comes with the PM's art plan.

Temperate here means the biomes the live world generator places (`game/data/DEUS_WorldCatalog.json` → `biomes`):
- grassland (meadow)
- broadleaf forest (leaf litter)
- conifer forest (needle floor)
- shrubland (scrub soil)
- marsh (mud)
- swamp (swamp mud)
- the rock of hills and mountains

After you generate, Antigravity picks the result up and archives it with your settings and cost (directive 0173-S). It then snaps the art to the master palette, runs the machine checks and makes a board. The PM reviews that board, and you give the YEA in the game at 1:1.

## Settings for every Maps → Tiles card (batches 1–3)
| Setting | Value | Why |
|---|---|---|
| Shape and size | square top-down, 48 px | the game grid (AS-GLOBAL-001) |
| View | **top-down (flat)** | In this tool, "high top-down" draws the tile as a raised block with a side, about 15 % thick. A flat ground tile is how the high top-down camera sees flat ground (AS-VIEW-002). |
| Outline | segmentation | cleaner seamless edges; terrain has no outline (AS-LOCK-001) |
| Tile feature | none (plain variations) | numbered items give variants of one kind |
| Style reference | your favourite meadow tile from 2026-09-29 | so every ground kind looks drawn by one hand |
| Seed | fixed, if the page offers one | Antigravity records it at pickup |

Prompt pattern for ground, the Dryness Triplet of DEC-045 (V1 damp, V2 base, V3 dry, all within one grey-value step of each other):
`1) damp <ground> 2) <ground> 3) dry <ground>; seamless 48x48 ground texture seen from directly above, soft light from the top-left, no outlines, no shadows of objects; readable high-contrast fantasy pixel art; world feel: English folklore, in the spirit of Ultima VII and EverQuest`

Cost: about 25 generations per call (PixelLab docs: 20–25, and 20–40 with a style reference).

## Batch 1 — Ground (22 of 26 ground kinds are transparent in the game today, AUDIT A9)
| # | Ground kind | Catalogue id | `<ground>` in the prompt | Where it shows |
|---|---|---|---|---|
| 0 | meadow | `SURFACE_SHARED_TERRAIN_MEADOW_A2_DEFAULT` | **already generated**: pick damp / base / dry from your six meadow variants; generate only if none fits | grassland |
| 1 | forest_floor | `…_FOREST-FLOOR_A2_DEFAULT` | leaf litter of fallen oak and ash leaves, twigs and dark humus | broadleaf forest |
| 2 | needle_floor | `…_NEEDLE-FLOOR_A2_DEFAULT` | pine-needle forest floor, rusty-brown needles over dark earth | conifer forest |
| 3 | dirt | `…_DIRT_A2_DEFAULT` | bare brown earth with a few small pebbles | paths, cleared and dug ground |
| 4 | shrub_soil | `…_SHRUB-SOIL_A2_DEFAULT` | scrubby light-brown soil with sparse grass tufts and small stones | shrubland |
| 5 | dry_grass | `…_DRY-GRASS_A2_DEFAULT` | dry golden-brown grass | dry temperate grassland |
| 6 | mud | `…_MUD_A2_DEFAULT` | wet brown marsh mud with small puddles and reed stubble | marsh |
| 7 | swamp_mud | `…_SWAMP-MUD_A2_DEFAULT` | black peaty swamp mud with flecks of moss | swamp |
| 8 | rock | `…_ROCK_A2_DEFAULT` | bare grey rock ground, cracked and weathered | mountains |
| 9 | peak_rock | `…_PEAK-ROCK_A2_DEFAULT` | rough dark-grey crag rock | **every hill interior (draws black today)** |
| 10 | stony | `…_STONY_A2_DEFAULT` | packed earth strewn with small grey stones | stony ground |
| 11 | scree | `…_SCREE_A2_DEFAULT` | loose grey scree of angular broken stones | slopes under crags |
| 12 | sand | `…_SAND_A2_DEFAULT` | pale sand of a lake or river shore | shores |
| 13 | road | `…_ROAD_A2_DEFAULT` | packed-earth track; **one tile only, no damp or dry** (DEC-045 keeps road uniform) | tracks |

Rows are in order of how much ground they cover. That is 13 calls, about 325 generations.

## Batch 2 — Surface water (rivers and lakes draw nothing since 2026-09-24)
One Maps → Tiles call. Same settings, but **no style reference**: water must not borrow the grass look.
`1) clear fresh river water 2) still pond water 3) marsh water with duckweed 4) dark peaty swamp water 5) deep open water; seamless 48x48 water texture seen from directly above, soft light from the top-left, no outlines; readable high-contrast fantasy pixel art; world feel: English folklore, in the spirit of Ultima VII and EverQuest`

| Item | Catalogue id |
|---|---|
| fresh | `SURFACE_SHARED_WATER_FRESH_A1_DEFAULT` |
| pond | `SURFACE_SHARED_WATER_POND_A1_DEFAULT` |
| marsh | `SURFACE_SHARED_WATER_MARSH_A1_DEFAULT` |
| swamp | `SURFACE_SHARED_WATER_SWAMP_A1_DEFAULT` |
| deep | `SURFACE_SHARED_WATER_DEEP_A1_DEFAULT` |

These are still frames. The ripple animation needs a ruling first (open question 2 below). About 25–40 generations.

## Batch 3 — Under the ground and cut faces seen from above
Solid rock currently draws as timber planks and soil as brick; the cave floors are placeholders. One Maps → Tiles call, same settings, style reference your rock tile from batch 1:
`1) natural cave floor of damp grey stone 2) mined stone floor with chisel marks 3) dug earth floor with pick marks 4) solid grey rock seen from above, the top of the rock mass 5) solid packed earth seen from above; seamless 48x48 texture seen from directly above, soft light from the top-left, no outlines; readable high-contrast fantasy pixel art; world feel: English folklore, in the spirit of Ultima VII and EverQuest`

| Item | Catalogue id |
|---|---|
| natural cave floor | `ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT` |
| mined stone floor | `ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT` |
| dug earth floor | `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT` |
| rock top | `ALL_SHARED_TERRAIN_ROCK-SOLID_TOP_DEFAULT` |
| soil top | `ALL_SHARED_TERRAIN_SOIL-SOLID_TOP_DEFAULT` |

About 25–40 generations.

## Batch 4 — Temperate ground objects (Objects generator)
Tool: the Objects generator, one direction.
- Size 48: one call returns 16 candidates; pick **8 distinct** variants per type.
- Do not use rotations of one object: nine older sets were rotations, and the light moved between "variants".
- View: top-down.
- Style reference: your YEA sheets Wild Grain and Berry Bush Bare, so the objects match them.

Prompt pattern:
`<object>, 8 distinct variations, seen from high above, soft light from the top-left, 1 px self-coloured outline, transparent background; readable high-contrast fantasy pixel art; world feel: English folklore, in the spirit of Ultima VII and EverQuest`

| # | Object | Runtime type (today's stand-in) | `<object>` |
|---|---|---|---|
| 1 | grass tuft | `grass_tuft` (`!$UF_GrassTuft`) | a tuft of wild meadow grass |
| 2 | wildflowers | `flowers` (`!$UF_Wildflowers`) | a small clump of wildflowers: buttercup, clover and daisy |
| 3 | bluebells | `flowers_blue` (`!$UF_Flowers_Blue`) | a clump of bluebells, the fairy flower of the woods |
| 4 | white flowers | `flowers_white` (`!$UF_Flowers_White`) | a clump of white marsh flowers, meadowsweet and cotton grass |
| 5 | fern | `fern` (`!$UF_Fern`) | a bracken fern |
| 6 | bush | `bush` (`!$UF_Bush`) | a low hazel or blackthorn bush |
| 7 | berry bush | `berry_bush` (`!$UF_BerryBush`) | a bramble bush heavy with blackberries (the pair of your YEA bare bush) |
| 8 | reeds | `reeds` (`!$UF_Reeds`) | a clump of tall marsh reeds and bulrushes |
| 9 | lily pad | `lily_pad` (`!$UF_Lily_Pad`) | floating water-lily pads, one with a white flower |
| 10 | lichen | `lichen` (`!$UF_Lichen`) | a crust of grey-green and orange lichen on a flat stone |
| 11 | gravel | `gravel` (`!$UF_Gravel`) | a small scatter of gravel and grit |

About 11 calls, 300–450 generations.

**Already generated, needing only your look.** Two V8 sets are drawn in the game today without a YEA:
- Loose Stones (`!UF_RocksSmall_V8`)
- Granite Boulder (`!UF_GraniteBoulder_V8`)

They come to you on the next board. No generation is needed.

## Totals
Batches 1–4 come to about 700–850 generations of the 3,745 left before the refill on 2026-10-26.

## Held, and why
| Item | Waiting on |
|---|---|
| Trees: oak, birch, pine, fruit tree, swamp tree | Today's tree frames are 96×96 and the eight-variant sheet only takes 48 px frames. Agents widen the assembler first; the tree cards follow. |
| Rock and earth cliff faces, cave walls | Open question 1 |
| Water and lava ripple frames | Open question 2 |
| Transition sets (grass to dirt, grass to shore, forest to meadow) | Open question 3. Your six meadow-to-dirt sets are kept. |
| Folklore set pieces: standing stones, barrow, fairy ring, hawthorn, holy well | They have no object type in the game yet; agents add the types, then the cards follow. |
| Deep bands (caverns, deep earth) and uplands above +2 | The world generator fills only z −2..+2 today; everything below is uniform stone. Generator work comes first. |

## Open questions for the Owner
1. **Walls and cliffs from above.** How should the side of a rock or earth wall look from the high top-down camera? The black 48×96 cap comes from the suspended Rule 13.
2. **Water and lava animation.** No Maps tool makes frames. The route that stays in your tools is `animate_object` on a still water tile, looped over 3 frames. Is that allowed?
3. **Terrain transitions.** Either the game gets a renderer that draws your 16-tile corner sets directly (AS-TERR-001), or agents convert them into RPG Maker autotiles (DEC-045's current path, not yet proven).

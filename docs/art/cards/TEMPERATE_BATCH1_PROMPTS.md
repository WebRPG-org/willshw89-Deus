# Temperate batch 1 — prompt cards for the Owner

Status: **DRAFT v0.1, 2026-09-29.** Every asset has one paste-ready prompt in the Owner's four parts (World / Biome or depth band / Item / Specs). The World paragraph is provisional until the lore lock. Sources: the braintrust's part-5 kits (Astra, Grok) and AG's temperate inventory; all catalogue IDs checked present on 2026-09-29. This file supersedes `docs/art/GENERATION_QUEUE_TEMPERATE.md`.

**Tools.** Ground, water and underground: PixelLab **Maps → Create Tiles Pro** (never Create Object: the object tool draws on a transparent background and, on the Rock prompt, returned only crack patterns). Square top-down, 48 px, view high top-down, segmentation on. Ground style reference: the accepted Meadow tile; underground and caps: the accepted Rock tile (soil top: Dirt). Water: no style reference, then Animate the accepted still into 3 looping phases. Flora and stones: **Create 1-direction object**, high top-down, selective outline, medium detail, 48 px, 16 candidates, keep 8. Trees: Create 1-direction object at the native size given; optional Animate, a restrained 4-frame foliage loop with the trunk still.

**After each run.** Snap a copy to the master palette beside the original, check it at 1x then 0.5x and 2x, repeat tiles 3x3 for seams, record seed and candidate, and bring it to the Owner's QA. Nothing enters the game without the Owner's YEA. Meadow is already done (6 variants in `art/masters/`).

## 1. Ground (Create Tiles Pro, 3 variations each)

### Rock (do first) — `SURFACE_SHARED_TERRAIN_ROCK_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) rain-wet, darker grey rock ground, cracked and weathered, with quiet mineral grain 2) grey rock ground, cracked and weathered, with quiet mineral grain 3) sun-dried, paler grey rock ground, cracked and weathered, with quiet mineral grain

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Dirt — `SURFACE_SHARED_TERRAIN_DIRT_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) damp, dark bare brown loam with an even fine crumb and a few tiny pebbles 2) bare brown loam with an even fine crumb and a few tiny pebbles 3) dry, pale bare brown loam with an even fine crumb and a few tiny pebbles

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Forest floor — `SURFACE_SHARED_TERRAIN_FOREST-FLOOR_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) damp, dark leaf litter of fallen oak and ash leaves with a few small twigs over dark humus 2) leaf litter of fallen oak and ash leaves with a few small twigs over dark humus 3) dry, paler leaf litter of fallen oak and ash leaves with a few small twigs over dark humus

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Needle floor — `SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) damp, dark fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs 2) fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs 3) dry, paler fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Shrub soil — `SURFACE_SHARED_TERRAIN_SHRUB-SOIL_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) damp gritty light-brown scrubland soil with sparse grass tufts and small stones, no bush in it 2) gritty light-brown scrubland soil with sparse grass tufts and small stones, no bush in it 3) dry, pale gritty light-brown scrubland soil with sparse grass tufts and small stones, no bush in it

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Dry grass — `SURFACE_SHARED_TERRAIN_DRY-GRASS_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) after rain, a trace of green in dry golden-brown grass with sparse blades over soil 2) dry golden-brown grass with sparse blades over soil 3) parched, pale dry golden-brown grass with sparse blades over soil

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Mud — `SURFACE_SHARED_TERRAIN_MUD_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) wettest, glossy soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles 2) soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles 3) drying at the surface, soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Swamp mud — `SURFACE_SHARED_TERRAIN_SWAMP-MUD_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) wettest, glossy black peaty swamp mud with coarse organic texture and small flecks of moss, no open water 2) black peaty swamp mud with coarse organic texture and small flecks of moss, no open water 3) drying at the surface, black peaty swamp mud with coarse organic texture and small flecks of moss, no open water

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Peak rock — `SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) rain-wet, darker rough dark-grey crag rock with hard fractures, darker than ordinary rock, not loose scree 2) rough dark-grey crag rock with hard fractures, darker than ordinary rock, not loose scree 3) sun-dried, paler rough dark-grey crag rock with hard fractures, darker than ordinary rock, not loose scree

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Stony — `SURFACE_SHARED_TERRAIN_STONY_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) damp packed brown earth with small, evenly scattered weathered grey stones, sparser than scree 2) packed brown earth with small, evenly scattered weathered grey stones, sparser than scree 3) dry, pale packed brown earth with small, evenly scattered weathered grey stones, sparser than scree

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Scree — `SURFACE_SHARED_TERRAIN_SCREE_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) rain-wet, darker loose grey scree of angular broken stones with visible gaps and no intact slab 2) loose grey scree of angular broken stones with visible gaps and no intact slab 3) dry, paler loose grey scree of angular broken stones with visible gaps and no intact slab

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Sand — `SURFACE_SHARED_TERRAIN_SAND_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

1) wet, darker fine pale lake-shore sand with even grain and faint shallow ripples 2) fine pale lake-shore sand with even grain and faint shallow ripples 3) dry, palest fine pale lake-shore sand with even grain and faint shallow ripples

Specs: three separate seamless 48x48 tiles of the same material, numbered as above. Same grain scale and density in all three. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is.
```

### Road — `SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT` (one tile)
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A compacted packed-earth cart track with subdued wheel wear, lighter and smoother than bare dirt, no painted border.

Specs: one seamless 48x48 tile. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow or central object.
```

## 2. Water (Create Tiles Pro for the still, then Animate: 3 phases)

### Fresh water — `SURFACE_SHARED_WATER_FRESH_A1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Clear fresh river water, cool blue-green, with small restrained groups of moving ripples.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### Pond — `SURFACE_SHARED_WATER_POND_A1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Sheltered still pond water, slightly greener and calmer than river water, with gentle local ripples and no foam.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### Marsh water — `SURFACE_SHARED_WATER_MARSH_A1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Shallow, sediment-rich marsh water, murky olive-green, with small scattered specks of duckweed and no reeds in the fill.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### Swamp water — `SURFACE_SHARED_WATER_SWAMP_A1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Dark peaty swamp water, tea-brown to near black, with sparse floating leaf debris, clearly wetter and glossier than swamp mud.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### Deep water — `SURFACE_SHARED_WATER_DEEP_A1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Deep open water, a darker blue clearly lower in value than shallow water, with broad quiet internal wave marks.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

## 3. Underground floors and caps (Create Tiles Pro, style reference Rock)

### Cave floor — `ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A natural cave floor of damp grey stone with worn mineral grain and a little settled sediment, no walls painted in.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object.
```

### Mined stone — `ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A newly worked floor of the same grey rock, flatter than the cave floor, with restrained chisel marks and the host rock still recognisable.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object.
```

### Dug earth — `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A freshly dug floor of compacted brown earth with blunt pick marks and no surviving turf, the same soil colour as dirt.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object.
```

### Rock top — `ALL_SHARED_TERRAIN_ROCK-SOLID_TOP_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of intact grey rock seen from directly above, quiet grain matching the rock ground, reading as solid and not as walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque edge to edge, static, no thickness, border, bevel or shadow.
```

### Soil top — `ALL_SHARED_TERRAIN_SOIL-SOLID_TOP_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of packed brown earth seen from directly above, matching the dug-earth colour, reading as solid and not as walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque edge to edge, static, no thickness, border, bevel or shadow.
```

## 4. Flora and stones (Create 1-direction object, 48 px, keep 8)

### Grass tuft — `SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One compact upright tuft of mid-green grass, separate from the ground.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Wildflowers — `SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small mixed cluster of meadow wildflowers, a few tiny red, yellow and white blooms among green leaves, quiet enough to stay background vegetation.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Bluebells — `SURFACE_SHARED_FLORA_FLOWERS-BLUE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small cluster of nodding bluebells with one readable blue-violet bloom mass over strap leaves.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### White flowers — `SURFACE_SHARED_FLORA_FLOWERS-WHITE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A low cluster of small white woodland flowers with restrained bright petals over dark leaves.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Fern — `SURFACE_SHARED_FLORA_FERN_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A few broad divided bracken fronds spread in a clear fan.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Bush — `SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A quiet non-fruiting hedgerow bush with a clear rounded silhouette.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Berry bush — `SURFACE_SHARED_FLORA_BERRY-BUSH_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A low broad bramble bush with a few conspicuous dark berry clusters.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Berry bush, picked (make from the accepted berry bush) — `SURFACE_SHARED_FLORA_BERRY-BUSH-BARE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

The same bramble bush after its berries are gathered: same shape and leaves, no fruit.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Reeds — `SURFACE_SHARED_FLORA_REEDS_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A bundle of slender wetland reed stems with brown seed heads.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Lily pad — `SURFACE_SHARED_FLORA_LILY-PAD_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small group of broad round floating lily leaves with transparent gaps where the water shows through.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Lichen — `SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A flat crust-like patch of pale grey-green lichen, shaped as if growing on exposed rock.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Gravel — `SURFACE_SHARED_STONE_GRAVEL_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small loose deposit of angular grey gravel in discrete pieces.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Loose stones (already generated; redo only if it fails QA) — `ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A loose group of a few separate weathered grey stones.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### Granite boulder (already generated; redo only if it fails QA) — `SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One heavy blocky speckled-grey granite boulder with a clear ground contact.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

## 5. Trees (Create 1-direction object at native size)

### Oak, 96x96 — `SURFACE_SHARED_TREE_OAK_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A broad sturdy oak with a broken rounded crown and a substantial trunk.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Birch, 96x144 — `SURFACE_SHARED_TREE_BIRCH_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A slender white-barked birch with dark bark marks and a light, airy, irregular crown.

Specs: a single tree on a transparent background at native size 96x144, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Pine, 96x144 — `SURFACE_SHARED_TREE_PINE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A tall pine with tiered dark-green foliage masses and a visible reddish trunk base.

Specs: a single tree on a transparent background at native size 96x144, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Fruit tree, 96x96 — `SURFACE_SHARED_TREE_FRUIT-TREE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A modest spreading apple tree with a few readable clusters of red fruit.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Fruit tree, picked (make from the accepted fruit tree), 96x96 — `SURFACE_SHARED_TREE_FRUIT-TREE-BARE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

The same apple tree after harvest: same trunk and crown, no fruit.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Swamp tree, 96x96 — `SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A damp-ground alder with exposed arching roots and an irregular crown.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Stump, 48x48 — `SURFACE_SHARED_TREE_STUMP_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A cut oak stump with a readable pale cut face and rings.

Specs: a single tree on a transparent background at native size 48x48, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### Dead tree, 96x96 — `SURFACE_SHARED_TREE_DEAD-TREE_V1_DEFAULT`
```text
Emerys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emerys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A leafless weathered dead tree with grey bark and broken branch ends.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

## Open points for the Owner
- The World paragraph is v0.1; it changes once, at the lore lock, and each card then records the version.
- Swamp, marsh and reed assets use the Temperate paragraph (temperate wetlands). Say if they should carry the Wet biome's look instead.

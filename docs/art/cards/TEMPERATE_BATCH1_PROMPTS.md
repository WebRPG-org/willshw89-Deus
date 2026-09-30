# Temperate batch 1 — prompt cards for the Owner

Status: **DRAFT v0.1, 2026-09-29.** The Owner generates every asset here himself (DEC-007, "I will generate all the art"). These cards follow the Owner's prompt structure, "World paragraph / Faction/biome paragraph / item description / Specs". The World paragraph is provisional until the lore is locked, and it will be versioned once then. The paragraphs, item lines and specs come from the braintrust's part-5 prompt kits (Astra and Grok, 2026-09-29), adapted to AG's temperate inventory. Every catalogue ID below exists in `art/catalogue/catalogue.json` (checked 2026-09-29, 42 of 42 plus the bare and stump states).

**How to use a card.** Paste the prompt block into the PixelLab description field. Set the tool settings listed above the block. Record the seed and the chosen candidate. After generation: snap a copy to the master palette **beside** the original (never overwrite the raw file), check it at 1× first, then 0.5× and 2×, and bring it to the Owner's QA. Nothing enters the game without the Owner's YEA.

**Suggested order.** Rock first (it is the style reference for the underground tiles and caps), then Dirt (the reference for the soil top), then the other ground kinds, water, underground floors and tops, small objects, trees. Transition sets between ground kinds (16-tile Wang sets, no style references) come after the pure materials are accepted; they are not in this batch.

Meadow (`SURFACE_SHARED_TERRAIN_MEADOW_A2_DEFAULT`) is already generated (6 variants in `art/masters/`). It is the style reference for the other ground kinds.

---

## The shared paragraphs

**WORLD v0.1** (every card)
> Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

**TEMPERATE v0.1** (surface cards)
> Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

**LOWLANDS v0.1** (underground floors and caps)
> The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

## The PixelLab settings by class

| Class | Tool and settings |
|---|---|
| **Ground triplet** | Maps → Create Tiles Pro · variations (3) · square top-down · 48 px · view **high top-down** · segmentation on · style reference: the accepted Meadow tile |
| **Road** | As ground, one variation |
| **Water** | Create Tiles Pro · variations · square top-down · 48 px · high top-down · **no style reference**; then Animate on the accepted still: 3 phases, looping (the A1 block holds 3 phases) |
| **Underground floor, cap** | Create Tiles Pro · square top-down · 48 px · high top-down · style reference: the accepted Rock tile (Soil top: the accepted Dirt tile) |
| **Small object** | Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep 8 distinct variants |
| **Tree** | Create 1-direction object · high top-down · selective outline · the tree's native size (96×96 or 96×144) · pick one; optional Animate: a restrained 4-frame foliage loop, trunk still |

---

## 1. Ground surfaces (A2), dryness triplets: damp / base / dry (DEC-045)

### 1.1 Rock — `SURFACE_SHARED_TERRAIN_ROCK_A2_DEFAULT` (do this one first)
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of bare grey rock ground, cracked and weathered, with quiet mineral grain: rain-wet and darker, ordinary, and sun-dried and paler.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants, paths or loose stones that change what the ground is.
```

### 1.2 Dirt — `SURFACE_SHARED_TERRAIN_DIRT_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of bare brown loam with even, small-scale crumb and a few tiny pebbles, no central feature: damp and dark, ordinary brown, and dry and pale.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants, paths or stones that change what the ground is.
```

### 1.3 Forest floor — `SURFACE_SHARED_TERRAIN_FOREST-FLOOR_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching broadleaf forest-floor surfaces of decayed oak and ash leaf litter over dark humus, quiet broken leaf shapes and a few small twigs: damp and dark, ordinary, and dry and paler.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants, paths or stones that change what the ground is.
```

### 1.4 Needle floor — `SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching conifer forest-floor surfaces of fine rusty-brown pine needles over dark earth, even grain, no large twigs or cones: damp and dark, ordinary, and dry and paler.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants, paths or stones that change what the ground is.
```

### 1.5 Shrub soil — `SURFACE_SHARED_TERRAIN_SHRUB-SOIL_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching scrubland surfaces of gritty light-brown soil with sparse grass tufts, small stones and dry organic traces, no shrub painted into it: damp, ordinary, and dry and pale.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object or large feature that changes what the ground is.
```

### 1.6 Dry grass — `SURFACE_SHARED_TERRAIN_DRY-GRASS_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of dry golden-brown grass with sparse readable blades over soil: after rain with a trace of green, ordinary straw, and parched and pale.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, flowers, paths or stones that change what the ground is.
```

### 1.7 Mud — `SURFACE_SHARED_TERRAIN_MUD_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of soft brown marsh mud with broad compressed patches, a little reed stubble and restrained wet highlights, no open puddles big enough to read as water: wettest, ordinary, and drying at the surface.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, standing water or plants that change what the ground is.
```

### 1.8 Swamp mud — `SURFACE_SHARED_TERRAIN_SWAMP-MUD_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of black peaty swamp mud with coarse organic texture and small flecks of moss, darker than marsh mud, no open water: wettest, ordinary, and drying at the surface.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, standing water or plants that change what the ground is.
```

### 1.9 Peak rock — `SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching crag-top surfaces of rough dark-grey rock with clear hard fractures, darker than ordinary rock and clearly not loose scree: rain-wet, ordinary, and sun-dried.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants or loose stones that change what the ground is.
```

### 1.10 Stony — `SURFACE_SHARED_TERRAIN_STONY_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of packed brown earth holding small, evenly scattered, weathered grey stones, sparser than scree: damp, ordinary, and dry and pale.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, plants or large rocks that change what the ground is.
```

### 1.11 Scree — `SURFACE_SHARED_TERRAIN_SCREE_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of loose grey scree: angular broken stones with visible gaps between them and no intact slab: rain-wet, ordinary, and dry.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central boulder or plants that change what the ground is.
```

### 1.12 Sand — `SURFACE_SHARED_TERRAIN_SAND_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Three matching surfaces of fine pale lake-shore sand with even grain and restrained shallow ripples: wet and darker, ordinary, and dry and palest.

Specs: three separate seamless 48x48 tiles of the same material: damp, ordinary and dry. Same grain scale and density in all three. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, shells, water or plants that change what the ground is.
```

### 1.13 Road — `SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT` (one tile, no triplet)
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Ground stays quiet enough for figures and resources to read clearly.

A compacted packed-earth cart track with subdued wheel wear, lighter and smoother than bare dirt, with no painted border.

Specs: one seamless 48x48 tile. Opaque, static, flat ground seen from high top-down. No border, bevel, cast shadow, ruts that run off one edge only, or central object.
```

---

## 2. Surface water (A1): one still tile, then three drawn phases

### 2.1 Fresh water — `SURFACE_SHARED_WATER_FRESH_A1_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Clear fresh river water, cool blue-green, with small restrained groups of moving ripples.

Specs: one seamless 48x48 water tile, opaque, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 2.2 Pond — `SURFACE_SHARED_WATER_POND_A1_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Sheltered still pond water, slightly greener and calmer than river water, with gentle local ripples and no foam.

Specs: one seamless 48x48 water tile, opaque, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 2.3 Marsh water — `SURFACE_SHARED_WATER_MARSH_A1_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Shallow, sediment-rich marsh water, murky olive-green, with small scattered specks of duckweed and no reeds in the fill.

Specs: one seamless 48x48 water tile, opaque, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 2.4 Swamp water — `SURFACE_SHARED_WATER_SWAMP_A1_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Dark peaty swamp water, tea-brown to near black, with sparse floating leaf debris, clearly wetter and glossier than swamp mud.

Specs: one seamless 48x48 water tile, opaque, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 2.5 Deep water — `SURFACE_SHARED_WATER_DEEP_A1_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Deep open water, a darker blue clearly lower in value than shallow water, with broad quiet internal wave marks.

Specs: one seamless 48x48 water tile, opaque, flat, seen from high top-down. It will be animated in three drawn phases that must each tile seamlessly. No foam line, border, glow, sparkle stars or reflections of objects.
```

---

## 3. Underground floors and cut tops

### 3.1 Cave floor — `ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A natural cave floor of damp grey stone with worn mineral grain and a little settled sediment, no walls painted in.

Specs: one seamless 48x48 floor tile, opaque, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object.
```

### 3.2 Mined stone — `ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A newly worked stone floor of the same grey rock, flatter than the cave floor, with restrained chisel marks and the host rock still recognisable.

Specs: one seamless 48x48 floor tile, opaque, static, flat, seen from high top-down. No walls, border, bevel, cast shadow, tools or central object.
```

### 3.3 Dug earth — `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A freshly dug floor of compacted brown earth with blunt pick marks and no surviving turf, the same soil colour as dirt.

Specs: one seamless 48x48 floor tile, opaque, static, flat, seen from high top-down. No walls, border, bevel, cast shadow, tools or central object.
```

### 3.4 Rock top — `ALL_SHARED_TERRAIN_ROCK-SOLID_TOP_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of intact grey rock seen from directly above, quiet grain matching the rock ground, reading as solid and not walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque, static, no thickness, border, bevel or shadow.
```

### 3.5 Soil top — `ALL_SHARED_TERRAIN_SOIL-SOLID_TOP_DEFAULT`
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of packed brown earth seen from directly above, matching the dug-earth colour, reading as solid and not walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque, static, no thickness, border, bevel or shadow.
```

---

## 4. Ground objects and flora (48x48, keep 8 distinct variants each)

Every card here uses the WORLD and TEMPERATE paragraphs, then its item line, then this Specs line:

> Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.

| # | Asset | Catalogue ID | Item line |
|---|---|---|---|
| 4.1 | Grass tuft | `SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT` | One compact upright tuft of mid-green grass, separate from the ground. |
| 4.2 | Wildflowers | `SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT` | A small mixed cluster of meadow wildflowers, a few tiny red, yellow and white blooms among green leaves, quiet enough to stay background vegetation. |
| 4.3 | Bluebells | `SURFACE_SHARED_FLORA_FLOWERS-BLUE_V1_DEFAULT` | A small cluster of nodding bluebells with one readable blue-violet bloom mass over strap leaves. |
| 4.4 | White flowers | `SURFACE_SHARED_FLORA_FLOWERS-WHITE_V1_DEFAULT` | A low cluster of small white woodland flowers with restrained bright petals over dark leaves. |
| 4.5 | Fern | `SURFACE_SHARED_FLORA_FERN_V1_DEFAULT` | A few broad divided bracken fronds spread in a clear fan. |
| 4.6 | Bush | `SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT` | A quiet non-fruiting hedgerow bush with a clear rounded silhouette. |
| 4.7 | Berry bush | `SURFACE_SHARED_FLORA_BERRY-BUSH_V1_DEFAULT` | A low broad bramble bush with a few conspicuous dark berry clusters. |
| 4.7b | Berry bush, picked | `SURFACE_SHARED_FLORA_BERRY-BUSH-BARE_V1_DEFAULT` | The same bramble bush after its berries are gathered: same shape and leaves, no fruit. Make it from the accepted berry bush, not from scratch. |
| 4.8 | Reeds | `SURFACE_SHARED_FLORA_REEDS_V1_DEFAULT` | A bundle of slender wetland reed stems with brown seed heads. |
| 4.9 | Lily pad | `SURFACE_SHARED_FLORA_LILY-PAD_V1_DEFAULT` | A small group of broad round floating lily leaves with transparent gaps where the water shows through. |
| 4.10 | Lichen | `SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT` | A flat crust-like patch of pale grey-green lichen, shaped as if growing on exposed rock. |
| 4.11 | Gravel | `SURFACE_SHARED_STONE_GRAVEL_V1_DEFAULT` | A small loose deposit of angular grey gravel in discrete pieces. |
| 4.12 | Loose stones (already generated) | `ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT` | A loose group of a few separate weathered grey stones. Redo only if the existing set fails QA. |
| 4.13 | Granite boulder (already generated) | `SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT` | One heavy blocky speckled-grey granite boulder with a clear ground contact. Redo only if the existing set fails QA. |

Assembled example (4.1), paste-ready:
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One compact upright tuft of mid-green grass, separate from the ground.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

---

## 5. Trees (native size from the catalogue)

Every card here uses the WORLD and TEMPERATE paragraphs, then its item line, then this Specs line with the size filled in:

> Specs: a single tree on a transparent background at native size SIZE, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.

| # | Asset | Catalogue ID | Size | Item line |
|---|---|---|---|---|
| 5.1 | Oak | `SURFACE_SHARED_TREE_OAK_V1_DEFAULT` | 96x96 | A broad sturdy oak with a broken rounded crown and a substantial trunk. |
| 5.2 | Birch | `SURFACE_SHARED_TREE_BIRCH_V1_DEFAULT` | 96x144 | A slender white-barked birch with dark bark marks and a light, airy, irregular crown. |
| 5.3 | Pine | `SURFACE_SHARED_TREE_PINE_V1_DEFAULT` | 96x144 | A tall pine with tiered dark-green foliage masses and a visible reddish trunk base. |
| 5.4 | Fruit tree | `SURFACE_SHARED_TREE_FRUIT-TREE_V1_DEFAULT` | 96x96 | A modest spreading apple tree with a few readable clusters of red fruit. |
| 5.4b | Fruit tree, picked | `SURFACE_SHARED_TREE_FRUIT-TREE-BARE_V1_DEFAULT` | 96x96 | The same apple tree after harvest: same trunk and crown, no fruit. Make it from the accepted fruit tree. |
| 5.5 | Swamp tree | `SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT` | 96x96 | A damp-ground alder with exposed arching roots and an irregular crown. |
| 5.6 | Stump | `SURFACE_SHARED_TREE_STUMP_V1_DEFAULT` | 48x48 | A cut oak stump with a readable pale cut face and rings. |
| 5.7 | Dead tree | `SURFACE_SHARED_TREE_DEAD-TREE_V1_DEFAULT` | 96x96 | A leafless weathered dead tree with grey bark and broken branch ends. |

Assembled example (5.1), paste-ready:
```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A broad sturdy oak with a broken rounded crown and a substantial trunk.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

---

## Open points for the Owner
- The World paragraph is v0.1. It changes once, when the lore is locked, and every card then records the new version.
- Swamp, marsh and reed assets use the Temperate paragraph because they are temperate wetlands. If you would rather they carry the Wet biome's look, say so and they get the Wet paragraph instead.
- Loose stones and the granite boulder were generated before the art restart. They stay unless they fail QA.

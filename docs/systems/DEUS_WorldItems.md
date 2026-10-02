# World item placement

Headless rules: `game/js/sim/world_items`. RMMZ shell: `game/js/plugins/DEUS_WorldItems.js`. The existing container plugin keeps its slot and kilogram API; a short bridge at the bottom of `DEUS_Containers.js` forwards spill and chest-use into the sim when a world is bound.

Sprites are a slot id and nothing else (AS-ID-001). This lane does not load or generate art. `WS.LONGSWORD.24.D` and `CN.BACKPACK.CLOSED.D` are the standard's examples. Other ids in the catalog use that same grammar and are not written into the asset catalogue.

## Units

One Z layer is 5 ft and 48 px. One quarter is 1.25 ft and 12 px. Placement logic uses 6 px cells, eight along a tile. Drawn positions are whole pixels. One sim tick is one 6 s round, and ten ticks are one game minute.

Size classes are 12, 24 and 48 px, drawn at that size with scale 1. A 12 px item takes a 1 px hard drop shadow. A 24 px or 48 px item takes a 2 px hard drop shadow.

## Where an item sits

An item anchor is a tile, a layer, and a cell in 0..7. The pixel is `tile * 48 + cell * 6`. A drag preview snaps to the nearest 6 px cell; a halfway value rounds away from negative infinity (`floor(px / 6 + 0.5)`).

A table top is 1 quarter (12 px). A shelf is 2 quarters, a high shelf 3. The item's height offset is that many whole pixels. Items do not add their own sprite height on top of the surface.

Draw order, inside the map's row-then-layer order, is the footprint's bottom pixel, then the height offset, then the id. Later items paint on top.

## Near and far

Storage is by chunk and layer. The chunk is 16 tiles (PM default). Inside 24 tiles of the viewer (Chebyshev, PM default) a chunk is expanded to individual records. Farther away the chunk keeps a count per type. Expansion places each count from the world seed, so the same seed puts the same item on the same cell. A move is stored on the chunk and survives collapse. Seeded records are not copied into the item save; the chunk record is.

`placedCount` is every represented item, including counts inside a summary. `budgetCount` counts a summary chunk as one object and a container as one object. Contents are not extra budget objects.

## Saves

`saveChanges` writes format `v: 2` with manifests, top-level items, units, tombstones and deposits whose revision moved since the last save. Item records carry `massCp`. A container is one record; its contents are nested in that record. The next save after a quiet tick is empty. Load applies that chain onto a world with the same seed. `loadChanges` refuses `v: 1` and any blob carrying `massMu` with `E_SAVE` before changing state; no old-save conversion exists. The placement save does not embed the mass ledger snapshot. The host stores `ledger.snapshot()` beside it.

## Surfaces, spill, collapse

SRD pound weights are stored as whole ounces (16 oz = 1 lb). A surface has a load limit. Past the limit, the newest occupant is dropped to the ground at height 0 until the load fits. At the collapse multiple (PM default 2×, overridable per surface) every occupant drops and the surface breaks.

The break posts one existing ledger `transform`. A wooden table goes `wood/object` to `wood/ruin` (`decay`). The item record keeps that mass in the new form. `ledgerRecount()` is the world's side of `ledger.assertBalanced`.

Catalog load limits (PM defaults, not an Owner table): table 150 lb, shelf 40 lb. Tests pass an explicit limit.

`massCp` on a catalog row is derived from `weightOz` by half-up rounding of `weightOz × 100 / 16`. The resulting integer centipounds are posted to the ledger (3 lb = 300 cp; 1 oz = 6 cp; 2 oz = 13 cp). The calculation checks safe-integer range.

Seeded summary counts do not register mass. `place()` does, and only before `seal()`.

## Containers

A double-click opens a movable window. The window background is the container's open slot id. Contents are free-placed world sprites on the 6 px grid inside the window, not an inventory slot grid. Two items may share a cell. A nested container opens its own window. Several windows stay open. Closing the last window restores the closed slot id.

Drag moves an item among the map, a container, and the paper doll. The doll slots are armor, main hand, off hand, pack, and the gear that does not change the map sprite (ring, amulet, cloak, boots, gloves, belt, helmet). The map sprite slot changes only when the worn armor category changes. The five states are UNARMORED, ROBE, LIGHT, MEDIUM, HEAVY. The unit supplies `slotByArmor`. A weapon, a shield, or a key does not change it.

| Container | Tare | Weight cap | Volume cap | Notes |
| --- | --- | --- | --- | --- |
| Backpack | 5 lb | 30 lb | 1 cu ft | SRD worked example |
| Sack | 1/2 lb | 30 lb | 1 cu ft | SRD |
| Chest | 25 lb | 300 lb | 12 cu ft | SRD |
| Barrel | 70 lb | none | 4 cu ft solid | SRD lists volume, not a pound cap |
| Crate | 15 lb | 200 lb | 8 cu ft | Not an SRD row. PM default |

A container stowed inside another counts as its exterior volume, not the volume of what is inside it. Its weight counts in full, including nested contents, against the parent cap and against the carrier. Carry cap is Strength × 15 lb.

A lock opens with the key item, or with thieves' tools: d20 + Dex modifier + proficiency bonus if proficient, against the lock DC. A trap is the same check. Missing the DC by 5 or more springs the trap. Opening an unlocked container that is still trapped springs it once, without a second roll.

`destroyContainer(id, { mode: "burn" })` burns what the ledger can burn (`wood` and `biomass` to `ash/strata`) and spills the rest (steel stays an item). `mode: "spill"` drops contents on the ground. A wooden body becomes `wood/ruin`. A hide or cloth body (backpack, sack) becomes `humus/strata` through the existing `litter` row. Both paths leave `assertBalanced(ledgerRecount())` true.

A shop is a container with an owner. Taking from it without permission sets `theft` and moves the item to the ground under the new owner. `permit: true` transfers it without the theft flag.

## Pathing

Units step tile to tile in eight directions. Terrain, walls and caves are whole tiles (`setBlocked`, or `setBlockProvider` for a live wall grid). A 12 px or 24 px item does not block. A 48 px item blocks every tile its footprint covers. A diagonal step is refused when either orthogonal neighbour is blocked.

Cardinal walk is 4 px per frame and run is 6. Diagonal walk is 3 px on each axis. Diagonal run is 4 px on each axis (PM default: 6 / sqrt(2), rounded to a whole pixel).

`DEUS_Movement8D` is the RMMZ character plugin. This sim keeps its own adapter so the tests do not need the engine. The world-items plugin, when `Game_CharacterBase` exists, also refuses a step whose destination or diagonal flank is blocked by a large item.

Hauling picks the item up and sets the life clip to `CARRY`. The item no longer blocks a tile.

## Readability

Hover is a 1 px outline and the item name. Picking returns the topmost item under the point. A cycle offset walks down the stack and wraps. The plugin treats Shift as that modifier when the host has installed a pointer (`setPointer`) that already maps the cursor into world pixels. Hold PageUp for 3× and PageDown for 4×. Any other factor is refused. Release clears the hold. Sampling stays nearest-neighbour; this lane does not scale the sprite.

Items within a glow's bright radius are `bright`. Items in the dim ring are `dim`. Distance is SRD 5-5-5 squares: `max(dx, dy) + floor(min(dx, dy) / 2)`. A torch is 4 squares bright and 4 squares dim.

## Decay

A perishable item loses `decayPerTick` condition each tick. At 0, cleanup removes it and posts the ledger rot (`biomass/item` or `wood/item` to `humus/strata`). Deposits on the same cell merge.

## PM defaults (Owner may override)

Near radius 24 tiles. Chunk 16 tiles. Collapse at twice the load limit. Table 150 lb, shelf 40 lb. Crate 15 lb / 200 lb / 8 cu ft. Robe 4 lb. Brass key 1 oz. Item volumes that the SRD does not list. Run diagonal 4 px per axis. Shift cycles, PageUp holds 3×, PageDown holds 4×. Fire destruction uses the ash row, not a split with charcoal. Seeded counts do not register ledger mass. The placement save does not contain the ledger snapshot.

## Tests

`node tools/world_items/test_world_items.js` covers seeded re-placement, load spill and collapse, nested weight, locks and traps, ledger balance on burn and spill, change-only save round-trip, picking and stack cycling, and the 6 px snap. Each of those has a killed in-memory mutant.

`node tools/world_items/bench_world_items_100k.js` places 100,000 longswords as 1,000 chunk counts, draws the near window, and reports frame time, memory, heap, summary save size and the save after 20 edits.

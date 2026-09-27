# Vertical biome coupling

Underground substrate biomes follow the surface climate column at the same cell, plus the depth band. A new world turns this on (`UF.World.state.verticalBiomeCoupling`, copied from `UF.Levels.VERTICAL_BIOME_COUPLING`, default `true`). A save that does not carry the flag keeps the old 4×4 province roll, so its level checksums still match.

The rock below Z-2 stays solid. Coupling only names the substrate there. Caves, pockets and fluids stay on the core levels -2..+2.

## Depth bands

DEC-013 item 7, the two underground bands. This is not DEC-030's later edge table (Deep Earth -16..-11, Caverns -10..-5, Lowlands -4..+1).

| Band | Layers | Role | Substrate set |
|---|---|---|---|
| Shallow underground (Lower-1) | -8..-1 | `shallow` | rooted loam, clay bed, chalk and karst, shallow cave |
| Deep caverns (Lower-2) | -16..-9 | `deep` | deep mine belt, crystal cavern, fossil bed, deep salt cavern |

Every layer in a band gets the same substrate id for a given column. Z-1 and Z-2 are both in the shallow band. The old Z-2 deep set is the deep band, from Z-9 down.

## Column rule

`UF.WorldGen.columnClimate(gx, gy)` is the column: `e`, `r`, `t`, `d`, `v`, `sal`, and `water` (river, pond, lake or sea). The first matching kind wins. `mountainLevel` is the catalog's `climate.mountainLevel`.

| Order | Kind | Test | Shallow | Deep |
|---|---|---|---|---|
| 1 | volcanic | `v > 0.62` | shallow_cave | deep_mine_belt |
| 2 | wet_water | `water` | clay_bed | deep_salt_cavern |
| 3 | wet_land | `r > 0.6` and `d < 0.35` | clay_bed | fossil_bed |
| 4 | mountain | `e >= mountainLevel` | chalk_karst | deep_mine_belt |
| 5 | cold | `t < 0.25` | chalk_karst | crystal_cavern |
| 6 | arid | `r < 0.28` | shallow_cave | deep_salt_cavern |
| 7 | forest | `r > 0.45` | rooted_loam | crystal_cavern |
| 8 | temperate | anything else | rooted_loam | deep_mine_belt |

Cuts match the surface classifier and the existing family cuts (`v > 0.62`, swamp/marsh `r > 0.6 && d < 0.35`, cold `t < 0.25`, arid `r < 0.28`). Clay bed is the wet shallow substrate (swamps, rivers, lakes, the sea). Rooted loam is forest and temperate ground. Chalk and karst is mountains and cold ground. There is no `deep_magma` substrate id. Volcanic columns use deep mine belt in the deep band. Lava on Z-2 stays a pool, not a biome.

With coupling on, `WorldGen.geologyAt` picks the stone from that substrate id at every underground layer. With coupling off it keeps the old Z-1 / deeper split.

## Survey budget

`UF.NaturalConnections.SURVEY.testedCap` is 64 (it was 12). The search is still the start area, at most two chains. A column whose underground floor is flooded is not a dry passage, so it does not spend the budget (baseline pools were already excluded). `survey.foundAt` is the clearance test that placed the first chain. On a founded world the camp's drinking flood covers the nearest caves, so the chain is further out than the old cap of 12 could reach.

## Checks

`node tools/worldgen/test_vertical_biome_coupling.js` — 20 seeds, both Z ranges (-16..+15 and -4..+4), the rule above, determinism, the 64-cap chain, and generation time against coupling off. Mutants: independent roll, cap 12, broken determinism.

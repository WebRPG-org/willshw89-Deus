# DEUS encounter tables (NAT.07.03)

`game/js/sim/placement/encounters.js` turns the bestiary layer (`game/data/srd_adaptation/creatures.json`, NAT.07.01, see `DEUS_Bestiary.md`) into one integer-weighted table per biome cell, danger tier and kind, and draws from a table deterministically. It is the encounter-table step of DESIGN-D4 section 5 and DEC-057: creatures are placed by seeded rules by biome cell and danger tier, with no ecology simulation.

The module is data and functions only. No plugin loads it yet. Spawning (where, how many, lair odds, the start-safe radius) is a later leaf (NAT.07.04, NAT.07.05; lane-fe depends on this lane). Geometry and summoning are not here either.

## Files

| Path | Role |
|---|---|
| `game/js/sim/placement/encounters.js` | `buildTables`, `pick`, `tableFor`, `loadDefault`. Host-agnostic: no file IO except in `loadDefault`, no state, no `Math.random`. |
| `game/data/ecology/encounter_weights.json` | The integer weights and the feature-only list. Status `PM_DEFAULT`: set by the writer for the PM to change. |
| `tools/test_encounter_tables.js` | Checks and mutant sweep. |

## Tables

There is one table for every (cell, tier, kind): 31 cells (the 30 FAMILY/BAND cells of DEC-030 plus the Sky) x 5 tiers x 3 kinds = 465 tables.

| Kind | Holds | Never holds |
|---|---|---|
| `wander` | Bestiary rows with placement `seeded` and role WILDLIFE or MONSTER, not feature-only. Rolled by the spawner. | |
| `lair` | Rows with placement `lair`. Anchored to a lair site; never a wandering spawn. | |
| `feature` | Rows listed in `featureOnly.ids` (the four elementals). Summoned by their element source; never tier-rolled. | |
| (none) | | SUMMON-ONLY rows (placement `summon`), EXCLUDE rows (placement `none`), PEOPLE rows. |

PEOPLE are the 21 NPC rows that wear the Nine's faces (bestiary source, C1). They come from settlements, not from encounter rolls, so they are in no table.

A row goes into the table of each of its cells, and into the Sky's table when its `sky` flag is set.

**Tier ceiling.** A table of tier Tn holds rows of tier Tn and below, never above. A row is left out when it is as many tiers below the table as `tierGapWeight` has entries (with the default three, T0 rows are not in T3 or T4 tables).

**Weight** = `frequencyWeight[row.frequency]` x `tierGapWeight[table tier - row tier]`. Both are positive integers from the data file. A table's `total` is the sum of its entry weights.

**Order.** Entries are sorted by bestiary id, so the same data gives the same tables byte for byte.

**The Sky.** Its 15 tables are built from the 69 sky rows and marked `unusedV1: true`: the Sky has no spawns in v1 (DESIGN-D4 section 4). `pick` throws `E_UNUSED_V1` on them. Every other table has `unusedV1: false`.

## Cell and tier ids

Cell id = family index x 5 + band index, families VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD and bands Deep Earth, Caverns, Lowlands, Uplands, Highlands (0 to 29); the Sky is 30. Tier index is 0 to 4 for T0 to T4. Kind index is 0, 1, 2 for wander, lair, feature.

## API

```js
const E = require("game/js/sim/placement/encounters.js");
const built = E.loadDefault();                     // or E.buildTables(bestiaryJson, weightsJson)
const table = E.tableFor(built, "TEMPERATE/Lowlands", "T1", "wander");
const id = E.pick(table, seed, spawnIndex);        // "srd:creature:..." or null for an empty table
```

`buildTables(bestiary, weights)` returns a frozen object: `{ schemaVersion, weightsStatus, cells, tiers, kinds, tables }`, with `tables[cell][tier][kind]` = `{ key, cell, cellId, tier, tierIndex, kind, unusedV1, total, entries: [{ id, tier, weight }] }`.

It throws (with `e.code`) rather than build from bad input:

| Code | When |
|---|---|
| `E_WEIGHTS` | a frequency weight for common, uncommon, rare or lair is missing or not a positive integer; `tierGapWeight` is empty, longer than 5 or holds a non-positive or non-integer weight; a `featureOnly` id is repeated, not in the bestiary, or not a seeded non-PEOPLE row; a table's total passes 2^21 |
| `E_BESTIARY`, `E_ROW`, `E_CELL`, `E_TIER` | no entries, a repeated id, an unknown placement or frequency, a cell outside DEC-030, an unknown tier |

`pick(table, seed, spawnIndex)` takes uint32 `seed` and `spawnIndex` and throws `E_RANGE` otherwise. The draw is `floor(h x total / 2^32)` walked along the cumulative integer weights, where `h` is a 32-bit hash of (seed, cell id, tier index, kind index, spawn index), each folded in through the murmur3 finaliser. DESIGN-D4 section 5 gives the key as `seed ^ biome_cell_id ^ tier ^ spawn_index`; a plain XOR would give cell 1 tier 0 the same draws as cell 0 tier 1, so the inputs are hashed one at a time instead. The same inputs give the same creature on any host.

## Default weights (PM_DEFAULT)

| Key | Value |
|---|---|
| `frequencyWeight` | common 6, uncommon 3, rare 1, lair 1 |
| `tierGapWeight` | 32, 4, 1 (the table's own tier, one below, two below) |
| `featureOnly.ids` | air-, earth-, fire- and water-elemental |

Why 32, 4, 1: most of the bestiary's higher-tier rows are rare, so with gentler steps the lower tiers drown the table's own tier. Measured on the shipped bestiary (2026-10-01), the median share of the wander table's weight held by the table's own tier, over the 30 cells:

| `tierGapWeight` | T1 | T2 | T3 | Tables where own tier is under half |
|---|---|---|---|---|
| 4, 2, 1 | 57% | 22% | 16% | 60 of 83 |
| 16, 4, 1 | 73% | 42% | 36% | 36 of 83 |
| 32, 4, 1 (default) | 84% | 60% | 52% | 20 of 83 |

The lower tiers stay in as filler, so thin cells still have a table (bestiary section A lists WILD/Deep Earth T2 and T3 as empty).

## What the shipped data gives

Measured with `loadDefault()` on 2026-10-01:

- Wander: 149 of the 150 cell tables are non-empty, 222 distinct creatures (247 seeded rows less 21 PEOPLE and 4 elementals). The empty one is WILD/Deep Earth T4.
- No T4 creature is in any wander table. All 38 T4 rows are lair (29), SUMMON-ONLY (7) or EXCLUDE (2), so T4 wander tables hold T2 and T3 rows, and T4 creatures come only from lair tables. This matches DESIGN-D4 ("T4: always lair-anchored").
- Lair: 26 cell tables, all at T4, 29 distinct creatures. No lair table below T4 holds anything, because every lair row is T4.
- Feature: 39 cell tables, the 4 elementals (all T2, so T2 to T4).
- Every one of the 30 cells has a non-empty T0 wander table.
- TEMPERATE/Lowlands wander: T0 35 entries (all T0); T1 57 (T1 74% of the weight, T0 26%); T2 69 (T2 61%); T3 36 (T3 28%, T2 42%, T1 30%); T4 14 (T3 25%, T2 75%).

## Open, not settled here

- **Which creatures are feature-only.** DESIGN-D4 says "elementals"; the default lists the four creatures named elemental. srd51 types twelve more rows as elementals (azer, gargoyle, djinni, efreeti, invisible stalker, magmin, the four mephits, salamander, xorn); the bestiary source (C4) keeps the ones it places as MONSTER, "the world's substance stirring". Widening the list is a data change.
- **T0 near starts.** DESIGN-D4 calls T0 "wildlife only"; the T0 tables also hold T0 MONSTER rows (goblin, kobold, skeleton, steam-mephit and others). With wildlife only, TEMPERATE/Deep Earth would have an empty T0 table. Keeping predators away from starts is the spawner's start-safe predicate (DESIGN-D4 section 5), not this table.
- **Lair odds by tier** (DESIGN-D4: T1 5%, T2 15%, T3 35%, T4 always) belong to the spawner. With the current bestiary only T4 lair tables have creatures.

## Checks

`node tools/test_encounter_tables.js` builds the tables and compares them with tables it computes itself from the two data files (it does not reuse the module's code):

| Check | What fails it |
|---|---|
| `tier_ceiling` | An entry above its table's tier, too many tiers below it, or whose tier differs from the bestiary's. |
| `no_summon_exclude_people` | Any SUMMON-ONLY, EXCLUDE or PEOPLE row (or placement `summon`/`none`) in any table. |
| `lairs_only_in_lair_tables` | A lair row outside a lair table, a non-lair row in one, a lair row missing from one of its cells at its tier, a non-empty T0 lair table, or no lair entries at all. |
| `elementals_feature_only` | One of the four elementals not in `featureOnly.ids`, missing from a feature table of its cells, or in a wander or lair table; a feature table holding a row not listed. |
| `t0_nonempty` | An empty T0 wander table in any of the 30 cells, or a T0 draw that is not one of its entries. |
| `sky_tables_marked_unused_v1` | A missing Sky table, one not marked `unusedV1`, `pick` not throwing `E_UNUSED_V1` on it, empty Sky stubs, or a cell table marked unused. |
| `pick_deterministic` | Two builds or a fresh process (with `Math.random` disabled) giving different draws; draws not varying with the index or seed; a draw that is not an entry; draw frequencies more than 0.02 (total variation) from the weights over 200,000 draws; an empty table not giving null; a bad seed or index accepted. |
| `weights_from_data` | Status not `PM_DEFAULT`; any table differing from the oracle; changed weights not changing the tables to the oracle's; bad weights accepted. |
| `module_syntax` | `node --check` fails on the module (`tools/check_deus_syntax.js` covers `game/js/plugins` only). |

A missing module or data file fails every check. Then, unless `--no-mutants`, the sweep copies the three files to a temp folder, applies each mutant, reruns itself there and requires exit 1 with the named checks FAIL:

| Mutant | Change | Must turn red |
|---|---|---|
| `tier_plus_one` | ceiling = tier + 1 | `tier_ceiling` |
| `summon_leak` | summon rows not skipped | `no_summon_exclude_people` |
| `lair_wanders` | lair rows go to wander tables | `lairs_only_in_lair_tables` |
| `elementals_rolled` | `featureOnly.ids` emptied | `elementals_feature_only` |
| `t0_dropped` | nothing enters a T0 table | `t0_nonempty` |
| `sky_live` | Sky tables not marked unused | `sky_tables_marked_unused_v1` |
| `pick_random` | the draw uses `Math.random` | `pick_deterministic` |
| `weights_hardcoded` | gap weights written in the code | `weights_from_data` |
| `syntax_break` | a stray `function (` appended | `module_syntax` |

`--mutant <name>` runs one mutant and prints the rerun's output. `--root <dir>` points the test at another tree.

## Changing it

- **Weights:** edit `encounter_weights.json`. The tables follow; the test's oracle reads the same file. Change `status` from `PM_DEFAULT` only together with `weights_from_data`.
- **Bestiary rebuilt:** nothing to do here; the tables are built from whatever `creatures.json` holds. The statistics above are a record of 2026-10-01, not a check.
- **Sky spawns in a later version:** a new version of this module, and `sky_tables_marked_unused_v1` changes with it.

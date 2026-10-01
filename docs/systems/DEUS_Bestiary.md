# DEUS bestiary adaptation layer (NAT.07.01)

`game/data/srd_adaptation/creatures.json` gives each of the 317 SRD 5.1 creatures in `game/data/srd51/creatures.json` exactly one DEUS row, keyed by its `srd:` id. A row says the creature's role in Emerys, its danger tier, the biome-depth cells it lives in, how often it turns up, how it is placed, and which catalog wildlife species use its stat block. This is the DEUS-owned layer of DEC-050 item 3 and DEC-053 item 2. Placement by seeded rules is DEC-057.

The file is generated and is data only. No plugin loads it yet. Runtime spawning is a later leaf (NAT.07.04, NAT.07.05). `srd51` is read and never edited. The frozen legacy folder `game/data/srd5_1/` is not read.

## Files

| Path | Role |
|---|---|
| `docs/design/bestiary/BESTIARY_grok_heavy.md` | The adopted bestiary source: a verbatim copy of the braintrust's Grok Heavy voice of 2026-09-30. Never edited. |
| `docs/design/bestiary/SOURCE.json` | Its pin: sha256 `c6f9d41853f29ecd83b4ffa5cbd26b17d6a1e67f3445bfde29b843c41e740914`, 46,217 bytes. The same hash is pinned in `tasks/wbs_registry.json` (`tasks.NAT.07.01.source`). |
| `tools/bestiary/build_bestiary.js` | Builds the data file. `--check` rebuilds in memory and compares. |
| `game/data/srd_adaptation/creatures.json` | The generated layer. Do not hand-edit it. |
| `tools/test_bestiary_adaptation.js` | Checks and mutant sweep. |

## Inputs

| Input | Used for |
|---|---|
| The 317 `srd:creature:` rows of the source (lines 3 to 319) | id, role, tier, cells, frequency, note |
| `game/data/srd51/creatures.json` | name, challenge rating |
| `game/js/sim/rules/species_map.js` (live) | `bodies[]` |

Sections A, B and C of the source are not inputs:

- **Section A (occupancy grid)** has one wrong cell. COLD/Deep Earth T1 says 2; the rows give 3 (PM check, 2026-10-01; the builder's count agrees, and every other cell of A matches the rows). Occupancy is counted from the rows.
- **Section B (wildlife map)** is advisory. `bodies[]` comes from the live `species_map.js`. B differs from it on 4 of its 23 species. The differences are recorded here and not applied:

  | Species | Section B | Live `species_map.js` (used) |
  |---|---|---|
  | fowl | `srd:creature:hawk` | `srd:creature:blood-hawk` (proxy) |
  | wildcat | `srd:creature:cat` | `srd:creature:panther` (proxy) |
  | sand_stalker | DEUS-original, stat base `srd:creature:phase-spider` | `srd:creature:ankheg` (proxy) |
  | ice_wraith | DEUS-original, stat base `srd:creature:specter` | `srd:creature:wraith` (proxy) |

  B also calls bog_horror and restless_dead "DEUS-original"; their stat bases (shambling-mound, zombie) are the same as the live map's, so their bodies do not differ.
- **Section C (recommendations C1 to C10)** is adopted as design (the PM, G02) but is not a build input. C8's place-wyrm renaming is a later pass.

## Build

```
node tools/bestiary/build_bestiary.js            # write the file
node tools/bestiary/build_bestiary.js --check    # exit 1 if the file differs from a fresh build
```

`--root <dir>` points both at another tree (the test's mutants use it). The builder refuses to write (exit 1) when:

- the source copy does not hash to the pin in `SOURCE.json` (compared with CRLF folded to LF);
- a line that starts with `srd:creature:` is not a well-formed row, or a row lists a cell twice;
- an id appears twice, a source id has no srd51 record, or an srd51 creature has no source row;
- a source tier disagrees with the tier from the srd51 challenge rating;
- an EXCLUDE row has a cell or a frequency, or a non-EXCLUDE row has neither;
- a `species_map.js` row points at an id that is not in srd51.

Missing inputs exit 2. The output has no timestamp, so the same inputs always give the same bytes.

## Row

```json
{
 "id": "srd:creature:aboleth",
 "name": "Aboleth",
 "role": "MONSTER",
 "tier": "T3",
 "cr": { "rating": 10, "text": "10" },
 "cells": [ { "family": "WET", "band": "Deep Earth" }, { "family": "WET", "band": "Caverns" } ],
 "sky": false,
 "frequency": "rare",
 "placement": "seeded",
 "bodies": [],
 "note": "Mind-eel of the oldest drowned hollows",
 "sourceLine": 3
}
```

| Field | Meaning |
|---|---|
| `role` | From the source: MONSTER (164), WILDLIFE (91), PEOPLE (21), SUMMON-ONLY (28), EXCLUDE (13). |
| `tier` | Danger tier from CR (below). Equals the source's tier on every row. |
| `cells` | FAMILY/BAND cells of DEC-030 in source order: families VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD; bands Deep Earth, Caverns, Lowlands, Uplands, Highlands. |
| `sky` | The source lists the row on the Sky line (69 rows). Sky is not one of the 30 cells. |
| `frequency` | common, uncommon, rare or lair; `null` on EXCLUDE rows. |
| `placement` | The placement rule (below). |
| `bodies` | Catalog wildlife species whose stat block is this creature: `{ species, kind }` from `species_map.js`, in its order. 21 rows have bodies; the jackal has three (jackal, fox, arctic_fox). |
| `note` | The source note. The old spelling "Emrys" is written "Emerys" (DEC-054); this touches couatl, half-red-dragon-veteran, androsphinx and gynosphinx. |
| `sourceLine` | Line of the row in the pinned source. |

`metadata` carries the source hash, the CC-BY-4.0 attribution copied from srd51, the tier bands, the placement rules in words, counts by role, tier and placement, and `occupancy`: per cell (all 30, plus `Sky`) and tier, how many rows list it. A row with several cells counts in each.

## Tier from CR

DESIGN-D4 section 4 (approved under DEC-058):

| Tier | CR |
|---|---|
| T0 | 0 to 1/4 |
| T1 | 1/2 to 2 |
| T2 | 3 to 6 |
| T3 | 7 to 12 |
| T4 | 13 and up |

Counts: T0 79, T1 95, T2 66, T3 39, T4 38.

## Placement rules

Read off each row's source role and frequency, for the seeded spawner of DEC-057 and DESIGN-D4 section 5. The spawner's densities, lair odds and start-safe radius belong to the spawner, not to this file.

| Rule | When | Meaning | Rows |
|---|---|---|---|
| `seeded` | any other row | Rolled by the seeded spawner in each of the row's cells, filtered by the cell's danger tier; frequency weights the draw. | 247 |
| `lair` | frequency `lair`, role not SUMMON-ONLY | Anchored to a lair site in one of its cells; never a wandering spawn (source C7 for the tarrasque). | 29 |
| `summon` | role SUMMON-ONLY | Enters the world only when summoned; never rolled by the spawner. Its cells say where it belongs. | 28 |
| `none` | role EXCLUDE | No cell; never placed. | 13 |

## Open, not settled here

- **EXCLUDE rows and the solar.** DEC-053 item 1 and DEC-050 item 3 put every SRD creature in the world's cells. The source marks 13 rows EXCLUDE (couatl, plesiosaurus, triceratops, tyrannosaurus-rex, drider, elf-drow, half-red-dragon-veteran, guardian-naga, spirit-naga, oni, rakshasa, androsphinx, gynosphinx) and gives `srd:creature:solar` the Sky only. This layer builds them as the source has them, one row each. The question is with the Owner and the PM; an answer arrives as a new pinned source and a new build.
- **Sky.** DESIGN-D4 section 4 says the Sky has no spawns; the source lists 69 rows on the Sky line. The row keeps `sky` as the source has it; what the spawner does with it is the spawner's call.
- **Elementals.** DESIGN-D4 section 5 makes elementals feature-summoned, never tier-rolled; the source gives the four elementals role MONSTER, frequency uncommon, so they read `seeded`. Not changed here.

## Checks

`node tools/test_bestiary_adaptation.js` parses the source rows itself (it does not reuse the builder's parser) and checks the output against them, srd51 and `species_map.js`:

| Check | What fails it |
|---|---|
| `source_pinned` | The source copy, `SOURCE.json`, the registry pin and the output's `metadata.source.sha256` do not all agree. |
| `row_count_317` | Output, source or srd51 does not hold 317 creatures. |
| `source_output_bijection` | A source id with zero or two output rows, an output id with no source row, a duplicate on either side, or an srd51 id the source misses. |
| `tier_from_cr` | A tier or `cr` that differs from the band of the srd51 challenge rating. |
| `cells_valid` | A cell outside the 6 families and 5 bands, a repeated cell, or cells or `sky` that differ from the source row. |
| `exclude_empty` | An EXCLUDE row with a cell or Sky, a non-EXCLUDE row with neither, or a role that differs from the source. |
| `occupancy_matches_source` | Occupancy per cell and tier, and on the Sky line, from the output rows or from `metadata.occupancy`, differs from the count of the 317 source rows. Never compared with section A. |
| `placement_rules` | A frequency or placement that differs from the source role and frequency, or a rule list other than the four. |
| `bodies_consistent` | A `species_map.js` species that is not a body of exactly its own srdId row, or a body that the map does not give. |
| `build_reproducible` | `build_bestiary.js --check` exits non-zero. |
| `srd51_untouched` | A file in `game/data/srd51/` or `game/data/srd5_1/` added, removed or changed against the hashes pinned in the test (CRLF folded to LF). This is a guard: it passes before and after the lane. |
| `no_old_world_name` | Any key or string in the output contains "Emrys". |

Then it copies the inputs to a temp folder, applies each mutant there and reruns itself. Each mutant must exit 1 with its named checks FAIL:

| Mutant | Must turn red |
|---|---|
| `dup_plus_omit` (row 201 replaced by a copy of row 101; still 317 rows) | `source_output_bijection`, while `row_count_317` stays green |
| `srd51_edit` (one word of the aboleth's text) | `srd51_untouched` |
| `tier_shift` (one T2 row to T3) | `tier_from_cr` |
| `drop_row` | `row_count_317`, `source_output_bijection` |
| `bad_cell` (band "Midlands") | `cells_valid` |
| `hand_edit` (one note changed) | `build_reproducible`, and `build_bestiary.js --check` exits 1 |
| `verbatim_notes` (builder patched to copy notes verbatim, then rebuilt) | `no_old_world_name` |
| `exclude_given_cell`, `occupancy_count`, `placement_swap`, `body_moved`, `source_byte` | `exclude_empty`, `occupancy_matches_source`, `placement_rules`, `bodies_consistent`, `source_pinned` |

`--no-mutants` runs the checks only. The sweep runs only when the checks pass on the real files.

## Changing it

- **The bestiary changes:** add a new source file under `docs/design/bestiary/`, pin it in `SOURCE.json` and the registry, point the builder at it, rebuild. The old file stays as the record of the old version.
- **`species_map.js` or a srd51 name or CR changes:** rebuild; `--check` fails until then.
- **srd51 changes on purpose (for example a verification mark, DEC-053 item 3):** `srd51_untouched` fails until its pins in `tools/test_bestiary_adaptation.js` are updated in that change, and the bestiary is rebuilt if its output moves.

## License

The creature names and challenge ratings come from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). The attribution text is copied into `metadata.license` and must stay in the game credits. Roles, cells, notes and placement are DEUS's own.

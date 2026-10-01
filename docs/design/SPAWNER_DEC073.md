# Creature spawner (DEC-073): design note for the spawner lanes

**Written by:** Claude Code (PM), 2026-10-01, from the DEC-073 sweep's verified code findings and its completeness critic.
**For:** the briefs of lane-fi (WG.00.47), lane-fc (NAT.07.02), lane-fe (NAT.07.04), lane-ff (NAT.07.05) and the Ecology increment of SIM.00.05.
**Status:** design note only. Nothing here is built. It opens no lane, changes no WBS status and settles nothing the briefs have not yet settled; section 6 lists what the lanes still have to decide.
**Binding:** DEC-073; DEC-070 item 1 condition C and its amendment; DEC-050 items 2-3; DEC-057 item 2; DEC-059 item 4 (seasons stay off); DEC-039 item 5 (Minecraft Rule Record); the DEC-040 and DEC-028 amendments (mass); DEC-023 (finite minerals); VISION V67, V68, V75, V103; AGENTS.md Rule 14 (`AGENTS.md:58`).
**Line numbers.** Code lines are at main `6c6e4afe`; none of the code files cited here had uncommitted edits when read. Doc lines were read on 2026-10-01 while the DEC-073 sync edits to `docs/` were still uncommitted, so they may move; every doc citation also names its decision, section or row.

---

## 1. Purpose and the DEC-073 rules

This note tells the spawner lanes what DEC-073 changes in their work: which live code they reuse, which they retire by archiving, which they rewrite, and which tests go with it.

The rules (DEC-073 items 1-9, restated as ten short rules; `docs/OWNER_DECISIONS.md`, "Decision `DEC-073`"):

1. Wildlife and monsters have no ecology simulation: no breeding, birth or death curves, carrying capacity, food webs, migration or stored populations.
2. A seeded runtime spawner places them. Its inputs: the biome-depth cell (DEC-030), the danger tier (DEC-050), the bestiary rows and encounter tables (NAT.07.01, NAT.07.03), light, time of day, season (weight off while DEC-059 defers seasons), density caps per cell, herd and group sizes, and distance from the player, the starts and settlements.
3. Each spawn is a pure function of (seed, cell, tier, z, time window, attempt index). Live nearby counts only accept or reject it.
4. Finite minerals never spawn (DEC-023).
5. Heavy hunting lowers an area's spawn rate for a few in-game days, then it recovers. This is one small depletion record per area, not a population.
6. Spawning happens around the player and around active AI faction settlements. Hostile monsters stay out of a radius around settlements and starts.
7. Tamed, captured, named, quest and lair creatures, and any creature carrying items, persist with stable IDs. Every other creature despawns only when it is far away and out of sight.
8. A lair's boss is unique and gone for good once killed. Its minions refill by the spawn rules.
9. Ordinary wildlife registers nothing at first build. Spawn designations, lairs and dens, the depletion record and notable creatures must come out the same whether an (area, z) is built at New Game or later (section 5).
10. Spawned bodies sit outside the closed-mass ledger. Spawning or despawning one is neither a source nor a sink. A despawning creature drops any conserved material it carries, and spawned remains never become conserved soil.

Unchanged: flora regrowth, the lifecycle of people and owned livestock, the bestiary and encounter data, and the eight-way still sprites (DEC-071).

| Lane | WBS | Job under DEC-073 | Wave |
|---|---|---|---|
| lane-fi | WG.00.47 | Spawn on the first view of each (area, z); end the eager placement at `world:created` | 3 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, row WG.00.47, :136) |
| lane-fc | NAT.07.02 | Danger field and tiers T0-T4 | 6 (`C:/Users/snewt/.deus_ops/design_nw1/FACTS_DIGEST.md:167`) |
| lane-fe | NAT.07.04 | Spawn rules and draw, as a pure module | 7 (`tasks/NAT.07.03/lane-fd/BRIEF.md:88`) |
| lane-ff | NAT.07.05 | Live spawner: passes around foci, despawn, notables, lair refill, depletion | 18 (`FACTS_DIGEST.md:139`) |
| SIM.00.05 Ecology | SIM.00.05/ecology | Moves flora regrowth and the spawn and despawn service into the core tick | after SIM.00.04 (`DEUS_WORLDGEN_WBS.md`, row SIM.00.05, :558) |

The wave order matters. lane-fi runs before lane-fc and lane-fe exist, so lane-fi moves the trigger and keeps the legacy planners (planArea, planUnderground) as its draw. lane-ff later swaps in lane-fe's draw for every (area, z).

---

## 2. Building blocks that exist

### 2.1 Live code

| Block | Where | What it already does | Gap |
|---|---|---|---|
| Spawn attempt | `game/js/plugins/DEUS_Ecology.js:509-559` `attemptSpawn` | Cap check (:518-520), interval (:521), seeded chance roll (:529-530), candidate cell (`findCandidate` :481-495), herd size from the species' `herd` clamped to the cap (:536), `W.addUnit` tagged `{ ecology: true, spawnedAt }` (:547-548), event `ecology:spawned` (:557) | No z. Per-area `last` and `rolls` state (:524, :526). Herd IDs from a global counter (:537) |
| Placement predicate | `DEUS_Ecology.js:463-471` `candidateValid`, `:431-455` `protectedReason`, `:457-461` `campCellBlocked` | In bounds, free cell, not on a camp's nine cells, species allowed at the cell. Monsters are also kept from the start (:435-438, `predatorFreeRadius` 60), camps (:440-442), active sites (:443-447, `SITE_CLEARANCE` 20 at :53), people (:448-451, 12 at :54) and the player (:452-453, 12 at :55) | Monster-only (returns `""` for every other kind, :433). Protects only the one start area. The player test is a 12-cell radius, not out of sight. `W.cellFree` is called without z (:467) |
| Floors and odds | `DEUS_Ecology.js:45-49` | `POPULATION_INTERVAL` 6 h, `PREY_FLOOR` 8, `MONSTER_FLOOR` 2, `PREY_CHANCE` 0.55, `MONSTER_CHANCE` 0.25 | Floors are only a lower bound for a data cap |
| Spawn weight per species | `game/js/plugins/DEUS_Wildlife.js:277-289` `expectedHerds`, `:161-170` `herdScale`, `:152-157` `allowedInRegion`, `:323-345` `planArea` | Biome weight x savagery scale over 64 sample points, region rules, seeded herd count | Surface only; seeded by (seed, area, species) with no z or time (:331) |
| Cell test | `DEUS_Wildlife.js:224-237` `cellOk`, `:210-220` `campRuleOk` | Walkable, biome weight, region, no blocking object, start distance, camp rule (predators kept `predatorFree` + 3 from campfires) | `campRuleOk` is called without z (:229); surface-only `WG.cellInfo` (:231) |
| Herd building | `DEUS_Wildlife.js:293-301` `findHerdCenter`, `:305-321` `makeHerd`, `:542-560` `unitSpec` | Seeded centre and members within 3 cells; the unit spec every creature uses | - |
| Lair herds | `DEUS_Wildlife.js:413-449` `planLairs` | One herd per History lair site, origin `lair` | The occupant is the first monster with biome weight (`monsters.find`, :431), not a table pick; runs only from `planWorld` |
| Cave placement | `DEUS_Wildlife.js:452-520` `planUnderground` | Pocket and floor-cell choice, border rule, camp-safe distance (:456-468) | Five hard-coded species (:460); only z -1 and -2 (:530-533); at most 6 or 4 herds (:471) |
| Start kit | `DEUS_Wildlife.js:355-409` `planKit` | Kit prey herds around every faction campfire (V67) | z 0 camps only (:361) |
| Time-of-day table | `DEUS_Wildlife.js:669-693` `ACTIVITY_CYCLES`, `:702-709` `shouldSleep` | Diurnal, nocturnal or crepuscular per species | In code, not data; `currentDayPhase` calls `phase()` with no z (:698) |
| Light and phase | `game/js/plugins/DEUS_DayNight.js:95-98` `daylight(h, z)`, `:99-105` `phase(h, z)` | 0-1 light per z; underground always reads as night (:100) | - |
| View events | `game/js/plugins/DEUS_World.js:3137-3138` and `:3262-3263` (`world:areaBuilt`, `world:levelBuilt`), `:3090` and `:3188` (`world:viewAreaChanged`) | Fire when an (area, z) is shown | Fire on every show, cached or fresh, not only the first. `viewAreaChanged` misses a z-only switch |
| Unit events | `DEUS_World.js:1412` `world:unitAdded`, `:1451` `world:unitRemoved`, `:1662` `world:unitAreaChanged`, `:1687` `world:unitLevelChanged` | Hooks for per-(area, z) counters | `World.unitsInArea` (:1425-1435) scans every unit |
| Kill events | `game/js/plugins/DEUS_Combat.js:1276` `combat:kill` { attacker, target }, then `removeUnit` (:1277); `DEUS_Wildlife.js:1288` `wildlife:kill` for predator kills | Hook for the depletion record | - |
| Drop on removal | `game/js/plugins/DEUS_Items.js:1327-1331` | A removed unit drops what it carried | Carriers never despawn (rule 7), so this is only a safety net |
| Taming record | `game/js/sim/taming/record.js:45-50` `withdrawnFromWild` | Captive and domesticated animals are not wild | Also true for `dead` (:47) |
| Notable list | `docs/adr/ADR-003_sim_render_split_and_lod.md` §7.5 (:923-933) | Tracked units: person, owned or tamed, named, carrying items, hurt, referenced by a job or combat | Add quest and lair |

### 2.2 Data and pure modules (merged; no plugin loads them yet)

| Block | Where | Use |
|---|---|---|
| Bestiary | `game/data/srd_adaptation/creatures.json` (317 rows; tier bands :21, placement rules :48-52, occupancy :77; generated, "do not hand-edit" :6); `docs/systems/DEUS_Bestiary.md:111-114` (seeded 247, lair 29, summon 28, none 13) | Species source. It has no group-size, time-of-day or light fields |
| Encounter tables | `game/js/sim/placement/encounters.js`: `buildTables` :100, `tableFor` :173, `drawKey` :192-199, `pick` :203-216; 465 tables (`docs/systems/DEUS_Encounters.md:17`) | The draw step. Only `tools/test_encounter_tables.js` requires it. `pick` throws `E_UNUSED_V1` on Sky tables (:207) |
| Weights | `game/data/ecology/encounter_weights.json` (frequency 6/3/1/1, tier gap at :12), PM_DEFAULT | Spawn-frequency data |
| Body join | `game/js/sim/rules/species_map.js:6` (23 rows) | Maps a table pick to a catalog species with a sprite |
| Species table | `game/data/UF_WorldCatalog.json:6246-6258` `wildlife`: `herdsPerArea` :6248, `savageryScale` :6252, `startSafeRadius` 20 :6257, `predatorFreeRadius` 60 :6258 | Herd sizes, biome weights, start radii |
| Monster cadence | `UF_WorldCatalog.json:14638-14655` `ecology.monsters`: `intervalBeats` [2160, 5760] :14642, `chance` 0.6, clearance playerCamp 60 / camp 40 / site 40 / person 12 :14649 | Cadence and clearance. Unread by code today |
| Level budgets | `UF_WorldCatalog.json:14704` `ecology.levels` (z 0: 240 creatures / 12 monsters; z -1: 60/6; z -2: 60/8; only z 0 enabled) | Level-wide unit budgets (`docs/design/ECOLOGY.md` §4.4). Unread by code today |
| Season factor | `UF_WorldCatalog.json:14525` `ecology.seasons` (1.5 / 1 / 0.6 / 0.2) | Off until seasons open (DEC-059 item 4) |

No game code reads `catalog.ecology`: `DEUS_Ecology.js` is `VERSION = 1` (:44) and reads only `catalog().wildlife` (:437).

### 2.3 Design inputs

- VISION V75 (`docs/VISION.md:85`): capped, seeded monster spawning over time. V68 (`:78`): nothing spawns on a cell it cannot move through.
- VISION V103 (`:114`): "one creature per 150-200 land squares, with small game near every camp".
- DEC-050 items 2-3 (`docs/OWNER_DECISIONS.md:827-828`): the danger field from the starts; the bestiary over the 30 biome-depth cells.
- DEC-039 items 2 and 5 (`:612`, `:617`): Minecraft is the default behaviour reference, and each Minecraft-derived rule needs a SOURCE / REFERENCE BEHAVIOR / DEUS TRANSLATION / DEVIATIONS record.
- DESIGN-D4 §5 (`C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D4_merged_minimax_m3.md:96-119`): tier densities (:100-106), the 60-cell predator-free start ring (:117), lair anchors (:119). Use lane-fd's per-input hashing, not D4's plain XOR key (:98).
- `docs/design/ECOLOGY.md` §7.3 (a seeded monster clock) and §7.6 (one placement gate; its step 3 is the "not visible" test against `viewLevel()` +/- `viewMargin`, catalog :14522).
- `docs/design/RESOURCE_ATLAS.md` §8.1, the "enemy bucket" paragraph (:312 when read): species eligibility by z, biome, depth band, region and danger tier.

---

## 3. Code dispositions per lane

### 3.1 lane-fi (WG.00.47, wave 3): move the trigger

- **Rewrite the hook.** `DEUS_Wildlife.js:1519` registers `spawnWorld` (:562) on `world:created`, and `planWorld` (:523-539) loops over every area plus z -1 and -2 (:526-535). That eager loop goes (archive copy plus git). In its place: a first pass per (area, z), seeded by (seed, ax, ay, z), run the first time that (area, z) is shown (`world:areaBuilt` / `world:levelBuilt`), and at New Game for the view start level and every faction-home level. Those are spawn foci (DEC-073 item 3) and are built at New Game (DEC-070 condition A).
- **Keep the legacy draw for now.** z 0 uses `planArea` (:323-345); z -1 and -2 use `planUnderground` (:452-520). Other levels get nothing until lane-ff. Keep `cellOk`, `campRuleOk`, `expectedHerds`, `herdScale`, `makeHerd` and `unitSpec` unchanged.
- **Keep `planKit` (:355-409) at `world:created`.** Faction homes are built at New Game, so it is no lazy-vs-eager risk. It still serves only z 0 camps (:361). Giving kit herds to homes at other depths is WG.62.01 work, which DEC-067 item 3 moved to the civilization phase.
- **Move `planLairs` (:413-449) off `world:created`.** Make one lair record per History lair site at New Game (History's sites exist then; its listener runs before Wildlife's, :1518), and place the occupants on the first pass of the lair's (area, z). The occupant pick stays `monsters.find` (:431) until lane-ff.
- **Retire DEUS_Ecology's breeding and baselines (proposed for lane-fi).** lane-fi's change is what breaks the baselines, and the DEC-070 amendment says lane-fi registers no wildlife against them. The brief must then add `DEUS_Ecology.js`, `tools/test_ecology.js` and `tools/test_birth_rate_halved.js` to lane-fi's allowed paths; otherwise a small lane must do this before lane-fi merges.
  - `stepBreeding` (:661-729) and its call in `tickHour` (:921): archive. It breeds herds every game hour (chance 0.175 / 0.275 at :697, 12-hour spacing at :695, newborns flagged `born`).
  - `initializeBaselines` (:210-221), called at `world:created` (:947), on every load through the `DataManager.extractSaveContents` alias (:1021-1025) and in the suite (:1046); `ensureArea`'s `baseline` field (:195); `capFor` (:223-228). Once areas are no longer filled at New Game, the snapshot reads 0 for unvisited areas, and their caps fall to the floors (8 prey, 2 monsters) for good. Replace `capFor` with a data cap per (area, z) (section 6, Q4), with the floors as minimums.
  - Keep the `st.nextHerd` seeding (:214-215) on `world:created` and on load, so new herd IDs never collide with saved ones.
- **Add no per-area state** beyond a first-pass marker that only a view or a focus sets (section 5, rule 6).
- **Text.** The plugin header (`DEUS_Wildlife.js:15-17`), `docs/systems/DEUS_Wildlife.md` and the catalog's `wildlife.about` (`UF_WorldCatalog.json:6247`, "live on and off screen") say creatures are placed in every area at New Game. Correct them.

### 3.2 lane-fc (NAT.07.02, wave 6): danger field and tiers

- DEC-073 does not change the field's maths. The field is a spawn designation: a pure function of the seed and the starts, never saved, rebuilt on load. It is part of the per-area checksum (section 5, rule 2).
- Tier lookup must be cheap enough for a spawn pass: a coarse grid per map, and no per-cell work per frame (`AGENTS.md:58`).
- Print a tier profile per start; no lane prints one today (`FACTS_DIGEST.md:167`).
- The hostile radius around starts and settlements is a lane-fe rule, not part of the field.

### 3.3 lane-fe (NAT.07.04, wave 7): spawn rules and draw

Before DEC-073 this lane was a pure planner that turned (seed, map, z) into fixed placements at D4 densities. Now it is a pure module with two parts and no plugin code.

- **Designations** for an (area, z), from the seed and the starts only: cell (DEC-030), tier (lane-fc), table ids (`encounters.tableFor`, `encounters.js:173`), lair and den anchors (D4 §5 lair rule, :119), and caps per kind.
- **The draw** for (seed, area, z, time window, attempt index), given live counts:
  - species by `encounters.pick` (:203), with a uint32 spawn index folded from (area, z, window, attempt) one input at a time as `drawKey` does (:192-199), never by plain XOR;
  - group size from the catalog species' `herd` range, through `species_map.js`;
  - a time-of-day and light gate from the activity table, moved from code (`DEUS_Wildlife.js:669-693`) into data and read with `DayNight.phase(h, z)` (`DEUS_DayNight.js:99-105`);
  - a season weight hook that stays at 1 (catalog :14525; DEC-059 item 4);
  - T0 rules: no predator within 60 cells of any of the nine starts, and only herbivores within 20 (catalog :6257-6258; D4 :117);
  - hostile monsters kept out of the clearance radii around starts and active settlements (catalog `ecology.monsters.clearance`, :14649).
- **Reuse as rules, not as calls.** Copy the logic of `candidateValid` / `protectedReason` (`DEUS_Ecology.js:431-471`) and `cellOk` / `campRuleOk` (`DEUS_Wildlife.js:210-237`) into the pure module, made z-aware. The module must not import a plugin.
- No Sky spawns in v1 (`encounters.js:207`). No minerals, ever (rule 4).
- Out of scope: units, despawn and the live passes (lane-ff).
- Data: archive the dead `ecology.fauna` breeding and arrival blocks (`UF_WorldCatalog.json:14536` `birth`, :14543 `arrival`, :14551 per-species `birthBeats` and litters, e.g. :14553). Keep `targetScale` to `worldCap` (:14532-14535) as candidate caps. New spawn fields on bestiary rows (group size, activity, light) come through a new pinned source and a rebuild, never by hand (`creatures.json:6`).

### 3.4 lane-ff (NAT.07.05, wave 18): the live spawner

- **Wire lane-fe's module into the live plugin**, replacing lane-fi's legacy draw on every one of the 32 levels.
- **Passes over foci only:** the player's view level and its neighbours, and every active AI faction settlement. This replaces DEUS_Ecology's rotating cursor (`cursorArea` :895-903, used by `tickHour` at :915), which reaches one off-screen area per hour, at z 0 only. Flora (`spreadPlants` :570, `processResources` :344) keeps its own timers.
- **Spawn core:** the logic of `attemptSpawn` (:509-559), made z-aware and without per-area clocks (section 5, rule 4).
- **Counts:** per-(area, z) counters kept on the unit events (`DEUS_World.js:1412`, :1451, :1662, :1687), instead of `population()` (`DEUS_Ecology.js:170-184`), which goes through `unitsInArea` (`DEUS_World.js:1425-1435`), scans every unit and defaults to z 0.
- **Keep `population()`'s public shape** `{ prey, monsters, predators, creatures, bySpecies }`. Merged WG.00.38 code wraps it (`game/js/plugins/DEUS_Taming.js:107-121`; `game/js/sim/taming/census.js:42-74`; `tools/taming/test_taming.js:647-667`). The spawner's own cap count must leave out captive and domesticated animals itself, because the internal closure bypasses the alias (`docs/systems/DEUS_Taming.md:103`, PROPOSED-AX-05). DEUS_Taming is not loaded today: it is in neither `game/js/plugins.js` nor the companion list at `game/js/plugins/DEUS_Core.js:89-104`.
- **Despawn pass:** far from every focus and out of sight, and never a notable. Exempt: taming status `captive` or `domesticated` (not `withdrawnFromWild` as is, which also passes `dead`, `record.js:47`), named, quest, lair, or carrying items or equipment. Mark a despawn before `World.removeUnit` (`DEUS_World.js:1443`), which emits the same `world:unitRemoved` as a death. Its listeners include Factions (`DEUS_Factions.js:619-625`, which counts only dead or dying faction units), Items (`DEUS_Items.js:1327-1331`), Combat (`DEUS_Combat.js:1963`), Jobs (`DEUS_Jobs.js:1847`) and Ownership (`DEUS_Ownership.js:568`).
- **Notable registry** with stable keys (section 5, rule 3).
- **Lairs:** the boss is a lair-table pick and unique; its death is recorded by key and never re-rolled. Minions refill as a closed-form function of the time since the lair was cleared. Lair occupants never despawn.
- **Depletion record:** written on `combat:kill` (`DEUS_Combat.js:1276`), with closed-form recovery (section 5, rule 5).
- **Bodies:** picks with a catalog body become units. Picks without one count as failed attempts and are reported, never drawn with a stand-in.
- **Equal starts:** one hostile radius around all nine starts and every active settlement. Today only the start area's centre gets 60 cells (`DEUS_Ecology.js:435-438`), and NPC campfires get the kit's 20 (:440-442; `FACTS_DIGEST.md:167`). Print the bodied share of each start's T0 table: the dragonborn and dwarf homes have 0.000 (`FACTS_DIGEST.md:139`).

### 3.5 SIM.00.05 Ecology increment (later)

- Moves flora regrowth and the spawn and despawn service into the core tick (`DEUS_WORLDGEN_WBS.md`, row SIM.00.05, :558). `stepBreeding` is not migrated; it is already archived (3.1). No herd breeding.

### 3.6 Other code the sweep listed

| Item | Where | Disposition |
|---|---|---|
| Wildlife behaviour | `DEUS_Wildlife.js` `tick` :1312-1346, `predatorTick` :1191, `PREDATOR_PREY` :711; the map hook is empty (:1348-1352) | Keep as behaviour only, with no food-web growth. It is unwired, so spawned creatures stand still. No spawner lane rewires it; the parked block WB-003 (`docs/WORK_QUEUE.md:98`) is its only home, and the PM must open a leaf if it is wanted. Grazing only sets a state and removes nothing (`grazeTick` :837-879) |
| Owned livestock breeding | `game/js/sim/taming/care.js:149`, `:152` (`breedingEligible`, hook `SIM.40.10`) | Keep. Civilization phase |
| Taming neglect reversion | `game/js/sim/taming/defaults.js:41-45` (off); OQ-AX-03 at :76 | lane-ff decides what a reverted animal is (section 6, Q12) |
| Mass ledger `creature` form | `game/js/sim/ledger_defaults.js:20`, :50, :55; transforms `eat`, `butcher`, `remains` :96-98 and `drink`, `excrete` :119-120; `SOURCES` :157-174, `SINKS` :175-192 | Add no spawn source and no despawn sink: DEC-073 item 9 says spawning is neither. The `creature` form stays for people and owned livestock. For spawned bodies: they hold no ledgered matter, so `butcher` and `remains` of a spawned creature post nothing (DEC-028 amendment, `OWNER_DECISIONS.md:427`), and a spawned creature never takes ledgered matter (food, world water) into itself unless it gives it back on despawn (DEC-040 amendment, :650; "Water never leaves", :649). No plugin uses the ledger today (only `game/js/sim` modules and `tools/sim` tests), so these lanes add no ledger calls; they add a check that spawn and despawn post nothing. Any change to `ledger_defaults.js` belongs to the ledger's leaf (WG.65.15) |
| SIM.40.10 `spawned` origin | `tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md`, origin table row `spawned` (:84 when read) | Reuse the origin name only. Its ledger source `spawn:<sourceId>` contradicts DEC-073 item 9 |
| Ore, stone and gem sprouting | `DEUS_Ecology.js` `SPROUT_DEFS` :747-763, `stepBeat` :775, run every 60 frames by the map hook (:1008-1018) | Already ruled out (DEC-023 item 2; fix leaves SIM.50.12 and SIM.50.13). Ore outcomes are dropped (:796-801), but loose stone (`rocks_small`, :750, :755, :760) and crystal (`crystal_small`, :756, :761; `glow_caps` maturing to `crystal_spire`, :759) still sprout. Not a spawner lane's job. The spawner never reuses `stepBeat` and never places minerals |

Not in these lanes (for the PM): the simulation-only creature states in `docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md:153-161`, with their baselines in `tools/wsr/known_gaps.json` (:10-11, :255-256); the plugin rows in `docs/STATUS.md:36-37`.

---

## 4. Tests to rewrite or archive

### 4.1 Red before anyone starts

- `tools/test_ecology.js` ran 0 passed, 7 failed, exit 1 on main on 2026-10-01 (run for this note): harness errors "reading 'setIn'" and "reading 'speciesById'", and `depleted_wildlife_recovery` got status `unavailable`. Its checks prove nothing until the harness is fixed. The lane that touches DEUS_Ecology fixes the harness or records the file as red; it is not a guard.
- `tools/test_birth_rate_halved.js` fails at its first assertion (:25, DEUS_Colonists conception), so it never reaches the Ecology assertion (:39-43).
- The untracked prune census marks both files ARCHIVE because they "read legacy UF_* shims" (`tasks/PRUNE/readonly/R3a.md:20`, :55). That is wrong: both read `DEUS_Ecology.js` (`tools/test_ecology.js:6`, `tools/test_birth_rate_halved.js:40`). Archive only their breeding parts.

### 4.2 Archive

| Test | Where | Why |
|---|---|---|
| `wildlife_herd_breeding` | `tools/test_ecology.js:318-338` | Tests `stepBreeding`. Archive with it |
| Ecology birth-chance assertion | `tools/test_birth_rate_halved.js:39-43` (the string `0.175 : 0.275`) | Remove this block only; the Colonists and History parts are about people and stay. The "user directive 2026-09-20" cited at `DEUS_Ecology.js:697` is in neither VISION nor OWNER_DECISIONS |
| `population_over_seeds` | `DEUS_Wildlife.js:1974`, suite `wildlife_seeds` (not default, :1977) | Plans `planWorld` over 24 seeds and wants 60 creatures per world. Archive it with `planWorld`, or rewrite it as a per-(area, z) cap check over seeds |

### 4.3 Rewrite

| Check | Where | New form | Lane |
|---|---|---|---|
| `spawned_with_world` | `DEUS_Wildlife.js:1598` (wants 60 creatures after `world:created`) | After New Game only the view start level and faction-home levels hold creatures; the first view of another (area, z) adds them | lane-fi |
| `by_biome`, `none_too_near_start`, `monsters_only_wild` | `DEUS_Wildlife.js:1628`, :1688, :1698 | The same assertions over first-pass spawns, measured against every start | lane-fi |
| `deterministic` | `DEUS_Wildlife.js:1704` (`Wildlife.plan(st)` twice) | The first pass of the same (seed, area, z) twice is identical, and the order of first views does not change it | lane-fi |
| `saved` | `DEUS_Wildlife.js:1913` | Keep; add a notable that keeps its key across save and load | lane-ff |
| `state_saved` | `DEUS_Ecology.js:1052` (counts "area baseline(s)") | Drop the baseline part | lane-fi |
| `depleted_wildlife_recovery` | `tools/test_ecology.js:341-351` (calls `initializeBaselines` at :344) | A spawn under a data cap | lane-fi |
| `bounded_work` | `DEUS_Ecology.js:1194` (expects the cursor's 1 or 2 areas per hour) | Bounded focus passes | lane-ff |
| Snapshot showcase | `tools/test_creatures_ingame.js:47` injects at the line `t.screenshot("df_behaviors");` | Keep that line in the wildlife suite, or update the test | lane-fi |

### 4.4 Keep and carry over

- `DEUS_Ecology.js` `deterministic_safe_cell` :1127, `hard_cap` :1136, `monster_replenishes` :1150 and `prey_replenishes` :1172 already test a capped, seeded, protected spawn. They become spawner checks (renamed to "spawns"), with z and the out-of-sight test added.
- `start_kit_herd` (`DEUS_Wildlife.js:1638`) and `kit_every_area` (:1674) stay while `planKit` stays at New Game.
- The wildlife behaviour checks (`wanders` :1776 through `perf` :1930) are unchanged.
- `tools/taming/test_taming.js:667` stays green.
- The flora checks (`tools/test_ecology.js:230`, :248, :278, :292, :354; suite `ecology` :1058-1101, :1208, :1221) are not spawner work.

### 4.5 New tests (names are suggestions; the PM sets them in the briefs)

- **lane-fi**, `tools/test_creature_spawn_first_build.js` (the gate already named in `tasks/wbs_registry.json`, entry WG.00.47): `no_eager_placement`, `foci_filled_at_new_game`, `first_view_spawns`, `first_pass_once`, `lazy_equals_eager`, `order_independence`, `no_ecology_baseline` (also after a load), `no_breeding`, `perf`. Mutants: put the `world:created` hook back, put the baseline back, put the breeding call back, let a build (not a view) run the first pass.
- **lane-fc**, `tools/test_danger_field.js`: the existing plan, plus the printed per-start tier profile.
- **lane-fe**, a pure test (the draft brief calls it `tools/test_creature_plan.js`): `draw_deterministic`, `index_mixing` (cell 1 tier 0 differs from cell 0 tier 1), `designations_pure` (no live state read), `cap_by_tier`, `t0_no_predators`, `herbivores_only_within_20`, `hostile_radius_every_start`, `activity_gate`, `underground_is_night`, `season_weight_off`, `no_sky_spawn`, `no_minerals`, `perf`. Mutants: a global RNG, a plain XOR key, no tier gate, a predator in T0, the season weight on.
- **lane-ff**, a live test (the draft brief calls it `tools/test_wildlife_plan_live.js`): `spawn_near_foci_only`, `faction_home_focus` (creatures appear around an AI home while the player is elsewhere), `despawn_far_unseen`, `visible_never_despawns`, `notables_persist` (same key, never despawned, through save and load), `dead_not_exempt`, `lair_boss_unique`, `minions_refill_closed_form`, `depletion_thins_then_recovers`, `despawn_not_death` (faction population unchanged), `no_ledger_post`, `bodied_only`, `per_start_report`, `perf`. F5 evidence per Scenario F (`tools/ops/GAME_TRANSLATION_TEMPLATE.md:119`).

---

## 5. DEC-070 lazy-vs-eager rules for the spawner

DEC-070 condition C as amended (`docs/OWNER_DECISIONS.md:1207`) and DEC-041 item 11 as amended (:685) come down to these rules.

1. **Designations are pure.** Tier, cell, table ids, lair and den anchors and caps depend only on the seed and the starts: never on build order, build time, the clock, unit IDs or live counts.
2. **Checksums.** The per-area and per-(area, z) checksums of lane-dd and lane-dg include designations, lair and den records (anchor, occupant species, boss alive or dead), the depletion record and the notable registry. They exclude transient spawned units, the `nextUnitId` and `nextHerd` counters, and Ecology's stats.
3. **Stable keys, not unit IDs.** `World.addUnit` takes IDs from a global counter (`DEUS_World.js:1364`), and herd IDs come from another (`DEUS_Ecology.js:537`), so the same creature gets a different ID when (area, z)s are built in another order. Notables carry a stable key, such as `lair:<siteId>:boss`, or the key given when a creature became notable. Lair records exist for every History lair site from New Game, so a unique boss exists at tick 0 whether its area is built or not; its unit is placed on the first pass of its (area, z).
4. **No clocks that run only while an area is loaded.** DEUS_Ecology keeps `last`, `rolls` and `spawned` per area (:196-198) and advances `rolls` only when the area is processed (:526), so today's draws depend on visit history. Use instead a time window (floor of the hour divided by the window length) and an attempt index within the window. Minion refill and depletion recovery are closed-form functions of (now - recorded time).
5. **Depletion comes only from play.** It is written by kills, keyed by (area, z) or by block, and stored with absolute game time. An unvisited area has none in both modes, and its effect on the spawn rate is closed-form.
6. **First pass on a view or a focus, never on a build.** `world:areaBuilt` and `world:levelBuilt` fire whenever an (area, z) is shown, cached or fresh (`DEUS_World.js:3063-3075`, then :3137-3138; and :3248-3263). A build made for another reason, such as a faction home floor, emits neither. So a first-pass marker that only a view or a focus sets comes out the same in both modes.
7. **Same view, same spawn.** With rules 1-6, an (area, z) built at New Game and first seen at hour 500 spawns exactly what one built at hour 500 and seen then spawns. lane-fi's `lazy_equals_eager` check asserts it.
8. **Faction homes are foci from tick 0.** DEC-070 condition A builds them at New Game, and DEC-073 item 3 makes them foci. Spawn parity across the nine homes is reported per start (3.4); its tolerance comes from DESIGN-NW-1 (DEC-070 item 2).
9. **Save and reload** reproduce, bit for bit, everything rule 2 includes. Transient spawned units may be saved as units, but they are not compared.
10. **Frame time** (DEC-070 item 3; `AGENTS.md:58`). Passes cover only the focus ring and use per-(area, z) counters. Nothing scans all units or all areas per frame. lane-fe and lane-ff each carry a perf gate.

---

## 6. Open technical questions for the lanes

Each has a proposed default. The lane settles it in its brief or report, and the PM records the choice.

| # | Question | Lane | Proposed default |
|---|---|---|---|
| Q1 | What is the focus ring, and which settlements are "active"? | ff | The focus (area, z) plus the levels directly above and below. Active settlements are non-ruined faction sites, as DEUS_Ecology's `activeSites` reads them (`DEUS_Ecology.js:424-429`) |
| Q2 | What is "out of sight"? | ff | Outside the drawn screen of the view level plus `viewMargin` 4 (`ECOLOGY.md` §7.6 step 3; catalog :14522). Any level not drawn is out of sight. Not today's 12-cell player radius (`DEUS_Ecology.js:55`, :452-453) |
| Q3 | How far is "far away"? | ff | Write a Minecraft Rule Record (DEC-039 item 5) for mob caps, light, despawn distance and persistence flags, translated to 5-ft cells, and store the numbers as PM_DEFAULT data |
| Q4 | Which density number sets the caps? | fe | V103 (one creature per 150-200 land squares, about 8.7-11.6 per acre at 1,742.4 cells per acre) and D4's T0 density (0.30 per acre) differ by roughly 30 to 40 times, and `ecology.levels` holds level-wide budgets (240 and 12 at z 0). The brief must pick one number per tier. V103 is an Owner-approved default, so a lower number goes to the Owner first. The floors 8 and 2 stay as minimums |
| Q5 | Window length and attempt index? | fe | Window = 6 game hours (`POPULATION_INTERVAL`, `DEUS_Ecology.js:45`) for prey; monster cadence from `ecology.monsters.intervalBeats` (:14642). The attempt index counts attempts inside the window and is folded into `pick`'s uint32 spawn index as in `drawKey` |
| Q6 | Where is the first-pass marker stored, and what catches a z-only switch? | fi | A saved set of (area, z) keys, set only by a view or a focus. `world:levelBuilt` covers a z switch; `world:viewAreaChanged` does not (`DEUS_World.js:3090`) |
| Q7 | How are live counts kept? | ff | Per-(area, z) counters by kind, updated on the four unit events (2.1) and rebuilt on load. No `unitsInArea` call inside a pass |
| Q8 | How do listeners tell a despawn from a death? | ff | Set `data.despawned = true` before `removeUnit`. Never despawn a unit with inventory, so Items' drop (`DEUS_Items.js:1327-1331`) never runs for a despawn |
| Q9 | Which kills thin an area, how coarse is the record, and how long is recovery? | ff | Kills of a spawned wild creature by a person, colonist or faction unit (`combat:kill`). Predator kills (`wildlife:kill`) do not count. Keyed by (area, z). Linear recovery over 3 in-game days (PM_DEFAULT data) |
| Q10 | Lair bosses and minions, when only T4 lair tables have creatures (`tasks/NAT.07.03/lane-fd/REPORT.md:59-60`)? | fe, ff | Boss = the lair-table pick at the lair's tier, falling back to the wander table at that tier. Minions = wander-table picks at the lair's tier, capped per lair. A T0 lair holds no monsters |
| Q11 | Do kit herds persist? | ff | No. They are placed at New Game and are ordinary wildlife afterwards; the home focus refills by rule. Parity is checked by the per-start report |
| Q12 | What is an animal that reverts from tamed to wild (`taming/defaults.js:41-45`, off)? | ff | It keeps a notable flag, so it never vanishes in front of its former owner |
| Q13 | What happens to a pick with no catalog body? | ff | A failed attempt: no unit, no cap used, counted in the report |
| Q14 | Where does the live spawner live until SIM.00.05? | fe, ff | The rules live in lane-fe's pure module, with a thin caller in `DEUS_Wildlife.js` (lane-ff's file). `DEUS_Ecology.js` keeps flora and loses its creature work at the SIM.00.05 Ecology increment |
| Q15 | How does the game load the pure modules? | fi, ff | Through `UF.Sim.require` from WG.00.44, which lane-fi already depends on (`tasks/wbs_registry.json`, entry WG.00.47). `encounters.js` is CommonJS |
| Q16 | Do notables count toward density caps? | fe, ff | Captive and domesticated animals do not. Lair occupants count toward their lair's cap only. Named and quest creatures count |
| Q17 | What happens when a spawned creature eats or drinks, once behaviour is wired? | ff, ledger leaf | It takes no ledgered matter, or it holds what it takes and gives it back on despawn (DEC-073 item 9). Moot until a behaviour leaf exists |

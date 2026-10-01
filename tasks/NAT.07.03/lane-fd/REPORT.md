# NAT.07.03 lane-fd report (writer claude, 2026-10-01)

Branch `task/lane-fd`, base 839fb6e3 (holds the lane-ex merge 02496b6c). Code tip 3221d2b7; this report and EVIDENCE.md are committed on top of it. Not pushed, not merged. Reviewer: gemini.

## What changed
- `game/js/sim/placement/encounters.js`: NEW. `buildTables(bestiary, weights)` builds one integer-weighted table per (cell, tier, kind) for the 30 DEC-030 cells plus the Sky (465 tables). The kinds are wander, lair and feature. `pick(table, seed, spawnIndex)` makes one deterministic draw, hashed from (seed, cell, tier, kind, index). `tableFor` looks up a table and `loadDefault` builds from the shipped files. The module is host-agnostic and never calls `Math.random`.
- `game/data/ecology/encounter_weights.json`: NEW, status `PM_DEFAULT`:
  - frequency weights: common 6, uncommon 3, rare 1, lair 1;
  - tier-gap weights: 32, 4, 1;
  - feature-only ids: the four elementals.
- `tools/test_encounter_tables.js`: NEW. It has the brief's 8 named checks plus `module_syntax`, all compared with an oracle the test computes itself. The mutant sweep runs 9 mutants (the brief's `tier_plus_one` and `summon_leak`, plus one per remaining check). Options: `--root`, `--no-mutants`, `--mutant`.
- `docs/systems/DEUS_Encounters.md`: NEW system doc. It covers the table rules, API, error codes, the default weights with the measurement behind them, the statistics of the shipped data, open questions, checks and mutants.
- `tasks/NAT.07.03/lane-fd/EVIDENCE.md`, `REPORT.md`: evidence and this report.

## How I tested it
- At the base (839fb6e3, worktree), I ran the three gate commands: `node tools/test_encounter_tables.js` (exit 1, file absent), `node tools/test_bestiary_adaptation.js` (exit 0) and `node tools/check_deus_syntax.js` (exit 0).
- For FAIL before, I ran the tip's test with `--root` on a `git archive 839fb6e3` export: 9 of 9 checks FAIL, exit 1.
- In the worktree I ran `node tools/test_encounter_tables.js`: 9 PASS and 9 of 9 mutants killed, about 2.6 s.
- I ran the three gate commands in a fresh `git clone --no-hardlinks` at 3221d2b7, where core.autocrlf is true and the files are CRLF. All three exited 0.
- I ran `--mutant tier_plus_one` and `--mutant summon_leak` singly to capture each rerun's full output.
- Harness check: in a test copy with the `tier_plus_one` patch made a no-op, the sweep reports `FAIL ::mutant_tier_plus_one_killed: test exit 0, want 1` and exits 1.
- I measured the gap-weight choice: the median own-tier share for six candidate weight lists over the 30 cells (table in DEUS_Encounters.md).

## Evidence
- No screenshots. The brief requires no F5 evidence, and no plugin loads this module.
- Full logs are in `tasks/NAT.07.03/lane-fd/EVIDENCE.md`. Excerpts:

```
(base tree, tip test)  FAIL ::tier_ceiling: weights file missing or unreadable (game/data/ecology/encounter_weights.json) ...  (all 9 FAIL)  exit 1
(fresh clone 3221d2b7) node tools/test_encounter_tables.js      9 PASS, 9 mutants killed   exit 0
                       node tools/test_bestiary_adaptation.js   all checks passed          exit 0
                       node tools/check_deus_syntax.js          Checked 62 DEUS plugin files. Errors: 0   exit 0
tier_plus_one: FAIL ::tier_ceiling: 613 problem(s); VOLCANIC/Deep Earth|T0|wander: srd:creature:azer is T1, above the table's ceiling; ...
summon_leak:   FAIL ::no_summon_exclude_people: 142 problem(s); VOLCANIC/Deep Earth|T0|wander: srd:creature:lemure (SUMMON-ONLY, summon); ...
```

## Not done / known problems
- **The before-state failures are missing-file failures.** At the base, the weights file and the module do not exist, so every check fails at setup. The mutants are what show each check catching a wrong value.
- **The weights are my PM_DEFAULT, not a PM ruling.** I first tried tier-gap weights 4, 2, 1, but a T3 table then rolled its own tier only 16% of the time (median), because most high-tier bestiary rows are rare. 32, 4, 1 gives own-tier medians of T1 84%, T2 60% and T3 52%. Twenty of the 83 cell tables that hold own-tier rows still give their own tier under half the weight.
- **No T4 creature wanders.** All 38 T4 rows are lair (29), SUMMON-ONLY (7) or EXCLUDE (2), so T4 wander tables hold only T2 and T3 rows, and WILD/Deep Earth T4 wander is empty. This follows from the bestiary and matches DESIGN-D4 ("T4 always lair-anchored"). Lair tables are non-empty only at T4.
- **The T0 tables include T0 MONSTER rows** (goblin, kobold, skeleton, steam-mephit and others). DESIGN-D4 calls T0 "wildlife only", but a wildlife-only T0 leaves TEMPERATE/Deep Earth with an empty T0 table, which `t0_nonempty` forbids. Keeping predators away from starts is the spawner's start-safe predicate (D4 section 5), so I left it there.
- **The draw key is not D4's literal XOR.** D4 gives `seed ^ cell ^ tier ^ index`. I hash the inputs one at a time (murmur3 finaliser) and add the kind. A plain XOR gives cell 1 tier 0 the same draws as cell 0 tier 1.
- **`tools/check_deus_syntax.js` covers `game/js/plugins` only**, so it does not check the new module. The `module_syntax` check in my test runs `node --check` on it instead.
- Lair odds per tier, densities, the start-safe radius and element-source matching for feature tables are spawner work (out of scope) and are not here.
- I did not update `docs/STATUS.md` or add a claim line, because both are outside this lane's allowedPaths.
- Not pushed and not merged, per the launch rules. The Gemini review has not run yet.

## Try it in RMMZ
Nothing to try in RMMZ: no plugin loads `encounters.js` or `encounter_weights.json` yet. To check the lane:
1. `node tools/test_encounter_tables.js`
2. `node -e "const E=require('./game/js/sim/placement/encounters.js'); const b=E.loadDefault(); console.log(E.pick(E.tableFor(b,'TEMPERATE/Lowlands','T1','wander'), 20261001, 0))"`

Expected: (1) exits 0 with 9 PASS and 9 killed mutants. (2) prints `srd:creature:axe-beak` every time (the first of the eight draws listed in DEUS_Encounters.md's measurement run).

## Decisions needed
- **PM: the weights.** Keep or change PM_DEFAULT (frequency 6/3/1/1, tier gap 32/4/1). It is a data edit; the test follows the file.
- **PM: which creatures are feature-only.** The default is the four creatures named elemental. srd51 types 12 more rows as elementals (mephits, azer, xorn, salamander, magmin, gargoyle and others), and the bestiary source (C4) keeps the ones it places as MONSTER. Widening the list is a data edit.
- **PM, for the spawner lane (lane-fe):**
  - whether T0 near starts should exclude MONSTER rows beyond the start-safe predicate;
  - how lair odds at T1 to T3 (D4: 5%, 15%, 35%) apply when only T4 lair tables have creatures.

```text
GAME TRANSLATION

WBS / Lane: NAT.07.03 / lane-fd
Approved scope / Owner authorization reference: DEC-058 natural-world build plan (2026-09-30) as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34); DEC-057 seeded placement; brief tasks/NAT.07.03/lane-fd/BRIEF.md
Writer SHA / evidence date: 3221d2b774d889824db502d7d1a485915b616dc0 / 2026-10-01
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
Decides which creature the world puts in a given biome cell at a given danger tier: wolves and boars near a temperate start, deeper or rarer creatures further out, lair bosses only at lair sites, elementals only at their element source, and no summoned fiends, excluded rows or NPC people from a roll. Nothing changes in the game until a spawner consumes it.

Trigger:
A future spawner asking "what lives here?" for a (cell, tier) and a spawn index; at build time, buildTables over the bestiary layer and encounter_weights.json.

Runtime Authority:
game/js/sim/placement/encounters.js owns the tables: tables[cell][tier][kind] = { cellId, tierIndex, kind, unusedV1, total, entries[{id, tier, weight}] }. Creature facts stay with game/data/srd_adaptation/creatures.json (NAT.07.01); weights with game/data/ecology/encounter_weights.json.

Simulation Path:
encounters.js buildTables -> kindOf (placement/role filter, feature-only list) -> tier ceiling and tierGapWeight -> frequencyWeight x gap weight; pick -> drawKey (murmur3 fold of seed, cellId, tierIndex, kind, spawnIndex) -> floor(h x total / 2^32) over cumulative integer weights.

Engine Bridge:
None. DEFERRED TO the seeded spawner (NAT.07.04 / NAT.07.05; lane-fe, wave 7, depends on this lane). No plugin requires the module.

Visible Result:
None yet. Observed only headless: e.g. TEMPERATE/Lowlands T1 wander, seed 20261001, draws 0-7 = axe-beak, green-dragon-wyrmling, mimic, death-dog, black-bear, ghoul, giant-weasel, animated-armor.

Persistence:
N/A - the tables are rebuilt from data and hold no state; a draw is a pure function of (seed, cell, tier, kind, index), so a save needs only the seed and the spawner's own indices. Save/load of spawned creatures belongs to the spawner.

Failure Without This Lane:
The spawner would have no per-cell, per-tier creature list: it would have to filter the 317-row bestiary itself each time, with no weights, no lair/feature separation and no guarantee that summons, excluded rows and NPCs stay out of rolls.

Automated Proof:
node tools/test_encounter_tables.js at 3221d2b7 in a fresh CRLF clone: 9 PASS (tier_ceiling, no_summon_exclude_people, lairs_only_in_lair_tables, elementals_feature_only, t0_nonempty, sky_tables_marked_unused_v1, pick_deterministic, weights_from_data, module_syntax), 9 of 9 mutants killed, exit 0. The same test on the base tree: 9 FAIL, exit 1. Deterministic unit proof only; there is no consumer integration test because no consumer exists yet.

In-Game Proof:
NOT RUN - the brief requires no F5 evidence and nothing in the game loads the module.

CONSUMED BY GAME SYSTEMS:
- Seeded spawner (NAT.07.04/05, lane-fe): planned to call tableFor(...) and pick(...) for each spawn. Integration test: none yet (consumer not built).
- Corruption would show in play as wrong-tier creatures near starts (tier ceiling), demons or NPC people wandering (summon/people leak), dragons wandering instead of holding lairs, elementals away from their element source, the same creature sequence in two different cells (weak draw key), or a different world from the same seed (non-determinism).

GAME BRIDGE STATUS
Simulation implemented: YES - encounters.js buildTables/pick; tools/test_encounter_tables.js 9 PASS at 3221d2b7
Engine bridge implemented: NO - deferred to the seeded spawner (NAT.07.04/05, lane-fe)
Presentation implemented: NO - no creature is spawned or drawn; spawner and art work come later
Input/player interaction implemented: NO - N/A to a table builder; encounters come with the spawner
Save/load implemented: NO - nothing to save here (pure function of seed and data); the spawner's saves are its own
Playable verification performed: NO - NOT RUN; not loadable in game yet

Simulation authority: COMPLETE within NAT.07.03 (encounter tables and deterministic pick), supported by EVIDENCE.md sections 2-4
Game translation consumer: DEFINED as the seeded spawner (NAT.07.04/05, lane-fe) calling tableFor + pick
Engine bridge: DEFERRED TO NAT.07.04/05 (lane-fe, wave 7)
Player-facing status: NOT YET PLAYABLE

Remaining step before player can experience it:
The seeded spawner (lane-fe) must read the danger field and biome cell, call pick, and place creatures in the live map. Their sprites also have to exist, and they are frozen under DEC-063 (no creatures yet).
```

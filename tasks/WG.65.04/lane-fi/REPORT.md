# lane-fi (WG.65.04): world-wide spawn density, writer report

**Writer:** claude (Opus 5.5), 2026-10-02. **Reviewer:** grok (not yet run). **Code commit:** 229d2c31 on `task/lane-fi` (base a7028103).
**Brief:** `tasks/WG.65.04/lane-fi/BRIEF.md`. **Binding:** DEC-080 items 1 and 5, DEC-073 item 1, DEC-065, DEC-070 condition C, AGENTS.md Rule 14.

## What changed
- `game/js/sim/spawner/global_density.js` (new): a pure module that gives every (area, z) of the world an approximate prey count and monster count, from the seed alone. No terrain is built, no live state is read, the core does no file IO and never calls Math.random or the clock.
- `game/js/sim/spawner/index.js` (new): exports it. The game would load it with `UF.Sim.require("spawner")` (resolves `spawner/index.js`, `DEUS_World.js` simResolve); nothing loads it yet.
- `tools/sim/test_global_spawn_density.js` (new): 19 checks plus a 15-mutant sweep that runs on every invocation.

## How it works
- `configFromCatalog(catalog, knobs)` reads the caps from data: `ecology.levels` (z 0: 240 creatures / 12 monsters; z -1: 60/6; z -2: 60/8; z 1: 30/0; z 2: 20/0) and `wildlife.savageryScale` (0.6 / 1 / 1.8). A level the catalog does not list uses the nearest listed level (z -16..-3 use z -2, z 3..15 use z 2). `loadDefaultConfig()` is the Node/NW.js helper that reads `game/data/UF_WorldCatalog.json`.
- Per (area, z): `prey = min(preyCap, round(preyCap x fill x savageryScale))` and `monsters = min(monsterCap, round(monsterCap x tierScale[tier] x fill' x savageryScale))`, where `preyCap = creatureCap - monsterCap` and the two fills are seeded in [0.5, 1]. Hashes fold (seed, salt, ax, ay, z) through murmur3 fmix32 one input at a time, as `encounters.drawKey` does, never by plain XOR.
- `computeGlobalDensity(seed, world, cfg)` fills flat typed arrays (prey and monsters `Uint16Array`, tier `Uint8Array` per (area, z); savagery `Uint8Array` per area) plus totals, per-level totals and a checksum. `densityAt` computes one (area, z) on its own and gives the same answer; `at(result, ax, ay, z)` reads one back.
- **Two stand-in inputs, injectable.** `world.savageryAt(ax, ay)` (default: a seeded coarse value-noise field, lattice every 8 areas) and `world.tierAt(ax, ay, z)` (default: Chebyshev distance in (area, z) to the nearest start, one tier per area, capped at T4; T2 everywhere with no starts). T0 holds no monsters. lane-fc's danger field (NAT.07.02) and a pure worldgen savagery field replace the defaults by injection, without changing this module.
- The stand-in knobs (`fill`, `tierMonsterScale` [0, 0.25, 0.5, 0.75, 1], `tierStepAreas` 1, `fieldCellAreas` 8, `savageryCuts` [0.3, 0.75]) are in `DEFAULTS`, PM_DEFAULT for the reviewer and PM to change.

## How I tested it
- `node tools/sim/test_global_spawn_density.js`: exit 0. `RESULT: 19 passed, 0 failed`, then `MUTATION RESULT: 15/15 killed; 0 survived/invalid` (about 19 s in all).
- `node tools/check_deus_syntax.js`: `Checked 62 DEUS plugin files. Errors: 0`, exit 0. (It checks plugins only; `node -c` on both new modules also passed.)

Checks: `index_exports`, `config_from_catalog`, `mix32_reference` (BigInt fmix32 and the published fmix32(1) = 0x514E28B7), `counts_match_oracle` (the count formula re-derived in the test with a BigInt hash, 375 (area, z) over three seeds), `deterministic`, `seeds_differ`, `golden_seeds` (pinned totals and checksums for seeds 1, 20260919 and 0xFFFFFFFF on 100 x 100 x 32 levels, plus 8 pinned cells), `single_equals_batch` (every (area, z) asked for alone in shuffled order, and inside a larger world, equals the batch), `index_mixing`, `caps_respected`, `fill_range`, `tier_from_starts`, `t0_no_monsters`, `savagery_scales`, `totals_consistent`, `no_random_no_clock` (Math.random and Date trapped), `no_host_needed` (runs in a VM context holding only `module`), `input_validation`, `perf_100x100`.

Mutants (each must fail every named check by assertion): xor_key, tier_off_by_one, prey_uncapped, t0_monsters, global_rng, seed_ignored, deep_levels_use_surface, savagery_ignored, batch_flattens_z, batch_depends_on_world_width, totals_drop_level, no_inject_check, catalog_scale_ignored, host_global, per_cell_rows.

## Evidence
Log excerpt (from the run at 229d2c31 plus the comment-only index edit, trimmed):
```
PASS golden_seeds
PASS single_equals_batch
  perf: 100 x 100 areas x 32 levels (320000 (area, z)) best of 3 = 49.8 ms
PASS perf_100x100
RESULT: 19 passed, 0 failed
FAIL per_cell_rows::perf_100x100: took 4422.4 ms; the budget is 1000 ms
KILLED per_cell_rows
MUTATION RESULT: 15/15 killed; 0 survived/invalid
```
Perf method: wall clock (`process.hrtime.bigint`) around `computeGlobalDensity`, best of 3 runs after one warm-up, in one Node v24.19.0 process on this machine. Observed 39-53 ms across four runs; the check's budget is 1000 ms.

Seed 20260919 on the 100 x 100 x 32 test world: 10,044,715 prey and 1,010,212 monsters in total. No screenshot: there is nothing on screen yet.

## Not done / known problems
- **WBS id mismatch.** `docs/worldgen/DEUS_WORLDGEN_WBS.md:272` names WG.65.04 "Structural-Collapse Material Transfer"; this brief uses the same id for the world-wide spawner. The design note calls the spawn-on-first-build lane lane-fi / WG.00.47. The PM should fix the id in the registry or the brief.
- **No consumer.** Nothing in the game calls this yet. The sky view (DEC-080 item 5) is a separate view lane; no F5 run, no screenshot.
- **No `docs/systems/` page** (ENGINE_RULES §2): `docs/systems/` is outside this lane's allowed paths. The module header and this report document it; a page should be added when the sky view lane integrates it.
- **Stand-in fields.** Savagery and tier come from the stand-ins above, not from worldgen's region field or lane-fc's danger field. With one tier per area, nearly the whole of a 100 x 100 world is T4 (on the test world with its three starts, seed 20260919: 3 T0, 78 T1, 294 T2, 654 T3, 318,971 T4 of 320,000).
- **Density numbers are not settled.** Caps are the catalog's `ecology.levels` budgets per area. Design note Q4 (`docs/design/SPAWNER_DEC073.md` section 6) is still open: V103 (one creature per 150-200 land squares) and D4's T0 density differ by 30-40 times. Levels above z 2 use the z 2 row (20 creatures, 0 monsters), so highland homes (elves, halflings) read thin; z 3..15 are terrain levels under WG.00.17, not air. These counts are designations only.
- `ecology.levels.*.enabled` is ignored: it gated old Ecology's live processing, and DEC-080 gives every level a population.
- No anchors (dens, lairs, burrows, roosts, edges), no respawn timers, no counts per anchor: those are lanes fc, fe and ff. This lane gives the density layer only.
- Golden values were pinned from this module's own output; they guard against drift, not correctness. `counts_match_oracle` is the independent check of the formula.

## GAME TRANSLATION
```text
WBS / Lane: WG.65.04 / lane-fi
Approved scope / Owner authorization reference: DEC-080 items 1 and 5 (Owner 2026-10-01); brief a7028103
Writer SHA / evidence date: 229d2c31 (and the report commit) / 2026-10-02
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect: none yet. Supplies the per-(area, z) prey and monster density the sky view will draw.
Trigger: a call with (seed, world dims, starts, config), meant for the end of world generation.
Runtime Authority: game/js/sim/spawner/global_density.js; designations only, never saved (pure function of seed, starts and catalog).
Simulation Path: computeGlobalDensity / densityAt / at; caps from UF_WorldCatalog.json ecology.levels and wildlife.savageryScale.
Engine Bridge: none. DEFERRED TO the sky view lane named in DEC-080 item 5 (not yet minted).
Visible Result: nothing observed in game.
Persistence: N/A - designations are recomputed from the seed; nothing is stored.
Failure Without This Lane: the sky view has no world-wide density to show without building every area's terrain (DEC-065).

Automated Proof: node tools/sim/test_global_spawn_density.js, exit 0, 19/19, 15/15 mutants; seeds 1, 20260919, 4294967295 pinned.
In-Game Proof: NOT RUN (no consumer).

CONSUMED BY GAME SYSTEMS:
- Sky view lane (DEC-080 item 5): would read computeGlobalDensity's arrays. No integration test exists.
- Corruption would show as wrong or unstable densities in the sky view, or densities that change with build order.

GAME BRIDGE STATUS
Simulation implemented: YES - headless module and tests above
Engine bridge implemented: NO - no plugin loads it
Presentation implemented: NO - sky view not built
Input/player interaction implemented: NO
Save/load implemented: N/A - nothing stored
Playable verification performed: NO - NOT VERIFIED

Remaining step before player can experience it: the sky view lane loads it through UF.Sim.require("spawner") at the end of world generation and draws the counts.
```

## Try it
```
node tools/sim/test_global_spawn_density.js
node -e "const s=require('./game/js/sim/spawner');const r=s.computeGlobalDensity(20260919,{areasX:100,areasY:100,zMin:-16,zMax:15,starts:[{ax:10,ay:10,z:0}]},s.loadDefaultConfig());console.log(r.totals, s.at(r,10,10,0))"
```
Expected: the suite ends `MUTATION RESULT: 15/15 killed`; the one-liner prints totals and the start area with tier 0 and 0 monsters.

## Decisions needed
- The WG.65.04 id (see the first known problem).
- Density per tier and per depth band (Q4) for the caps, and whether levels above z 2 should keep the z 2 budget.
- Stand-in tier step (one tier per area) until lane-fc's danger field exists.

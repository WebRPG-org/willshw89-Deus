# SIM.50.12 lane-af report

Writer: grok. Reviewer: gemini (not this run). This report does not mark the task DONE.

No art was generated, drawn, edited, or requested (DEC-007). No file outside the brief's allowedPaths was written. No WBS id was minted. No Owner question is answered here. No merge. The only push is `git push origin task/lane-af`.

## What changed

`tools/sim/test_living_world_rules.js` and `tools/sim/fixtures/living_world/ranges.json`. The fixture records the audit commit `75cf2ff399e5fdbce1f69e7178e4cb4329374eee` and the two ranges the brief names: `-16..+15` and `-4..+4`, with 5 ft cells, 2 ft strata, and 10 ft layers.

The suite is one node program (no NW.js). Each finding runs at both ranges.

| Finding | What the check requires at each range |
|---|---|
| F-01 | `DEUS_Z_RANGE` and the world state both select that range. `isLevel` matches it. Cell 5 ft, stratum 2 ft, layer 10 ft. A solid cell below -2 stands at elevation `(z - zMin) * 5 + 4`, including 69 at z=-3 on `-16..+15` (above the old cap of 24). |
| F-02 | Every z below -2 is one uniform chunk (directory only, no strata arrays). Mixed levels stay at or under 8. A one-cell path on z=0 allocates scratch for that layer only. Reading every layer allocates no fluid grid; one write allocates one grid. |
| F-03 | No sprout row in the range matures to `ironstone`, `copper_outcrop`, `gold_outcrop`, or a type tagged `ore`. A save that already scheduled those at zMin, 0, and zMax leaves the loose stone. A `granite_boulder` outcome still matures. Two seeds, 160 beats each, place no ore. |
| F-04 | With `UF.Matter` attached, `Jobs` mine and quarry of limestone post 4 slices and keep 1, at zMin, 0, and zMax. A soil dig does not create stone. `Walls.collapse("campfire")` posts and the mineral family stays put. |
| F-05 | `require()` of `DEUS_Fluid.js` publishes `window.UF.Fluid` before Core's assignment, and that object survives the assignment. Placing 22 depth of water, flooding every layer, and ticking until the queue is empty keeps 22, all of it on the bottom layer. The legacy fill is not called. |

Three extra checks show the assertions can fail: a 5-level 1 ft stand-in is rejected, a `rocks_small` row that matures to `ironstone` is rejected, and a copy of `DEUS_Fluid.js` with the three `window` assignments removed does not bind.

No gameplay file was edited. On this tree the five checks pass, so the suite did not find a breach inside the files this lane may change.

## Pre-fix proof

The recorded pre-fix commit is the audit's `75cf2ff399e5fdbce1f69e7178e4cb4329374eee` (`docs/audits/LIVING_WORLD_GAP_AUDIT.md` header). A local clone at `%TEMP%\sim5012-prefix` was checked out detached at that commit (sparse to `game/js/plugins`, `game/js/sim`, `game/data/sim`, and `tools/sim`). The suite and fixture were copied in. `DEUS_World.js` in that tree is `const LEVELS = Object.freeze([-2, -1, 0, 1, 2])`.

`node tools/sim/test_living_world_rules.js` there exited 1. The clone was deleted before the commit that adds this report. Raw log: `tasks/SIM.50.12/lane-af/evidence/prefix_75cf2ff3.txt`.

```text
PRE-FIX 75cf2ff399e5fdbce1f69e7178e4cb4329374eee
PASS F-01 rejects the 5-level 1 ft model — rejected (levels -2,-1,0,1,2 want -16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15; zRange {"zMin":-2,"zMax":2}; isLevel false for 27 levels in range, first -16; feet cell 5 stratum 1 per 5 step 5; no worldStrataElevationAt)
PASS F-03 rejects an ore sprout row — rejected (0:rocks_small->ironstone)
FAIL F-05 mutant bind stays unset: bind lines missing window.DEUS = window.UF = {}; | window.UF = window.DEUS; | window.DEUS = window.UF;
FAIL F-01 -16..+15: no zRange(); levels -2,-1,0,1,2 want -16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15; zRange null; isLevel false for 27 levels in range, first -16; feet cell 5 stratum undefined per undefined step 5; layer feet not strata x stratum; no mapIdSlot; elevation z -16 -1 want 4; elevation z -15 -1 want 9; elevation z -14 -1 want 14; elevation z -13 -1 want 19; elevation z -12 -1 want 24; elevation z -11 -1 want 29; elevation z -10 -1 want 34; elevation z -9 -1 want 39; elevation z -8 -1 want 44; elevation z -7 -1 want 49; elevation z -6 -1 want 54; elevation z -5 -1 want 59; elevation z -4 -1 want 64; elevation z -3 -1 want 69
FAIL F-02 -16..+15: no chunk store (chunkInfo / strataMemory missing)
FAIL F-03 -16..+15: tables 0:rocks_small->ironstone, 0:rocks_small->copper_outcrop, 0:rocks_small->gold_outcrop, -1:rocks_small->ironstone, -1:rocks_small->copper_outcrop, -1:rocks_small->gold_outcrop, -2:rocks_small->ironstone, -2:rocks_small->gold_outcrop; scheduled ore matured 12 writes 12; loose stone was replaced; long run ore hits 10522
FAIL F-04 -16..+15: no ledger/reclaim; mining does not post mass
FAIL F-05 -16..+15: require bind before false after false
FAIL F-01 -4..+4: no zRange(); levels -2,-1,0,1,2 want -4,-3,-2,-1,0,1,2,3,4; zRange null; isLevel false for 4 levels in range, first -4; feet cell 5 stratum undefined per undefined step 5; layer feet not strata x stratum; no mapIdSlot; elevation z -4 -1 want 4; elevation z -3 -1 want 9
FAIL F-02 -4..+4: no chunk store (chunkInfo / strataMemory missing)
FAIL F-03 -4..+4: tables 0:rocks_small->ironstone, 0:rocks_small->copper_outcrop, 0:rocks_small->gold_outcrop, -1:rocks_small->ironstone, -1:rocks_small->copper_outcrop, -1:rocks_small->gold_outcrop, -2:rocks_small->ironstone, -2:rocks_small->gold_outcrop; scheduled ore matured 12 writes 12; loose stone was replaced; long run ore hits 10522
FAIL F-04 -4..+4: no ledger/reclaim; mining does not post mass
FAIL F-05 -4..+4: require bind before false after false
RESULT: FAIL (11 failed)
EXIT=1
```

F-01..F-05 each fail at both ranges. The 5-level list, the 5 ft step, the ore table, the missing ledger, and the unbound fluid solver are the breaches the audit recorded.

## Gate output

Commands from `tasks/SIM.50.12/lane-af/lane.json`, foreground, this tree, after the last edit of the suite. The temp clone was already removed.

`node tools/sim/test_living_world_rules.js`

```text
PRE-FIX 75cf2ff399e5fdbce1f69e7178e4cb4329374eee
PASS F-01 rejects the 5-level 1 ft model — rejected (levels -2,-1,0,1,2 want -16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15; zRange {"zMin":-2,"zMax":2}; isLevel false for 27 levels in range, first -16; feet cell 5 stratum 1 per 5 step 5; no worldStrataElevationAt)
PASS F-03 rejects an ore sprout row — rejected (0:rocks_small->ironstone)
PASS F-05 mutant bind stays unset — mutant left window.UF.Fluid unset
PASS F-01 -16..+15 — env -16..+15 and state; levels 32 feet 5/2/10 elevation -16=4,-11=29,-10=34,-9=39,-8=44,-7=49,-6=54,-5=59,-4=64,-3=69
PASS F-02 -16..+15 — below-core 14 uniform; mixed levels 2; scratch 1/32; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -16..+15 — scheduled ore refused at -16,0,15; beats 320; ore hits 0
PASS F-04 -16..+15 — mine z -16 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 15 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -16 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -16..+15 — bound before Core; volume 22 across 32 layers; bottom 22
PASS F-01 -4..+4 — env -4..+4 and state; levels 9 feet 5/2/10 elevation -4=4
PASS F-02 -4..+4 — below-core 2 uniform; mixed levels 2; scratch 1/9; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -4..+4 — scheduled ore refused at -4,0,4; beats 320; ore hits 0
PASS F-04 -4..+4 — mine z -4 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 4 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -4 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -4..+4 — bound before Core; volume 22 across 9 layers; bottom 22
RESULT: PASS (0 failed)
EXIT=0
```

`node tools/check_deus_syntax.js`

```text
Checked 56 DEUS plugin files. Errors: 0
EXIT=0
```

## Open Owner questions

These are not answered here.

| ID | Question | What this lane did |
|---|---|---|
| DEC-013 split | The default `-16..+15` is the PM default. The Owner may still change the split. | The suite runs the two ranges named in the brief. It does not pick a different split. |
| DEC-026 (D-1) | How the calendar reconciles the solar day with the year. Status in `docs/OWNER_DECISIONS.md`: OPEN. | Nothing in this lane sets a year length. |
| DEC-023 item 2 | Ore, stone, and gem sprouting was classed as a defect to remove in SIM.50.12. | Ore ids are refused, which is what the merged SIM.50.13 fix does and what F-03's audit sentence names. Granite and gem maturation are still in the sprout tables. See PROPOSED-AF-04. |

## Proposed follow-ups

| ID | Follow-up |
|---|---|
| PROPOSED-AF-01 | No boot path calls `reclaim.install`. `DEUS_Jobs`, `DEUS_Walls`, `DEUS_Objects`, `DEUS_Floors`, and `DEUS_Items` no-op their matter hooks until a host sets `UF.Matter`. Live mining still uses the legacy drop counts. The host file is outside this lane's allowedPaths. The suite attaches Matter and then runs those hooks, which is the contract SIM.40.11 merged. |
| PROPOSED-AF-02 | `applyVolumeDamage` still turns a destroyed stratum into air with no ledger post. `DEUS_Fire` `burnOut` still removes items when a rule sets `destroysItems`. Neither plugin calls `UF.Matter`. |
| PROPOSED-AF-03 | Ecology births still add a unit with no biomass post. SIM.40.11 left creature body mass open. |
| PROPOSED-AF-04 | `rocks_small` still matures to `granite_boulder`. `crystal_small` still matures to `crystal` and `crystal_spire`. DEC-023 item 2 names stones and gems as well as ore. SIM.50.13 recorded the gem rows as PROPOSED-AE-01. `DEUS_Ecology.js` is outside this lane's allowedPaths. |
| PROPOSED-AF-05 | F-05 here is the Node `require()` order. An in-game read of `window.UF.Fluid` after boot (the audit's F5 check, also PROPOSED-AE-03) was not run. NW.js was not started. |

## Scope

Against the lane base `c58df3bac659e0b0278a2767a991bc2d4b4e10aa`, the branch also contains the PM open commit's `tasks/SIM.50.12/lane-af/BRIEF.md` and `lane.json`. The files written for this run are:

- `tools/sim/test_living_world_rules.js`
- `tools/sim/fixtures/living_world/ranges.json`
- `tasks/SIM.50.12/lane-af/REPORT.md`
- `tasks/SIM.50.12/lane-af/evidence/prefix_75cf2ff3.txt`

`tasks/SIM.50.12/lane-af/launches/` was already present and was not added. The temp clone is gone.

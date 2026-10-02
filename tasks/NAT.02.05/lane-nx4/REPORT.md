# NAT.02.05 lane-nx4 report — 2026-10-02

## What changed

- `game/js/plugins/DEUS_Jobs.js`: added one-stratum `dig_down` and `mine_ceiling` jobs, a single mine matter note and yield per completed action, and a queued occupant check for floors removed by mining or volume damage.
- `game/js/plugins/DEUS_Interact.js`: added the two context-menu designations and their existing marker treatment.
- `tools/test_dig_vertical.js`: added real-plugin VM checks for strata, support collapse, occupant falls, water drainage, and the world floor.
- `docs/systems/DEUS_Jobs.md`: documented the vertical job and event contracts.
- `tasks/NAT.02.05/lane-nx4/evidence/`: recorded inspected before and after screenshots from the named engine suite; `.gitignore` keeps the disposable game copy out of the commit.

## How I tested it

- `node tools/test_dig_vertical.js` — exit 0, 11 passed, 0 failed. The VM loaded real Levels, Fluid, Structural, and Jobs with seed 20260923, including a pending-fall save/load round trip.
- `node tools/test_dig_vertical.js --mutant=skip_floor_queue` — exit 1 as intended; the mined-floor, volume-damage, and pending-fall save/load checks failed.
- `node tools/run_tests.js dig_through_floor --game tasks/NAT.02.05/lane-nx4/snapshot_game` — exit 0, 6 passed, 0 failed, using a disposable NW.js game copy with DEUS_Test registered. The test selected the actual **Dig down** menu option, assigned its designation to a test worker, and waited for the worker to fall.
- `node --check game/js/plugins/DEUS_Jobs.js`, `node --check game/js/plugins/DEUS_Interact.js`, and `git diff --cached --check` — exit 0.
- `node tools/test_project_construction_loop.js` — interrupted after several minutes without output beyond its first three passing checks; no final result claimed.

## Evidence

- Screenshot `evidence/dig_through_floor.before.png`: opened and inspected; the test worker is visible in the gray floor fixture on Ground before digging.
- Screenshot `evidence/dig_through_floor.after.png`: opened and inspected; the same worker is visible on level −1 below the mined cell. The top bar shows −1.
- Log excerpt (from the final named engine run):

  ```text
  PASS dig_through_floor.menu_offers_dig_down - Dig down
  PASS dig_through_floor.floor_mined_once - done; upper S0 air; removed S0
  PASS dig_through_floor.worker_fell - worker z -1
  PASS dig_through_floor.no_errors
  RESULT: 6 passed, 0 failed (exit 0)
  ```

- Log excerpt (from the final headless run):

  ```text
  PASS: last_support_mined_drops_ceiling - done commits 0->1; upper air/air/air/air/air lower stone/stone/air/air/air
  PASS: volume_damage_drops_occupant - destroyed 1, z -1
  PASS: mined_floor_drains_water - done upper {"depth":0,"type":null} lower {"depth":1,"type":"water"}
  PASS: pending_fall_survives_save_load - queued true, loaded unit z -1
  RESULT: PASS (11 passed, 0 failed)
  ```

## Not done / known problems

- Native RMMZ editor F5 and its F8 console were not opened. The named suite ran in NW.js from a disposable game copy; its `no_errors` check observed no harness errors.
- The optional construction-loop regression did not complete, so it supplies no pass or fail verdict.
- `docs/STATUS.md` and the required claim row are outside this lane's allowed paths. The coordinator must reconcile project status after review.
- Independent review and integration are pending. This report does not certify the lane or merge it.

## Try it in RMMZ

1. After integration, reopen the project and start Playtest (F5). On a supported floor with open space below, right-click the worker's cell and select **Dig down**.
2. Assign the designation to a worker on that level and let one work action finish. Switch the view to the lower level.

Expected: one supporting stratum becomes air; the worker falls to the first standable lower cell and takes falling damage. A floor over water opens a downward passage. **Mine ceiling** is offered when a reachable solid stratum lies above the worker.

## Decisions needed

- Grok review and the coordinator's normal merge gate remain outstanding; no Owner decision is requested by this lane.

## GAME TRANSLATION

**WBS / Lane:** NAT.02.05 / lane-nx4.

**Approved scope / Owner authorization reference:** 2026-10-02 assignment and `tasks/NAT.02.05/lane-nx4/BRIEF.md`.

**Writer SHA / evidence date:** `9fb61d69b6c77fe1be4f073ebb334a91ab7debce` (implementation, evidence and final headless test), 2026-10-02.
**Translation Class:** A — DIRECT PLAYER-VISIBLE.

**Player / World Effect:** A worker can dig through a floor or mine a ceiling one stratum at a time. Removed support may drop a ceiling; an opened floor lets occupants and water fall.

**Trigger:** A right-click context-menu designation, or `UF.Levels.applyVolumeDamage` destroying a floor stratum.

**Runtime Authority:** `UF.Levels` owns saved strata; `UF.Jobs` owns the job and pending floor-check coordinates in `World.state.jobs`; `UF.Structural` owns unsupported matter falls; `UF.Fluid` owns water.

**Simulation Path:** `DEUS_Jobs.js` `verticalStratum`, the two job handlers, `queueFloorCheck`, and `settleFloorOccupants` use `UF.Levels.setStrata`, the shared simulation tick, and `structural/index.planOccupants`. Structural's existing event subscriber and Fluid's normal passage logic consume the geometry change.

**Engine Bridge:** `DEUS_Interact.optionsFor` exposes both verbs in the RPG Maker MZ context menu. Jobs advances on map updates, Levels redraws changed cells, and the lower-level view shows the relocated worker.

**Visible Result:** In the named NW.js engine scenario, the before image shows the worker on Ground; the after image shows the worker on −1. The menu option and the single S0 removal were checked in the same run.

**Persistence:** Strata changes use Levels' existing saved records and jobs use `World.state.jobs`; the pending `verticalFalls` array is in that state. The headless test saved immediately after floor damage, loaded the game state, then observed the queued worker fall on the next shared tick.

**Failure Without This Lane:** There is no player designation for a floor or ceiling stratum; blast damage can leave a worker standing on a vanished floor until another system happens to move it.

**Automated Proof:** `node tools/test_dig_vertical.js` on SHA `9fb61d69b6c77fe1be4f073ebb334a91ab7debce`: exit 0, 11/11 checks. The deliberate missing-listener mutant exited 1 with three relevant failing checks. The consumer integration run on the same production plugin code exited 0 with 6/6 checks.

**In-Game Proof:** The named NW.js suite `dig_through_floor` on a disposable copy with seed set by the game setup, using an isolated fixture near the center of the starting area. It produced `evidence/dig_through_floor.before.png` and `evidence/dig_through_floor.after.png`, both opened and inspected. Native editor F5/F8 was not run.

**CONSUMED BY GAME SYSTEMS:** `DEUS_Interact` receives `UF.Jobs.verticalStratum` eligibility and creates a job; the named engine suite checks the option and its result. `DEUS_Levels` receives the strata write, `DEUS_Structural` receives its event, and `DEUS_Fluid` receives an opened passage; the real-plugin VM checks support collapse, occupant relocation and water depth.

## GAME BRIDGE STATUS

- Simulation implemented: **YES** — the 11 headless checks passed.
- Engine bridge implemented: **YES** — the named NW.js suite ran through the menu and job to the level switch.
- Presentation implemented: **YES** — the opened screenshots show the worker before and after the floor removal.
- Input/player interaction implemented: **YES** — `menu_offers_dig_down` and the option's `run()` path passed; manual mouse input was not used.
- Save/load implemented: **YES** — the pending-fall save/load round trip passed on the real World and Jobs state in the VM.
- Playable verification performed: **YES** in the disposable NW.js test run; native editor F5/F8 remains untested.

**Remaining step before player can experience it:** independent review, merge-gate integration, and a native editor playtest on the integrated build.

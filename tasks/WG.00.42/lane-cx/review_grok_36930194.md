# Independent review: WG.00.42 / lane-cx

## Metadata

| Field | Value |
| --- | --- |
| Writer | Codex |
| Reviewer | Grok |
| Target SHA | `36930194e7d1a72407907e83ce85fce59782a664` |
| Branch | `task/lane-cx` |
| Parent | `7172f0e25f73c55d7e0b88fe2f90d071c28b2031` |
| Task | WG.00.42 WorldGen quick fixes |
| World | Emerys (DEC-054) |

Reviewed worktree: `C:\Users\snewt\.deus_worktrees\lane-cx`. `git rev-parse HEAD` returned `36930194e7d1a72407907e83ce85fce59782a664`. That commit's parent is `7172f0e25f73c55d7e0b88fe2f90d071c28b2031`. Tip subject: `[codex] WG.00.42: implement WorldGen quick fixes for start_in_middle, ground timeout, and levelKey`.

## Scope and diff verification

`git diff --name-status 7172f0e2 36930194`:

| Status | Path |
| --- | --- |
| M | `game/js/plugins/DEUS_WorldGen.js` |
| A | `tasks/WG.00.42/lane-cx/REPORT.md` |
| A | `tasks/WG.00.42/lane-cx/mutants.log` |
| A | `tasks/WG.00.42/lane-cx/quickfixes.log` |
| A | `tasks/WG.00.42/lane-cx/state.md` |
| A | `tasks/WG.00.42/lane-cx/syntax.log` |
| A | `tools/test_worldgen_quickfixes.js` |

Diffstat: 7 files, 482 insertions, 16 deletions. Every path sits inside the brief allowlist (`DEUS_WorldGen.js`, `tools/test_worldgen_quickfixes.js`, `tasks/WG.00.42/lane-cx/**`). `lane.json`, `rmmz_*.js`, `main.js`, `game/js/libs/`, art, and catalogue data are absent from the diff. Untracked `tasks/WG.00.42/lane-cx/launches/` is outside commit `36930194`.

The plugin change is local to the three fixes: surface diagnostic keys, the worldgen suite's Ground wait, `start_in_middle` expectations, and the suite reads of `stats` and `kitLog`. `generateUnderground` already stored both collections with `W.levelKey(ctx.areaX, ctx.areaY, ctx.z)` and is unchanged.

## Behavioral analysis

### 1. `start_in_middle` checks configured pair notes

Generation already copies each configured pair entry into map events with `fill(e.name)` and `fill(e.note)` (`DEUS_WorldGen.js` around the start-event loop). `makeEventData` stores `spec.note || ""`. The suite previously built expectations from name and centre-relative position only, then required `colonistEvents.length === expected.length`. That count is every event whose note matches `/<colonist/`. A pair whose notes omit that tag, or a mixed pair, fails the check while the events sit on the correct cells. `cat.start.pair.map` also throws when `pair` is absent. The checker `fill` threw when a name or note was missing; the generator already used `String(s || "")`.

The suite now does all of the following in the branch where `UF.Colonists` is absent:

- Reads `(cat.start.pair || [])`.
- Fills name and note with `String(s || "")` and the same `{male}` / `{female}` replacement the generator uses.
- Rejects an event whose id, name, note, or centre-relative `x`/`y` disagrees.
- Sets `expectedColonists` to the number of expected notes that match `/<colonist/`.
- Passes only when that count equals the colonist-tagged events on the map and the map note contains `<glade>`.

The installed-Colonists branch is unchanged in intent: zero generator colonist events and a glade note. The shipping catalog pair is tagged (`<colonist: {male}>`, `<colonist: {female}>` in `game/data/DEUS_WorldCatalog.json`). The new count still accepts that catalog. Untagged, mixed, empty, and absent pairs are what the old length comparison rejected or threw on.

The harness builds through real `UF.World.buildArea` in a fresh VM. On seed `20260930` and size 64, the tagged pair is Zoric as event 1 at (31, 32) and Merwen as event 2 at (33, 32), matching `dx`/`dy` of -1 and +1 around the centre. The same check rejects a shifted cell, a wrong name, a cleared note, a missing glade note, and an extra `<colonist:...>` event.

### 2. Ground timeout reaches the caller

The old wait was `t.waitUntil(() => !!(W && W.currentArea && W.currentArea()), ...).catch(() => {})`. A truthy `currentArea()` can still be the outgoing level, and the empty catch dropped the timeout.

The suite now waits only when `UF.Levels.view() !== 0`, calls `setView(0)`, and awaits:

```js
t.waitUntil(() => UF.Levels.view() === 0 && !!W.currentArea(), 10000, "Ground view for worldgen checks")
```

There is no catch. `UF.Levels.view` is `viewZ()`, which returns `World.viewLevel().z`. `DEUS_Test.js` `waitUntil` rejects with `timed out after ${timeoutMs} ms waiting for ${what}`. `run` catches that rejection and records `suite_completed` as failed with the error message. The node harness injects the same Error object, asserts the predicate is false while the outgoing area is still current, and asserts `buildArea` has not run. A successful switch stays unready until both `view() === 0` and a current area are true. A suite that is already on Ground does not call `waitUntil`.

### 3. `kitLog` and `stats` use `W.levelKey`

`DEUS_World.js` defines `levelKey(ax, ay, z)` as `` `${ax},${ay}` `` when `z` is falsy and `` `${ax},${ay},${z}` `` otherwise. Ground stays `ax,ay`. Positive and negative levels include `z` (`-1` is truthy, so the key is `ax,ay,-1`).

Surface generation now binds `const W = UF.World` and writes both collections at `W.levelKey(ctx.areaX, ctx.areaY, z)`. Underground generation already used `W.levelKey(ctx.areaX, ctx.areaY, ctx.z)`. The worldgen suite reads `WorldGen.stats` and `WorldGen.kitLog` through `startKey = W.levelKey(a.x, a.y, 0)` for `objects_placed` and `kit_seeded`. `volumeStats` remains an area record written only at `z === 0`, where that spelling matches `levelKey`.

The level-key check builds areas (1, 1) and (0, 1) at `z` in `{0, 1, 2, -1, -2}`: 10 keys. Each key has a `kitLog` array and a `stats` object whose counts equal the generated `ufObjects` grid, and each kit entry's id matches the catalog object in that cell. Later builds leave earlier key identities in place. Rebuilding Ground after a JSON round-trip of `World.state` reproduces the Ground diagnostic snapshot. A second fixture replaces `W.levelKey` with `TEST_LEVEL:ax,ay,z` and proxies gets on both collections. The real suite readers, stopped at `kit_seeded`, touch only `TEST_LEVEL:1,1,0`. A hardcoded `` `${ax},${ay}` `` read fails that proxy even though today's Ground spelling looks the same.

## Gate test results

Commands run in this worktree at `36930194`, sequentially, after the source reading above. Process exit 0. Wall time 30.29s.

| Command | Exit | Observed result |
| --- | --- | --- |
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_worldgen_quickfixes.js` | 0 | `RESULT: 3 passed, 0 failed` |
| `node tools/test_worldgen_quickfixes.js --mutants` | 0 | baseline 3 passed, 0 failed; `MUTANTS: 3/3 killed only by targeted checks` |

Baseline lines, both the plain run and the mutant run:

- `PASS baseline.start_in_middle: tagged/untagged/mixed/empty/absent pair and Colonists paths pass; five corrupt starts rejected`
- `PASS baseline.ground_timeout: stale view rejected; identical timeout propagated before builds; successful switch and Ground fast path pass`
- `PASS baseline.level_keys: 10 area/level records isolated; counts and placements match grids; JSON rebuild and real suite readers pass`

Each mutant is one in-memory replacement. The anchor occurs once. Every mutant runs all three checks. A kill requires exactly one failure, and that failure must be the targeted check.

| Mutant | Restored source | start_in_middle | ground_timeout | level_keys | Outcome |
| --- | --- | --- | --- | --- | --- |
| `M1_pair_requires_colonist_tags` | `colonistEvents.length === expected.length` | FAIL | PASS | PASS | KILLED |
| `M2_ground_timeout_swallowed` | `.catch(() => {})` on the Ground wait | PASS | FAIL | PASS | KILLED |
| `M3_surface_keys_omit_z` | surface key `` `${ctx.areaX},${ctx.areaY}` `` | PASS | PASS | FAIL | KILLED |

Observed failure text:

- M1: `untagged catalog pair: Zoric = event 1 at (31,32); Merwen = event 2 at (33,32); note "<glade>"`. Placement and the glade note still match; the restored pair-length colonist count fails the untagged catalog.
- M2: `Missing expected rejection: original timeout must bubble to the suite runner`.
- M3: `kit log missing at 1,1,1`. Ground's `1,1` spelling still matches the mutant, so the other two checks stay green. The `z = 1` record is the one that disappears.

Native editor F5/F8, screenshots, and engine save/load were not run. The brief's required gates are the three node commands above. `docs/systems/UF_WorldGen.md` still describes the Ground `ax,ay` spelling; that spelling is what `levelKey` returns at `z === 0`. `tools/bench_vertical_worldgen.js` detailed mode still searches for the pre-fix assignment line. That tool is outside the allowlist and outside these gates, and this review did not execute it.

VERDICT: CLEAN PASS

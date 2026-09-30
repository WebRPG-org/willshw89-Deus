# Grok review: WG.00.41 lane-cm deep cuts and DEC-030 mountain cap

## Metadata

| Field | Value |
| --- | --- |
| Task | WG.00.41 |
| Lane | lane-cm |
| Writer | Gemini (lane.json writer of record) |
| Reviewer | Grok |
| Reviewed commit | `d95f0cdef8355ed820ea408f01e4cb35e95e2c77` |
| Branch | `task/lane-cm` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cm` |
| Merge-base with `origin/main` | `fd44579c8c9698eef66d1fb6a6ff68c35984146b` |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` |
| Reviewed at | 2026-09-30 10:28:35 -05:00 |
| Node | v24.19.0 |

The lane writer of record is Gemini. The commits on the reviewed range also include Claude's test harness and the PM manifest. This review inspected the git objects and ran the gates in this worktree. It does not treat the lane's evidence note as a result.

## Commit & Diff Verification

`d95f0cdef8355ed820ea408f01e4cb35e95e2c77` is on `task/lane-cm`.

```text
d95f0cdef8355ed820ea408f01e4cb35e95e2c77 deus-ops [gemini] WG.00.41: make bs[0].deepCuts non-enumerable to satisfy no_parallel_authority check
4ee9ff9ddab65905a3941845d318dc248603c4bd deus-ops [claude] WG.00.41 lane-cm: strengthen the deep-cut and mountain-cap test (braintrust findings on 26f6969d)
26f6969d440d44bcbe572d966702e66754a3c0e8 deus-ops [claude] WG.00.41 lane-cm: deep-cut and mountain-cap test with mutants and cross-world determinism
9215a824f5e9dbedd05dd71976759cce38c0c7ce deus-ops [gemini] WG.00.41: fix volume keep calculation to use areasX * areasY
80c17b3be6d90d1e3ca1e043bbd9ab73aee776f2 deus-ops [pm] lane-cm manifest: allow and gate test_deep_cuts_and_mountain_cap_wg0041.js; gate the strata suites
dab44cb9872203e4d939b9bf478a3a2ee32e2819 deus-ops [gemini] WG.00.41 materializeDeepCuts and roof stretch capped at +11 per DEC-030
```

Merge-base of `d95f0cde` with `origin/main` is `fd44579c8c9698eef66d1fb6a6ff68c35984146b`. The same merge-base is the merge-base of `HEAD`.

`git diff --stat fd44579c8c9698eef66d1fb6a6ff68c35984146b d95f0cde`:

```text
 game/js/plugins/DEUS_Levels.js                     |  68 +++-
 tasks/WG.00.41/lane-cm/BRIEF.md                    |  32 ++
 .../evidence/claude_test_rewrite_2026-09-30.md     |  39 +++
 tasks/WG.00.41/lane-cm/lane.json                   |  49 +++
 tools/test_deep_cuts_and_mountain_cap_wg0041.js    | 341 +++++++++++++++++++++
 5 files changed, 525 insertions(+), 4 deletions(-)
```

The single commit `d95f0cde` itself changes one line of `game/js/plugins/DEUS_Levels.js`: `bs[0].deepCuts` is defined with `enumerable: false`.

At review time, `HEAD` was `b23b2ea8109371a6ba042a489620ad44096222d2`, one descendant later: `[ops] WG.00.41 lane-cm launch prompt 20260930_095914 (reviewer grok)`. That commit adds only `tasks/WG.00.41/lane-cm/launches/20260930_095914_prompt.txt`. The plugin and the gate test are the same blobs at `d95f0cde` and at `HEAD`:

```text
DEUS_Levels.js                              8076d47cc455996cd4447d78467cf2fc1fa879e7
test_deep_cuts_and_mountain_cap_wg0041.js   b16deaf0eae3bbb30c6a011d55fb0413e6046c4e
```

The gates below ran in this worktree, so they executed the reviewed plugin blob.

## Path Boundary Check

Allowlist from the assignment and from `tasks/WG.00.41/lane-cm/lane.json`:

- `game/js/plugins/DEUS_Levels.js`
- `tasks/WG.00.41/lane-cm/**`
- `tools/test_deep_cuts_and_mountain_cap_wg0041.js`

| Status | Path | In allowlist |
| --- | --- | --- |
| M | `game/js/plugins/DEUS_Levels.js` | yes |
| A | `tasks/WG.00.41/lane-cm/BRIEF.md` | yes |
| A | `tasks/WG.00.41/lane-cm/evidence/claude_test_rewrite_2026-09-30.md` | yes |
| A | `tasks/WG.00.41/lane-cm/lane.json` | yes |
| A | `tools/test_deep_cuts_and_mountain_cap_wg0041.js` | yes |

5 paths, 0 outside the allowlist.

`git diff --name-only fd44579c8c9698eef66d1fb6a6ff68c35984146b d95f0cde -- game/js/rmmz_*.js game/js/main.js game/js/libs art game/data game/js/sim docs` printed no paths.

- Engine core (`rmmz_*.js`, `main.js`, `libs/**`): 0 files.
- Art and catalogue: 0 files.
- Civilization and factions: 0 files.

`lane.json` names the test file. `BRIEF.md` lists the plugin and the task directory and leaves the test file off its own allowlist. The committed test path is inside the `lane.json` allowlist used for this review.

## Code & Simulation Path Audit

DEC-030 reserves `+12..+15` as open air and tops natural terrain at `+11`. Strata are 2 ft (`DEUS_Levels.js` records `STRATA = 5` and takes `STRATUM_FEET` from `UF.Space`). A level is 10 ft. `derivePacked` stands a cell only when headroom is at least 4 strata.

### `materializeCaps` (lines 2571–2591)

Called from `volumeOf` after the core baselines are sealed. For a world taller than the core:

- `maxRockLevel = Math.min(r.zMax, 11)` (line 2576).
- The write loop breaks when `z > maxRockLevel` (line 2584). Level `+11` can receive rock. Levels `+12` and above are never written.
- Thickness is stretched only when the room above the core exceeds 12 strata, and the stretched thickness is capped at `maxAvailable = (maxRockLevel - CORE.zMax) * STRATA`. With `CORE.zMax` at `+2` and `STRATA` at 5, a world that reaches `+11` has 45 strata of room, exactly `+3..+11`. A source cap of thickness 12 stretches to 45 and fills those nine levels. A thinner cap stops lower. Nothing is left to spill past `+11`.
- A leftover cap is stored on the top baseline only when `maxRockLevel === r.zMax` (line 2587). On a `-16..+15` world, `maxRockLevel` is 11 and `zMax` is 15, so no `topCaps` record is hung above `+15`.

`outerBaseline` fills levels above the core with `AIR_CELL` (lines 1356–1358). Unwritten strata on `+12..+15` stay air.

Independent probe, start area, `-16..+15`, after `newWorld`:

| Seed | Non-air strata on `+12..+15` | Highest solid level | Solid strata on `+11` | `topCaps` size |
| --- | --- | --- | --- | --- |
| 18 | 0 | +11 | 372 | 0 |
| 3 | 0 | +11 | 139 | 0 |
| 21 | 0 | +11 | 195 | 0 |
| 4 | 0 | +11 | 592 | 0 |

The gate reported the same four seeds at `+11` and 0 non-air strata on `+12..+15`.

On the 9-level range `-4..+4`, `maxRockLevel` is 4, rock is allowed through the top of that shorter world, and overflow stays a cap on the top baseline (`topCaps` size 128 on seed 18). That is the short-world path. DEC-030's open-air band is the band that exists only when the world includes `+12..+15`.

The comment above `materializeCaps` still says that at `-16..+15` every cap fits as its original 3..12 strata. The code stretches those caps and stops them at `+11`. The executed path matches DEC-030.

### `materializeDeepCuts` (lines 2596–2644)

Called from `volumeOf` after `seal` on the core and after `materializeCaps`.

- When `r.zMin >= CORE.zMin` the function returns immediately (line 2597). A legacy `-2..+2` world does not receive the plunge. Probe, seed 18, legacy range: 73 unguarded deep-cut columns kept `-2` S0 solid (`legacyS0Air` 0).
- Each recorded column is skipped entirely when any core stratum is fluid (`storeLocate` plus `FLUID_B`, lines 2606–2615). The gate's before-snapshot check saw 2 such columns on seed 18, unchanged from `-16` through `+2`.
- Otherwise the column is cleared from elevation `fromE - 1` down through elevation 0 (core, including `-2` S0), then every stratum of `Z = -3` down to `zBedrock + 1` is `M_AIR`, then bedrock `S1..S4` are `M_AIR`. Bedrock `S0` is not written.
- `zBedrock` is `r.zMin`, so the floor follows the world. On `-4..+4`, seed 18, the 73 carved columns had a stone floor at `Z = -4` with `S1..S4` air, open air on `Z = -3`, and an open core. The floor is the world's bottom level.
- Below the core, `outerBaseline` is uniform `STONE_CELL` (`M_STONE`). Preserved `S0` is that stone.

`S1..S4` is four strata. At 2 ft per stratum that is 8 ft of headroom, which is the `derivePacked` floor threshold (`head >= 4`, line 1584). The gate names those four open strata as 8 ft. The comment on `materializeDeepCuts` calls the same opening 4 ft. The bytes written are `S1..S4`.

Probe shapes via `shapeAt` / `strataAt` (the chunk store, which is what the game reads):

| World | Seed | Cuts | Carved | Guarded | Store connectors | Bad shapes | Bedrock not floor | Mid-level not open | Core not open |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-16..+15` | 18 | 75 | 73 | 2 | 0 | 0 | 0 | 0 | 0 |
| `-4..+4` | 18 | 75 | 73 | 2 | 0 | 0 | 0 | 0 | 0 |
| `-16..+15` | 3 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| `-16..+15` | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `-16..+15` | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Seeds 21 and 4 simply had no abyssal vertical or throat cut in the start area. Their roofs still stopped at `+11` with open air above. Seed 18 is the gate's deep-cut seed: 73 columns reach bedrock, the 2 fluid columns do not move, and every carved column is a sheer stack of one cell from the core down to a stone `S0` floor.

The connector clear inside `materializeDeepCuts` assigns the dense `b.conn` copy. `shapeAt` reads the chunk store through `storeLocate`. On every carved column above, that store connector was already 0, and the derived shapes were floor at bedrock and open above it.

Recording happens at lines 3198–3199: a cut whose profile is `vertical` or `throat`, whose depth class is `deep` or `z2`, and whose floor reached `bed + 1`, pushes `{ i, fromE }` onto `bs[0].deepCuts`. `volumeOf` passes that same core array into `materializeDeepCuts` as `core[0]`.

### `deepCuts` and `no_parallel_authority` (line 2671)

```javascript
Object.defineProperty(bs[0], "deepCuts", { value: [], writable: true, configurable: true, enumerable: false });
```

Probe on the finished `-2` baseline: `enumerable` false, `writable` true, `configurable` true, absent from `Object.keys`, present on `Object.getOwnPropertyNames`.

`tools/test_strata_cuts_and_caves.js` lines 1236–1241 collect `Object.keys` of each baseline and reject unknown enumerable members. `no_parallel_authority` passed on this tip (quoted in the gate section). `derivePacked`, `strataHash`, and `shapeAt` read the chunk store. The array is the carve-to-materialize handoff inside one `volumeOf` call. It stays on the cached baseline as a non-enumerable scratch. It is not a saved terrain grid and it is not a second shape authority.

`volumeOf` keeps `Math.max(VOLUME_KEEP, areasX * areasY)` volumes (line 2562), using the area counts already defaulted on the description. That replaces the earlier reference to an out-of-scope `st`.

## Gate Test Execution & Results

All commands ran in `C:\Users\snewt\.deus_worktrees\lane-cm`. The suites ran concurrently, so the wall times include CPU contention. The node exit code is the `EXIT:` line recorded from `$LASTEXITCODE`.

| Command | Result | Exit |
| --- | --- | --- |
| `node tools/check_deus_syntax.js` | Checked 62 DEUS plugin files. Errors: 0 | 0 |
| `node tools/test_deep_cuts_and_mountain_cap_wg0041.js` | RESULT: 11 passed, 0 failed. Wall 171 s. `+12..+15` air on seeds 18, 3, 21, 4. Highlands `+11` on all four. Seed 18: 75 deep cuts, 73 carved to bedrock with four open strata, 73/73 open through the core, 2 fluid columns unchanged. 32 levels byte-identical across two VMs. Cross-world checksums match from a default host and a legacy host. | 0 |
| `node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutants` | BASELINE clean. 7/7 mutants caught by their designated checks only (`roof_stretch_to_15`, `no_stretch`, `deep_cuts_skipped`, `core_opening_skipped`, `fluid_guard_removed`, `per_vm_random_roll`, `host_seed_leak`). Wall 1011 s. | 0 |
| `node tools/test_strata_cuts_and_caves.js` | RESULT: 30 passed, 0 failed. Wall 463 s. Includes `PASS no_parallel_authority` (no extra enumerable baseline members; feature descriptors 11897 chars) and a nested foundation suite, 27 passed, 0 failed. | 0 |
| `node tools/test_geology_strata.js` | RESULT: 10 passed, 0 failed. Coupled outer substrate at `(100, 100)` remained `rooted_loam` at `Z=-3` and `deep_mine_belt` at `Z=-9` and `Z=-16`. | 0 |
| `node tools/test_strata_foundation.js` | RESULT: 27 passed, 0 failed. Wall 462 s. | 0 |

## Findings

BLOCKER: none.

MAJOR: none.

MINOR: none.

## Verdict

The reviewed commit is `d95f0cdef8355ed820ea408f01e4cb35e95e2c77`. Its diff against `origin/main` stays inside the lane allowlist, with no engine-core, art, catalogue, civilization, or faction edits. Natural rock stops at `+11`, `+12..+15` stay air, and deep cuts on seed 18 drop sheerly to a preserved stone `S0` at the world bottom with `S1..S4` open. Core fluid columns stay put. `deepCuts` is a non-enumerable scratch, and `no_parallel_authority` passes. Syntax, the lane gate, all seven mutants, and the three strata suites passed in this worktree on the reviewed plugin blob.

VERDICT: CLEAN PASS

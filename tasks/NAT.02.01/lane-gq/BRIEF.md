# lane-gq: Pure connectivity kernel: held and falls verdicts, bounded resumable search, fall plan, dirty queue

| Field | Value |
|---|---|
| WBS | NAT.02.01 (re-specified by DEC-083), part 2 of 3: en (merged, superseded in part), nx1, nx2. The runtime is NAT.02.01.BRIDGE (nx3) |
| taskId (manifest) | NAT.02.01 |
| Branch | `task/lane-gq` |
| Manifest | `tasks/NAT.02.01/lane-gq/lane.json` (copy of `lane.json` beside this brief; the PM commits it, merge_gate refuses a writer's edit) |
| Writer -> reviewer | gemini (the Antigravity agent) -> grok |
| Size | M |
| Wave | first lane of the DEC-083 re-plan (no wave numbers until the PM re-validates the plan) |
| Dependencies | none unmerged (lane-en is merged at `4bac3eff`) |
| RMMZ editor must be closed | no |

Plan: the DEC-083 re-plan of 2026-10-02 (PM). It sits in the PM's session scratchpad, which writers in other CLIs cannot see, so everything this brief relies on is stated here. Base: `main` at `2c63c5e6` or later. This lane is called nx1 in the DEC-083 re-plan; its lane id is `lane-gq`. Re-run both guards at your own base before claiming FAIL-before or PASS-after.

## Preconditions (checked by the PM-side study on 2026-10-02 at `6eedfd33`; the PM re-checks at dispatch)

1. DEC-083 and both amendments are on main (`docs/OWNER_DECISIONS.md:1387-1399`): structure is pure connectivity, no load, span, weight or capacity limit of any kind; an unheld structure falls straight down and can crush; no rubble accounting.
2. lane-en is merged (`4bac3eff`). `game/js/sim/structural/` holds `rooted.js` (555 lines), `reader.js` (165), `support.js` (57), `collapse.js` (85), `index.js` (37). This lane reuses only patterns from them and does not `require` `rooted.js`, `reader.js`, `support.js` or `collapse.js` from its new modules (nx3 archives them).
3. Both guards pass at the base: `node tools/test_structural_rooted.js --baseline` exit 0 (12 checks) and `node tools/test_structural_collapse.js` exit 0 (5 checks), run 2026-10-02 with Node v24.19.0. `node tools/check_deus_syntax.js` exit 0 ("Checked 62 DEUS plugin files. Errors: 0").
4. Patterns to follow, verified by reading: the counter `rooted.js:79-100`, the charge-before-read generator `:102-106`, the resumable job `:491-531`, address helpers `reader.js:36-46` (`g = 5*(z+16)+s`), the fixture reader `reader.js:81-152`, the mutation harness (text edits compiled in memory, each must match exactly once, modes `--baseline`, `--legacy`, `--mutant=NAME`) `tools/test_structural_rooted.js:1-60` and the `MUTANTS` table at `:129`.
5. Design anchors: ADR-003 s16.3 (`docs/adr/ADR-003_sim_render_split_and_lod.md:1639-1655`: dirty queue fed only by mutations, stable geometry means zero work, bounded search that stops at the first grounded block), s16.6 (`:1678-1692`: every test and mutant runs at 9 and 32 layers; a hard-coded bottom layer is a named mutant), s2.3 (`:362-371`: identifiers forbidden in `game/js/sim/**`), s9.1 (`support.work_per_tick`: 0 while nothing changes, the same at 9 and 32 layers on the sparse fixture). DEC-010 (`docs/OWNER_DECISIONS.md:156-170`): lateral connectivity is sufficient.
6. `tools/sim/check_sim_purity.js` is not on main (SIM.00.02 is not built), so this lane's own static purity check is the only purity gate.

## Goal

Given any block reader, decide whether a solid block is held (a chain of face-adjacent solid blocks reaches an anchor) or falls (its whole connected component has none), plan the straight rigid fall of a falling component, and schedule the checks from changed blocks within a per-tick read budget: all pure, deterministic and resumable, with no span, load, weight or capacity concept anywhere.

## Contract (build exactly this; names are part of the interface nx2 and nx3 will use)

**BlockReader** (all integers; `g = 5*(z+16)+s`, so S4 of layer z and S0 of layer z+1 are neighbours):
- `floorG`, `topG`: lowest and highest existing stratum index of the world's range. The kernel never calls `state` below `floorG`; above `topG` is air.
- `state(x, y, g)` returns `"solid"`, `"air"` or `"unknown"`. Fluid reads as `"air"`.
- `neighbors(x, y, g)` returns up to 6 `[x, y, g]` in the fixed order DOWN, N (y-1), E (x+1), S (y+1), W (x-1), UP, already canonicalised by the reader (wrap across area edges is the reader's job), omitting `g < floorG` and `g > topG`.
- `key(x, y, g)` is equal for equal voxels after canonicalisation. `anchor(x, y, g)` is optional (default false): the reader certifies this solid block is held by something the kernel cannot see. `floorAnchors` is optional (default true): a solid block at `g === floorG` is an anchor.
- Nothing else anchors a block: not stored flags, not HP, not material.

**counter.js**: `createOpsCounter(limit)` (non-negative integer or Infinity); `charge(kind)` for `"read"`, `"visit"`, `"write"` returns false and charges nothing at the limit, an unknown kind throws; `used`, `remaining`, `limit`, `byKind`. Every `state` and `anchor` call is preceded by a `read` charge; a block is charged one `visit` when first entered (the seed included). (`write` is for nx2's commit.)

**connectivity.js**: `DEFAULTS = { readsPerTick: 512, maxVisits: 65536, maxFallVoxels: 20000, maxActiveJobs: 4, maxCommitsPerTick: 1 }` (frozen; PM TO CONFIRM values, none measured).
- `createHeldJob(reader, seed, opts)` returns a job: `step(counter)` runs until done or the counter refuses and returns `done`; `result`, `ops`, `visitedCount`.
- `evaluateHeld(reader, seed, opts)` returns the result, or `{ verdict: "pending", reason: "budget", job, ops }` when `opts.counter` runs out; without a counter it is unbounded.
- `wouldBeHeld(reader, addr, opts)`: the same, through an overlay that makes `addr` solid although the reader says air (placement); it never mutates the reader. An unknown option to any constructor or function throws a TypeError.
- **Result** (frozen): `verdict` is `"held"`, `"falls"` or `"not_solid"`; `reason` is `"floor"`, `"certified"`, `"unknown_edge"`, `"too_large"`, `"no_anchor"` or `"seed_not_solid"`; `anchor` `[x,y,g]` or null; `visited`; `component` (only for `falls`: exactly the connected solid component, sorted by g, y, x); `watch` (only for `unknown_edge`: the unknown neighbours met, sorted); `ops {read, visit}`.
- **Search**: iterative depth-first with an explicit stack and a visited set keyed by `key`; neighbours are read one at a time in the fixed order and the search enters the first solid, unvisited one at once (true depth-first), so the straight-down path is explored first and a column of rock costs one read per stratum; the anchor test is made when a block is first reached (floor rule, then `reader.anchor`) and the search stops there (`held`, reason `floor` or `certified`). Exhausting the component with no anchor and no unknown neighbour gives `falls` (reason `no_anchor`). Exhausting it with unknown neighbours met and no anchor gives `held` with reason `unknown_edge` and a `watch` list: unknown is neither air nor an anchor, and a component that touches it never falls. More than `maxVisits` visited blocks without an anchor gives `held` with reason `too_large`. Running out of budget is `pending`, never `falls`; resuming gives the identical result and the identical total ops as an unbounded run. A cycle cannot hold itself up (visited blocks are never treated as anchored).

**fall.js**: `createFallJob(reader, component, opts)` (resumable like the held job) and `planFall(reader, component, opts)`.
- Rigid straight fall: x and y never change; every block moves down by the same `drop >= 1`. `drop` is the smallest, over all blocks b, of (g(b) minus the g of the first non-piece solid block below b, or `floorG - 1` when none) minus 1; positions occupied by the piece itself count as free. A block with `unknown` below it gives `{ ok: false, reason: "unknown_below" }`; more than `maxFallVoxels` blocks gives `{ ok: false, reason: "too_large" }`; `drop` 0 gives `{ ok: false, reason: "no_room" }` (a stale component: a maximal component never has it).
- Plan: `{ ok: true, drop, blocks, vacated, filled, contact, ops }` where `vacated` is the piece positions not in `filled`, `filled` the destination positions not in the piece (both sorted by g, y, x) and `contact` the first non-piece solid under the binding block (null when the world floor binds). Cost at most `blocks x (drop + 1)` reads; stop scanning a block once its gap exceeds the best drop so far, and scan the lowest block of each column first.

**queue.js**: `createDirtyQueue()` with `add(addr, tick)`, `has`, `size`, `take(n)` (in (tick, g, y, x) order, duplicates collapsed), `snapshot()` `{ v: 1, seeds: [[x, y, g, tick], ...] }`, `restore(data)` (unknown version throws, live state kept). `createStructuralService(reader, opts)`:
- `markChanged(addrs, tick)`: queue each changed block and its six neighbours as candidate seeds (only solid candidates are checked, at processing time, charged).
- `tick(tickNo, counter)`: counter defaults to `createOpsCounter(readsPerTick)`. Continue active jobs round-robin (at most `maxActiveJobs`), then start jobs from the queue, skipping candidates that are not solid or already settled in this epoch, until the counter refuses. Returns `{ falls: [{ id, component, plan }], held, unknownEdge, pending, ops }` with at most `maxCommitsPerTick` falls, lowest piece first; components beyond that stay queued. A fall's plan is computed by a fall job charged to the same counter; a falling verdict whose plan is unfinished stays pending and is returned on a later tick. An idle service reads nothing.
- `committed(changedAddrs, tickNo)`: bump the epoch, drop plans and settled sets, restart only the jobs whose visited set touches the changed blocks, then `markChanged`. `snapshot()`/`restore()` save the queue only (jobs restart from their seeds). `stats()` `{ queued, activeJobs, epoch, opsLastTick, opsTotal, ticks, falls, held }`.

**Determinism and purity**: no `Math.random`, `Date`, `performance`, no host global, `require` only of `./` files inside `game/js/sim/structural/`, and none of `rooted.js`, `reader.js`, `support.js`, `collapse.js`. Same inputs give byte-identical results and ops. Fixture reader `createBlockFixture({ bounds: {x0, y0, x1, y1}, zMin: -2, zMax: 2, wrap: false, floor: true })` in `block_reader.js` with writers `set`, `fillBox`, `clear`, `markUnknown`, `pin` and a `reads` counter; columns outside bounds are `unknown` unless `wrap` makes the bounds a torus.

## Scope

- NEW `game/js/sim/structural/block_reader.js`, `counter.js`, `connectivity.js`, `fall.js`, `queue.js`.
- `game/js/sim/structural/index.js`: add the new exports; leave every existing export (the legacy `evalCellSupport`, `executeCollapse`, `CELL_VOLUME_CUFT` and the rooted API) untouched until nx3 archives them.
- `docs/systems/DEUS_Structural.md`: a new top section "Pure connectivity (DEC-083)" with the model, the contract above, the checks and the status; mark the lane-en span, HP-band and member sections "superseded by DEC-083, code archived by nx3".
- NEW `tools/test_structural_connectivity.js` (below), manifest `tasks/NAT.02.01/lane-gq/lane.json`, branch `task/lane-gq`, writer gemini, reviewer grok; the gate commands below are the manifest's `gateTests`.

## How to work this lane (for the writer)

1. Work only in the lane worktree `C:Userssnewt.deus_worktreeslane-gq` on branch `task/lane-gq` (`git branch --show-current` must print it). Never change files in the main checkout (`C:UserssnewtOneDriveDesktopUF`), never commit on `main`, never edit this brief or `lane.json` (merge_gate refuses a writer's change to either).
2. Read, in this order: this brief; `game/js/sim/structural/rooted.js` lines 79-110 and 491-531 and `reader.js` lines 36-152 (patterns only); `tools/test_structural_rooted.js` (the harness pattern you copy); `docs/systems/DEUS_Structural.md`.
3. Run the three guards first and record their output: `node tools/check_deus_syntax.js`, `node tools/test_structural_rooted.js --baseline`, `node tools/test_structural_collapse.js`. They pass at the base and must still pass at the tip.
4. Build in this order, committing after each step is green: `counter.js`, `block_reader.js` (the fixture reader), `connectivity.js`, `fall.js`, `queue.js`, then `index.js` exports, `tools/test_structural_connectivity.js` (write each named check first and watch it fail), the mutants, and the doc section. One commit per step is fine; all of them use the `[gemini]` tag.
5. Stage only the allowed paths by name (`git add <paths>`; never `git add -A`, `.` or `-a`). Before every commit run `git status --short` and `git diff --cached --name-only`: every path must be in allowedPaths.
6. When all gates pass in your worktree, push `task/lane-gq` and mail the PM the tip SHA (a line in `docs/agents/mailboxes/fable/inbox.jsonl`, UTF-8, no BOM, LF). Do not launch a reviewer and do not run merge_gate: the PM does both.
7. Write REPORT.md in the lane folder: one paragraph (what changed, how it was tested, what was not checked) and the real output of every gate command. "Not checked" for anything you did not observe.
8. Two failed attempts at the same problem: stop, write down what you ruled out, and mail the PM (AGENTS.md Rule 10).

## Out of scope

- Any reader over Levels or objects, any commit, occupant, fluid, plugin, save hook or tick wiring (nx2, nx3).
- Archiving or editing `rooted.js`, `reader.js`, `support.js`, `collapse.js` or their tests (nx3).
- Any load, span, weight, capacity, HP band, integrity ladder, rubble, ledger or mass concept (DEC-083). Any edit to `DEUS_Levels.js` or any plugin.
- Which blocks a Levels reader certifies as anchors (Owner question 1) and whether wall objects are blocks (Owner question 5): the kernel is neutral on both.

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/structural/block_reader.js`
- `game/js/sim/structural/counter.js`
- `game/js/sim/structural/connectivity.js`
- `game/js/sim/structural/fall.js`
- `game/js/sim/structural/queue.js`
- `game/js/sim/structural/index.js`
- `tools/test_structural_connectivity.js`
- `docs/systems/DEUS_Structural.md`
- `tasks/NAT.02.01/lane-gq/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `game/js/sim/structural/index.js`: lane-en (merged) -> this lane -> nx2 -> nx3.
- `docs/systems/DEUS_Structural.md`: lane-en (merged) -> this lane -> nx2 -> nx3 -> nx4 -> nx5; each lane edits its own section.

Start from a base that already holds every earlier writer of these files.

## Tests

Follow the harness of `tools/test_structural_rooted.js`: modes (default full run, `--baseline`, `--legacy`, `--mutant=NAME`), mutants as text edits compiled in memory that must each match exactly once, no mutant hooks in production code. Every fixture check runs at three Z ranges where a range matters (-2..+2, -4..+4, -16..+15). `FAILS on main` means shown failing at the lane base and passing at the tip (AGENTS.md Rule 4). Copy real output into the evidence.

### Must fail without the change

- `tools/test_structural_connectivity.js::connectivity_modules_present` (absence: the five modules and the new exports; FAILS at the base).
- `--legacy` controls, each must be rejected (exit 1) by an adapter that changes no logic: `rooted.js::evaluateMember` on `::unlimited_reach_beam` (its span cap of 12 leaves the far end unsupported) and `support.js::evalCellSupport` on `::floating_ring_falls` (it trusts the stored supported flag of a ring of mutually flagged blocks). An import failure is never taken as proof.

### Named checks (pass at the tip)

1. `held_by_floor_column`: a 1x1 column from the floor to 40 blocks is held (reason `floor`), reads at most 2 x height + 2 (a state read and an anchor read per block); one block short of the floor it falls.
2. `unlimited_reach_beam`: a beam 60 blocks long fixed at one end to a floor-anchored wall is held at its far end.
3. `unlimited_weight_tower`: a 30 x 30 x 50 mass (45,000 blocks, under `maxVisits`) on a single 1x1 pillar, seeded at the top above the pillar, is held (`floor`).
4. `floating_island_falls`: a 3x3x3 cube in air falls; `component` is exactly the 27 blocks.
5. `floating_ring_falls`: a ring of 12 mutually touching blocks falls; with one block touching an anchored wall it is held.
6. `cut_neck_falls_restore_holds`: a slab joined by a 1-block neck is held; remove the neck and it falls; restore the neck and it is held.
7. `six_connected_only`: blocks that touch only at an edge or corner are not connected.
8. `cross_z_adjacency`: S4 of layer z and S0 of layer z+1 are neighbours; a column across the boundary is one component.
9. `unknown_edge_is_held_with_watch`: a floating cube beside unknown columns is held (`unknown_edge`) with exactly those neighbours in `watch`; once they are known air it falls; known solid and anchored, it is held (`floor`).
10. `wrap_seam_connects`: on a torus fixture a beam across the seam to an anchored wall is held.
11. `anchor_is_floor_or_certified`: the floor rule uses `reader.floorG`, never a constant; `pin` certifies a floating cube (`certified`); a stored `supported` flag in the fixture is ignored.
12. `budget_is_pending_never_falls`: a counter that refuses early gives `pending` on a floating island, never `falls`; resumed it gives `falls`.
13. `budget_resume_identical`: budgets 1, 2, 3, 7, 50, T-1 and T give the identical result and identical total ops in ceil(T/k) steps.
14. `ops_counted_exactly`: counts derived by hand: a 3-block column on the floor seeded at the top charges read 3, visit 3; one more hand-derived fixture with a lateral branch.
15. `early_exit_on_anchor`: a 100-block tower with a large wing, seeded above the tower: reads at most 2 x depth + 10, far below the component size.
16. `seeds_share_one_flood`: through the service, 50 seeds in one floating component cost at most 1.5 times one seed's reads (one flood, equal verdicts); 50 seeds in one held component each stop at the first anchor (at most 50 x (2 x depth + 2) reads).
17. `too_large_is_held`: with `maxVisits` 100 a floating component of 500 blocks is held (`too_large`), never `falls`; `planFall` with `maxFallVoxels` 100 gives `ok: false, too_large`.
18. `fall_lands_on_first_contact`: drop equals the gap to the first non-piece solid; a slab lands on a pillar; an overhang lands on the highest obstacle; a two-layer piece with air between counts its own lower layer as free.
19. `fall_moves_every_block_once`: `vacated` plus `filled` account for every block; translation is exactly -drop, x and y unchanged; applying the plan to the fixture keeps the solid-block census equal.
20. `fall_stops_at_world_floor`: over a hollow bottom the piece lands with its lowest block on `floorG`, then is held (`floor`).
21. `fall_never_into_unknown`: unknown below any block gives `ok: false, unknown_below`.
22. `placement_requires_attachment`: `wouldBeHeld` is true beside a held block, above it and below it, false in mid-air; over a random structure placing a block never changes the verdict of any existing block.
23. `queue_canonical_order_and_dedupe`: shuffled adds come out in (tick, g, y, x) order, duplicates collapsed; snapshot and restore round-trip; a newer version is refused with the live state kept.
24. `service_work_bounded_and_idle_zero`: idle service reads 0 over 10,000 ticks at 9 and at 32 layers; under a change every tick the reads per tick never exceed `readsPerTick`; `committed` restarts only touched jobs; at most `maxCommitsPerTick` falls per tick, lowest first.
25. `z_ranges_agree`: the same structure at -2..+2, -4..+4 and -16..+15 gives identical verdicts and drops.
26. `deterministic_and_rotation_invariant`: two runs are byte-equal; rotating by 90 degrees and mirroring give the same verdicts, component sizes and drops.
27. `no_capacity_concepts`: no export or identifier named span, capacity, load, weight, band, rated or hp in the new modules (comments excluded); an unknown option to a constructor throws.
28. `sim_purity_static`: none of the ADR-003 s2.3 identifiers appear, and only `./` requires of the five new files.

### Mutants (each must turn its named check red; each edit matches once)

`eight_connected` (7), `z_local` (8), `unknown_as_air` and `unknown_as_anchor` (9), `no_wrap` (10), `trust_flag` and `floor_hardcoded` (11, 25), `budget_means_falls` (12), `restart_on_resume` (13), `uncharged_read` (14), `no_early_exit` (15), `no_dedupe_seeds` (16), `too_large_falls` (17), `fall_through` and `off_by_one_landing` (18), `drop_block` (19), `fall_below_floor` (20), `fall_into_unknown` (21), `placement_not_checked` (22), `queue_unsorted` (23), `scan_all` (24), `nondeterministic_order` (26), `add_span_option` (27), `random_in_module` (28), `ring_supports_itself` (5), `span_limit` (2), `capacity_limit` (3), `floor_off_by_one` (1).

### Guards (pass before and after)

- `node tools/test_structural_rooted.js --baseline` and `node tools/test_structural_collapse.js` (the legacy files are untouched).

### Gate commands (lane.json `gateTests`; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_structural_connectivity.js` (presence, all checks, legacy controls, all mutants; pure, expected seconds, not measured)
- `node tools/test_structural_rooted.js --baseline`
- `node tools/test_structural_collapse.js`

## F5 evidence

None. Pure module with no consumer yet (Class C). Report: one paragraph (what changed, how tested, what was not checked) plus the test output (DEC-085 items 1 and 5), and, because the diff touches `game/js/sim/`, the short Class C GAME TRANSLATION block of `tools/ops/GAME_TRANSLATION_TEMPLATE.md`: named consumers nx2 and nx3, engine bridge NO, playable verification NO.

## Dependencies

- lane-en (merged `4bac3eff`): patterns only. Lanes that depend on this one: nx2, nx3, nx5 (`wouldBeHeld`), and lane-di (WG.64.09, caves: its `::carved_spans_supported` becomes "no solid component without an anchor", PM edit).

## Design references

- `docs/OWNER_DECISIONS.md` DEC-083 (`:1387-1399`), DEC-010 (`:156-170`).
- `docs/adr/ADR-003_sim_render_split_and_lod.md` s2.3, s9.1, s10.7, s16.3 to s16.6.
- `tasks/NAT.02.01/lane-en/BRIEF.md` (format and the pending-is-not-air rule), `game/js/sim/structural/rooted.js` (counter and job patterns).
- The braintrust's D3 design (`C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_merged_chatgpt_pro.md`) is superseded by DEC-083 (capacity, ladder, rubble); read it only for the bounded-work and resumability ideas.

Treat design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- Face neighbours only, solid block = stratum with a solid material and HP above 0, anchors = world floor plus reader-certified (PM TO CONFIRM).
- Unknown is held with a watch, never a fall; running out of budget is pending, never a fall (PM TO CONFIRM, from lane-en's rule).
- Budget and caps are the defaults above, unmeasured (PM TO CONFIRM; nx3 measures).
- The rigid-fall rule and the instant landing are the PM's choice (Owner questions 3 and 4 may change nx2 and nx3, not this lane).

## Writer and reviewer

- Writer `gemini` (family gemini; the Antigravity agent, which signs each commit per command: `git -c user.name=deus-gemini -c user.email=deus-gemini@local.invalid commit ...`; never `git config user.name`), reviewer `grok` (family grok): different families, as merge_gate requires (REVIEW_SAME_FAMILY otherwise). Authority: DEC-031 item 1, DEC-058, DEC-078.
- Review per DEC-031 item 4 and DEC-085 item 2: one review file `tasks/NAT.02.01/lane-gq/review_grok_<sha8>.md`, subject `[grok] NAT.02.01 review <sha8>`, exactly one VERDICT line (`CLEAN PASS` or `PASS`; `PASS WITH MINORS` is accepted once lane-gk is merged). The PM launches the review through `tools/ops/launch_worker.ps1`; the reviewer's own run commits the file. The whole lane range is reviewed.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`.

## Rules that bind this lane

- The engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4). Two failed fixes on the same problem: stop and escalate (Rule 10).
- No full-world scans per frame; indexes, dirty sets and the shared tick (Rule 14): this module reads only what a check touches and does nothing when idle.
- Mass is integer centipounds in a closed ledger (DEC-038, DEC-040): a fall moves blocks and posts nothing; this lane has no ledger code.
- Commit only on `task/lane-gq`, subject tag `[gemini]` (author deus-gemini), staging only this lane's paths (`git add <paths>`, never `-A`). Main gets only merges and PM commits (DEC-085 item 1); the PM merges through `merge_gate` (`--no-ff`). Report in one paragraph plus test output; write "not checked" for anything not observed.

## Owner rulings that bind this lane

- DEC-083 and its amendments, quoted: "I basically just want it to work like minecraft, it'll hold as long as there's something somewhere holding it up, otherwise shit falls, people can still get crushed etc". Pure connectivity; no load, span, weight or capacity limit of any kind.
- DEC-070 (acceptable FPS) and DEC-057/DEC-059 (no soil runtime, no structure decay): nothing here ages or settles matter.

## Plan excerpts (DEC-083 re-plan, 2026-10-02)

- Rules: (1) connectivity, (2) rigid straight fall to first contact, matter moved and never converted, (3) floors and roofs are ordinary solid strata, (4) building is attachment across Z. Water and lava stay calculated; collapse meets fluid only where a floor opens and where a piece lands.
- Order of lanes: nx1 (this) > nx2 (Levels reader, commit, occupants, fluid tests) > nx3 (`DEUS_Structural` runtime) > nx4 (dig and mine floors and roofs) > nx5 (build above and below).
- Anchors beyond the floor are the reader's call (Owner question 1); this kernel only honours `floorG` and `anchor()`.

## lane.json draft

```json
{
  "lane": "lane-gq",
  "taskId": "NAT.02.01",
  "branch": "task/lane-gq",
  "writer": "gemini",
  "reviewer": "grok",
  "allowedPaths": [
    "game/js/sim/structural/block_reader.js",
    "game/js/sim/structural/counter.js",
    "game/js/sim/structural/connectivity.js",
    "game/js/sim/structural/fall.js",
    "game/js/sim/structural/queue.js",
    "game/js/sim/structural/index.js",
    "tools/test_structural_connectivity.js",
    "docs/systems/DEUS_Structural.md",
    "tasks/NAT.02.01/lane-gq/**"
  ],
  "gateTests": [
    { "cmd": "node", "args": ["tools/check_deus_syntax.js"], "timeoutSec": 900 },
    { "cmd": "node", "args": ["tools/test_structural_connectivity.js"], "timeoutSec": 900 },
    { "cmd": "node", "args": ["tools/test_structural_rooted.js", "--baseline"], "timeoutSec": 900 },
    { "cmd": "node", "args": ["tools/test_structural_collapse.js"], "timeoutSec": 900 }
  ]
}
```

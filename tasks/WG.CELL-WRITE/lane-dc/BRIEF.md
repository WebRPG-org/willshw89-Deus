# lane-dc: Generate an area at least twice as fast, byte for byte the same

| Field | Value |
|---|---|
| WBS | WG.CELL-WRITE (SHARED; merged D2/D3 CELL), part 2 of 15; deliverable WG.00.45 (NEW) |
| taskId (manifest) | WG.CELL-WRITE |
| Branch | `task/lane-dc` |
| Manifest | `tasks/WG.CELL-WRITE/lane-dc/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | grok -> gemini |
| Size | S |
| Wave | 2 of 19 |
| Dependencies | lane-da (w1; merged at `2f504c62`) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34). That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at the wave-2B launch commit, which holds every wave-1 merge (lanes ex, en, dn, ez, el and da, after the prune lanes cu and ct; lane-da merged at `2f504c62`) and WBS Rev 34 (`0b4a0689`) or later. At the post-approval prep (2026-10-01) main was `68483d99`, which also holds the wave-2A merges of lanes fd, ed and ea and WBS Rev 36. Pin the SHA you actually start from in your launch record (WORK-GATE wave 2B, CROSS-LANE). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4; plan risk 17).

## Goal

volumeOf for one area drops from about 10 s to 5 s or less in the node harness with identical output for every generator version.

## Scope

- Manifest tasks/WG.CELL-WRITE/lane-dc/lane.json, branch task/lane-dc, writer grok, reviewer gemini; GATE lines as gateTests.
- Replace the rest-parameter hash32 (DEUS_Levels.js:324 at `2f504c62`) and the valueNoise closure (`valueNoise` at :344, its per-corner closure `c` at :348) on the generator path with fixed-arity versions giving identical values.
- Record tools/fixtures/levels/core_checksums_gen1_5.json at the lane base (gens 1-5, seeds 18 and 20260927, 1x1 and 3x3); later lanes reuse it as the gen-5 guard.
- Print measurements; bounds keep a 2x margin.

## Out of scope

- WorldGen valueNoise
- Generator output changes
- Lazy areas (lane-dd)

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/plugins/DEUS_Levels.js`
- `tools/test_area_generation_speed.js`
- `tools/fixtures/levels/core_checksums_gen1_5.json`
- `docs/systems/DEUS_Levels.md`
- `tasks/WG.CELL-WRITE/lane-dc/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `game/js/plugins/DEUS_Levels.js`: after lane-da (w1; merged at `2f504c62`); before lane-dd (w3), lane-dw (w5), lane-dv (w6), lane-dx (w7), lane-dy (w8), lane-dz (w9), lane-dg (w10), lane-di (w11), lane-dj (w12), lane-eg (w14)
- `docs/systems/DEUS_Levels.md`: after lane-da (w1; merged at `2f504c62`); before lane-dd (w3), lane-dw (w5), lane-dv (w6), lane-dx (w7), lane-dy (w8), lane-dz (w9), lane-dg (w10), lane-di (w11), lane-dj (w12), lane-eg (w14)
- `tools/test_area_generation_speed.js`: this lane creates it (first writer); lane-db writes it only under the one-file handoff exception below. lane-dd (w3) and lane-df (w4) gate on it.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

**One-file handoff exception (WORK-GATE wave 2B, P1 as corrected by the judge).** lane-db and lane-dc run in parallel. For `tools/test_area_generation_speed.js` only, the sentence above does not make either lane wait for the other; every other row above keeps the rule, and no other hot-file order changes.

- If lane-dc merges first: lane-db merges origin/main into its branch (a normal merge, no rebase) and then installs only the vm hook in `tools/test_area_generation_speed.js`, which is in lane-db's allowedPaths for that purpose only, so that `tools/test_sim_loader.js::every_vm_harness_installs_hook` passes at lane-db's tip.
- If lane-db merges first: lane-db does not create or edit `tools/test_area_generation_speed.js`. lane-dc merges origin/main into its branch (a normal merge, no rebase), installs lane-db's hook in its own speed harness, and the PM adds `node tools/test_sim_loader.js` (timeoutSec 900) to lane-dc's gateTests by a `[pm]` manifest commit before lane-dc's final review. The PM then reruns the manifest and registry validation.
- Either way the second merger completes this integration before its final independent review and answerability check. An earlier review does not cover the integration changes. lane-dc owns the creation of the harness in both cases.

**Combined runs (WORK-GATE wave 2B, P5).** merge_gate tests each branch tip, not the merge result. Before the second of lane-db and lane-dc merges, the PM runs the union of both lanes' current gate sets on the exact combined candidate (main plus the second tip) and records the main, branch and candidate SHAs, every command, its exit code and the clone settings. A change to any input of the candidate makes that evidence stale. Even apart from the handoff file, lane-db edits lane-dc's keep-green harnesses while lane-dc changes `DEUS_Levels.js`, which lane-db's gates load, so two green branch tips are not enough.

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- NEW tools/test_area_generation_speed.js::one_area_volume_ms (median of 3 cold trials <= 5,000 ms, every sample printed; see the speed contract below) - FAILS on main (draft measurement 9,603-11,699 ms on an older main; a PM probe at main 89a4bc52 on 2026-10-01 timed the first `UF.Levels.baseline(0, 0, 0)` of a fresh seed-18 1x1 world in the vm env of `tools/test_32_levels_generation.js` (one volumeOf for the area) at 10,103, 10,191 and 10,617 ms, median 10,191 ms)
- `tools/test_area_generation_speed.js` ::no_rest_parameter_hash_on_generator_path (static) - FAILS on main

### Speed and fixture contract (WORK-GATE wave 2B, lane-dc changes 2 and 3)

Speed (`one_area_volume_ms`):

- Three independent cold-volume trials with the same first-area operation and setup at base and tip: each trial builds a fresh seed-18, generator-5, 1x1 world in a fresh vm and times the first `UF.Levels.baseline(0, 0, 0)`, or an equivalent complete `volumeOf` operation for that area. Print all three samples and the median. The gate stays median <= 5,000 ms.
- Before claiming the title (at least twice as fast), record comparable base and tip runs of this test on the same machine, showing at least a 2x improvement of the median.
- Do not derive the ratio from the PM's earlier probe or the draft figure, do not time a cached later read (the PM's probe shows a second `baseline` of the same area at 0 ms), and do not introduce deferred or lazy generation (lane-dd's work).

Unchanged output (`core_checksums_bit_identical` and `tools/fixtures/levels/core_checksums_gen1_5.json`):

- Capture the fixture from the actual pre-optimization base for all 20 combinations: generators 1-5, seeds 18 and 20260927, grids 1x1 and 3x3. The fixture records the source SHA it was captured at and names the core levels and area coordinates each checksum covers.
- The guard asserts that each requested generator and grid configuration took effect, including after lane-db's hook is installed in this harness: a 3x3 case must not silently run as 1x1. (lane-db's hook makes DEUS_World read AreasX and AreasY as 1 unless the harness passes them or opts into the shipped grid; see lane-db's brief.)
- Normal runs compare against the frozen fixture and never regenerate expectations from the code under test. The guard passes against base production code and fails under the mutant `hash_changed`.
- Show each new must-fail check failing against base production code with the new test present (the new test file run against the base's `DEUS_Levels.js`). A MODULE_NOT_FOUND exit is not a named-check failure.

### Mutants and provocations

- (none)

### Guards (pass before and after)

- `tools/test_area_generation_speed.js` ::core_checksums_bit_identical - guard; mutant hash_changed must fail it (see the speed and fixture contract above)
- `node tools/test_sparse_outer_save.js` (keep-green, read-only for this lane): passes at your base and at the tip. It pins the 32 per-layer seed-18 baseline checksums (`BASE_LAYER_CHECKSUMS`, `tools/test_sparse_outer_save.js:18`) and passed 7/7 in 47 s at main `89a4bc52`. It adds to the generator 1-5 fixture guard and does not replace it, and it gives this lane no write permission: lane-db is its hook writer (WORK-GATE wave 2B, lane-dc change 4; P6).

### Other named checks (pass at the tip)

- (none)

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_area_generation_speed.js`
- `node tools/test_strata_cuts_and_caves.js`
- `node tools/test_deep_cuts_and_mountain_cap_wg0041.js`
- `node tools/test_sparse_outer_save.js`

## F5 evidence

NW.js --uf-test: New Game time on seed 18 logged at base and tip; no console errors. Class C.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-da (w1): Sparse outer save: no save entry for an unchanged outer layer (merged at `2f504c62`)

Lanes that depend on this one: lane-dd (w3).

## Design references

- C:/Users/snewt/.deus_pm/braintrust/2026-10-01/DESIGN-D1_merged_grok_heavy.md section 3.2 (Cost bound)
- C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md section 3 (da -> dc -> dd; D1 routing: no Claude writer)
- C:/Users/snewt/OneDrive/Desktop/UF/docs/OWNER_DECISIONS.md DEC-030; AGENTS.md Rule 14

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- DEUS_Levels.js ownership (WORK-GATE G02 section 3; plan risk 25 as replaced 2026-10-01, see Plan excerpts): only WG.CELL-WRITE parts edit DEUS_Levels.js. This lane is WG.CELL-WRITE part 2 of 15, cross-referenced to its D1 deliverable WG.00.45. It changes only the Levels surfaces its Scope names, never the rest of the CELL contract (commitMatterBatch and removeStratum, setShape/derivePacked/standing, committed-change publication, flood delegation, effectiveSupport, the matter-participant registry). The PM's ownership validator enforces this at plan time. `tools/governance/lane_ownership.js` (proposed leaf OPS.10.06, lane-fw) is not on main and is not one of this lane's gates; it joins the gates once the Owner approves that leaf and it merges (`tasks/wbs_registry.json`, WG.CELL-WRITE `ownership`; `docs/worldgen/NW_ID_CROSSWALK.md`:118 at `68483d99`).
- Speed up without changing output before 3x3 ships; Tarea from this test feeds lane-dd/lane-de bounds.
- The speed harness is this lane's; lane-db hooks it only if this lane merges first. If lane-db merges first, this lane installs the hook and gains the gate `node tools/test_sim_loader.js` by a `[pm]` amendment before its final review (WORK-GATE wave 2B, P1 as corrected).
- The sparse-save suite is an extra keep-green gate, not a substitute for the generator 1-5 fixture (WORK-GATE wave 2B, P6).

## Writer and reviewer

- Writer `grok` (family grok), reviewer `gemini` (family gemini): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). docs/CANONICAL_ROLES.md section 2.1 (synced 2026-10-01 under DEC-051) lets Grok and Codex write natural-world lanes (plan risk 2; see Plan excerpts).
- No Claude fallback: D1 lanes take codex, gemini or grok writers and reviewers (`docs/CANONICAL_ROLES.md` section 2.1, lines 32-33, which also record lane-dc as writer grok, reviewer gemini; WORK-GATE G02 section 3, D1 routing).
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/<taskId>/<lane>/review_gemini_<sha8>.md`, has subject `[gemini] <taskId> review <sha8>` and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`.

## Rules that bind this lane

- Engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4).
- No full-world scans per frame; use indexes, dirty sets and the shared tick (Rule 14).
- Two failed fixes on the same problem: stop, write down what is known and ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred; creatures, flora and fauna are placed by seeded rules by biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); rows and cards only; the PM chooses what goes in game (DEC-056); PixelLab-native forms (DEC-055); static art first (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-dc`, subject tag `[grok]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 and the D1 reconciliation amend the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 2: "Roles: docs/CANONICAL_ROLES.md:23-24 says Grok does not implement production engine code and Codex is bounded to tools/ and docs/telemetry/. ... Before wave 1 the PM records the CANONICAL_ROLES.md sync under DEC-051. If the PM does not, the fallback is to re-manifest the plugin-touching codex lanes ... and the grok lanes with claude writers." The sync is recorded on main (docs/CANONICAL_ROLES.md section 2.1, 2026-10-01). The fallback never applies to D1 lanes: section 2.1 (lines 32-33) routes them to codex, gemini or grok only, and this lane is one.
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."
- Risk 18: "Timing gates (dc speed; dd, de and fb New Game bounds; dh carve cost; fc, fe and fg perf) print their measurements and use same-process formulas or a 2x margin, but a slow gate machine can still flake them."
- Risk 25, as replaced under G02 section 3 and recorded on main (`docs/worldgen/NW_ID_CROSSWALK.md`:118 at `68483d99`): "WG.CELL-WRITE is the only writer of `game/js/plugins/DEUS_Levels.js`. The Levels work of the D1 lanes da, dc, dd, dg, di and dj runs as WG.CELL-WRITE parts, each with one manifest under `tasks/WG.CELL-WRITE/<lane>/` and a cross-reference to its D1 deliverable (WG.00.43, WG.00.45, WG.00.46, WG.00.30, WG.62.03, WG.62.04)." The same record says that `tools/governance/lane_ownership.js` enforces the table at merge time only after the Owner approves its leaf (proposed OPS.10.06, lane-fw) and it merges; until then the table is enforced at plan time only.

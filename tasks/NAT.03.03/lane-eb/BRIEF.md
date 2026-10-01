# lane-eb: Water return: every water exit comes back as rain

| Field | Value |
|---|---|
| WBS | NAT.03.03 (NEW leaf of the merged D2 design, W-CYCLE; a registry entry only, with no WBS row, like NAT.03.02) |
| taskId (manifest) | NAT.03.03 |
| Branch | `task/lane-eb` |
| Manifest | `tasks/NAT.03.03/lane-eb/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> gemini |
| Size | M |
| Wave | 3 of 19 |
| Dependencies | lane-ea (w2; merged at `2bb8f7da`) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34). That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at the launch commit, which holds lane-ea's merge `2bb8f7da` (NAT.03.02 contract checkpoint), the earlier hydrology merges of lane-el (`fa482001`) and lane-ed (`f2aab67b`), WBS Rev 36 (`ba523831`) or later, and the NAT.03.03 registry entry (not on main at this prep; the PM adds it before launch). At this prep (2026-10-01) main was `f4998385`. Pin the SHA you actually start from in your launch record. Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4; plan risk 17).

## Goal

cycle.js keeps one counted return inventory; evaporation, exits, steam and unplaceable water holdings credit it; after a delay it rains back by deterministic rotation; lava never enters.

## Scope

- Manifest tasks/NAT.03.03/lane-eb/lane.json, branch task/lane-eb, writer claude, reviewer gemini; GATE lines as gateTests.
- credit(cp, cause, from); due records; rain service with indexed receivers and shared budget.
- Receiver index per area from an injected provider.
- Evaporation reads and debits sky-exposed water, and rain credits receivers, only through the injected provider; no edit to open.js (lane-ec binds the provider to the open store). An authority created without the new options behaves exactly as at the base. (WORK-GATE wave 3 lane-eb, Grok Heavy, REQUIRED CHANGE 1.)
- Evaporation from sky-exposed water at a PM_DEFAULT rate.
- Transfer records 'exit' (fluid->return, holding->return) and 'rain'.
- water|holding routes to return; lava credit throws.
- NEW game/data/sim/hydrology.json.

### What lane-ea, lane-el and lane-ed left on main (facts at `f4998385`)

These are the interfaces this lane builds on. They are facts, not new scope.

- `game/js/sim/hydrology/index.js` exports `createWaterAuthority` (lines 27-53), the schema string `deus.water.authority/1` (line 18) and the nine aquifer re-exports (lines 56-64). The authority's methods are `registerGeologicalSources`, `release`, `step`, `wake`, `fluidAt`, `depthView`, `typeView`, `capacityAt`, `totals`, `sourceRemaining`, `queued`, `serialize` and `deserialize` (lines 29-52). Nothing in the game calls it yet; binding is lane-ec (`docs/systems/DEUS_WaterAuthority.md:13-16`).
- `game/js/sim/hydrology/open.js` is lane-ea's open-fluid store. Its public methods are listed at lines 537-545. Fluid enters a cell only through `release` from a registered, finite source (lines 379-396). The store has no method that debits a cell to an outside account, and nothing falls below `zMin` (line 323). `open.js` is not in this lane's allowedPaths; its next writer is lane-ec (wave 7).
- Transfer records have the shape `{ row, cls, cp, cause, from, to, seam? }`; `row` rises by one per record and is saved (`open.js:218-233`; `docs/systems/DEUS_WaterAuthority.md:57-70`).
- One work counter per `step`: one unit per visit and one per host probe; default 512 (`open.js:23`, `:302-345`; `docs/systems/DEUS_WaterAuthority.md:123-129`).
- `docs/systems/DEUS_WaterAuthority.md:154-156` lists "No rain or water return (NAT.03.03). No drains" among the checkpoint's simplifications. An area seam is an ordinary interface, not an exit (`:119-121`). A floored natural passage is not a drain (PM ruling, `tasks/NAT.03.02/lane-el/BRIEF_AMENDMENT_1.md:5`).
- Typed displaced water in the running game is still DEUS_Fluid's `pendingDisplaced` (`game/js/plugins/DEUS_Fluid.js:143`, credited at `:1197-1198`, saved at `:972-973`). Connecting it to the return inventory is binding work (lane-ec).
- The keep-green gate `tools/sim/test_water_open_cp.js` (lane-ea's suite) loads `index.js` in every check. At `f4998385` it:
  - builds authorities with only `{ host, densities }` (`:88-90`);
  - requires the nine baseline exports to stay `aquifer.js`'s (`:129-135`);
  - asserts that open plus source cp equals registered cp for every class after every step (`:160-163`), and that `totals().water` deep-equals `{ open, sources }` (`:340`, `:348`);
  - asserts that a settled step costs 0 work, 0 host probes and 0 records (`:373-377`);
  - reads `serialize().open.cells` and `.open.cursor` (`:283`, `:441`), and requires a refused load to leave the whole `serialize()` unchanged (`:343-347`);
  - forbids unit literals in `index.js`, among them `100` (`units.CP_PER_LB`) (`:386-395`);
  - edits the exact text `    canonicalEdgeKey: aquifer.canonicalEdgeKey,` in `index.js` for its mutant `export_dropped`, and counts a mutant whose edit target is not found exactly once as a survivor (`:479-480`, `:518-522`);
  - loads modules through its own loader, which appends `.js` to any relative require that does not end in `.js` (`:51-53`). A PM probe on a scratch copy at prep: a `require("../../../data/sim/hydrology.json")` in a module that `index.js` loads made all 11 checks fail with ENOENT on `hydrology.json.js`; reading the same file with `fs.readFileSync` kept all 11 green; a line `const RETURN_DELAY_TICKS = 100;` in `index.js` failed `no_unit_constants`.
- `tools/test_aquifer_seepage.js` (the NAT.03.01 suite, last extended by lane-ed; a keep-green gate) loads `index.js` with Node's own `require` (`:43-53`, `:675`).

## Out of scope

- Climate rainfall
- Art
- Binding (lane-ec)

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/hydrology/cycle.js`
- `game/js/sim/hydrology/index.js`
- `game/data/sim/hydrology.json`
- `tools/sim/test_water_cycle.js`
- `docs/systems/DEUS_WaterAuthority.md`
- `tasks/NAT.03.03/lane-eb/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `game/js/sim/hydrology/index.js`: after lane-ea (w2; merged at `2bb8f7da`); before lane-ec (w7), lane-ec2 (w8), lane-fm (w9), lane-ee (w10), lane-ef (w11), lane-eh (w12), lane-eg (w14), lane-ei (w15), lane-ej (w16), lane-ek (w17)
- `game/js/sim/hydrology/cycle.js`: after (first writer); before lane-ec (w7)
- `game/data/sim/hydrology.json`: after (first writer); before lane-ef (w11)
- `docs/systems/DEUS_WaterAuthority.md`: after lane-ea (w2; merged at `2bb8f7da`); before lane-ec (w7), lane-ec2 (w8), lane-fm (w9), lane-ee (w10), lane-ef (w11), lane-eh (w12), lane-fq (w13), lane-eg (w14), lane-ei (w15), lane-ej (w16), lane-ek (w17)
- `tools/sim/test_water_cycle.js`: this lane creates it and is its only writer in the plan. lane-ec (w7), lane-ei (w15) and lane-em (w18) gate on it.

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts). Every earlier writer is merged: lane-ea at `2bb8f7da`.

**Open lanes (prep, 2026-10-01).** lane-do (NAT.02.MASS), lane-db (WG.00.44) and lane-dc (WG.CELL-WRITE part 2) are open. None of them lists a path of this lane, and this lane lists none of theirs. None of them writes a file that this lane's gates load or run, and this lane writes no file their gates read. `node tools/check_deus_syntax.js` parses every `game/js/plugins/DEUS_*.js` with `node -c`, including `DEUS_World.js` (lane-db) and `DEUS_Levels.js` (lane-dc), but runs none of them. So no combined-candidate run is required against these three lanes. If a later amendment gives any open lane a path this lane's gates load, the combined-run rule of WORK-GATE wave 2B (P5) applies: before the second of the two lanes merges, the PM runs the union of both lanes' current gate sets on the exact combined candidate and records the main, branch and candidate SHAs, every command, its exit code and the clone settings.

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- (none). `cycle.js` and `tools/sim/test_water_cycle.js` are both new. At the lane base the new test can only stop with MODULE_NOT_FOUND, which is not a named-check failure (WORK-GATE wave 2B, lane-dc change 3). Each named check below therefore shows that it can fail through a mutant or a provocation that turns it red by assertion.

### Mutants and provocations

- Mutants lakes_only, drop_on_full, lava_as_water, free_probe
- Pairing read from the names at prep, for the PM to confirm: lakes_only -> `::exit_rains_remote_nonlake`; drop_on_full -> `::full_receivers_retain`; lava_as_water -> `::lava_never_returns`; free_probe -> `::rain_charges_budget`.
- The four named checks no mutant names (`::evaporation_save_load_cycle`, `::rotation_deterministic`, `::due_not_early`, `::transfer_records_balance`) each get a provocation that turns that check red by assertion, as lane-ea did for its checks the brief named no mutant for (`tools/sim/test_water_open_cp.js:468-480` at `f4998385`).

### Guards (pass before and after)

- `node tools/sim/test_water_open_cp.js` (keep-green, read-only for this lane): 11 checks passed and 11 mutants were killed at `f4998385`. Every check loads `index.js`, which this lane edits (see the facts under Scope).
- `node tools/test_aquifer_seepage.js` (keep-green, read-only for this lane): 17 checks passed at `f4998385`. It loads `index.js`.

### Other named checks (pass at the tip)

- NEW tools/sim/test_water_cycle.js::exit_rains_remote_nonlake
- `tools/sim/test_water_cycle.js` ::full_receivers_retain; ::lava_never_returns; ::evaporation_save_load_cycle; ::rotation_deterministic; ::due_not_early; ::rain_charges_budget; ::transfer_records_balance

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/sim/test_water_cycle.js`
- `node tools/sim/test_water_open_cp.js`
- `node tools/test_aquifer_seepage.js`

`tools/check_deus_syntax.js` checks only `game/js/plugins/DEUS_*.js` (lines 6-7), so it does not parse `cycle.js` or `index.js`; the three test gates load them.

## F5 evidence

None (in-game proof in lane-ec).

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-ea (w2): Water authority entry point and cp open-fluid store (headless) (merged at `2bb8f7da`)

Lanes that depend on this one: lane-ec (w7), lane-ei (w15), lane-fk (w16).

## Design references

- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md sections 2, 3.2, 4 (they start at lines 17, 91 and 275; the NAT.03.03 row is line 288; the transfer table is lines 133-149; rain return is lines 186 and 202)

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- Rotation over indexed receivers; delay 100 ticks; steam credits return.

## Writer and reviewer

- Writer `claude` (family claude), reviewer `gemini` (family gemini): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). docs/CANONICAL_ROLES.md section 2.1 (synced 2026-10-01 under DEC-051) lets Grok and Codex write natural-world lanes (plan risk 2; see Plan excerpts). This is a D2 lane, not a D1 lane: Claude stays available as writer or reviewer for the D2 lanes (`docs/CANONICAL_ROLES.md:32`).
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/<taskId>/<lane>/review_gemini_<sha8>.md`, has subject `[gemini] <taskId> review <sha8>` and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`. Its data file (`game/data/sim/hydrology.json`) sits in a subfolder of `game/data/`, which the editor does not load or save.

## Rules that bind this lane

- Engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4).
- No full-world scans per frame; use indexes, dirty sets and the shared tick (Rule 14).
- Two failed fixes on the same problem: stop, write down what is known and ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred; creatures, flora and fauna are placed by seeded rules by biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); rows and cards only; the PM chooses what goes in game (DEC-056); PixelLab-native forms (DEC-055); static art first (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-eb`, subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 and the D1 reconciliation amend the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Wave 3: "water return follows lane-ea".
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 2: "Roles: docs/CANONICAL_ROLES.md:23-24 says Grok does not implement production engine code and Codex is bounded to tools/ and docs/telemetry/. ... Before wave 1 the PM records the CANONICAL_ROLES.md sync under DEC-051. If the PM does not, the fallback is to re-manifest the plugin-touching codex lanes ... and the grok lanes with claude writers." The sync is recorded on main (docs/CANONICAL_ROLES.md section 2.1, 2026-10-01).
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."
- Risk 19: "PM rulings and defaults flagged for Owner visibility (DEC-058 lets the Owner change any): ... all PM_DEFAULT danger, encounter, density and evaporation constants; water at B=512 on 36 s ticks may look slower than per-frame stepping." This lane's evaporation rate is one of those PM_DEFAULT constants.

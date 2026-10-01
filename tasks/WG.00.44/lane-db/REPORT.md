# WG.00.44 / lane-db writer report

Date: 2026-10-01. Fix-round writer: Codex (OpenAI family), with same-family delegated implementation support.
Directive: MSG-PRUNE-PM-107, as supplied in the Owner's resume instruction.
Branch: `task/lane-db`. Base: `7f91efbb`. Resumed HEAD: `d7cef0d446fe7db100dd6c1bfd2ca92e053f2778`.
The brief and tracked diff were read before editing. No tracked uncommitted changes were present;
the two pre-existing untracked launch prompts are preserved. The manifest is unchanged, including its older
claude/grok role fields; the PM owns manifest reconciliation. This is writer evidence, not independent
review, approval, merge, or WBS closure. Nothing pushed or merged.

## What changed

- `tools/lib/vm_harness_scan.js`: trace read-derived source to whole-target VM evaluations. Whole template
  wrappers and whole-preserving chained/separated slices or matches count; genuine partial extracts and
  hash-only consumers do not. Hook proof relates the installation to the evaluated sandbox and its order.
- `tools/test_sim_loader.js`: regression programs for those source forms and explicit wrong-sandbox,
  unreachable-install, and after-evaluation provocations. Each provocation targets
  `every_vm_harness_installs_hook`. Whole World loads install unconditionally; the intentional browser/no-host
  check evaluates only the loader block. `WG0044_KEEP_NW_SNAPSHOT=1` preserves evidence without altering gate arguments.
- `tools/bench_history_demographics.js`: restored to its exact base contents. It hashes World but does not
  evaluate a target plugin, so it requires no hook under the corrected rule.
- `docs/systems/DEUS_World.md`: corrected rule and test contract, including measured counts after final runs.
- `evidence/harness_base_vs_tip.txt`: removed trailing spaces/tabs. The resumed artifact contained 29 affected
  lines, measured by `git diff 7f91efbb..d7cef0d4 --check` (exit 2), rather than the 31 stated in the request.
- `run_fix_round.js`, this report, and lane evidence: exact foreground commands, fresh-clone setup and outputs.
  No art, runtime plugin, engine-core, manifest, database or plugin-list edits in this fix round.

## How I tested it

Fresh-clone gate evidence is pending completion of the fix-round implementation.
The reproducible runner is `node tasks/WG.00.44/lane-db/run_fix_round.js <committed-code-sha>`.
It creates a separate fresh shared clone for each of the six manifest commands, sets
`core.autocrlf=false` and `core.eol=lf`, checks out detached HEAD, verifies an initially clean tree,
and runs synchronously with a 900-second timeout. The NW.js gate gets
`WG0044_KEEP_NW_SNAPSHOT=1` so its screenshot can be opened after the exact manifest command.

The required commands are:

1. `node tools/check_deus_syntax.js`
2. `node tools/test_sim_loader.js`
3. `node tools/test_32_levels_generation.js`
4. `node tools/test_geology_strata.js`
5. `node tools/test_new_game_year0.js`
6. `node tools/sim/test_units.js`

The six mutant runs select the six headless named checks with `--only=vm_loader_loads_ledger,missing_module_throws,every_vm_harness_installs_hook,scan_finds_known_harnesses,opener_registry,grid_pinned_by_hook`.
Each must exit 1 with exactly one FAIL, its named target:

| Mutant/provocation | Required FAIL |
|---|---|
| `return_null_on_missing` | `missing_module_throws` |
| `fixed_list_scan` | `every_vm_harness_installs_hook` |
| `unpinned_grid` | `grid_pinned_by_hook` |
| `hook_wrong_sandbox` | `every_vm_harness_installs_hook` |
| `hook_unreachable` | `every_vm_harness_installs_hook` |
| `hook_after_eval` | `every_vm_harness_installs_hook` |

Local development evidence: the old scanner at `d7cef0d4` misclassified 15 of the 36 new source fixtures,
including wrapped whole source, hash-only use, full separated slices, and partial chained slices.
The four runtime loader checks pass after the no-host probe is changed to an extract;
`return_null_on_missing` and `unpinned_grid` still turn their respective checks red.
These local observations do not replace the final fresh-clone results below.

## Evidence

Final gate log, measured base/tip counts, screenshot inspection and diff checks: pending.
The older evidence files remain historical records of the original writer's runs. In particular,
`harness_base_vs_tip.txt` was whitespace-cleaned, not rerun in this fix round. Its historical survey included
the hash-only benchmark. The earlier report's assertion that `git diff --check` was clean was false and is
withdrawn; only new command output can support that assertion.

## Not done / known problems

- Independent review of this fix round has not run. Prior review artifacts describe earlier SHAs.
- RMMZ editor F5 and interactive F8 are not checked in this fix round. The brief's Class C proof uses NW.js
  on a snapshot, with the actual resolved ledger path and console-error check.
- The scanner uses Node's bundled Acorn parser through a private Node interface because this repository has
  no parser dependency. It must fail with a diagnostic if the parser is unavailable; portability to another
  Node distribution is not established by this machine's run.
- A static checker is bounded by the supported loader forms. Unsupported or unresolved cases must remain
  visible for review rather than being certified from an install-text match.
- Historical non-gate harness failures listed in the earlier writer evidence were not repaired or rerun here.
- Combined candidate runs for lane-dc and lane-do, if applicable, remain the PM's responsibility under the brief.
- `docs/STATUS.md` is outside allowedPaths. The bounded resume claim is in `FIX_ROUND.md`; no PM-controlled
  status, role, integration or closure record was changed.

## Try it in RMMZ

1. Open `game/game.rmmzproject`, press F5, and start a New Game.
2. Press F8; evaluate `UF.Sim.resolve("ledger")`, then `UF.Sim.require("ledger").createLedger`.
3. Evaluate `UF.Sim.require("nope")`.

Expected: a path under the project's `game/js/sim`, a function, then a
`DEUS_SIM_MODULE_MISSING` exception naming attempted paths. This fix round changes tooling assurance;
these runtime steps exercise the original lane implementation. Interactive steps are not checked here.

## Decisions needed

- No additional Owner decision for the authorized fix scope. The PM must arrange independent review of the
  final SHA and any manifest role update, then apply the normal merge gate. This writer does not merge or push.

## GAME TRANSLATION

WBS / Lane: WG.00.44 / lane-db. Authorization: MSG-PRUNE-PM-107 and the explicit Codex resume instruction.
Writer SHA / evidence date: final code SHA pending; 2026-10-01.
Translation Class: C FOUNDATIONAL / INDIRECT.

- **Player / World Effect:** consistent module loading in the game and its test harnesses prevents consumers
  from silently using missing or substitute simulation modules. This correction strengthens the tooling that
  checks that contract; it adds no player-visible feature.
- **Trigger:** target plugin evaluation in a VM harness; runtime consumers call `UF.Sim.require(name)`.
- **Runtime Authority:** the existing `UF.Sim` block in `game/js/plugins/DEUS_World.js` owns module resolution and
  the matter-opener registry. The fix-round scanner owns only test discovery and hook proof.
- **Simulation Path:** harness source -> `vm_harness_scan` -> verified prior `vm_sim_require.install(sandbox)` ->
  `DEUS_SIM_HOST` -> `UF.Sim.require` -> `game/js/sim` module exports. Missing modules throw.
- **Engine Bridge:** the existing World plugin loads in RPG Maker MZ. Matter-opener execution remains deferred
  to lane-dv; core registration is lane-dl. No new consumer bridge is implemented here.
- **Visible Result:** no new gameplay result. NW.js map boot and ledger resolution are foundational evidence;
  they do not prove downstream matter or water behavior.
- **Persistence:** this fix adds no save state or schema. Module handles and opener callbacks are runtime objects;
  downstream consumers own persistence. Save/load behavior is not newly claimed.
- **Failure Without This Lane:** an unhooked or wrongly hooked target sandbox can resolve modules incorrectly
  or inherit a changed grid fallback, invalidating tests of the generated world.
- **Automated Proof:** the six manifest gates and named mutation/provocation outputs in the final evidence log.
- **In-Game Proof:** NW.js snapshot gate pending; interactive editor F5/F8 NOT RUN.

CONSUMED BY GAME SYSTEMS: WorldGen registers before Levels exists through the World-owned opener registry;
lanes dv/dl supply execution/registration. Future matter consumers (including dm/fi) depend on consistent
module resolution. The loader integration test loads the actual ledger export in a World VM and NW.js snapshot;
it does not demonstrate those downstream lanes' game behavior.

GAME BRIDGE STATUS:

- Simulation implemented: YES for the existing loader/registry contract, exercised by the loader checks;
  this fix changes its tooling assurance only.
- Engine bridge implemented: YES for the existing World plugin loader; opener execution DEFERRED TO lane-dv.
- Presentation implemented: NO; no new presentation is in this foundational scope.
- Input/player interaction implemented: NO; no input or player interaction is added here.
- Save/load implemented: NO new state; downstream consumer persistence is outside this fix.
- Playable verification performed: NO editor F5/F8 run; snapshot loader proof is separately reported.

Remaining step before player can experience downstream effects: the authorized consumer lanes must connect
and prove their own world behavior; this report does not declare those behaviors playable.

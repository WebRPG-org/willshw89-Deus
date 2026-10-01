# WG.00.44 / lane-db writer report

Date: 2026-10-01. Writer: Codex (OpenAI family).
Authorization: MSG-PRUNE-PM-116 item 1 and the Owner ruling, "Ship reviewed scanner".
Branch: `task/lane-db`. Base: `7f91efbbfb7d21a99bfaef7cbcede6a87d53bf0d`.
Requested resume: `ecaea43ec9508440bf17b4d615efe15edb231600`; observed HEAD at start:
`c50fddfad4714d51b6cb0181ea0cd2d675bf556a` (only an operations launch record after the resume checkpoint).
Tested candidate: `a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`, an unreferenced Git snapshot
of the staged restoration, used for detached fresh-clone checkouts before the final writer commit.
The final commit adds the resulting report/evidence; its `game/`, `tools/`, and system doc inputs
are identical to the tested candidate. This is writer evidence, not a new independent review,
merge approval, or WBS closure. Nothing pushed or merged.

## What changed

- `tools/lib/vm_harness_scan.js`, `tools/test_sim_loader.js`, and
  `tools/bench_history_demographics.js`: restored exactly to `06ccf8ce` (code `7cc12f1f`).
  The benchmark's reviewed hook is restored along with the scanner. The AST implementation
  is removed from the active scanner/test; the attempt and its failed evidence remain historical.
- `docs/systems/DEUS_World.md`: restored to `06ccf8ce`, with only an appended
  "Known gaps (Owner ruling 2026-10-01)" section accepting the two scanner residuals.
- `evidence/harness_base_vs_tip.txt`: retained the whitespace fixes unchanged from `ecaea43e`
  (Git blob `86b22d6f62fd9e0b3a0992afbe56006044465f14`). The prior fix round measured
  29 affected lines in the historical artifact, not the 31 alleged in its request.
- `RESTORE_REVIEWED.md`, `run_reviewed_scanner_gates.js`, `capture_gate_snapshot.js`, this report,
  and `evidence/reviewed_scanner_restore/`: bounded claim, foreground runner, evidence capture,
  measured scan counts, six fresh-clone gate outputs, and inspected NW.js evidence.
- No art generated, requested, or integrated. No runtime plugin, engine core, manifest,
  RMMZ database, or plugin-list change in this restoration. The two pre-existing untracked
  launch prompts are preserved. `lane.json` retains its older claude/grok fields unchanged;
  this explicit Owner assignment authorizes Codex as writer.

## How I tested it

Executed in the foreground:
`node tasks/WG.00.44/lane-db/run_reviewed_scanner_gates.js a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`.
Each manifest command ran in its own fresh shared clone with detached candidate HEAD,
`core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`, an initially clean tree,
and a 900-second timeout. Node: v24.19.0. Exact commands and output:
`evidence/reviewed_scanner_restore/gates.txt`; clone paths and durations: `summary.json`.

| Manifest command | Exit | Observed result |
|---|---:|---|
| `node tools/check_deus_syntax.js` | 0 | 62 DEUS plugin files; 0 errors |
| `node tools/test_sim_loader.js` | 0 | 7 passed, 0 failed |
| `node tools/test_32_levels_generation.js` | 0 | 9 passed, 0 failed |
| `node tools/test_geology_strata.js` | 0 | 10 passed, 0 failed |
| `node tools/test_new_game_year0.js` | 0 | 30 gating checks; 15 mutants caught |
| `node tools/sim/test_units.js` | 0 | 7 passed, 0 failed |

For the exact loader gate command, `NODE_OPTIONS` preloaded `capture_gate_snapshot.js`,
with `WG0044_CAPTURE_DIR` pointing to this run's NW.js evidence directory. The helper copies
`test_output` and `game_runtime.log` immediately before the gate's normal snapshot cleanup;
it then invokes the original cleanup. It changes no test source, arguments, result, or exit code.
Other gate environments were inherited unchanged. Every test process was awaited.

Supplementary headless proof uses the restored test's six headless checks (no extra NW.js run):
`--only=vm_loader_loads_ledger,missing_module_throws,every_vm_harness_installs_hook,scan_finds_known_harnesses,opener_registry,grid_pinned_by_hook`.
The runner exercises `return_null_on_missing`, `fixed_list_scan`, and `unpinned_grid`, requiring
exit 1 and exactly their respective named failure. All three met that requirement: respectively
`missing_module_throws`, `every_vm_harness_installs_hook`, and `grid_pinned_by_hook` turned red.
It also overlays only the restored loader test,
scanner, and hook onto a separate base clone for fail-before measurements. Full outcomes are in
the same log. The base-overlay run exited 1 with 2 passed and exactly the 4 expected headless
failures (loader, missing-module, every-harness-hook, opener-registry). The complete foreground
runner exited 0 with `RESULT: 0 unexpected failures`. The stronger AST wrong-sandbox/order provocations are not reinstated: those gaps
are Owner-accepted residuals.

## Evidence

The earlier writer's assertion that `git diff --check` was clean was false and remains withdrawn.
Fresh whitespace checks are separate evidence; historical successes are not relabelled.
`harness_base_vs_tip.txt` is historical and was not rerun as a full benchmark matrix here.

`evidence/reviewed_scanner_restore/validation.txt` records `git diff --check`,
`git diff --cached --check`, and `git diff 7f91efbb --check`, each exit 0; exact
restoration of all three code files; unchanged manifest and whitespace-corrected
historical evidence; allowed-path checks; and equality of final test inputs to
the candidate. The post-run process check found 0 owned test/Node/NW.js processes.

The restored loader gate measured **49 hits in 937 files**, with no missing install-text match.
This includes `tools/test_sim_loader.js` itself and the conservative hash-only benchmark hit.
The raw lane base omits the newly added loader test; the runner records raw-base and
base-with-test-overlay counts separately: **48 hits in 934 files** for the untouched base;
**49 hits in 937 files** with the three test/support files overlaid. The base-overlay hook
check reports 48 missing install matches; the test itself supplies the 49th match.
See `scan_base.json` and `scan_base_with_test.json`.
`scan_tip.json` records the full restored candidate list. A hit count is not proof of correct
sandbox identity or installation order.

Opened screenshot: `evidence/reviewed_scanner_restore/nwjs/test_output/sim_loader.map.png`
(816 x 624). It shows grass, rows of units with green bars, a red banner near the center,
trees and rocks, Ground selector, 1x Speed, zoom panel, minimap, and bottom controls.
This matches map-boot evidence for the Class C loader check; it does not prove downstream
matter, water, or simulation-forward gameplay.

Actual NW.js outputs: `nwjs/test_output/results.txt` and `nwjs/game_runtime.log` under the
same evidence directory. Trimmed real output:

```text
PASS every_vm_harness_installs_hook - 49 hits in 937 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 49 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
RESULT: 7 passed, 0 failed
PASS sim_loader.no_console_errors - none since TEST_SimLoaderConsole loaded (plugins.js index 0)
RESULT: 5 passed, 0 failed (exit 0)
```

The NW.js runtime log resolves `ledger` to
`C:\Users\snewt\AppData\Local\Temp\wg0044-nw-n8AiKH\game\js\sim\ledger.js`.
The prior Grok CLEAN PASS at `d7cef0d4` covers `06ccf8ce`; it is preserved as historical
review, not represented as review of this restoration commit.

## Not done / known problems

- Owner-accepted answerability MERGE NO residuals: the scanner does not count template-wrapped
  or chained-slice whole loads; its install check proves an install appears, not that it runs
  on the evaluating sandbox before evaluation. These are accepted gaps, not fixed defects.
- The scanner conservatively includes `bench_history_demographics.js`, which hashes World
  rather than evaluating the target plugin. Its reviewed hook is restored exactly.
- Editor F5 and interactive F8 are not checked in this session. NW.js snapshot proof is separate.
  No new gameplay, save/load, or downstream consumer completion is claimed.
- The broader historical harness matrix and unrelated known failures were not repaired or rerun.
- PM review/integration, manifest role reconciliation if required, and lane-dc/lane-do combined
  candidate gates remain outside this writer handoff. No self-certification or merge performed.
- `docs/STATUS.md` and `docs/VISION.md` are outside allowedPaths. This ruling, scoped claim,
  and report are recorded inside the lane; no PM-controlled status/closure record was edited.

## Try it in RMMZ

When the PM makes the editor available after the natural-world build:

1. Open `game/game.rmmzproject`, press F5, and start a New Game.
2. Press F8; evaluate `UF.Sim.resolve("ledger")`, then `UF.Sim.require("ledger").createLedger`.
3. Evaluate `UF.Sim.require("nope")`.

Expected: the project's `game/js/sim/ledger.js` path, a function, then a
`DEUS_SIM_MODULE_MISSING` exception naming attempted paths. These manual steps were not run.
The restoration changes tooling assurance; the runtime loader is the existing reviewed code.

## Decisions needed

No further Owner ruling is needed for this restoration: "Ship reviewed scanner" settles the
Rule 10 stop by reverting the AST attempt and accepting the stated scanner gaps. The PM owns
subsequent review and integration through the normal gate; this report does not authorize them.

## GAME TRANSLATION

WBS / Lane: WG.00.44 / lane-db.
Approved scope / Owner authorization: MSG-PRUNE-PM-116 item 1; Owner 2026-10-01, "Ship reviewed scanner".
Writer candidate / evidence date: `a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`; 2026-10-01.
Translation Class: C FOUNDATIONAL / INDIRECT.

- **Player / World Effect:** restores the reviewed tooling that checks simulation-module loading
  and harness grid pinning. No player-visible feature is added by this restoration.
- **Trigger:** scanning a target-plugin VM harness; runtime consumers call `UF.Sim.require(name)`.
- **Runtime Authority:** the unchanged `UF.Sim` block in `game/js/plugins/DEUS_World.js` owns
  module resolution and the matter-opener registry. The scanner owns only test discovery.
- **Simulation Path:** `vm_harness_scan.scan` discovers hits; `test_sim_loader` checks install text;
  harness `vm_sim_require.install(sandbox)` provides `DEUS_SIM_HOST`; `UF.Sim.require` resolves
  `game/js/sim` exports. Missing modules throw. Sandbox identity/order is not established by the scan.
- **Engine Bridge:** the existing World plugin loads in RMMZ; its ledger resolution was exercised
  in the NW.js snapshot. Matter-opener execution is deferred to lane-dv and core registration to lane-dl.
- **Visible Result:** inspected map boot as described above. Downstream simulation-forward,
  matter, and water behavior was not demonstrated by this tooling restoration.
- **Persistence:** no new state or save schema. Module handles/opener callbacks are runtime objects;
  downstream consumers own persistence. New save/load or region-reload proof: NOT RUN.
- **Failure Without This Lane:** inconsistent module loading or grid defaults can invalidate harness
  results used to support world behavior; missing modules must not silently substitute or return null.
- **Automated Proof:** the six manifest gates on the candidate, scanner counts, three named mutants,
  and headless base-overlay probe are in `evidence/reviewed_scanner_restore/gates.txt`.
- **In-Game Proof:** NW.js loader suite 5 passed, 0 failed; actual ledger path in runtime log;
  screenshot opened. Editor F5/F8: NOT RUN. Downstream gameplay: NOT VERIFIED.

CONSUMED BY GAME SYSTEMS: WorldGen can register matter openers before Levels exists through
World's registry; authorized lanes dv/dl supply execution/registration. Matter consumers,
including lanes dm/fi, depend on consistent module resolution. Delivery to the current World
consumer is exercised by ledger export identity in the VM and ledger resolution/loading in NW.js.
Broken resolution would prevent consumers from loading the authoritative simulation modules;
this evidence does not establish those future consumers' gameplay.

GAME BRIDGE STATUS:

- Simulation implemented: YES for the existing loader/registry contract; loader gate evidence.
- Engine bridge implemented: YES for the existing World-to-ledger loader in NW.js;
  matter-opener execution remains DEFERRED TO lane-dv.
- Presentation implemented: NO new presentation; not part of this foundational restoration.
- Input/player interaction implemented: NO new input or player action in this scope.
- Save/load implemented: NO new save state; downstream persistence remains with its consumers.
- Playable verification performed: NO editor F5/F8 run or downstream scenario; NW.js loader
  integration proof is reported separately.

Remaining step before downstream effects reach the player: the authorized consumer lanes must
connect and demonstrate their world behavior. Player-facing status: NOT YET PLAYABLE for those
downstream effects; this handoff makes no gameplay-complete claim.

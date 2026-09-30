# OPS.PRUNE.05 / lane-ct writer completion report

Date: 2026-09-30. Writer: Codex. Branch: `task/lane-ct`.
Implementation/evidence SHA: `78da533344b4ce3ffc337f584e2d0b45ea21a506`.
Disposition: writer submission for independent Grok review; no self-certification, WBS closure, merge, or push.

## What changed

- Exactly the 16 authorized harness paths changed. No repository files were pruned, archived, or deleted. No game runtime, game data, art, lane manifest, or active-lane registry was changed.
- `tools/test_all_animated_objects_live.js` now supplies a shared, import-safe wrapper contract for the live tests: checked snapshot copy, unique snapshot with old results/screenshots/saves excluded, exact injection hooks, checked child status/error/signal, completed results with matching PASS counts and suite identity, and required PNG artifacts that decode and contain visible pixels. Exceptions print `FAIL` and set exit code 1. The animated suite's swallowed readiness timeout was removed.
- The other live wrappers use that contract before copying review artifacts. Injection targets use the actual `DEUS_Test.js`, `DEUS_Anim.js`, and `DEUS_Wildlife.js` implementations rather than the UF forwarding stubs. The creature injection's escaped literal `${targetHook}` was corrected. Existing optional, machine-specific brain directories are no longer required for a valid run.
- Golden grass now checks its screenshot was written. Temperate/arid checks the live map's six terrain variants and west/east endpoint tile IDs after frame settling. Title capture checks a visible command menu and a nonempty decoded screenshot, and installs its capture plugin only in a private snapshot with a valid plugin array.
- The sack test loads the real `DEUS_Bag.js` in a Node VM and makes ten assertions against its UI/Items/Sheet contracts. Rendering and service boundaries are doubles; this does not prove rendered UI or full Items integration.
- The PowerShell test retains its existing policy assertions and exit counter. It adds case-sensitive comparisons, validates child artifact presence, row count, identity and boolean status, and accepts matching exceptions only for its explicit bad-task-type case. `-LibraryPath` allows the ordinary assertions to run against a defective library copy. Unique temporary evidence directories are retained.
- `docs/STATUS.md` records the writer handoff, with the temporary writer claim removed. Task evidence includes reproducible fixtures, transcripts and SHA-256 hashes of all 16 tested harness sources.

The checked-out facts differ from two brief descriptions: `tools/test_sack_ui_and_loose_items.js` was absent, not a tracked zero-byte file, and `.gitignore:40` explicitly ignored it. The authorized path was created and staged explicitly with `git add -f`, without changing `.gitignore`. `test_top_models_effort.ps1` already had substantial assertions, child exit checks, mutation cases and an exit counter; those were preserved and strengthened.

### Per-file failure evidence

Every listed negative invocation exited **1**, printed **FAIL**, and matched the intended failure diagnostic. All 14 live wrappers also had a healthy boundary fixture exit **0**. Full child commands/output are in `evidence/negative_verification.json`.

| Harness | Original failure-path defect / change | Observed negative condition |
|---|---|---|
| `tools/test_all_animated_objects_live.js` | Ignored spawn result, results and readiness timeout | Child status 7; FAIL/ERROR results; missing PNG; missing injection hook |
| `tools/test_all_faction_menus.js` | Swallowed runner exception; unchecked artifacts | Child status 7; missing faction screenshot |
| `tools/test_creatures_ingame.js` | Swallowed runner exception; ineffective/invalid injection | Child status 7; missing showcase screenshot/hook |
| `tools/test_dwarves_ingame.js` | Swallowed smoke failure | Child status 7; missing showcase screenshot |
| `tools/test_elves_ingame.js` | Swallowed smoke failure | Child status 7; missing showcase screenshot |
| `tools/test_golden_art_review_live.js` | Hardcoded grass assertion and swallowed runner failure | Missing screenshot fails the actual injected grass assertion |
| `tools/test_light_wall_occlusion_live.js` | Ignored spawned runner status | Child status 7; missing closed-door screenshot |
| `tools/test_sack_ui_and_loose_items.js` | Absent authorized harness | In-memory Bag mutant bypasses `Items.pickUp`; identity/call assertion fails |
| `tools/test_standard_4d_ingame.js` | Swallowed smoke failure; unchecked shots | Child status 7; missing closeup screenshot |
| `tools/test_standard_8d_ingame.js` | Swallowed smoke failure; unchecked shots | Child status 7; missing normal-view screenshot |
| `tools/test_temperate_arid_transition_live.js` | Hardcoded transition assertion | Replacing settled terrain with uniform grass fails actual injected metadata assertion |
| `tools/test_tilesets_live.js` | Swallowed runner failure; unchecked shots | Child status 7; missing ground screenshot |
| `tools/test_title_menu.js` | Swallowed capture failure; stale screenshot accepted | Hidden menu fails actual capture callback; missing/empty PNG fails wrapper |
| `tools/test_underground_room.js` | Swallowed smoke failure; unchecked screenshot | Child status 7; missing underground screenshot |
| `tools/test_water_ingame.js` | Swallowed smoke failure; unchecked screenshot | Child status 7; missing water screenshot |
| `tools/ops/pm_launch/test_top_models_effort.ps1` | Existing assertions hardened; overly broad matching-exception acceptance | Library copy lowers Codex standard floor from xhigh to low; ordinary policy comparison fails |

## How I tested it

All commands ran from `C:\Users\snewt\.deus_worktrees\lane-ct` on 2026-09-30.

| Command | Observed outcome | Evidence |
|---|---|---|
| `node tools/check_deus_syntax.js` | Exit 0; 62 plugins checked, 0 errors | `evidence/gate_syntax.log` |
| `node tools/test_control_board.js` | Exit 0; CLEAN PASS, 0 errors; also passed after the final STATUS handoff edit | `evidence/gate_control_board.log`, `evidence/gate_control_board_final.log` |
| `node tools/test_palette.js` | Exit 0; `Palette loaded successfully` | `evidence/gate_palette.log` |
| `node tools/governance/test_check_claims.js` | Exit 0; 279 passed, 0 failed | `evidence/gate_claims.log` |
| `node tasks/OPS.PRUNE.05/lane-ct/evidence/run_negative_verification.js` | Exit 0; 246 fixture cases passed, 0 failed, covering all 16 harnesses | `evidence/negative_verification.log`, `.json` |
| `node tools/test_sack_ui_and_loose_items.js` | Exit 0; 10 assertions passed against the real Bag implementation | Real-plugin row in the JSON proof |
| `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/pm_launch/test_top_models_effort.ps1` | Exit 0; existing policy and mutation assertions passed | Real-library row in the JSON proof; `effort_initial.log` |

The fixture run has **19 positive controls and 227 expected failures**. Each of the 14 live wrappers receives child crash, launch error, timeout, copy failure, stale output, missing/empty/truncated/failed/error/miscounted/wrong-suite results, and missing/empty/invalid PNG conditions. The 12 injection wrappers also receive a missing hook. The actual grass/transition/title injected code runs separately against deterministic map/renderer doubles, both healthy and defective. The Bag mutant replaces the pickup call in memory; the effort mutant changes a library copy in this evidence directory. No production failure switch or unconditional forced failure was added.

The fixture loader parses the modified snapshot JavaScript it would write, including title plugin registration and embedded suites. All 15 JavaScript harnesses were also parsed directly with `vm.Script`. Source hashes in the proof were checked against the committed implementation and match all 16 files. The JSON names the pre-implementation base SHA and source hashes because execution preceded the implementation commit; the implementation SHA above binds those exact harness bytes.

Logs were converted from PowerShell UTF-16 to UTF-8 with LF line endings for review. Their diagnostic text is retained. `git diff --cached --check` passed before the implementation commit.

## Evidence

- Screenshot: **NOT PRODUCED**. This session ran headless verification, not NW.js. Fixture artifact bytes are the existing `game/img/system/Window.png` held in memory; they are neither game captures nor art QA evidence. No screenshot or art conversion was written to the game or review directories.
- Real output excerpts:

```text
Checked 62 DEUS plugin files. Errors: 0
CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)
Palette loaded successfully
RESULT: 279 passed, 0 failed
RESULT: 246 fixture cases passed, 0 failed; 16 target harnesses
FAIL golden_art_review_grass.grass_batch1_rendered - Batch 1 screenshot must exist and contain image data
FAIL temperate_arid_live.temperate_arid_transition_verified - Live ground kinds=2862; west=2862; east=2862
FAIL title.menu_visible - title command menu is not visible or has no commands
FAIL rule codex mechanical high effort got=high want=xhigh
```

## Not done / known problems

- NW.js, native RMMZ F5, F8 console inspection and visual acceptance were **NOT RUN**. The brief's prefilled “Playable verification performed: YES” is not adopted as evidence. This submission proves failure routing and bounded headless contracts.
- The existing palette command is a palette-load smoke check and emits no `CLEAN PASS` banner. Its actual exit 0 and output are reported without claiming wider palette validation.
- Existing runtime defects/assets may make these live tests fail; that now propagates as failure. For example, source inspection shows `DEUS_FactionMenus.js:59` lists 11 entries while its `factions_list_12` check at line 1548 expects 12. The runtime file was not changed and this scenario was not run.
- Screenshot presence/decoding does not prove artistic quality, exact framing, occlusion correctness or animation quality. Those need real runtime checks and opened captures. The golden assertion is deliberately limited to evidence creation; its historical check name is retained.
- The transition wrapper's existing composite-sheet builder was not executed; the fixture replaces that boundary with a no-op. DEC-055 conversion work remains outside this lane.
- The existing `tools/run_tests.js` remains outside the 16-file scope. These wrappers add their own result/exit checks; they do not harden that runner for other callers.
- Independent Grok review, any fresh-clone integration-gate run, PM acceptance and `merge_gate` integration remain pending. The pre-existing untracked launch prompt was preserved and not staged.

## Try it in RMMZ

1. Keep the editor closed during the standing DEC-059 build. The reproducible headless check is `node tasks/OPS.PRUNE.05/lane-ct/evidence/run_negative_verification.js`.
2. For subsequent authorized live verification, run the selected wrapper, for example `node tools/test_title_menu.js`. It uses a fresh snapshot and records its artifacts there; successful title evidence is copied to `art/review/menus/title_menu_default.png`. Inspect every resulting capture.
3. When the PM calls for the native editor gate, reopen `game/game.rmmzproject`, use F5 to reach the corresponding scene, and inspect F8 for new errors. Capture and inspect the relevant moment against that harness's criteria.

Expected: the wrapper returns 0 only when its child, results and required screenshots meet its checks; missing evidence or failed criteria return 1. Native scene appearance and console behavior remain unobserved in this session. No live project database/plugin-list edits from this lane require an editor reload.

## Decisions needed

- No new scope or Owner permission is requested. The existing independent Grok reviewer and PM integration path must assess this writer submission. Gameplay completeness and final Natural World sign-off are not claimed.

## GAME TRANSLATION

WBS / Lane: OPS.PRUNE.05 / lane-ct.
Approved scope / Owner authorization reference: the direct Owner task and `tasks/OPS.PRUNE.05/lane-ct/BRIEF.md`; exactly 16 harnesses plus permitted lane records/evidence.
Writer SHA / evidence date: `78da533344b4ce3ffc337f584e2d0b45ea21a506` / 2026-09-30.
Translation Class: **C — FOUNDATIONAL / INDIRECT (test tooling)**.

1. **Player / World Effect:** No new gameplay is introduced. Broken animation, missing scene evidence, incorrect terrain transitions, invisible menus and rejected bag pickups can no longer be accepted by these wrappers solely because a child exited or an old screenshot exists. The assurance supports the named visual/world consumers below.
2. **Trigger:** Run one of the 16 ordinary test commands during development/review, or run the lane's negative verification driver. Failed checks, child errors or missing evidence produce exit 1.
3. **Runtime Authority:** The test process owns its verdict. `runMain`, `checkChild`, `verifyArtifacts` and `verifyScreenshot` in `tools/test_all_animated_objects_live.js` supply the common live-wrapper verdict contract. The sack test asserts the real Bag API; PowerShell asserts `Get-PmTopModelSpec` policy results.
4. **Simulation Path:** Live wrapper -> unique snapshot -> exact suite injection -> `tools/run_tests.js` -> `DEUS_Test` results/screenshots -> parent validation -> exit status. Title uses its snapshot-only capture callback. Sack uses `vm.runInNewContext(DEUS_Bag.js)` -> real Bag methods -> controlled Items/Sheet services -> assertions. Model test -> real/mutated library -> launch-spec comparisons -> fail counter.
5. **Engine Bridge:** Existing `game/js/plugins/DEUS_Test.js` provides named checks and screenshots consumed through `tools/run_tests.js`. Snapshot injections target `DEUS_Anim`, `DEUS_Wildlife` and `DEUS_Test`; title aliases `Scene_Title.start` only in the snapshot. Wiring/source insertion and parent contracts were tested headlessly; real NW.js delivery was **NOT VERIFIED**.
6. **Visible Result:** Observed: terminal PASS/FAIL diagnostics and correct child exit classifications. Expected indirect benefit: reviewers can reject missing/broken game evidence. No player-visible scene result was observed.
7. **Persistence:** Harness source, report, fixtures, transcripts and source hashes persist in Git. No save schema or game save data changed. Private runtime snapshots exclude existing saves and retain their evidence; save/load gameplay was not tested.
8. **Failure Without This Lane:** The affected wrappers can conceal child failures, accept stale/missing screenshots or accept hardcoded assertions. Bag UI contracts lack the requested standalone test; matching unexpected model-policy exceptions can count as equivalent success.
9. **Automated Proof:** The four required commands above exited 0. `node tasks/OPS.PRUNE.05/lane-ct/evidence/run_negative_verification.js` observed 246/246 cases: 19 healthy exit-0 controls and 227 defective exit-1 cases, with intended diagnostics checked. Exact commands, output and all 16 source hashes are in `evidence/negative_verification.json`; the implementation SHA is above. These are deterministic/headless boundary and API proofs.
10. **In-Game Proof:** **NOT RUN** — no NW.js session, native editor F5, F8 console observation or opened gameplay screenshot. Follow the explicit runtime steps above during subsequent authorized verification; this report does not substitute fixture success for playability.

### CONSUMED BY GAME SYSTEMS

- Animation, wildlife and scene suites: `DEUS_Anim`, `DEUS_Wildlife`, `DEUS_Test`, `DEUS_FactionMenus`, `DEUS_Levels` and the map renderer produce the state/screenshots these wrappers inspect. A broken consumer would appear as missing/incorrect objects, menus, lighting, underground/water scenes or terrain. Parent contract delivery is covered by the live-wrapper fixtures; actual NW.js delivery remains unverified.
- Bag: `DEUS_Bag.Window_UFBag.handleDrop` passes loose-item and holder IDs to `UF.Items.pickUp`; `UF.Bag.open/toggle` routes to `UF.Sheet` inventory tab 1. The ten real-plugin VM assertions prove that bounded consumer routing against doubles. Corruption would show as missing items, false successful pickups, wrong carried weight or the wrong inventory tab.
- PM launch tooling consumes model effort specifications; its effect is development/review quality, with no game-runtime consumer or save fields.

### GAME BRIDGE STATUS

- Simulation implemented: **NO — N/A**, this lane changes test tooling only.
- Engine bridge implemented: **YES — existing bridge targeted**, as shown by snapshot source injections and ordinary `run_tests.js` calls. Live operation is not verified by this report.
- Presentation implemented: **NO — N/A**, no game presentation change.
- Input/player interaction implemented: **NO — N/A**, no gameplay/input implementation change; Bag routing is exercised headlessly.
- Save/load implemented: **NO — N/A**, no persistence feature or schema change.
- Playable verification performed: **NO — NOT RUN**, NW.js/F5/F8 and visual proof remain outstanding.

Remaining step before player can experience it: indirect tooling benefit is available to reviewers now; independent review/integration and genuine runtime evidence are still needed for claims about the tested scenes.

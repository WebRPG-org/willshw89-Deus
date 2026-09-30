# OPS.PRUNE.02 / lane-co writer handoff

Date: 2026-09-30. Authority: MSG-PRUNE-PM-059 and the Owner's explicit task.
Writer: Codex (OpenAI family). Reviewer assigned by lane.json: Grok; review not
performed by this writer. Base: 6a6a5f1b. Writer SHA is the commit containing this
report; the exact resulting SHA is supplied in the session handoff. Tests ran on
the working tree before that commit. No merge, push, WBS closure or self-approval.

## What changed

- `archive/game/js/plugins/`: 41 explicit forwarders archived using `git mv`.
  All 41 retain their original bytes. The reconciliation is 43 original UF files,
  41 archived shims and 2 retained implementations.
- `game/js/plugins/DEUS_Colonists.js`: removed the dead SettlementPillars and
  Sanitation requires, and the entire Generator fallback block whose candidates
  were exclusively UF shim paths. The UF service accessors remain.
- `game/js/plugins/DEUS_History.js`: removed the UF Items require fallback.
- `game/js/plugins/DEUS_Combat.js`: its source check reads the canonical file;
  removed the UF source-file fallback.
- 82 tools/tests retargeted to the corresponding DEUS filenames, including VM
  reads, constructed filenames, snapshot instrumentation and plugin registration.
  Exact file list: `evidence/retargeted_files.json`. UF namespaces and legacy
  parameter checks remain. The town-hall helper now reads DEUS_Test directly.
- `tools/test_no_loadscript_shims.js`: read-only gate for live loadScript calls,
  all 41 archives, protected-file presence, and stale literal imports/VM paths.
  Mutants use in-memory inventories; child exit codes and specific diagnostics
  must agree. Both protected files are tested separately.
- `UF_Households.js`, `UF_Time.js`, and the L3-owned
  `tools/test_time_domains_proof.js` are byte-identical to their originals.
  `evidence/before_hashes.json` records their hashes and the 41 shim hashes.
- Coordinator-owned STATUS/VISION files are outside the whitelist; the bounded
  claim and the acceptance conflict are recorded in STATE.md instead. Existing
  launch files are preserved and excluded from this writer's staging.

## How I tested it

All ten manifest gates were exercised: nine exit 0; the strict new gate exits 1.
Real exit codes and capture times are in `evidence/gates/results.json`.
Individual logs are in `evidence/gates/`.

| Command (all prefixed with node) | Exit | Observed result |
|---|---:|---|
| tools/check_deus_syntax.js | 0 | Syntax gate passed |
| tools/test_palette.js | 0 | Palette loaded successfully |
| tools/governance/test_check_claims.js | 0 | 279 passed, 0 failed |
| tools/test_strata_cuts_and_caves.js | 0 | 30 passed, 0 failed |
| tools/test_new_game_year0.js | 0 | 30 gating checks, 15 mutants caught |
| tools/test_history_materialization_and_world_age.js | 0 | 29 passed, 0 failed |
| tools/test_historical_carrying_capacity.js | 0 | See captured gate log |
| tools/test_geology_strata.js | 0 | See captured gate log |
| tools/test_strata_foundation.js | 0 | 27 passed, 0 failed |
| tools/test_no_loadscript_shims.js | 1 | Five canonical loadScript callers |

The strict gate was first run directly by its requested filename. During the
final checks an unknown concurrent writer added a five-file exception list to
that file. To preserve their work without including unowned edits, the strict
writer source was staged separately. Its final baseline and all mutants were
rerun from a byte-identical temporary file in tools/, preserving the same
repository root and child execution behavior. That temporary file was removed
after checking its bytes; the original working file was never overwritten.
The staged source blob and exact invocation are recorded in results.json.
The concurrent exceptions remain UNSTAGED and are not part of this writer commit.

Additional checks actually run:

- `node tools/test_no_loadscript_shims.js --mutants`: all three named mutants
  detected, four scenarios total. Aggregate exit 1 because the real baseline
  still has five forbidden callers; this is not a passing repository gate.
- Individual `--mutant moved-protected`, `--mutant shim-survived`, and
  `--mutant broken-retarget` executions, plus moved-protected with
  `--protected UF_Time.js`: each exits 1 with its intended diagnostic.
- `node tasks/OPS.PRUNE.02/lane-co/evidence/test_detector.js`: 60 synthetic
  fixture cases passed, exit 0. Covers a clean inventory, removal of each of the
  41 archives, both protected plugins, require/import/VM path forms, and retained
  parameters and plugin registrations. It does not substitute for the failing
  live gate. The clean fixture contains no canonical companion-loader files,
  so the concurrent allowlist has no bearing on these unit checks.
- `node --check` on all 82 changed tools and the new gate; all passed. The
  byte-identical staged gate copy also passed its own syntax check.
- SHA-256 comparison of each moved file and the three protected files; all match.
- `git diff --check`; passed. Scope and namespace/parameter checks passed
  (`evidence/scope_check.log`).
- Read-only evaluation of plugins.js: all 42 enabled plugin files exist
  (`evidence/registration_check.log`). No native boot claim.

## Evidence

- Screenshots: none produced. Native editor Playtest and F8 console were not run.
- Observed log excerpts:

```text
RESULT: 279 passed, 0 failed
RESULT: 30 passed, 0 failed (exit 0)
MUTANTS: 4/4 scenarios killed (3 names)
RESULT: FAIL; 41 required archives; 2 protected plugins; 5 violations; 1 L3 deferrals
```

The first two lines are from governance and cuts/caves respectively. The last
two are from the new detector's mutation run; its overall exit is 1.

## Not done / known problems

1. Acceptance conflict: the Owner message says zero files calling
   PluginManager.loadScript, while BRIEF.md says zero forwarder shims. The strict
   implementation fails on five existing canonical implementations:
   DEUS_Camera.js:624, DEUS_ColonyOverseer.js:51, DEUS_Core.js:126,
   DEUS_History.js:220, and DEUS_Items.js:44/47. Four files are outside the allowed
   runtime paths. Their real dependency-loading behavior remains unchanged.
   An Owner clarification was requested; no answer has been received. The strict
   writer gate has not been relaxed to manufacture a passing result. A concurrent
   edit inserted CANONICAL_COMPANION_LOADERS and skipped these five files; that
   version exits 0 but is excluded from this commit. Evidence/provenance is in
   `evidence/concurrent_edit.json`; its separately captured passing results have
   the `concurrent_allowlist_` prefix. Do not cite them as writer-gate acceptance.
2. L3/lane-cp still owns the exact `../game/js/plugins/UF_World.js` require in
   test_time_domains_proof.js:38. The gate prints this exact exclusion as DEFERRED;
   other stale references in that file would fail. L3 must retarget it. The
   exclusion disappears from the output when L3 updates its import.
3. Two historical tool records are retained: the old-save fixture hashes the old
   Factions/History implementations, and fix_colonists_checks.js targets
   archive/plugins_uf_pre_rename. Exact historical lines are exempted, not whole
   files. These refer to different, pre-rename implementations.
4. Literal source scanning is not a general JavaScript dependency resolver.
   Arbitrarily computed or obfuscated paths are outside this static detector.
   Every edited legacy tool has not been run; other missing UF dependencies
   outside the specified 41 are outside this lane's retargeting scope.
5. Independent Grok review, the coordinator's fresh-clone gates/merge gate,
   RMMZ F5/F8 evidence and Owner acceptance remain outstanding. The brief's
   pre-existing playable-verification YES is not evidence from this session.

## Try it in RMMZ

1. Open this lane's `game/game.rmmzproject` and press F5.
2. Start New Game and open the F8 developer console.
3. Check for missing-script or shim-redirection errors and capture the boot result.

Expected, not observed in this session: the canonical plugins start normally
without requiring archived forwarders. Do not infer this from headless results.

## Decisions needed

Clarify whether the new gate should reject only loadScript-only forwarders, as
the brief specifies, or every loadScript caller. The latter needs an authorized
runtime follow-up covering the out-of-scope canonical loaders before L2 can pass.
No next slice or integration is approved by this report.

## GAME TRANSLATION

- WBS / Lane: OPS.PRUNE.02 / lane-co (L2).
- Approved scope: MSG-PRUNE-PM-059 and Owner task; writer identity/base above.
- Translation Class: C, FOUNDATIONAL / INDIRECT.
- Player / World Effect: no new simulation rules. Tools address the canonical
  implementations directly; obsolete forwarding files leave the live directory.
- Trigger: plugin initialization, tool imports, VM source loading, snapshot tests.
- Runtime Authority: existing DEUS plugins, plus retained UF_Households and
  UF_Time implementations. UF namespaces and legacy parameters remain intact.
- Simulation Path: DEUS_Colonists service accessors and DEUS_History.getItems
  retain their APIs; obsolete require candidates are removed. Tool loaders read
  the canonical files. DEUS_Combat's source check reads its own canonical source.
- Engine Bridge: existing PluginManager.setup via game/js/plugins.js. All 42
  enabled file targets exist; the real RMMZ boot was not observed.
- Visible Result: expected unchanged New Game behavior and absence of missing
  archived-shim loads. No visible result claimed from this session.
- Persistence: no save schema edits. Headless history materialization/save-load
  checks pass. Git preserves every shim unchanged in archive/. Native save/load
  was not checked in this session.
- Failure Without This Lane: Node/VM tools may execute empty forwarding shims
  instead of subsystem code; snapshot instrumentation targets the wrong files.
- Automated Proof: all manifest command results and mutation/fixture evidence
  above; the gates table records acceptance independently of these claims.
- In-Game Proof: NOT RUN; F5/F8 procedure above remains an acceptance step.
- CONSUMED BY GAME SYSTEMS: New Game/DEUS_Core, DEUS_World and DEUS_History consume
  canonical plugin state; year-zero and history materialization gates exercise
  those consumers headlessly. Bad imports would leave missing services or prevent
  initialization. DEUS_Test snapshot tooling consumes the canonical test plugin.

### GAME BRIDGE STATUS

- Simulation implemented: YES, existing modules exercised by manifest tests;
  this lane introduces no simulation feature.
- Engine bridge implemented: YES, existing registration with 42 present targets;
  only the static connection was checked here.
- Presentation implemented: N/A, no presentation feature in this tooling lane.
- Input/player interaction implemented: N/A, no interaction feature changed.
- Save/load implemented: YES, existing persistence exercised headlessly; no
  schema change or native-playtest persistence claim.
- Playable verification performed: NO, native editor Playtest not run.
- Remaining step: resolve the strict-gate acceptance conflict, L3 import handoff,
  independent review, coordinator integration and actual RMMZ boot proof.

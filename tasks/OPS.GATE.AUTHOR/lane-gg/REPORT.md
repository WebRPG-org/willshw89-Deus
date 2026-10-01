# OPS.GATE.AUTHOR lane-gg writer report — 2026-10-01

## What changed
- `tools/governance/merge_gate.js`: check Git author names for reviews, writer commits, manifest edits and `[ops]` commits; honor only ancestry-based exemptions from `origin/main`.
- `tools/governance/test_merge_gate.js`: sign fixture commits as their tagged family and exercise the new refusals, permitted exceptions and five mutants.
- `tools/governance/author_rules.json`: add the empty version 1 transition list for the PM to fill at integration.
- `tools/governance/MERGE_GATE.md`: document identity rules, reason codes, exceptions and PM transition steps.

Implementation commit: `7a0c7f3fcf163686585e1a0295e4ee69228627a8` (author `deus-codex`).

## How I tested it
- `node tools/governance/test_merge_gate.js` on the writer worktree immediately before the implementation commit: exit 0, 129 passed, 0 failed. The harness builds and gates throw-away repositories; 30 gate mutants and three source mutants were caught.
- The same manifest test in a fresh LF-configured detached clone at `245a2a45b189a92d9bbdfb3950c62f778b9e9bd8`: exit 0, 129 passed, 0 failed. Clone: `C:\Users\snewt\AppData\Local\Temp\deus-author-gate-final-245a2a45`.
- `node --check tools/governance/merge_gate.js` and `node --check tools/governance/test_merge_gate.js`: exit 0.
- `git diff --check` and `git diff --cached --check`: exit 0.

## Evidence
- Screenshot: N/A; this is a command-line governance tool with no visual game output.
- Log excerpt from the final suite:

```text
PASS mutant_review_author_off_killed
PASS mutant_writer_author_off_killed
PASS mutant_manifest_author_off_killed
PASS mutant_ops_scope_off_killed
PASS mutant_grandfather_by_date_killed
PASS source_mutant_dry_run_merges_killed
PASS source_mutant_fast_forward_merge_killed
PASS source_mutant_push_after_merge_killed
RESULT: 129 passed, 0 failed
```

## Not done / known problems
- Independent Grok review, PM dry run and merge have not happened. The branch has no review commit yet. The coordinator's fresh-clone test of the final reviewed tip remains pending.
- The PM must populate `grandfatheredTips` with the then-open lanes' exact tips when this lane merges. The committed file intentionally has an empty mapping.
- A direct comparison run against the old gate was not completed: two attempts to extract its source into a temporary harness failed through PowerShell quoting and UTF-8 BOM handling. The five new mutants supply the fail-capable check evidence.
- RMMZ playtest and dev-console checks were not run; no game file changed.

## Try it in RMMZ
1. N/A for RMMZ. Run `node tools/governance/test_merge_gate.js` from the repository root.
Expected: `RESULT: 129 passed, 0 failed` and exit 0 on the implementation tree.

## Decisions needed
- No new Owner decision. The PM records the open-lane tip snapshot, arranges independent review, and integrates through `merge_gate` under DEC-082.

## GAME TRANSLATION

**WBS / Lane:** OPS.GATE.AUTHOR / lane-gg
**Approved scope / Owner authorization reference:** DEC-082; `tasks/OPS.GATE.AUTHOR/lane-gg/BRIEF.md`
**Writer SHA / evidence date:** implementation `7a0c7f3fcf163686585e1a0295e4ee69228627a8`; test observed 2026-10-01
**Translation Class:** C FOUNDATIONAL / INDIRECT

**Player / World Effect:** No immediate game behavior. Reviewed natural-world lanes can reach the game only after the gate accepts their actual author identities.
**Trigger:** The integrator invokes `node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json` for a reviewed branch.
**Runtime Authority:** `merge_gate.js` owns this integration decision from committed Git objects, `origin/main`'s author rules and the lane manifest.
**Simulation Path:** N/A; this lane changes governance logic, not simulation state.
**Engine Bridge:** N/A; no RPG Maker MZ runtime path. The tool gates merges that may later change game plugins or data.
**Visible Result:** Integrators see `REFUSED REVIEW_AUTHOR`, `WRITER_AUTHOR`, `MANIFEST_AUTHOR` or `OPS_COMMIT_SCOPE` for the corresponding bad commit. Players see no direct change.
**Persistence:** Git commit author/ancestry, the committed `author_rules.json` and merge history persist; RMMZ save/load is N/A.
**Failure Without This Lane:** A coordinator-authored review bearing another family's subject tag could pass the old gate, allowing unreviewed game work to merge.
**Automated Proof:** `node tools/governance/test_merge_gate.js`, exit 0 with 129/0 both on the writer worktree and in a detached clone at `245a2a45b189a92d9bbdfb3950c62f778b9e9bd8`; cases cover each rule, transition boundary and fail-capable mutants. The coordinator/reviewer must rerun the final reviewed tip.
**In-Game Proof:** NOT RUN; governance-only work has no in-game scenario.

**CONSUMED BY GAME SYSTEMS:** N/A directly. The consumer is the PM/coordinator integration workflow for reviewed game and world lanes; the temporary-repository suite proves its branch acceptance/refusal contract. Bad integration could admit a game change without independent review.

### GAME BRIDGE STATUS

Simulation implemented: NO — not applicable to governance tooling.
Engine bridge implemented: NO — not applicable to governance tooling.
Presentation implemented: NO — CLI summary only, no game presentation.
Input/player interaction implemented: NO — integrator CLI, no player input.
Save/load implemented: NO — Git objects, no RMMZ save schema.
Playable verification performed: NO — no game behavior changed.

**Remaining step before player can experience it:** Independent review and PM merge of this governance lane, then later independently reviewed game lanes; there is no direct player-facing feature in this task.

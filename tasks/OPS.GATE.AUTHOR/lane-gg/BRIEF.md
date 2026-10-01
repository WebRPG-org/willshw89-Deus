# lane-gg: merge_gate checks who authored a lane's commits

| Field | Value |
|---|---|
| WBS | OPS.GATE.AUTHOR (governance tooling; AUDIT_LOG A12-3) |
| taskId (manifest) | OPS.GATE.AUTHOR |
| Branch | `task/lane-gg` |
| Manifest | `tasks/OPS.GATE.AUTHOR/lane-gg/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | codex -> grok |
| Size | M |
| Dependencies | none |
| RMMZ editor must be closed | no (no game file is touched) |

Base: `main` at `68dbe1e9` or later.

## Why

- **AUDIT_LOG A12.** On 2026-10-01 the coordinator (AG) wrote review commits itself under `[grok]` and `[codex]` subject tags, authored `deus-ops`, and reported the lanes merge-ready. merge_gate accepted them because its review check reads only the subject tag (A12-3, MAJOR). The PM caught it by hand.
- **The Owner's ruling** (DEC-082, 2026-10-01: "Do all three": "Hand-off queue now; governance lane for the authorship check (reviewed by an independent family); then AG may run merge_gate itself"). This lane is that governance lane. When it merges, AG may run merge_gate, so the gate itself must refuse what the PM has been catching by hand.

## Identities (binding; the gate checks these names)

| Who | Author and committer name | Where it is set |
|---|---|---|
| Workers launched by `tools/ops/launch_worker.ps1` | `deus-<provider>`: `deus-claude`, `deus-grok`, `deus-codex`, `deus-gemini` | `launch_worker.ps1:1270-1275` (`GIT_AUTHOR_NAME`, `GIT_COMMITTER_NAME`) |
| The PM (Claude Code) | `deus-pm` | the PM's own commits, from 2026-10-01 ~20:15Z |
| The coordinator (AG) | `deus-ops` | the repository's `user.name` |

Family of a subject tag, as in `merge_gate.js:62`: `claude` and `fable` → `deus-claude`; `gemini` and `antigravity` → `deus-gemini`; `grok` → `deus-grok`; `codex` → `deus-codex`.

## Goal

merge_gate refuses a lane when any commit in the range it checks (`origin/main..tip`, as today) was authored by someone other than the identity its tag requires. Four new reason codes:

1. **`REVIEW_AUTHOR`** (check (b)). The review commit's author name must be `deus-<family of its tag>`. `deus-ops`, `deus-pm` and any other name are refused. This applies to every review, with no grandfathering.
2. **`WRITER_AUTHOR`** (new check (b2)). Any other commit whose subject tag is an agent family (`[claude]`, `[fable]`, `[grok]`, `[codex]`, `[gemini]`, `[antigravity]`) must be authored `deus-<that family>`. One exception: a single-parent `[gemini]` commit authored `deus-ops` that changes only the lane's `lane.json` and `BRIEF.md`. That is the coordinator's manifest edit, already trusted by check (a).
3. **`MANIFEST_AUTHOR`** (check (a)). A `[pm]` commit that changes `lane.json` must be authored `deus-pm`. A `[gemini]` manifest commit must be authored `deus-ops` or `deus-gemini`.
4. **`OPS_COMMIT_SCOPE`** (new). An `[ops]` commit, i.e. the coordinator's launch records and evidence, must be authored `deus-ops`. It may change only paths under `tasks/<taskId>/<lane>/`.
5. **Exemptions.**
   - A merge commit whose second parent is an ancestor of `origin/main` (a sync from main) is exempt from 2-4.
   - Commits reachable from a tip listed in the new `tools/governance/author_rules.json` are exempt from 2-4, not from 1. The list holds the open lanes' tips at the time the PM merges this lane. It is written by the PM, and the gate reads it from `origin/main`, never from the lane. Exemption works by commit ancestry, never by date, so a backdated commit cannot use it.

Today's check (b) refuses a review in the writer's family. Keep that check.

## Files this lane may touch (allowedPaths)

- `tools/governance/merge_gate.js`
- `tools/governance/test_merge_gate.js`
- `tools/governance/MERGE_GATE.md`
- `tools/governance/author_rules.json` (new; the writer creates it with an empty list: `{"version": 1, "grandfatheredTips": {}}`; the PM fills it at merge time)
- `tools/governance/fixtures/**`
- `tasks/OPS.GATE.AUTHOR/lane-gg/**`

## Tests

`tools/governance/test_merge_gate.js` builds throw-away repositories (`user.name` is "DEUS Test" today, `:72`). Two things change:

1. Existing cases author each commit as the identity the new rules expect, so they keep their current outcome.
2. New cases, each shown failing without the change and passing with it (AGENTS.md Rule 4):

| Case | Expect |
|---|---|
| `fail_review_author_ops`: a `[grok]` review commit authored `deus-ops` | REFUSED `REVIEW_AUTHOR` |
| `fail_review_author_pm`: the same review authored `deus-pm` | REFUSED `REVIEW_AUTHOR` |
| `pass_review_author_matches`: authored `deus-grok` | `GATE: PASS` |
| `fail_writer_author_mismatch`: a `[codex]` code commit authored `deus-ops` | REFUSED `WRITER_AUTHOR` |
| `pass_gemini_manifest_by_ops`: a `[gemini]` commit authored `deus-ops` changing only `lane.json` | PASS (manifest trust unchanged) |
| `fail_gemini_code_by_ops`: a `[gemini]` commit authored `deus-ops` changing code | REFUSED `WRITER_AUTHOR` |
| `fail_pm_manifest_by_ops`: a `[pm]` `lane.json` commit authored `deus-ops` | REFUSED `MANIFEST_AUTHOR` |
| `pass_pm_manifest_by_pm`: the same commit authored `deus-pm` | PASS |
| `fail_ops_commit_outside_task`: an `[ops]` commit changing a code path | REFUSED `OPS_COMMIT_SCOPE` |
| `pass_ops_launch_record`: an `[ops]` commit under `tasks/<id>/<lane>/launches/` | PASS |
| `pass_main_sync_merge_exempt`: a sync merge from main authored `deus-ops` | PASS |
| `pass_grandfathered_tip`: a `[codex]` commit authored `deus-ops` reachable from a listed tip | PASS |
| `fail_after_grandfathered_tip`: the same kind of commit after the listed tip | REFUSED `WRITER_AUTHOR` |
| `fail_grandfather_list_on_lane`: the lane edits `author_rules.json` to exempt itself | REFUSED (outside scope, or not read from the lane) |

**Mutants.** Add one per new rule to `MUTANTS` (`review_author_off`, `writer_author_off`, `manifest_author_off`, `ops_scope_off`, `grandfather_by_date`). Each must be caught by a case. The harness already requires that every mutant is caught (`test_merge_gate.js:14`).

**Gate commands** (lane.json gateTests; each runs in a fresh clone, 900 s timeout):
- `node tools/governance/test_merge_gate.js`

## Docs

`tools/governance/MERGE_GATE.md`: the identity table, the four reason codes in the reason-code table, the exemptions, and how the PM updates `author_rules.json`.

## Out of scope

- Launch records as evidence. Whether a launch record exists for the review is checked by the PM. A later lane may read `docs/telemetry/sessions/active_workers.json`, which is not on the lane branch.
- Changing `launch_worker.ps1`.
- The PM's and AG's local git configuration.
- Changing who may run merge_gate. That is a DEC-048 amendment the PM records when this lane merges (DEC-082).

## Writer and reviewer

- Writer `codex` (family codex), reviewer `grok` (family grok). The Owner asked for a review by an independent family.
- Both are launched through `tools/ops/launch_worker.ps1`. Writer commits are tagged `[codex]`; the review commit touches only `tasks/OPS.GATE.AUTHOR/lane-gg/review_grok_<sha8>.md` and has one VERDICT line.
- OpenAI stays at gpt-6-sol (DEC-077).

## Rules that bind this lane

- Tests must be able to fail; no hardcoded PASS (Rule 4). Two failed fixes on the same problem: stop and escalate (Rule 10).
- Commit only on `task/lane-gg`, staging only this lane's paths (`git add <paths>`, never `-A`). The PM merges through merge_gate (`--no-ff`).
- Report in the AGENTS.md report format. Write "not checked" for anything not observed.

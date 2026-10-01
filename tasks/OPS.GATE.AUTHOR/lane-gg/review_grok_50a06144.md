# OPS.GATE.AUTHOR independent review — lane-gg

## Metadata

| Field | Value |
|---|---|
| Reviewer | Grok (`deus-grok`) |
| Reviewed commit | `50a06144b0763b9dba114d511def832343a5ba08` |
| Subject | `[codex] OPS.GATE.AUTHOR record writer evidence` |
| Author | `deus-codex` |
| Implementation | `7a0c7f3fcf163686585e1a0295e4ee69228627a8` (`deus-codex`) |
| Branch | `task/lane-gg` |
| Brief | `tasks/OPS.GATE.AUTHOR/lane-gg/BRIEF.md` |
| Node | v24.19.0 |
| Base used for the range | `origin/main` (`git merge-base` `9be75b930b177c183225e028d85c3139161aa6fd`) |

The uncommitted worktree file at review time was only `tasks/OPS.GATE.AUTHOR/lane-gg/launches/20261001_160002_prompt.txt` (this launch prompt). It was left untracked. The review below is of the committed range `origin/main..50a06144`.

## What the range does

Four commits, all inside the lane's allowed paths:

| Commit | Author | Paths |
|---|---|---|
| `a3fd229f` `[pm]` | `deus-pm` | `BRIEF.md`, `lane.json` |
| `446abbf2` `[ops]` | `deus-ops` | `launches/20261001_153034_prompt.txt` |
| `7a0c7f3f` `[codex]` | `deus-codex` | `merge_gate.js`, `test_merge_gate.js`, `MERGE_GATE.md`, `author_rules.json` |
| `50a06144` `[codex]` | `deus-codex` | `REPORT.md` |

`tools/governance/author_rules.json` is `{"version": 1, "grandfatheredTips": {}}`.

`merge_gate.js` now refuses a lane commit whose author name does not match the identity its subject tag requires:

- `REVIEW_AUTHOR` — a single-parent commit that only adds or modifies `tasks/<taskId>/<lane>/review_*.md` must be authored `deus-<family of its tag>`. That check runs before any exemption (`checkCommitAuthors`, the `continue` at the review branch).
- `WRITER_AUTHOR` — any other agent-family tag must be authored `deus-<family>`. A single-parent `[gemini]` or `[antigravity]` commit authored `deus-ops` is allowed only when it touches that lane's `lane.json` and every other path is that lane's `BRIEF.md`.
- `MANIFEST_AUTHOR` — a new `[pm]` edit of `lane.json` must be `deus-pm`. A new `[gemini]` / `[antigravity]` edit must be `deus-ops` or `deus-gemini`. Commits already contained in `origin/main` are not re-checked.
- `OPS_COMMIT_SCOPE` — an `[ops]` commit must be authored `deus-ops`, and every path it changes must sit under `tasks/<taskId>/<lane>/`.

Exemptions from the writer, manifest-author, and ops checks, and not from review authors:

- A merge whose second parent is an ancestor of `origin/main` (`git merge-base --is-ancestor`).
- A commit that is an ancestor of a tip listed in `tools/governance/author_rules.json` as read from `refs/remotes/origin/main` after fetch. The lane's own copy is not read. `isGrandfathered` uses ancestry. The `grandfather_by_date` switch replaces that with author-date order only when the self-test mutant is on.

`git diff --check origin/main...HEAD` exited 0. `node --check` on `merge_gate.js` and `test_merge_gate.js` exited 0.

## Brief cases

| Brief case | Where it is locked |
|---|---|
| `fail_review_author_ops`, `fail_review_author_pm`, `pass_review_author_matches` | present; an earlier bad review is also refused (`fail_earlier_review_author_ops`) |
| `fail_writer_author_mismatch` | present |
| `pass_gemini_manifest_by_ops`, `fail_gemini_code_by_ops` | present; brief-only `[gemini]` by `deus-ops` is also refused |
| `fail_pm_manifest_by_ops`, `pass_pm_manifest_by_pm` | present |
| `fail_ops_commit_outside_task`, `pass_ops_launch_record` | present; wrong `[ops]` author is also refused |
| `pass_main_sync_merge_exempt` | a `[codex]` merge authored `deus-ops` whose second parent is `main` |
| `pass_grandfathered_tip`, `fail_after_grandfathered_tip` | the later commit is dated `2000-01-01` and is still refused |
| `fail_grandfather_list_on_lane` | the forged list is committed on the lane; `origin/main` still has the empty map |

The five new mutants are in `MUTANTS` and in `KILLS`: `review_author_off`, `writer_author_off`, `manifest_author_off`, `ops_scope_off`, `grandfather_by_date`.

## Tests run here

Command, from this worktree: `node tools/governance/test_merge_gate.js`

```text
RESULT: 129 passed, 0 failed
```

Exit of that process was success (the log's result line, 129 `PASS` lines, 0 `FAIL` lines). The author kills and the three source kills were in that run:

```text
PASS mutant_review_author_off_killed
PASS mutant_writer_author_off_killed
PASS mutant_manifest_author_off_killed
PASS mutant_ops_scope_off_killed
PASS mutant_grandfather_by_date_killed
PASS source_mutant_dry_run_merges_killed
PASS source_mutant_fast_forward_merge_killed
PASS source_mutant_push_after_merge_killed
```

## Notes that do not change the result

The `(b2) authors` row is not added to the skip list used when the branch is missing, `main` is missing, there is no merge-base, there is nothing to merge, or the manifest is not trusted (`run`, the `later` array and the manifest-not-trusted skip). `Report.state` then prints `PASS` for a check that did not run. A run that reached a trusted manifest does call `checkCommitAuthors` before a merge, and a bad manifest author is still refused as `MANIFEST_AUTHOR`. This matches the summary gap the doc already records for a failed `ls-remote`: the gate still refuses.

Two properties are in the source and not named as their own cases. A review-shaped commit returns before `isGrandfathered`, so a listed tip does not excuse its author. `manifestOnly` requires every changed path to be that lane's `lane.json` or `BRIEF.md`, so `lane.json` plus another path is refused.

Reviewed commit: 50a06144b0763b9dba114d511def832343a5ba08

VERDICT: CLEAN PASS

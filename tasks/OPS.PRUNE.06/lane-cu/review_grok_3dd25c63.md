# Independent closure re-review: OPS.PRUNE.06 / lane-cu

## Metadata

| Field | Value |
|---|---|
| Writer | Codex |
| Reviewer | Grok |
| Reviewer family | xAI (Grok) |
| Lane | lane-cu |
| Task | OPS.PRUNE.06 (L6 docs archival and renaming) |
| Directive | Remediation of `review_grok_5478e116.md` (MSG-PRUNE-PM-069 / ANSWER-CU) |
| Branch | `task/lane-cu` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cu` |
| Reviewed writer commit | `3dd25c63ed648a9ca727902f7df4dfc891f91476` |
| Parent | `0909c7d1c23ad36cb774c369c7de8d49a45c51ea` (`[grok] review of 5478e116: VERDICT: FAIL`) |
| Baseline used by the harness | `9271173f2b6a11bf624edfac54df28fe7471357b` |
| Local `origin/main` at review | `18dfd92df7abcf8eb293e10a9a2b4e26def952a6` |
| Node | v24.19.0 |
| `core.autocrlf` | false (`file:C:/Users/snewt/OneDrive/Desktop/UF/.git/config`) |
| Executed | 2026-10-01, in this worktree, against the writer commit |

`3dd25c63ed648a9ca727902f7df4dfc891f91476` is a one-parent commit. It changes one path, 37 insertions and 6 deletions: `tools/test_l6_docs_preservation.js`. No path under `game/`, `art/`, or `data/` is in the commit. Untracked launch prompts under `tasks/OPS.PRUNE.06/lane-cu/launches/` were present and are not part of this review commit.

The prior review failed because `DEUS_History.md:192-201` and the same-line shorthand citations `:31-44`, `:106`, and `:207` were still accepted, and because a range citation was semantically checked only at its start line. This commit registers the two missing stale keys, extracts same-line shorthand, and applies the semantic pattern to the inclusive line slice.

## Finding 1 — `DEUS_History.md:192-201`

`CORRECTED_CITATIONS` now contains:

```text
{ target: "DEUS_History.md", stale: "192-201", valid: "196-203", pattern: /Seed|Repeat|Simulation/i, desc: "demographic trajectories deterministic table" }
```

`STALE_LOCATORS` therefore rejects `DEUS_History.md:192-201` with the corrected target `196-203`. The existing `194-201 -> 196-203` row remains. Both rows share one semantic key, `DEUS_History.md:196-203`, and the same pattern and description, so the Map write does not change the check.

Current `docs/systems/DEUS_History.md` places the demographic table on lines 196–203. Line 196 is `| Seed | Repeat | Simulation, s | ...`. Line 203 is the last data row (`20260919` repeat 2, simulation `9.9830550` s). Line 192 is the heading `### Timing and demographic gates`. Line 194 is the `api.step` timing paragraph. `192-201` is the pre-shift window, and the registered key rejects it.

ADR-003 cites the corrected range at lines 1385 and 1404 (`docs/systems/DEUS_History.md:196-203`). Named mutant `stale_history_192` rewrites the first of those to `DEUS_History.md:192-201`. Direct invocation:

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:192-201 (stale line locator: DEUS_History.md:192-201 was corrected to 196-203 (demographic trajectories deterministic table))
RESULT: 15757 passed, 1 failed (mutant stale_history_192)
exit 1
```

## Finding 2 — shorthand `:31-44`, `:106`, `:207`

After the code-fence strip, each source line is scanned for a backticked `:N` or `:N-M`. The token is bound to the nearest preceding filename on that line when that filename ends in `.md`. The harness then checks `fullPath:spec` through `resolveLink`.

ADR-003 carries the three shorthand forms on the same line as a History path:

| Line | Citation | Bound target |
|---|---|---|
| 1376 | `` `docs/systems/DEUS_History.md:95`, `:108` `` | `DEUS_History.md:108` |
| 1386 and 1407 | `` `docs/systems/DEUS_History.md:29`, `:33-46` `` | `DEUS_History.md:33-46` |
| 1404 | `` `docs/systems/DEUS_History.md:196-203`, `:209` `` | `DEUS_History.md:209` |

`CORRECTED_CITATIONS` now contains `31-44 -> 33-46` (integration matrix). `106 -> 108` and `207 -> 209` were already registered; the shorthand extractor is what makes those keys see `` `:106` `` and `` `:207` ``.

On the current History file, line 33 is the matrix header `| Seed | Age | Living | ... | Worker ms |` and line 46 is the last matrix row (seed `20260919`, age 500, worker `13465.403` ms). Line 31 is the headless-suite paragraph, so `31-44` stops two rows early and starts above the table. Line 108 is item 5, `Physical grave ownership gate` (grave, burial, ruin). Line 106 is item 3, `Snapshot versus live truth`. Line 209 begins `Both repeats have exact matching state`. Line 207 is the checkpoints heading.

The clean scan checks 219 relevant destinations. The prior clean scan at `5478e116` checked 218. The added destination is `DEUS_History.md:33-46`. The shorthand forms `:108` and `:209` dedupe with the full-path citations of those same lines.

Named mutants, each a single `String.replace` of the first matching token in ADR-003:

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:31-44 (stale line locator: DEUS_History.md:31-44 was corrected to 33-46 (integration matrix timing table))
RESULT: 15757 passed, 1 failed (mutant stale_shorthand_3144)
exit 1
```

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:106 (stale line locator: DEUS_History.md:106 was corrected to 108 (physical grave ownership gate))
RESULT: 15757 passed, 1 failed (mutant stale_shorthand_108)
exit 1
```

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:207 (stale line locator: DEUS_History.md:207 was corrected to 209 (repeat output checksums match))
RESULT: 15757 passed, 1 failed (mutant stale_shorthand_209)
exit 1
```

Each mutant run checks 220 destinations: the rewritten locator is a new URL, and the untouched copy of the corrected citation remains.

## Finding 3 — range semantics

`resolveLink` now keeps `endLine`. A single line number sets `endLine` equal to `line`. A range sets `endLine` from the second number. For every citation with a line, the harness requires `endLine >= line` and `endLine <= targetLines.length`, and it tests the registered pattern against:

```text
targetLines.slice(link.line - 1, link.endLine || link.line).join("\n")
```

`slice` end is exclusive, so `196-203` is indexes 195 through 202: lines 196 through 203 inclusive, header and six data rows. `33-46` is the matrix header through the last data row. The lookup prefers the exact `file:rawLine` semantic key, so `DEUS_History.md:196-203` and `DEUS_History.md:33-46` use the range entry. The pattern is applied to that whole slice. `/Seed|Repeat|Simulation/i` matches the line 196 header inside the slice. `/Seed\s*\|\s*Age\s*\|\s*Living|Worker ms/i` matches the line 33 header inside `33-46`.

## Mutants

The default run killed 24 of 24 mutants. Each child exited 1 and its output contained the expected diagnostic:

`missing_live`, `missing_archive`, `archive_content`, `missing_households`, `protected_content`, `missing_l4`, `corrupt_path`, `stale_path`, `external_link`, `reference_link`, `corrupt_anchor`, `lost_live_text`, `lost_colonists_reflex`, `missing_inventory_row`, `engine_rules_typo`, `unscanned_inventory_file`, `stale_history_1161`, `stale_history_192`, `stale_shorthand_3144`, `stale_shorthand_108`, `stale_shorthand_209`, `stale_history_locator`, `stale_ecology_locator`, `stale_floors_locator`.

## Quality gates run in this worktree

| Command | Result |
|---|---|
| `node tools/check_deus_syntax.js` | Exit 0. `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | Exit 0. `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | Exit 0. `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | Exit 0. `RESULT: 279 passed, 0 failed` |
| `node tools/test_l6_docs_preservation.js` | Exit 0. `RESULT: 15777 passed, 0 failed`. 24/24 mutants exited 1 with the expected diagnostic |

The preservation run reported 33 live, 15 archived, 9 protected docs plus the Households plugin, 2 Colonists source snapshots, 79 retargeted scope files, 309 mutable Markdown documents scanned, and 219 relevant destinations checked. The 15,777 passed count is the clean scan (15,753 checks) plus one check per mutant (24).

## Line endings

`git config --show-origin --get core.autocrlf` is `false`. The blob `3dd25c63:tools/test_l6_docs_preservation.js` contains 20,161 bytes, 0 CR bytes, and 288 LF bytes. `git show --check 3dd25c63` and `git diff --check 0909c7d1 3dd25c63` reported no whitespace errors. A worktree `git diff --check` exited 0. Tracked files have no uncommitted edits.

Runtime source was not edited. This review did not re-run RMMZ, and the lane claims no playable result.

VERDICT: CLEAN PASS

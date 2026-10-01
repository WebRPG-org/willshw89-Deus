# Independent closure re-review: OPS.PRUNE.06 / lane-cu

## Metadata

| Field | Value |
|---|---|
| Writer | Codex |
| Reviewer | Grok |
| Reviewer family | xAI (Grok) |
| Lane | lane-cu |
| Task | OPS.PRUNE.06 (L6 docs archival and renaming) |
| Branch | `task/lane-cu` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cu` |
| Reviewed writer commit | `a777a191ea0bfe3bdc5b2274270662ffac2093e0` |
| Parent | `66abee3eea14972557ffda47fbee7935d7073b96` (PM ANSWER-CU fix 3) |
| Prior review | `190392c5` of writer tip `9a6d239cbb602d694397cfce7ef015b1b5ae08dc` |
| `origin/main` at review | `f2f57eaf4785e649e6dee4ab3f75e4123f4d4b9c` |
| Node | v24.19.0 |
| `core.autocrlf` | false |
| Executed | 2026-10-01, in this worktree, against the writer commit |

`a777a191ea0bfe3bdc5b2274270662ffac2093e0` is a one-parent commit. It changes seven paths, 110 insertions and 43 deletions:

- `tools/test_l6_docs_preservation.js`
- `docs/adr/ADR-003_sim_render_split_and_lod.md`
- `docs/audits/LIVING_WORLD_GAP_AUDIT.md`
- `docs/design/ECOLOGY.md`
- `docs/design/SELECTION.md`
- `docs/STATUS.md`
- `tools/ops/active_lanes.json`

No path under `game/`, `art/`, or `data/` is in the commit. Protected documents and `UF_Households.js` are untouched. Untracked launch prompts under `tasks/OPS.PRUNE.06/lane-cu/launches/` were present and are not part of this review commit.

## FIX 1 — code-spanned and plain reference validation

`tools/test_l6_docs_preservation.js` still extracts Markdown inline links and reference-link definitions. It also extracts documentation-system paths from inline code spans and plain text: optional `../`, `docs/`, and `archive/`, then `systems/<file>.md`, with an optional `:line` or `:line-line` and an optional heading anchor. Fenced code blocks are removed before that scan. Exact legacy move paths are still rejected anywhere in the file, including inside fences.

`tasks/OPS.PRUNE.06/lane-cu/retargeted_files.json` has 79 entries. All 79 are Markdown, all exist in the worktree, and none fall under the scanner's skip prefixes (`docs/archive/`, `archive/`, `tasks/`) or the protected-file skip. The harness loads that inventory and the run reports `79 retargeted scope files`. The scan walks every tracked and untracked Markdown file outside those skips (307 documents). Each related destination must exist. A heading anchor must match a heading in the target. A numeric locator must fall inside the target.

The suite reported `218 relevant destinations checked`, up from 76 at the previous review, which only walked Markdown links.

The only `DEUS_World.md` reference in `docs/ENGINE_RULES.md` is the inline span on line 46: `` `docs/systems/DEUS_World.md` ``. Mutant `engine_rules_typo` rewrites that span to `DEUS_Wor1d.md` in the reader's memory and does not touch disk. Direct invocation:

```text
FAIL broken-reference diagnostic: broken Markdown link: docs/ENGINE_RULES.md -> docs/systems/DEUS_Wor1d.md
RESULT: 15465 passed, 1 failed (mutant engine_rules_typo)
exit 1
```

## FIX 2 — numeric locators

The naming banner inserts two lines after the title of `DEUS_History.md`, `DEUS_Ecology.md`, and `DEUS_Floors.md`. `DEUS_World.md` inserts those two lines plus the DEC-030 extent line, so its body shifts by three. Each external citation below was compared with baseline `9271173f2b6a11bf624edfac54df28fe7471357b` and with the current file.

| Citation | Current text | Baseline |
|---|---|---|
| `DEUS_History.md:108` | Physical grave ownership gate. No automatic grave, crypt, or ruin placement is authorized. | line 106, same sentence |
| `DEUS_History.md:1163` | `currentYear()` counts game-clock years; a year takes over 100 real hours at ×1. | line 1161, same sentence |
| `DEUS_History.md:104` | Historical subject identity through `data.historicalPersonId`. | line 102, same sentence |
| `DEUS_History.md:95` | A `graveyard` record is not evidence of a physical grave. | line 93, same sentence |
| `DEUS_History.md:196-203` | Timing table. Simulation 8.9013169–10.6002966 s; worst annual step 65.8954–91.4553 ms. | the same six data rows were 196–201; the table now occupies 196–203 |
| `DEUS_History.md:209` | Both repeats have exact matching state/event bytes. | line 207, same sentence |
| `DEUS_History.md:29` | Worker timings include generation and materialization. | line 27, same paragraph |
| `DEUS_History.md:33-46` | Integration matrix. Age 0 workers 2758–3064 ms; age 500 workers 10294–13465 ms. | lines 31–44, same table |
| `DEUS_Ecology.md:10` | Buckets, census, and the director. | line 8, same paragraph. Current line 8 is blank |
| `DEUS_Floors.md:50` | `` `kindAt(area,x,y)` ``, DEUS_Tiles ground kind at a cell. | line 48, same row. Baseline line 44 is the blank line under the Floors heading |
| `DEUS_World.md:181` | Suites that fail the same way with and without the change include stance `selection_square`. The only `selection_square` line in the file. | line 178, same sentence. Baseline line 151 is the `no_wall_steps` row |

`ADR-003` also uses same-sentence shorthand `:108`, `:209`, and `:33-46`. Those land on the rows in the table above. `SELECTION.md` cites `DEUS_World.md:181` at lines 57 and 577. `ECOLOGY.md` cites `DEUS_Floors.md:50` for `UF.Floors.kindAt`. `LIVING_WORLD_GAP_AUDIT.md` cites `DEUS_Ecology.md:10` as the bucket and census director.

The harness rejects the pre-shift keys `DEUS_History.md:106`, `DEUS_Ecology.md:8`, `DEUS_Floors.md:44`, and `DEUS_World.md:151` with `stale line locator:`. The four corrected keys must match `grave|ruin|burial`, `bucket|census|director`, `kindAt`, and `selection_square` on that line. Direct mutant invocations:

```text
FAIL stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:106 (shifted to line 108 (physical grave ownership gate))
RESULT: 15469 passed, 1 failed (mutant stale_history_locator)
exit 1
```

```text
FAIL stale line locator: docs/audits/LIVING_WORLD_GAP_AUDIT.md -> docs/systems/DEUS_Ecology.md:8 (shifted to line 10 (census/bucket director; line 8 is blank))
RESULT: 15465 passed, 1 failed (mutant stale_ecology_locator)
exit 1
```

## FIX 4 — STATUS and active_lanes

`docs/STATUS.md` and `tools/ops/active_lanes.json` are the same Git blobs as `origin/main` (`f2f57eaf`):

| Path | Blob |
|---|---|
| `docs/STATUS.md` | `00c64aa389098e1dbf929eb422f7108c4c429600` |
| `tools/ops/active_lanes.json` | `7e6dc165d8c92fea387660a16c691a68ab40b635` |

`git diff origin/main -- docs/STATUS.md tools/ops/active_lanes.json` is empty. The commit replaces the branch's stale board with main's board: DEC-054..059 phase text, lane-cq / lane-cr / lane-cs2 / lane-cw moved to merged or reference, lane-ct / lane-cw2 / lane-cx recorded, and the lane-cu row left as main already states it. Carriage-return bytes in the seven committed paths, plus the four cited system docs and `docs/ENGINE_RULES.md`, are 0. `git diff --check` from the parent flags two Markdown hard-break spaces and a trailing blank line in `docs/STATUS.md`; those bytes are main's blob, not a second edit.

## Quality gates run in this worktree

| Command | Result |
|---|---|
| `node tools/check_deus_syntax.js` | Exit 0. `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | Exit 0. `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | Exit 0. `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | Exit 0. `RESULT: 279 passed, 0 failed` |
| `node tools/test_l6_docs_preservation.js` | Exit 0. `RESULT: 15483 passed, 0 failed`. 17/17 mutants exited 1 with the expected diagnostic, including `engine_rules_typo`, `stale_history_locator`, and `stale_ecology_locator` |

The preservation run reported 33 live, 15 archived, 9 protected docs plus the Households plugin, 2 Colonists source snapshots, 79 retargeted scope files, 307 mutable Markdown documents scanned, and 218 relevant destinations checked.

Runtime source was not edited. This review did not re-run RMMZ, and the lane claims no playable result.

VERDICT: CLEAN PASS

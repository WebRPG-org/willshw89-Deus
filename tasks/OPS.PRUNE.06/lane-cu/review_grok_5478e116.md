# Independent closure re-review: OPS.PRUNE.06 / lane-cu

## Metadata

| Field | Value |
|---|---|
| Writer | Codex |
| Reviewer | Grok |
| Reviewer family | xAI (Grok) |
| Lane | lane-cu |
| Task | OPS.PRUNE.06 (L6 docs archival and renaming) |
| Directive | MSG-PRUNE-PM-069 and ANSWER-CU |
| Branch | `task/lane-cu` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cu` |
| Reviewed writer commit | `5478e116e2a34fe13a13ccdac2a2d6226d40467e` |
| Parent | `1eed26849cd9b82539d867ae00999137f5897a5e` |
| Baseline used by the harness | `9271173f2b6a11bf624edfac54df28fe7471357b` |
| `origin/main` at review | `da6c437000ca0b69f446131d92bf0b5e3eba1ed9` |
| Node | v24.19.0 |
| `core.autocrlf` | false (`C:/Users/snewt/OneDrive/Desktop/UF/.git/config`) |
| Executed | 2026-10-01, in this worktree, against the writer commit |

`5478e116e2a34fe13a13ccdac2a2d6226d40467e` is a one-parent commit. It changes one path, 49 insertions and 24 deletions: `tools/test_l6_docs_preservation.js`. No path under `game/`, `art/`, or `data/` is in the commit.

## GAP A — inventory coverage

`tasks/OPS.PRUNE.06/lane-cu/retargeted_files.json` has 79 paths. All 79 end in `.md`, all 79 are in `git ls-files --cached --others --exclude-standard`, and none match the scanner skip (`docs/archive/`, `archive/`, `tasks/`) or the protected-file list. `docs/ENGINE_RULES.md` is one of the 79.

`validate()` builds `scannedFiles` from the Markdown walk and, after that walk, requires every retargeted path to exist and to be a member of `scannedFiles`. A missing membership fails with `unvalidated inventoried file:`. Mutant `unscanned_inventory_file` leaves `docs/ENGINE_RULES.md` unchanged on disk and skips it before `scannedFiles.add`. Direct invocation:

```text
FAIL unvalidated inventoried file: docs/ENGINE_RULES.md
RESULT: 15673 passed, 1 failed (mutant unscanned_inventory_file)
exit 1
```

The default suite reports `79 retargeted scope files (100% coverage enforced)` and kills this mutant. GAP A matches the required coverage check.

## GAP B — stale locators and semantic lines

`CORRECTED_CITATIONS` has these ten rows, and the clean run applied a semantic check to each valid start line once (`SEMANTIC_HITS` from a `--check-only` instrumentation of this same file):

| Stale | Valid | Semantic hits | Pattern on the current line |
|---|---|---|---|
| `DEUS_History.md:1161` | `:1163` | 1 | line 1163 matches `currentYear` / `100 real hours` |
| `DEUS_History.md:102` | `:104` | 1 | line 104 is `Historical subject identity` |
| `DEUS_History.md:106` | `:108` | 1 | line 108 is the physical grave ownership gate |
| `DEUS_History.md:93` | `:95` | 1 | line 95 says a `graveyard` record is not evidence of a physical grave |
| `DEUS_History.md:194-201` | `:196-203` | 1 (line 196) | line 196 is the `Seed \| Repeat \| Simulation` header |
| `DEUS_History.md:207` | `:209` | 1 | line 209 begins `Both repeats have exact matching state` |
| `DEUS_History.md:27` | `:29` | 1 | line 29 begins `Final integration artifact` |
| `DEUS_Ecology.md:8` | `:10` | 1 | line 10 names buckets, census, and the director; line 8 is blank |
| `DEUS_Floors.md:44` | `:50` | 1 | line 50 is `` `kindAt(area,x,y)` `` |
| `DEUS_World.md:151` | `:181` | 1 | line 181 names stance `selection_square` |

Named mutants, invoked directly against `tools/test_l6_docs_preservation.js`:

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:1161 (stale line locator: DEUS_History.md:1161 was corrected to 1163 (year takes over 100 real hours))
RESULT: 15729 passed, 1 failed (mutant stale_history_1161)
exit 1
```

```text
FAIL stale-reference diagnostic: stale line locator: docs/adr/ADR-003_sim_render_split_and_lod.md -> docs/systems/DEUS_History.md:106 (stale line locator: DEUS_History.md:106 was corrected to 108 (physical grave ownership gate))
RESULT: 15729 passed, 1 failed (mutant stale_history_locator)
exit 1
```

```text
FAIL stale-reference diagnostic: stale line locator: docs/audits/LIVING_WORLD_GAP_AUDIT.md -> docs/systems/DEUS_Ecology.md:8 (stale line locator: DEUS_Ecology.md:8 was corrected to 10 (census and bucket director))
RESULT: 15725 passed, 1 failed (mutant stale_ecology_locator)
exit 1
```

```text
FAIL stale-reference diagnostic: stale line locator: docs/design/ECOLOGY.md -> docs/systems/DEUS_Floors.md:44 (stale line locator: DEUS_Floors.md:44 was corrected to 50 (kindAt definition))
RESULT: 15725 passed, 1 failed (mutant stale_floors_locator)
exit 1
```

A temporary mutant that rewrote both `DEUS_History.md:196-203` citations to `DEUS_History.md:194-201` also exited 1 with `stale-reference diagnostic:` for `194-201`. The registered range entry is live.

The lane diff against `9271173f` corrects more History locators than that table rejects.

`docs/adr/ADR-003_sim_render_split_and_lod.md` rewrote `docs/systems/UF_History.md:192-201` to `docs/systems/DEUS_History.md:196-203` (the demographic-timing citation). Baseline line 192 is the `api.step` timing paragraph and baseline line 201 is the last timing-table data row. After the two-line naming banner those sentences occupy lines 194 and 203. The other timing citation, baseline `194-201` (header through the last data row), now correctly occupies `196-203`, and that predecessor is the only `196-203` stale key. `DEUS_History.md:192-201` is absent from `STALE_LOCATORS`. Rewriting both current `196-203` citations to `192-201` in memory exited 0:

```text
RESULT: 15725 passed, 0 failed (mutant probe_range_192)
exit 0
```

The same ADR rewrote the integration-matrix shorthand `:31-44` to `:33-46` in both places it appears (`DEUS_History.md:29`, `:33-46`, and the later repeat). Baseline line 31 is the matrix header and baseline line 44 is the last matrix row; those rows are now lines 33 and 46. `CORRECTED_CITATIONS` records `27->29` and has no `31-44` row. `resolveLink` only sees a line number on a `systems/<file>.md` token, so a bare `` `:33-46` `` is never bound to `DEUS_History.md`. Restoring both shorthand tokens to `:31-44` exited 0:

```text
RESULT: 15726 passed, 0 failed (mutant probe_shorthand_3144)
exit 0
```

The same bare-token limit leaves two other corrected shorthand citations unenforced. ADR changed `` `:106` `` to `` `:108` `` and `` `:207` `` to `` `:209` ``. Those line pairs are in the table, and the full-path forms are rejected, but restoring only the backticked shorthand exited 0 (`probe_shorthand_108`, `probe_shorthand_209`).

Range semantics use `parseInt(valid.split("-")[0])`. For `196-203` the harness checks line 196, the header, and does not check data rows 198–203.

GAP B therefore enforces the ten listed keys and still accepts corrected locators `DEUS_History.md:192-201` and `:31-44`.

## Mutants

The default run killed 20 of 20 mutants, each exiting 1 with its expected diagnostic: `missing_live`, `missing_archive`, `archive_content`, `missing_households`, `protected_content`, `missing_l4`, `corrupt_path`, `stale_path`, `external_link`, `reference_link`, `corrupt_anchor`, `lost_live_text`, `lost_colonists_reflex`, `missing_inventory_row`, `engine_rules_typo`, `unscanned_inventory_file`, `stale_history_1161`, `stale_history_locator`, `stale_ecology_locator`, `stale_floors_locator`.

## Quality gates run in this worktree

| Command | Result |
|---|---|
| `node tools/check_deus_syntax.js` | Exit 0. `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | Exit 0. `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | Exit 0. `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | Exit 0. `RESULT: 279 passed, 0 failed` |
| `node tools/test_l6_docs_preservation.js` | Exit 0. `RESULT: 15746 passed, 0 failed`. 20/20 mutants exited 1 with the expected diagnostic |

The preservation run reported 33 live, 15 archived, 9 protected docs plus the Households plugin, 2 Colonists source snapshots, 79 retargeted scope files, 309 mutable Markdown documents scanned, and 218 relevant destinations checked.

These commands ran while the worktree also contained an uncommitted four-line conflict-marker insertion in `docs/VISION.md` (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/main` around the already-resolved OPS.PRUNE.06 / DEC-060 block). That edit is outside `5478e116`. The preservation counts above still completed with 0 failed.

## Line endings

`git config --show-origin --get core.autocrlf` is `false`. The blob `5478e116:tools/test_l6_docs_preservation.js` contains 0 CR bytes and 257 LF bytes. `git diff --check 1eed26849cd9b82539d867ae00999137f5897a5e 5478e116e2a34fe13a13ccdac2a2d6226d40467e` and `git show --check 5478e116` both exited 0 with no whitespace output. A worktree `git diff --check` reports the three uncommitted `docs/VISION.md` conflict markers described above. Those markers are not in the reviewed commit.

Runtime source was not edited. This review did not re-run RMMZ, and the lane claims no playable result.

VERDICT: FAIL

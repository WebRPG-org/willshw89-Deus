# Independent adversarial review: OPS.PRUNE.01 / lane-cq

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Reviewed commit | `45376e85521a9937be29bb4ba00b7897087b34ea` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `e961b6d634345e6240857842c40ca75a8797a433` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `6d70b0ff0f8e9c42df5accbf56763c84eec8af54` |
| Node | v24.19.0 |
| Executed | 2026-09-30 13:06 CT, in this worktree (not a fresh clone) |

`e961b6d6` is the ops launch-prompt commit and its only parent is the reviewed commit. `git diff --name-status 45376e85521a9937be29bb4ba00b7897087b34ea HEAD` at execution was only `A tasks/OPS.PRUNE.01/lane-cq/launches/20260930_125717_prompt.txt`. The six files judged below are the reviewed commit's content.

## Commit & Diff Verification

`git cat-file -t 45376e85521a9937be29bb4ba00b7897087b34ea` is `commit`.

```text
HASH:    45376e85521a9937be29bb4ba00b7897087b34ea
SUBJECT: [gemini] OPS.PRUNE.01: add lane manifest and brief for lane-cq
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 12:47:18 -0500
PARENT:  a321189979aac0330ff413671152a1b55afc1e91
```

Commits from the merge-base through the reviewed tip:

| Commit | Subject |
|---|---|
| `3675306ce81eb28f9561a788a10065716d5608c6` | `[gemini] OPS.PRUNE.01: initialize lane-cq manifest and brief for L1 board rebuild` |
| `a321189979aac0330ff413671152a1b55afc1e91` | `[gemini] OPS.PRUNE.01: rebuild control board and add anti-regression gate check` |
| `45376e85521a9937be29bb4ba00b7897087b34ea` | `[gemini] OPS.PRUNE.01: add lane manifest and brief for lane-cq` |

`git diff --stat 5fe51c14933edb31e391dd7d6049489a2ce0a631 45376e85521a9937be29bb4ba00b7897087b34ea`:

```text
 docs/STATUS.md                         | 453 +++++++++++++++------------------
 docs/archive/STATUS_LEDGER_20260930.md | 242 ++++++++++++++++++
 tasks/OPS.PRUNE.01/lane-cq/BRIEF.md    |  22 ++
 tasks/OPS.PRUNE.01/lane-cq/lane.json   |  30 +++
 tools/ops/gate_tests.json              |   3 +-
 tools/test_control_board.js            | 204 +++++++++++++++
 6 files changed, 711 insertions(+), 243 deletions(-)
```

`docs/archive/STATUS_LEDGER_20260930.md` is byte-identical to `docs/STATUS.md` at the merge-base (60,066 characters after newline normalization). The pre-prune narrative was moved, not rewritten.

## Path Boundary Check

`lane.json` `allowedPaths`: `docs/STATUS.md`, `docs/archive/STATUS_LEDGER_20260930.md`, `tools/ops/gate_tests.json`, `tools/test_control_board.js`, `tasks/OPS.PRUNE.01/lane-cq/**`.

| Path | Status | In allowedPaths |
|---|---|---|
| `docs/STATUS.md` | M | yes |
| `docs/archive/STATUS_LEDGER_20260930.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/BRIEF.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/lane.json` | A | yes |
| `tools/ops/gate_tests.json` | M | yes |
| `tools/test_control_board.js` | A | yes |

Zero paths outside that list. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits to art or catalogue trees. Zero edits to civilization or faction source. The name-status list is the whole diff.

`tools/ops/gate_tests.json` only appends `tools/test_control_board.js` after `tools/test_strata_foundation.js`. It is the 10th string in `gate` (indices 1–9 unchanged). `quarantine` is unchanged.

## Code & Control Board Verification

`docs/STATUS.md` is rebuilt as five lists. Headings present:

1. `## 1. Live Systems`
2. `## 2. Frozen Systems (Loaded, Postponed, or Pending Archival)`
3. `## 3. In Review`
4. `## 4. Defect / Unproved`
5. `## 5. Archived Systems`

What holds up under an independent read of the tree:

- `game/js/plugins.js` has 42 plugins, all `status: true`, none disabled. Section 1.A lists those 42 names in that load order. The only extra plugin row in section 1 is `UF_Households`, which `DEUS_Core.js:103` does load.
- Section 5 has 51 archived rows. For every row, the original path is absent and the archive path exists.
- `game/js/plugins/` contains 105 `.js` files. Each basename occurs in `docs/STATUS.md` or is one of the 42 enabled plugins.
- The 41 names in section 2.E all exist. Each is a 16-line `PluginManager.loadScript` shim (header, plugin block, IIFE). `UF_Core.js` is representative. The count is right. The words "single-line" are not.
- Cited branch SHAs that were checked resolve to real commits. `7bbe7f6c` is the merge of `task/lane-cm` on `origin/main` (`Merge task/lane-cm at 69a471f7`), which matches the row "Merged to main (`7bbe7f6c`)".
- `DEUS_Camera.js:624` does call `PluginManager.loadScript("DEUS_Minimap")`. The board cites line 623.
- `DEUS_Combat.js` does load `game/js/sim/rules/rules.js` (path built near line 242).
- `DEUS_Fluid.js:984` is `require("../sim/hydro/index.js")` inside a try/catch. The board calls that require mandatory.

What does not hold up is below, in Findings. The checker at `tools/test_control_board.js` prints a clean result for predicates it does not evaluate.

## Gate Test Execution & Results

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. Exit codes are `$LASTEXITCODE` immediately after each process.

| Command | Exit | Required |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | pass. Output: `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | pass. Output ends `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_control_board.js --mutate=missing_live_plugin` | 0 | must fail. Did not fail. No mutant banner. Same clean summary |
| `node tools/test_control_board.js --mutate=archived_file_exists` | 0 | must fail. Did not fail |
| `node tools/test_control_board.js --mutate=unlisted_plugin_in_dir` | 0 | must fail. Did not fail |
| `node tools/test_control_board.js --mutate=missing_task_branch` | 0 | must fail. Did not fail |
| `node tools/test_control_board.js --mutant=missing_live_plugin` | 1 | documented flag, not the required spelling. Exits 1 |
| `node tools/test_control_board.js --mutant=archived_file_exists` | 1 | documented flag. Exits 1 |
| `node tools/test_control_board.js --mutant=unlisted_plugin_in_dir` | 1 | documented flag. Exits 1 |
| `node tools/test_control_board.js --mutant=missing_task_branch` | 1 | documented flag. Exits 1 |

The four `--mutant=` failures each append one synthetic string and report `TOTAL FAILURES: 1`. They do not change `docs/STATUS.md`, the plugin directory, or the branch list. See Finding 2.

## Findings

### 1. Worktree task branches are dropped, and the check still prints OK

`tools/test_control_board.js` lines 109–112:

```javascript
taskBranches = rawBranches.split("\n")
    .map(b => b.replace(/^\*?\s+/, "").trim())
    .filter(b => b.startsWith("task/"));
```

`git branch` marks the current branch with `*` and every branch checked out in another worktree with `+`. The replacement strips only an optional star. A `+` line survives `trim` as `+ task/lane-cr` and fails `startsWith("task/")`.

Reproduced with the same `execSync("git branch --list task/*")` the tool uses, then that filter, against `docs/STATUS.md` at execution:

| Set | Count |
|---|---|
| Local `task/*` branches | 25 |
| Retained by the checker | 9 (`task/art-temperate-induction`, `task/lane-bb`, `task/lane-bt`, `task/lane-bu`, `task/lane-bv`, `task/lane-bw`, `task/lane-by`, `task/lane-bz`, `task/lane-cq`) |
| Dropped | 16, all of them other-worktree branches |
| Absent from section 3 | `task/lane-cr`, `task/lane-cs` |

Both absent branches are checked out (`C:\Users\snewt\.deus_worktrees\lane-cr` at `409e085c`, `C:\Users\snewt\.deus_worktrees\lane-cs` at `b0b0b784`). Their first commits are `863f7f68` (2026-09-30 12:57:58 -0500) and `26099959` (2026-09-30 13:03:09 -0500), after the reviewed tip (12:47:18). The board's silence on those two names is expected for a 12:47 snapshot. The checker is still wrong: it never inspects a `+` branch, including the 14 dropped branches that section 3 does name. The happy-path run still printed `[OK] All open task/* branches are accounted for in In Review` and exited 0.

A git failure is also a pass. The `catch` at lines 113–115 warns and leaves `taskBranches` empty, and an empty list satisfies the check.

### 2. The four required `--mutate=` runs exit 0. The `--mutant=` failures are injected, not detected

Argument parsing (lines 36–38) accepts only `--mutant=`. Any other argument, including `--mutate=`, is ignored. The process then takes the happy path and exits 0. That is the result recorded above for all four names this review was required to see fail.

The implemented switch does exit 1, by pushing a string onto the failure list after the real predicate:

| Flag value | Injection | Lines |
|---|---|---|
| `missing_live_plugin` | `missingLive.push("TEST_Mutant_Nonexistent_Plugin")` | 90–91 |
| `missing_task_branch` | `missingBranches.push("task/mutant-missing-lane")` | 124–125 |
| `archived_file_exists` | `existingArchived.push("game/js/plugins/DEUS_Core.js")` | 166–167 |
| `unlisted_plugin_in_dir` | `unlistedFiles.push("unauthorized_rogue_script.js")` | 187–188 |

None of these remove a live name from the board, create a file at an archived path, add a `.js` file under `game/js/plugins/`, or create a branch. If the `includes` / `existsSync` / `readdirSync` predicates were replaced with constants that always succeed, these four switches would still exit 1. `docs/INVARIANT_REGISTRY.md` INV-CORE-05 requires a suite to show it can detect a defect. `gate_tests.json` runs only `node tools/test_control_board.js`, so the gate never executes even these injections.

The same `includes` predicate is loose where it does run. `DEUS_World` is a substring of enabled `DEUS_WorldGen`, so a board that dropped the `DEUS_World` row would still satisfy check 1. `lane-b` is a substring of `lane-bb` and the other `lane-b*` rows.

### 3. DEUS_Core companions are not checked, and ten of them are labeled unwired

`DEUS_Core.js` lines 89–104, inside the boot `require` path, load:

`DEUS_Containers`, `DEUS_Bag`, `DEUS_Stockpiles`, `DEUS_Fluid`, `DEUS_Conditions`, `DEUS_Select`, `DEUS_Dnd5e`, `DEUS_Callings`, `DEUS_HistoricalDemographics`, `DEUS_DeathForensics`, `UF_Households`.

Check 2 (lines 99–104) is a substring search for `UF_Households` only. It does not read `companionPlugins`.

Section 1's own introduction says Live covers plugins loaded by `plugins.js` or companions invoked by `DEUS_Core.js`. Section 1.B names `UF_Households` and three sim paths. The other ten companions are under section 2.C, "Unwired Core & Candidate Modules (Pending Triage / Archival)". `DEUS_Fluid` appears in section 1 only inside the `sim/hydro` citation (`required by DEUS_Fluid.js:984`), not as its own live row. Enabled plugins also `loadScript` several of these: `DEUS_Items.js` loads `DEUS_Containers` and `DEUS_Dnd5e`, `DEUS_History.js` loads `DEUS_HistoricalDemographics` and `DEUS_Callings`, `DEUS_ColonyOverseer.js` loads `DEUS_Select`.

The lane brief requires the checker to validate that DEUS_Core companions are listed. The shipped check does not look at that array.

### Notes that do not carry the verdict

- Section 2.E calls the 41 `UF_*.js` forwarders single-line. All 41 exist and all 41 are 16-line shims.
- `sim/ledger` is listed as a live module. No enabled plugin and not `DEUS_Core.js` require `game/js/sim/ledger.js`. Live plugins consult `UF.Matter` only when some other host has attached it.
- `archive/plugins/` has 58 `.js` files. Seven are not in section 5 (`DEUS_Callings.js`, `DEUS_Conditions.js`, `DEUS_Containers.js`, `DEUS_Select.js`, `UF_Households.js`, `UF_Select.js`, `UF_Time.js`) because live copies remain. This commit does not touch `archive/plugins/`. Leaving them out of section 5 matches "original path must be gone".

## Final verdict

The scope, the five-list rebuild, the byte-identical ledger move, the 42-plugin order, the 51 archived paths, and the syntax gate are sound. The anti-regression gate is not. It reports every open `task/*` branch as accounted for while discarding every other-worktree branch, it exits 0 for the four `--mutate=` commands this review had to see fail, and its `--mutant=` failures are appended strings rather than detected defects. It also does not check the `DEUS_Core` companion list the lane brief names.

VERDICT: FAIL

# SOC.31.01 clean-replacement review (Grok) of 8fd9f4bd

Independent review of clean replacement lane-bp2 for SOC.31.01. The correction writer tip is `931e0ae08994a8acf117066430e5fc94069467fd`. This review commit's parent, and therefore the merge-gate target, is `8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262`. That parent only adds the reviewer launch prompt. The treasury schema blob `e4bf3deb067fba2426c47880b28c257bd4584517` and the treasury runtime blob `d4377baf19ce3aab6831645195db4ba5e988b42b` are identical at the writer tip, at that parent, and at corrected source commit `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`.

The prior failure `27a9a7491a7b105cd6bda9c7ff7abff3749b2034` closed in the corrected implementation review `79bf40be6a7b6a89b03688679b8e737ea13a7b3c`. This branch is a clean port of that corrected result onto a manifest whose only history is the trusted `[pm]` opening commit. The evidence-path repair at the writer tip keeps that behavior and points the test and system document at lane-bp2. This file is the only review write.

## Identity

```text
git rev-parse HEAD
8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262

git rev-parse 931e0ae08994a8acf117066430e5fc94069467fd
931e0ae08994a8acf117066430e5fc94069467fd

git merge-base 931e0ae08994a8acf117066430e5fc94069467fd main
368632d629bb65a773ee8c204578d7bf1ab74c61

git log --format="%H %s" 368632d629bb65a773ee8c204578d7bf1ab74c61..931e0ae08994a8acf117066430e5fc94069467fd
931e0ae08994a8acf117066430e5fc94069467fd [codex] SOC.31.01 fix clean evidence paths
0243bf3826485b59e6dbe69514791069c03eab60 [ops] SOC.31.01 lane-bp2 launch prompt 20260927_205317 (writer codex)
0a09758c3e6944e6b56d3e1f059178b828da51f0 [codex] SOC.31.01 clean provenance port
0b216b4dc8c2631ef04a64b23d1f07bd47a33ed1 [ops] SOC.31.01 lane-bp2 launch prompt 20260927_204452 (writer codex)
5a6b4a31c58e0863e62b1ba3b02e65619d11bcee [pm] Open lane-bp2 SOC.31.01 provenance repair
```

`git diff --stat 931e0ae08994a8acf117066430e5fc94069467fd HEAD` is one file: `tasks/SOC.31.01/lane-bp2/launches/20260927_210329_prompt.txt` (5 lines). Commands ran in this worktree at `8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262`. `git rev-parse` for `game/data/society/treasury.schema.json` and `game/js/sim/society/DEUS_Treasury.js` matched the writer-tip and corrected-source blobs above, so the executed sources are the corrected tip.

The writer commit is `931e0ae08994a8acf117066430e5fc94069467fd`, author `deus-codex`, date `2026-09-27T20:58:13-05:00`, subject `[codex] SOC.31.01 fix clean evidence paths`. Its patch touches `docs/systems/DEUS_Treasury.md`, `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md`, `tasks/SOC.31.01/lane-bp2/REPORT.md`, and `tools/society/test_treasury.js`. It does not touch the schema or the runtime module.

## Scope

`git diff --name-status --no-renames 368632d629bb65a773ee8c204578d7bf1ab74c61 931e0ae08994a8acf117066430e5fc94069467fd` (10 files, all additions). Every path matches `tasks/SOC.31.01/lane-bp2/lane.json` `allowedPaths`:

- `game/data/society/treasury.schema.json`
- `game/js/sim/society/DEUS_Treasury.js`
- `docs/systems/DEUS_Treasury.md`
- `tools/society/test_treasury.js`
- `tasks/SOC.31.01/lane-bp2/**`

| Status | Path | Allowed |
|---|---|---|
| A | `docs/systems/DEUS_Treasury.md` | yes |
| A | `game/data/society/treasury.schema.json` | yes |
| A | `game/js/sim/society/DEUS_Treasury.js` | yes |
| A | `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md` | yes |
| A | `tasks/SOC.31.01/lane-bp2/BRIEF.md` | yes |
| A | `tasks/SOC.31.01/lane-bp2/REPORT.md` | yes |
| A | `tasks/SOC.31.01/lane-bp2/lane.json` | yes |
| A | `tasks/SOC.31.01/lane-bp2/launches/20260927_204452_prompt.txt` | yes |
| A | `tasks/SOC.31.01/lane-bp2/launches/20260927_205317_prompt.txt` | yes |
| A | `tools/society/test_treasury.js` | yes |

The branch tip adds `tasks/SOC.31.01/lane-bp2/launches/20260927_210329_prompt.txt`, which is also inside `tasks/SOC.31.01/lane-bp2/**`. No path is a rename or a deletion. No path is `DEUS_Mint.js`, `game/js/plugins.js`, `game/js/plugins/`, or `docs/STATUS.md`. `git grep -n -e DEUS_Treasury -e treasury.schema 931e0ae08994a8acf117066430e5fc94069467fd -- game/js/plugins.js game/js/plugins` exited 1.

`git diff --name-only 368632d629bb65a773ee8c204578d7bf1ab74c61 HEAD -- art game/audio game/img game/effects docs/art docs/audio` printed no paths. A name filter for `.png`, `.ogg`, `.wav`, `.mp3`, `.jpg`, `.flac`, and `.webp` from the merge base through HEAD printed no paths. No art or audio file changed. `git diff --check` from the merge base to the writer tip exited 0. The schema, runtime, test, system document, authority gaps, `BRIEF.md`, and `lane.json` blobs at the writer tip contain 0 CR.

## Manifest provenance

`git log --format="%H %P %s" 931e0ae08994a8acf117066430e5fc94069467fd -- tasks/SOC.31.01/lane-bp2/lane.json tasks/SOC.31.01/lane-bp2/BRIEF.md` lists one commit:

```text
5a6b4a31c58e0863e62b1ba3b02e65619d11bcee 368632d629bb65a773ee8c204578d7bf1ab74c61 [pm] Open lane-bp2 SOC.31.01 provenance repair
```

That commit has one parent. Its subject tag is `[pm]`. It adds only `tasks/SOC.31.01/lane-bp2/BRIEF.md` and `tasks/SOC.31.01/lane-bp2/lane.json`. The blobs at the writer tip equal the blobs in that commit: `lane.json` `e6a317a5c82132f31ef6c3a2288d26d99fe7a1ce`, `BRIEF.md` `d1395da391402a44f6f04a7af546dc2ecee1dfc7`. No later commit changes either file.

## Corrected-source blobs

| Path | `3eddf8f6` blob | Writer-tip blob | Match |
|---|---|---|---|
| `game/data/society/treasury.schema.json` | `e4bf3deb067fba2426c47880b28c257bd4584517` | `e4bf3deb067fba2426c47880b28c257bd4584517` | yes |
| `game/js/sim/society/DEUS_Treasury.js` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | yes |
| source `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` / writer `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md` | `15be6b84b81c06fe923e416d204b9094349538af` | `15be6b84b81c06fe923e416d204b9094349538af` | yes |

`git diff -U3 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b 931e0ae08994a8acf117066430e5fc94069467fd -- docs/systems/DEUS_Treasury.md tools/society/test_treasury.js` is three token substitutions:

```diff
-see `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`.
+see `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md`.

-recorded in `tasks/SOC.31.01/lane-bp/REPORT.md`
+recorded in `tasks/SOC.31.01/lane-bp2/REPORT.md`

-const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp", "AUTHORITY_GAPS.md");
+const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp2", "AUTHORITY_GAPS.md");
```

A scan of those two files found `lane-bp2` at those sites and zero remaining `lane-bp` task-folder tokens. The schema and runtime diffs against `3eddf8f6` are empty. The substitutions are the evidence paths this clean branch has to carry: the authority-gap file lives under `lane-bp2`, and the system document's gate record points at the lane-bp2 report.

## Recorded gates

Both gates were rerun in the foreground from the repository root. The worktree was clean. The executed schema and runtime blobs are the writer-tip blobs.

`node --check game/js/sim/society/DEUS_Treasury.js` exited 0. `node --check tools/society/test_treasury.js` exited 0.

`node tools/society/test_treasury.js` exited 0.

```text
RESULT: 131 passed, 0 failed
```

The log contains 131 `PASS` lines and 0 `FAIL` lines, including `aggregate.category_boundary.*`, `aggregate.category_transition_rejected`, `aggregate.category_rejection_is_atomic`, `aggregate.equation_boundary.*`, `aggregate.equation_transition_rejected`, `aggregate.equation_rejection_is_atomic`, `integer.execute_fraction_reports_E_INTEGER`, `integer.repay_fraction_reports_E_INTEGER`, `integer.bigint_reports_E_INTEGER`, `ordering.persisted_accounts_code_unit`, `ordering.balance_sheet_accounts_code_unit`, and `provocation.hidden_input_mutation.killed - real module call completed with frozen caller input unchanged`. `negative.every_substantive_rule_has_fixture` reports 22 rules covered by 26 fixtures.

`node tools/check_deus_syntax.js` exited 0.

```text
Checked 60 DEUS plugin files. Errors: 0
```

The same two commands passed again inside the merge gate's fresh clones at `8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262`: treasury exit 0 in 0.10 s, syntax exit 0 in 4.90 s.

## Prior failure, remeasured

`validate` calls `aggregateAccounts` before `finish` accepts a transition. Category totals and both equation sides use `Number.isSafeInteger` on each sum. `serialize` and `deserialize` call `assertValid`. `audit` returns `{ ok: false, errors, balanceSheet: null }` when `validate` fails, and calls `balanceSheet` only after that succeeds.

An uncommitted harness outside the worktree required `game/js/sim/society/DEUS_Treasury.js` from this worktree. `Number.MAX_SAFE_INTEGER` is `9007199254740991`. For every accepted state below, `validate` returned ok, `balanceSheet` and `audit` returned a balanced sheet whose category totals and both equation sides were safe integers equal to a BigInt replay, `serialize` returned, `deserialize` validated, and `serialize(deserialize(text))` reproduced the same bytes.

| Accepted state | Measured totals | Equation |
|---|---|---|
| Asset/revenue split `4503599627370495` and `4503599627370496` | ASSET and REVENUE `9007199254740991` | both sides `9007199254740991` |
| Ten revenues of `900719925474099`, then one more unit, on one asset account | ASSET and REVENUE `9007199254740991` | both sides `9007199254740991` |
| Debt `9007199254740991`, then an authorized spend of 1 | ASSET `9007199254740990`, EXPENSE `1`, LIABILITY `9007199254740991`, REVENUE `0`, NET_POSITION `0` | both sides `9007199254740991` |
| That boundary, then another authorized spend of 1 | ASSET `9007199254740989`, EXPENSE `2`, LIABILITY unchanged | both sides `9007199254740991` |
| That boundary, then an authorized repayment of 1 | ASSET `9007199254740988`, EXPENSE `2`, LIABILITY `9007199254740990` | both sides `9007199254740990` |
| Ordinary lifecycle: revenue 1000, approved spend 250, debt 300, repay 300 | ASSET `750`, EXPENSE `250`, LIABILITY `0`, REVENUE `1000`, NET_POSITION `0` | both sides `1000` |

The same closure held after `deserialize` of the category-maximum state and of the equation-boundary state. Rejected transitions threw `TreasuryError` `E_INTEGER` and left both the frozen caller state and an unfrozen `JSON.parse` copy byte-identical:

- One more unit after the split had reached `9007199254740991`. Errors: `aggregate ASSET balance would exceed the safe integer range` and `aggregate REVENUE balance would exceed the safe integer range`.
- One more unit on the single account that already holds `9007199254740991`. Errors: `integer arithmetic would exceed the safe range` on both legs.
- Revenue of 1 on the equation boundary, into the empty bank account. Errors: `left accounting equation total would exceed the safe integer range` and `right accounting equation total would exceed the safe integer range`. A BigInt replay of that candidate is `9007199254740992` on both sides. Each separate category total on that candidate stays inside the safe range.

A hand-built copy of each rejected state is rejected by `validate`. `audit` returns `ok: false` and `balanceSheet: null` without throwing. `balanceSheet`, `serialize`, and `deserialize` throw `E_INTEGER`. The debt on the ordinary lifecycle was `OPEN` with outstanding 200 after the 100 repayment and `SETTLED` with outstanding 0 after the 200 repayment. The opening zero-transaction state stayed byte-identical.

## Ordering, integer errors, immutability, and persistence

`create` sorts account ids with UTF-16 code-unit comparison. The same ids in reverse input order, with one treasury id, produced identical `serialize` bytes. Persisted order and balance-sheet order were:

```text
code-unit and module: account.asset.B|account.asset.I|account.asset.b|account.asset.i
localeCompare en-US:  account.asset.b|account.asset.B|account.asset.i|account.asset.I
localeCompare tr:     account.asset.b|account.asset.B|account.asset.I|account.asset.i
localeCompare host:   account.asset.b|account.asset.B|account.asset.i|account.asset.I
```

The module source contains no `localeCompare`.

On a funded treasury, these amounts all throw `TreasuryError` `E_INTEGER` from `recordRevenue`, `authorizeExpenditure` (`requestedAmount`), `executeExpenditure`, `issueDebt` (`principalAmount`), and `repayDebt`: `0.2`, `1.2`, `1.5`, `0`, `-1`, `NaN`, `Infinity`, `-Infinity`, `9007199254740992`, `"10"`, `null`, `undefined`, `true`, `1n`, `{}`, and `[]`. Each API was 16/16. A revenue of `0.2` left the caller serialize bytes unchanged. An integer execution of 11 against a remaining approval of 10 throws `E_AUTH_LIMIT`. An integer repayment of 5 against outstanding principal 4 throws `E_DEBT_TRANSITION`. Fractions on the non-negative decision fields also throw `E_INTEGER`: `approvedAmount` of `0.2` and `approvedPrincipalAmount` of `0.2`. An authorized `approvedAmount` of `0` throws `E_AUTH_DECISION`. An `approvedPrincipalAmount` of `0` against principal 4 throws `E_UNAUTHORIZED`.

A Proxy around a revenue input and its nested time object counted zero `set`, `defineProperty`, and `deleteProperty` operations during `recordRevenue`. The stored revenue entry and its time object are distinct from the caller input. Later writes to the caller input left the stored amount and tick unchanged. Assigning the stored amount throws `TypeError`, and the amount stays 40. `tools/society/test_treasury.js` contains no `hiddenMutationMutant`. `provocation.hidden_input_mutation.killed` calls `Treasury.recordRevenue(validState, guardedInput)` with the input and its time object frozen. A temporary copy of the module that assigns `input.policyId` before cloning throws `TypeError: Cannot assign to read only property 'policyId'` on that frozen input, and the same assignment is visible on an unfrozen input. The real module accepts the frozen input and leaves the caller snapshots unchanged.

`serialize` of the lifecycle state, after recursively reversing object key order and passing the result through `deserialize`, reproduced the original bytes. Account array order in that text matches the code-unit account order.

A BigInt `tick` on an otherwise valid revenue input throws `TypeError: Do not know how to serialize a BigInt` from `JSON.stringify` inside `clone`. The caller serialize bytes stay unchanged. Amount fields return `E_INTEGER` for `1n` before that path.

## INV-SOC-06 and tracked authority

INV-SOC-06, also `ECON-002` in `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md`, separates faction monetary balance from Quartermaster physical stores. The schema is Draft 2020-12. Ten `type: object` nodes each set `additionalProperties: false`. Amount maximum is `9007199254740991`. Domain const is `FINANCIAL`. Categories are `ASSET`, `LIABILITY`, `NET_POSITION`, `REVENUE`, and `EXPENSE`. Schema property names contain no `quantity`, `itemId`, `storeId`, `interest`, `denomination`, `food`, `coin`, `wage`, `taxRate`, or `maturity`. The module source has no `require(`, `Date.`, `Math.random`, `performance.`, `DEUS_Mint`, `quartermaster`, `interestRate`, `taxRate`, `denomination`, `fiscalPeriod`, or `creditLimit`.

With `global.QuartermasterStores.grain` at 5000 and `global.$gameParty.gold` at 99999, a financial revenue of 40 left both values unchanged and raised the financial asset total to 40. Setting an account `domain` to `STORE` returns `E_STORE_DOMAIN`. Setting `category` to `FOOD` returns `E_FINANCIAL_ACCOUNT`. A revenue payload carrying `itemId` and `quantity` throws `E_SHAPE`. `Date.now`, `Math.random`, and `performance.now` were replaced with functions that throw. A revenue completed with those counters at 0.

`tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md` is byte-identical to the corrected source file. It records currency, rates, fiscal periods, office jurisdiction, opening balances, credit limits, interest and related debt terms, automatic fiscal policy, physical custody, and audit compaction as unavailable. `docs/OWNER_DECISIONS.md` has no treasury, denomination, interest-rate, credit-limit, or fiscal-period decision. The WBS row for SOC.31.01 remains the financial ledger: balance sheets, public revenue, expenditure authorizations, and debt ledgers. The module records caller-supplied amounts and external decisions. Debt status remains `OPEN` or `SETTLED`.

The independent harness reported `PROBE RESULT: 63 passed, 0 failed`.

## Merge-gate dry run

`node tools/governance/merge_gate.js --lane lane-bp2 --manifest tasks/SOC.31.01/lane-bp2/lane.json --dry-run` exited 1. The checked sha was the pre-review tip `8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262`. The run did not merge and did not push. Local `main` remained `368632d629bb65a773ee8c204578d7bf1ab74c61`. Exact summary:

```text
# DEUS merge gate summary (tools/governance/merge_gate.js)
| Item | Value |
|---|---|
| lane | lane-bp2 |
| branch | task/lane-bp2 |
| manifest | tasks/SOC.31.01/lane-bp2/lane.json |
| mode | dry-run |
| repository | C:\Users\snewt\.deus_worktrees\lane-bp2 |

## Refs (raw values after git fetch origin)
| Ref | Command | Hash |
|---|---|---|
| local branch | git rev-parse refs/heads/task/lane-bp2 | 8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262 |
| tracking ref | git rev-parse refs/remotes/origin/task/lane-bp2 | (missing) |
| remote branch | git ls-remote origin refs/heads/task/lane-bp2 | (missing) |
| local main | git rev-parse refs/heads/main | 368632d629bb65a773ee8c204578d7bf1ab74c61 |
| tracking main | git rev-parse refs/remotes/origin/main | 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 |
| remote main | git ls-remote origin refs/heads/main | 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 |
| main worktree | git worktree list --porcelain | C:/Users/snewt/OneDrive/Desktop/UF |
| merge-base | git merge-base 368632d6 8fd9f4bd | 368632d629bb65a773ee8c204578d7bf1ab74c61 |
| checked sha | (local branch tip; every check reads this commit) | 8fd9f4bddcc6f7f2489f8f9e7634e0cd26e5b262 |

## Manifest
| Item | Value |
|---|---|
| path | tasks/SOC.31.01/lane-bp2/lane.json |
| blob at tip | e6a317a5c82132f31ef6c3a2288d26d99fe7a1ce |
| changed by | 5a6b4a31c58e0863e62b1ba3b02e65619d11bcee [pm] Open lane-bp2 SOC.31.01 provenance repair |
| writer / reviewer | codex / grok |

## Diff (git diff --name-status 368632d6 8fd9f4bd): 11 file(s)
| # | Status | Path | In allowedPaths |
|---|---|---|---|
| 1 | A | docs/systems/DEUS_Treasury.md | yes |
| 2 | A | game/data/society/treasury.schema.json | yes |
| 3 | A | game/js/sim/society/DEUS_Treasury.js | yes |
| 4 | A | tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md | yes |
| 5 | A | tasks/SOC.31.01/lane-bp2/BRIEF.md | yes |
| 6 | A | tasks/SOC.31.01/lane-bp2/REPORT.md | yes |
| 7 | A | tasks/SOC.31.01/lane-bp2/lane.json | yes |
| 8 | A | tasks/SOC.31.01/lane-bp2/launches/20260927_204452_prompt.txt | yes |
| 9 | A | tasks/SOC.31.01/lane-bp2/launches/20260927_205317_prompt.txt | yes |
| 10 | A | tasks/SOC.31.01/lane-bp2/launches/20260927_210329_prompt.txt | yes |
| 11 | A | tools/society/test_treasury.js | yes |

## Review
| Item | Value |
|---|---|
| review commit | (none) |
| reviewer file | (none) |
| expected file | - |
| last non-review commit | (none) |
| full hashes in file | (none) |
| verdict | (none) |

## Tests (spawnSync, no shell; each in a fresh clone at the checked sha)
| # | Command | Timeout | Exit | Duration | Result |
|---|---|---|---|---|---|
| 1 | node tools/society/test_treasury.js | 1200 s | 0 | 0.10 s | PASS |
| 2 | node tools/check_deus_syntax.js | 900 s | 0 | 4.90 s | PASS |

## Checks
| Check | Result | Reason codes |
|---|---|---|
| refs | PASS | - |
| (a) manifest | PASS | - |
| (a) scope | PASS | - |
| (b) review | REFUSED | REVIEW_MISSING |
| (c) tests | PASS | - |
| (d) pushed | REFUSED | BRANCH_NOT_ON_REMOTE |
| (e) main | REFUSED | MAIN_NOT_SYNCED, MAIN_DIRTY |
| (f) execution | NOT RUN (refused) | - |

REFUSED BRANCH_NOT_ON_REMOTE: origin has no refs/heads/task/lane-bp2; push the branch first
REFUSED MAIN_NOT_SYNCED: main 368632d629bb65a773ee8c204578d7bf1ab74c61, origin/main 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0, ls-remote 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 must be one commit
REFUSED MAIN_DIRTY: C:/Users/snewt/OneDrive/Desktop/UF has uncommitted tracked changes or an operation in progress: M docs/agents/PROVIDER_USAGE_STATUS.json; M docs/telemetry/sessions/active_workers.json
REFUSED REVIEW_MISSING: no commit on task/lane-bp2 adds tasks/SOC.31.01/lane-bp2/review_<agent>_<sha8>.md
GATE: REFUSED (exit 1)
```

Manifest provenance passed: the only `lane.json` commit is the single-parent `[pm]` opening commit, and every diff path was inside `allowedPaths`. The clone tests passed. `REVIEW_MISSING` is this pre-review tip; the branch was not pushed, which matches the lane instruction to avoid push. `MAIN_NOT_SYNCED` and `MAIN_DIRTY` are the integrator `main` worktree at `C:/Users/snewt/OneDrive/Desktop/UF`, outside this lane diff. Execution did not run.

## Findings

### BLOCKER

None.

### MAJOR

None. The prior cross-account acceptance hole stays closed on the ported runtime. Accepted boundary states remain safe for `validate`, `balanceSheet`, `audit`, `serialize`, and `deserialize`. Rejected follow-on transitions leave the prior bytes unchanged.

### MINOR

None. The BigInt tick `TypeError` above is the same clone behavior the corrected review recorded, and it does not persist a state.

## Verdict

The recorded treasury gate passed at 131/0 and the syntax gate passed at 60 plugins, 0 errors, both in this worktree and in the merge-gate clones. Schema and runtime blobs match `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`. `AUTHORITY_GAPS.md` matches the corrected source blob. Test and documentation diffs are the three `lane-bp` to `lane-bp2` evidence-path substitutions. `BRIEF.md` and `lane.json` were changed only by `5a6b4a31c58e0863e62b1ba3b02e65619d11bcee`. Cross-account category totals and both accounting-equation sides reject `9007199254740992` and accept `9007199254740991`. Account order follows UTF-16 code units where the host, `en-US`, and `tr` locale orders differ. Fractional and non-Number amounts return `E_INTEGER`. The hidden-mutation fixture calls `recordRevenue`, and a real write to frozen caller input fails that fixture. Store separation holds. Every changed path is allowed. No art or audio file changed.

VERDICT: PASS

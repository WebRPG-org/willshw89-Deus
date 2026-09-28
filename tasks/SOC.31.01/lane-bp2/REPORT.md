# SOC.31.01 lane-bp2 provenance repair report

**Date:** 2026-09-27

**Branch:** `task/lane-bp2`

**Clean base:** `368632d629bb65a773ee8c204578d7bf1ab74c61`

**Reviewed source:** `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`

## What changed

- `game/data/society/treasury.schema.json`: recreated from the exact reviewed-source blob.
- `game/js/sim/society/DEUS_Treasury.js`: recreated from the exact reviewed-source blob.
- `docs/systems/DEUS_Treasury.md`: recreated from the exact reviewed-source blob.
- `tools/society/test_treasury.js`: recreated from the exact reviewed-source blob.
- `tasks/SOC.31.01/lane-bp2/REPORT.md`: fresh lane-bp2 evidence; no old lane report, review, launch, brief, or manifest was copied.

`tasks/SOC.31.01/lane-bp2/BRIEF.md` and `tasks/SOC.31.01/lane-bp2/lane.json` were not edited. No art or audio asset was read, generated, edited, requested, catalogued, moved, or integrated.

## Blob comparison

The expected IDs came from `git rev-parse 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b:<path>`. The actual IDs came from `git hash-object -- <path>` after recreation.

| Path | Reviewed source blob | Recreated blob | Match |
|---|---|---|---|
| `game/data/society/treasury.schema.json` | `e4bf3deb067fba2426c47880b28c257bd4584517` | `e4bf3deb067fba2426c47880b28c257bd4584517` | yes |
| `game/js/sim/society/DEUS_Treasury.js` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | yes |
| `docs/systems/DEUS_Treasury.md` | `d462cae44b4765d92dd756416efe9f81e455ddba` | `d462cae44b4765d92dd756416efe9f81e455ddba` | yes |
| `tools/society/test_treasury.js` | `40ecced1cdca9cd2c148161ca697b150de5e3036` | `40ecced1cdca9cd2c148161ca697b150de5e3036` | yes |

## How I tested it

- Ran `node tools/society/test_treasury.js` in the foreground from the repository root. Exit: `1`.
- Ran `node tools/check_deus_syntax.js` in the foreground from the repository root. Exit: `0`.
- Inspected the hard-coded task-evidence references with `rg -n 'AUTHORITY_GAPS|lane-bp' tools/society/test_treasury.js docs/systems/DEUS_Treasury.md`.
- Confirmed the referenced old-lane evidence exists at the reviewed source commit but not at clean branch `HEAD` with `git ls-tree` and `git cat-file -e`.
- Inspected the working-tree paths with `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard`.

## Evidence

### Treasury gate

Exact foreground output, including the directly captured exit code:

```text
node:fs:484
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'C:\Users\snewt\.deus_worktrees\lane-bp2\tasks\SOC.31.01\lane-bp\AUTHORITY_GAPS.md'
    at Object.readFileSync (node:fs:484:20)
    at Object.<anonymous> (C:\Users\snewt\.deus_worktrees\lane-bp2\tools\society\test_treasury.js:19:17)
    at Module._compile (node:internal/modules/cjs/loader:1872:14)
    at Object..js (node:internal/modules/cjs/loader:2003:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module._load (node:internal/modules/cjs/loader:1356:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'C:\\Users\\snewt\\.deus_worktrees\\lane-bp2\\tasks\\SOC.31.01\\lane-bp\\AUTHORITY_GAPS.md'
}

Node.js v24.19.0
EXIT=1
```

### Repository-wide syntax gate

Exact foreground output, including the directly captured exit code:

```text
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

### Hard-coded old-lane dependency

```text
tools/society/test_treasury.js:13:const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp", "AUTHORITY_GAPS.md");
docs/systems/DEUS_Treasury.md:75:Only principal is modeled. A debt is `OPEN` while principal remains and changes to `SETTLED` only when exact repayments reduce outstanding principal to zero. Reopening, overpayment, repayment after settlement, negative principal, and a persisted status/outstanding mismatch are invalid transitions. Interest, maturity, collateral, default, forgiveness, refinancing, restructuring, and credit limits are unavailable until tracked authority supplies them; see `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`.
docs/systems/DEUS_Treasury.md:124:Exact gate output and any observed problems are recorded in `tasks/SOC.31.01/lane-bp/REPORT.md` after the foreground runs.
```

The reviewed source tree contains the missing dependency:

```text
100644 blob 15be6b84b81c06fe923e416d204b9094349538af tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md
```

The same path is absent from the clean branch base/HEAD: `git cat-file -e HEAD:tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` returned `128`.

### Allowed-path inspection

Before this fresh report was added, all working-tree changes were the four allowed substantive paths:

```text
?? docs/systems/DEUS_Treasury.md
?? game/data/society/treasury.schema.json
?? game/js/sim/society/DEUS_Treasury.js
?? tools/society/test_treasury.js
```

After staging only explicit paths, `git diff --cached --name-status` reported:

```text
A	docs/systems/DEUS_Treasury.md
A	game/data/society/treasury.schema.json
A	game/js/sim/society/DEUS_Treasury.js
A	tasks/SOC.31.01/lane-bp2/REPORT.md
A	tools/society/test_treasury.js
```

The staged four-path comparison against the reviewed source produced no diff and `SOURCE_DIFF_EXIT=0`. The protected-file comparison for lane-bp2 `BRIEF.md` and `lane.json` produced no diff and `PROTECTED_DIFF_EXIT=0`.

No screenshot was produced. This is an unregistered, headless module port, so no RMMZ Playtest or F8 console check was run.

## Not done / known problems

- The targeted treasury gate did not reach its assertions. The exact reviewed test blob requires `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`, an old-lane evidence file that is not on the clean base.
- Creating that old-lane path would violate the brief's instruction to create only fresh evidence under `tasks/SOC.31.01/lane-bp2`. Changing the test to read lane-bp2 would break the required exact blob match. No workaround was introduced.
- The exact reviewed documentation blob also retains two stale `lane-bp` evidence references. Correcting them would break its required exact blob match.
- RMMZ editor Playtest and F8 console state were not checked because this module is not registered with the runtime.

## Try it in RMMZ

1. No RMMZ test step is available for this isolated, unregistered module.

Expected: runtime behavior is unchanged because no plugin registration or host integration is part of SOC.31.01.

## Decisions needed

- Choose which constraint may change: authorize a revised test/documentation blob that points to fresh lane-bp2 evidence, or authorize restoration of the old-lane authority evidence path. Without one of those changes, the exact reviewed blobs and a passing clean-branch treasury gate are mutually incompatible.

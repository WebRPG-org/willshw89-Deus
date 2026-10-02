# Review: NAT.02.MASS lane-dr

- Reviewer: grok (family grok)
- Writer family: codex (commit author deus-codex, subject tag `[codex]`)
- TIP (full hash reviewed): `b16037d5335dbd1a49e34bfe2674053cd9eb9140`
- Branch: `task/lane-dr`
- Parent: `74a9d7eee9497b70c9a027753864cf6e975003d8` (PM lane open)
- Merge-base with origin/main: `917f2755f823d7aad297769d09db600ff653b8c1`
- Worktree was clean at review start (`git status --porcelain` printed nothing)

`git log --format='%h %an | %s' origin/main..HEAD` (origin/main then at `15a6fe4c12eb15237f3c0d496d75d119a41d4940`):

```
b16037d5 deus-codex | [codex] NAT.02.MASS store reclaim and world item centipounds
74a9d7ee deus-pm | [pm] Open lane-dr (NAT.02.MASS part 4, writer codex): reclaim and world items store and post centipounds; rubble part dropped under DEC-083
```

The review is of `b16037d5335dbd1a49e34bfe2674053cd9eb9140` only. `node tools/check_deus_syntax.js` and `node tools/sim/test_ledger.js` were left to merge_gate.

## Check 1 — Scope

`git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD`:

```
M	.agents/rules/deus-game-translation.md
M	docs/AUDIT_LOG.md
M	docs/OWNER_DECISIONS.md
D	docs/design/COLLAPSE_REPLAN_DEC083.md
D	docs/design/WAVE3_BRIEF_NOTES_2026-10-02.md
D	docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
M	docs/systems/DEUS_Reclamation.md
M	docs/systems/DEUS_WorldItems.md
M	game/data/sim/mass_tables.json
M	game/js/sim/reclaim.js
M	game/js/sim/world_items/catalog.js
M	game/js/sim/world_items/ledger_bridge.js
M	game/js/sim/world_items/world.js
A	tasks/NAT.02.MASS/lane-dr/BRIEF.md
A	tasks/NAT.02.MASS/lane-dr/lane.json
D	tasks/OPS.MAIN.GREEN/lane-gp/BRIEF.md
D	tasks/OPS.MAIN.GREEN/lane-gp/REPORT.md
D	tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js
D	tasks/OPS.MAIN.GREEN/lane-gp/lane.json
D	tasks/OPS.MAIN.GREEN/lane-gp/review_grok_ecd1f50f.md
M	tools/sim/test_living_world_rules.js
M	tools/sim/test_reclaim.js
M	tools/sim/test_reclaim_longrun.js
M	tools/test_area_generation_speed.js
M	tools/world_items/test_world_items.js
M	tools/zrange/fixtures/geology_304ca7b2_seed18.json
M	tools/zrange/zrange_suite.js
```

`git merge-base --is-ancestor 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD` exited 1. That SHA is the pre-fetch `origin/main`, and it is not an ancestor of TIP. The two-dot diff therefore also lists files this branch does not contain. `git log --oneline 917f2755f823d7aad297769d09db600ff653b8c1..15a6fe4c12eb15237f3c0d496d75d119a41d4940`:

```
15a6fe4c [pm] DEC-088: AG takes the coordinator seat, Claude codes; the handoff brief docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
d874e0be [pm] DEC-087 (eight process cuts, Owner "do all"), AUDIT A13-17 (timing-sensitive zrange census), the DEC-083 collapse re-plan and the wave-3 brief notes moved into docs/design
86a51589 Merge task/lane-gp at 9d8db81291086e5978ca078be0b4a202906f8982 (OPS.MAIN.GREEN lane-gp) via merge_gate
91d37ae5 [pm] DEC-065: the Owner accepted the narrowing (2026-10-02): New Game builds the start and faction-home areas; the simulation, never the view, drives generation
9d8db812 [grok] OPS.MAIN.GREEN lane-gp review: review_grok_ecd1f50f.md (VERDICT: CLEAN PASS)
8a918a24 [pm] AUDIT_LOG A13-16: the coordinator edited launch_worker.ps1 live in the main checkout (astra-max model, whole-file rewrite); reverted, lane-dr relaunched
ecd1f50f [claude] OPS.MAIN.GREEN: speed harness installs the sim hook, six stump mass rows, zrange census counts objects by id
3aae2b8c [pm] Open lane-gp (OPS.MAIN.GREEN, writer claude): main's four red gates after the lane-gh, lane-do2 and lane-dc merges
```

Those commits account for the paths outside `lane.json` `allowedPaths` (the `.agents` rule, audit and decision logs, the design and handoff docs, `mass_tables.json`, the lane-gp task files, the speed harness, and the zrange fixture and suite). `git diff --stat 917f2755f823d7aad297769d09db600ff653b8c1 origin/main -- game/data/sim/mass_tables.json` is `282 insertions(+)` and no deletions, so the mass-table difference is main's added rows.

merge_gate compares the merge-base to the tip. `git diff --name-status 917f2755f823d7aad297769d09db600ff653b8c1 HEAD`:

```
M	docs/systems/DEUS_Reclamation.md
M	docs/systems/DEUS_WorldItems.md
M	game/js/sim/reclaim.js
M	game/js/sim/world_items/catalog.js
M	game/js/sim/world_items/ledger_bridge.js
M	game/js/sim/world_items/world.js
A	tasks/NAT.02.MASS/lane-dr/BRIEF.md
A	tasks/NAT.02.MASS/lane-dr/lane.json
M	tools/sim/test_living_world_rules.js
M	tools/sim/test_reclaim.js
M	tools/sim/test_reclaim_longrun.js
M	tools/world_items/test_world_items.js
```

Every path matches `tasks/NAT.02.MASS/lane-dr/lane.json` `allowedPaths`. The writer commit itself (`git diff --name-status 74a9d7eee9497b70c9a027753864cf6e975003d8 HEAD`) is those same paths without `BRIEF.md` and `lane.json`, which the PM commit added. The writer did not edit the manifest or the brief.

`git show --stat HEAD` for the writer commit: 10 files changed, 319 insertions, 200 deletions. Per-file `--numstat` (insertions, deletions) against the parent: Reclamation 5/4, WorldItems 2/2, reclaim.js 81/74, catalog.js 33/25, ledger_bridge.js 2/2, world.js 28/21, test_living_world_rules.js 4/4, test_reclaim.js 101/38, test_reclaim_longrun.js 12/29, test_world_items.js 51/1. `git diff --ignore-cr-at-eol --numstat` on the same range printed the same counts. File sizes at TIP are reclaim.js 1004 lines, world.js 1886 lines, catalog.js 215 lines. A byte scan of the ten writer paths reported `bom=false` and `crlf=0` on each (LF only). The reclaim.js diff is a field rename plus the `E_UNIT` refusal and schema-2 restore guard. world.js is the `massMu` to `massCp` rename, save `v: 2`, and the legacy-key refusal. No whole-file rewrite and no BOM.

## Check 2 — Scope items at TIP

The Scope section of the brief is five bullets. Each is present at `b16037d5335dbd1a49e34bfe2674053cd9eb9140`.

1. Manifest, branch, writer, reviewer, gate commands. `tasks/NAT.02.MASS/lane-dr/lane.json` lines 2-6 name lane-dr, NAT.02.MASS, `task/lane-dr`, writer codex, reviewer grok. Lines 21-63 are the six gate commands from the brief (`check_deus_syntax`, `test_reclaim`, `test_reclaim_longrun`, `test_living_world_rules`, `test_world_items`, `test_ledger`), each `timeoutSec` 900. `allowedPaths` lines 7-20 match the brief.

2. `reclaim.js` stores and posts `cp`. Places use `cp` at `blankPlace` line 193, `givePlace` 215-218, `available` 228-230, `takeCp` 234-244, `compact` 249. `postingAmount` lines 259-261 return `p.cp` only. `scalePostings` line 269 returns `{ error: "E_UNIT" }` when that is null, and `applyMaterial` line 345 and `applyElementPostings` line 377 pass that to `soft` before `runMoves`. `mine` line 671 returns `soft("E_UNIT", id)` before `applyMaterial`. `soft` (lines 113-117) calls `die` when strict, and `die` (lines 103-108) throws `e.code`. The strict probe below left both checksums unchanged. `registerCommon` lines 552-556 takes `cp` and returns `{ ok, cp, cls, form }`. `registerObject` line 615 reads `line.cp`. `mine` line 675 reads `unmapped.cp`. `blocks` lines 895-911 and `checksum` lines 921-924 carry `cp`. `snapshot` line 933 writes `schema: 2`. `restore` lines 945-952 refuse schema 1 with `E_UNIT_PROVENANCE`, then require schema 2 and a safe `place.cp` with no `mu` property, and only then call `ledger.restore` at line 952. Export `SCHEMA: 2` is line 1004. `note` line 817 is still `postElement(..., "collapse", ...)` and is outside the writer diff. `registerSlice` line 578 is still `exempt: o.exempt !== false` and is outside the writer diff. A scan of `reclaim.js`, `catalog.js`, `world.js`, and `ledger_bridge.js` finds `mu` / `massMu` only as the legacy refusal strings at `reclaim.js:950` and `world.js:1676`.

3. World items derive and post `massCp`. `catalog.js` `massCp` lines 16-21 are `floor((weightOz * CP_PER_LB + OZ_PER_LB / 2) / OZ_PER_LB)` with a safe-integer check. `CP_PER_LB` is 100 (`units.js:5`) and `OZ_PER_LB` is 16 (`world_items/constants.js:28`). `row` line 33 sets `massCp: massCp(spec.weightOz)`. The writer diff deletes every hand-set `massMu`. `world.js` carries `massCp` at makeItem 95, postRegister 395-397, surface collapse 430-436, seeded expand 1163, burn 1233-1240, container spill 1254-1263, rot 1337-1341, copy 1442, serialize 1482, restoreTree 1600. `saveChanges` line 1528 writes `v: 2`. `loadChanges` lines 1672-1680 refuse a blob whose `v` is not 2, or any nested key `massMu`, with `E_SAVE` before tombstones, manifests, items, or deposits are applied. `ledger_bridge.js` line 24 recounts `item.massCp`. Ledger class and form arguments on `register` and `transform` are unchanged.

4. Tests feed raw cp rows. `adaptForReclaim` is gone from `tools/sim/test_reclaim.js` and `tools/sim/test_reclaim_longrun.js`; both read `mass_tables.json` directly (test_reclaim.js lines 15-19, longrun lines 14-17). `placeCp` is `test_reclaim.js:45-49` and `test_living_world_rules.js:544-548`, used at living-world lines 654-655. `cpPins` are `test_reclaim_longrun.js:19-20`: seed 1 `0bc6fb75`, seed 2 `df4a146a`, with the comment that the place and checksum field names changed from `mu` to `cp`. The brief's probe text names `registerObject("stump")`. The new check calls `registerObject("wall_wood")` at `test_reclaim.js:56`. `stump` lines are already `cp` at `game/data/sim/mass_tables.json:3076-3080`, and `registerObject` uses `line.cp` for every object. Named checks: `reclaim_fields_are_cp` test_reclaim.js:60, `posting_amount_reads_cp` :126, `reclaim_old_snapshot_refused` :78, `reclaim_snapshot_roundtrip_cp` :82, `no_mu_identifiers` :96 (four files, empty allowlist, comment line 87), `world_item_mass_matches_weight` test_world_items.js:38, `world_item_ledger_cp` :409, `world_item_old_save_refused` :451. Mutants: `accept_mu_records_mutant_killed` test_reclaim.js:127-129 and `no_25_over_4_mutant_killed` test_world_items.js:62-63. Leak and duplicate injections remain at test_reclaim.js:284-347 and longrun line 133.

5. Docs. `docs/systems/DEUS_Reclamation.md` line 5 states integer centipounds and `E_UNIT`. Line 15 says the yield list's cp. Lines 23-24 state schema 2, `E_UNIT_PROVENANCE`, and no conversion. Line 60 points the gate pins at `test_reclaim_longrun.js`. The old `D-MU-UNIT` bullet is gone (Left open starts at line 66). `docs/systems/DEUS_WorldItems.md` line 29 states save `v: 2` and `E_SAVE` for `v: 1` or `massMu`. Line 39 replaces `massMu` with weight-derived `massCp` (3 lb = 300, 1 oz = 6, 2 oz = 13).

## Check 3 — Changed tests and named mutants

`node tools/sim/test_reclaim.js` exited 0.

```
PASS reclaim_fields_are_cp
PASS reclaim_old_snapshot_refused
PASS reclaim_snapshot_roundtrip_cp
PASS no_mu_identifiers
PASS posting_amount_reads_cp
PASS accept_mu_records_mutant_killed
PASS duplicated cp is caught
PASS leaked cp is caught
PASS mutant leak cp fails the run
PASS mutant duplicated cp fails the run
RESULT: 44 passed, 0 failed
```

`node tools/sim/test_reclaim_longrun.js` exited 0.

```
PASS pinned checksums
PASS injected cp fails the long run
CHECKSUM seed1 0bc6fb75
CHECKSUM seed2 df4a146a
RESULT: 20 passed, 0 failed
```

`node tools/sim/test_living_world_rules.js` exited 0. Thirteen `PASS` lines, including both `F-04` mine lines that call `placeCp`. Last line: `RESULT: PASS (0 failed)`.

`node tools/world_items/test_world_items.js` exited 0.

```
PASS world_item_mass_matches_weight
PASS no_25_over_4_mutant_killed
PASS world_item_ledger_cp
PASS mass_burn
PASS mass_spill
PASS world_item_old_save_refused
PASS save_roundtrip
RESULT: 90 passed, 0 failed
```

The suites apply the mutants in memory. A separate in-memory run of the same anchors (files on disk unchanged) printed:

```
no_25_over_4 real world_item_mass_matches_weight true rows 22
no_25_over_4 mutant world_item_mass_matches_weight false wrong 22 of 22
no_25_over_4 longsword real 300 mutant 3
no_25_over_4 key_brass real 6 mutant 0
no_25_over_4 sack real 50 mutant 1
no_25_over_4 massCp(2) real 13 mutant 0
accept_mu_records anchor count 1
accept_mu_records real posting_amount_reads_cp true mu:E_UNIT sessionSame:true ledgerSame:true, du:E_UNIT sessionSame:true ledgerSame:true
accept_mu_records mutant posting_amount_reads_cp false mu: sessionSame:false ledgerSame:false, du: sessionSame:false ledgerSame:false
MUTANT_COUNTS no_25_over_4_wrong=22/22 accept_mu_records_ok=false
```

`no_25_over_4` drops `weightOz * CP_PER_LB` to `weightOz`. All 22 catalog rows then miss `world_item_mass_matches_weight`; the longsword becomes 3. `accept_mu_records` inserts `if (typeof p.mu === "number") return p.mu` after the `p.cp` read. `posting_amount_reads_cp` then goes false for both `mu` and `du`: the mine returns no `E_UNIT` and both checksums change. The real function refuses both with `E_UNIT` and both checksums stay put.

## Check 4 — REPORT.md

`tasks/NAT.02.MASS/lane-dr/REPORT.md` is not in the worktree and is not in TIP. `git show --stat HEAD` lists ten files and does not list it. There is no number in a report to compare, so the report overstates nothing. It omits the whole AGENTS.md session report, the command output, the GAME TRANSLATION block, and the cpPins handoff the brief asks the writer to record. The values this run produced, which that handoff would have carried, are seed 1 `0bc6fb75` and seed 2 `df4a146a` (20 passed, 0 failed), reclaim 44 passed / 0 failed, world items 90 passed / 0 failed, living-world `RESULT: PASS (0 failed)`. Those two pins are the constants at `test_reclaim_longrun.js:20`, and the long-run output above matches them.

No in-game scene was run. The brief classes this lane C: neither plugin is in `plugins.js`, and the lane does not enable one.

## Check N — merge-tree

`git fetch origin` exited 0. After fetch, `git rev-parse origin/main` printed `a702810371b35ecf348f1f8fede487fd899dce95`. `git merge-base origin/main HEAD` remained `917f2755f823d7aad297769d09db600ff653b8c1`.

`git merge-tree --write-tree origin/main HEAD` exited 0 and printed `2a25fc2a044d7573ccf4bcc62fc9ba2e7978dc8a`.

## Findings

MINOR. `REPORT.md` was not committed. The brief requires that file for the session report, the quoted test output, the GAME TRANSLATION block, and the cpPins reason. The pins and the field-rename reason are in `tools/sim/test_reclaim_longrun.js:19-20`, and this run matched the pins. The missing file does not change the posted amounts.

MINOR. `docs/systems/DEUS_Reclamation.md:60` says `tools/sim/fixtures/reclaim/checksums.json` records the prior field spelling. That file is two hashes, `"1": "07830127"` and `"2": "d082be50"`. It has no field name. Those hashes are neither lane-do's reported pins (`1afb4f75`, `54b9da8d`) nor this lane's pins. The same sentence correctly sends the gate to `test_reclaim_longrun.js`, and the long run matched those pins.

VERDICT: PASS WITH MINORS

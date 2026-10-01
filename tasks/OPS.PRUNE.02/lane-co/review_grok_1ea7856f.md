# Grok review: OPS.PRUNE.02 lane-co (L2 plugin shims archival)

Reviewed writer commit: `1ea7856f958a4b4a612d353b304e135a2611000d`

Independent review of `task/lane-co` at that commit. Worktree: `C:\Users\snewt\.deus_worktrees\lane-co`. Commands below ran in that worktree on Node v24.19.0, against the writer tree, before this review file was added. Base for the lane diff is `6a6a5f1b`. The 41 renames and the tool retargets are in `e12e9e72`. `5d319406` records a launch prompt. `1ea7856f` adds the five canonical companion-loader exemptions and refreshes the shim-gate evidence. No production file outside `tools/test_no_loadscript_shims.js` changes between `e12e9e72` and `1ea7856f`.

VERDICT: CLEAN PASS

## 1. Exact 41-shim move

`git diff --name-status -M100% 6a6a5f1b..1ea7856f` records 41 renames, every one `R100`, each from `game/js/plugins/<file>` to `archive/game/js/plugins/<file>`, with an empty content diff. `git show --name-status e12e9e72` contains those same 41 `R100` records. The set matches the brief, with no missing name, no extra rename, and no other destination:

1. `UF_Anim.js`
2. `UF_Camera.js`
3. `UF_Colonists.js`
4. `UF_ColonyOverseer.js`
5. `UF_Combat.js`
6. `UF_Core.js`
7. `UF_DayNight.js`
8. `UF_Doors.js`
9. `UF_Ecology.js`
10. `UF_Environment.js`
11. `UF_FactionMenus.js`
12. `UF_Factions.js`
13. `UF_Fire.js`
14. `UF_Floors.js`
15. `UF_Fog.js`
16. `UF_Generator.js`
17. `UF_History.js`
18. `UF_Interact.js`
19. `UF_Items.js`
20. `UF_Jobs.js`
21. `UF_Levels.js`
22. `UF_Look.js`
23. `UF_Minimap.js`
24. `UF_Movement8D.js`
25. `UF_NaturalConnections.js`
26. `UF_Objects.js`
27. `UF_Ownership.js`
28. `UF_Perspective25D.js`
29. `UF_Select.js`
30. `UF_Sheet.js`
31. `UF_Speech.js`
32. `UF_Stance.js`
33. `UF_Talk.js`
34. `UF_Test.js`
35. `UF_Tiles.js`
36. `UF_TimeSpeed.js`
37. `UF_Visuals.js`
38. `UF_Walls.js`
39. `UF_Wildlife.js`
40. `UF_World.js`
41. `UF_WorldGen.js`

`archive/game/js/plugins/` contains exactly these 41 `UF_*.js` files. Each file is a short forwarder (one `PluginManager.loadScript` call) and loads `DEUS_<same stem>`. Each twin `game/js/plugins/DEUS_<stem>.js` exists.

Live `game/js/plugins/UF_*.js` is exactly `UF_Households.js` and `UF_Time.js`. Neither file contains `PluginManager.loadScript`. Blob identities match the base:

| File | Bytes | Blob at `1ea7856f` and `6a6a5f1b` |
|---|---:|---|
| `game/js/plugins/UF_Households.js` | 62,657 | `228c9beef0b7036745f0d819c4d1d4b738d9c7b9` |
| `game/js/plugins/UF_Time.js` | 22,262 | `0b3365d29d570d6ad7ceb0870004120c9710f509` |

Those sizes are the brief's 62 KB and 22 KB plugins. `git diff 6a6a5f1b..1ea7856f` for both paths is empty.

`game/js/plugins.js` was not modified. Evaluating it shows 42 enabled entries, every `name` file present under `game/js/plugins/`, and no enabled `UF_*` entry. The archived forwarders are not the files the editor loads.

## 2. Fallbacks removed

`git diff -U8 6a6a5f1b..1ea7856f` for the three allowed plugin files is only the briefed removal:

- `DEUS_Colonists.js`: removed the `require("./UF_SettlementPillars.js")` block, the `require("./UF_Sanitation.js")` block, and the `UF_Generator` candidate list (`./UF_Generator.js`, `js/plugins/UF_Generator.js`, `game/js/plugins/UF_Generator.js`, and the `path.resolve` pair). `Pillars`, `Sanitation`, and `Generator` remain window accessors.
- `DEUS_History.js`: `getItems` candidates are now `./DEUS_Items.js`, `./js/plugins/DEUS_Items.js`, and `./game/js/plugins/DEUS_Items.js`. `./UF_Items.js` is gone.
- `DEUS_Combat.js`: the `no_math_random` source read no longer falls back to `js/plugins/UF_Combat.js`. It reads `js/plugins/DEUS_Combat.js`.

Remaining `UF_` text in those three files is comments and `UF.*` namespace use.

## 3. Tool and test retargeting

`git diff --name-only --diff-filter=M 6a6a5f1b..1ea7856f -- tools` is 82 files. That set equals `tasks/OPS.PRUNE.02/lane-co/evidence/retargeted_files.json` with no missing path, no extra path, and no duplicate. `tools/test_no_loadscript_shims.js` is the separate addition.

The 82 diffs retarget archived shim names to the `DEUS_` twins: literal `UF_*.js` paths, constructed filenames, VM `filename` labels, snapshot plugin names, and comments that name those files. `tools/test_town_hall_ai_live.js` drops the `UF_Test.js` existence fallback and reads `DEUS_Test.js` directly. Names that are not in the 41 stay: `UF_Households`, `UF_Skills`, `UF_CultureGrowth`, `UF_Construction`, and `UF_FireSafety`. `node --check` on all 83 added or modified tool files exited 0.

`tools/test_time_domains_proof.js` is blob-identical to the base (`240c4238c42a55c727727ed5e975da63510d78c3`). Line 38 is still:

```js
require("../game/js/plugins/UF_World.js");
```

The shim gate prints that line as the single L3 deferral and does not treat it as a violation. The only other live `UF_<archived>.js` string literals under `tools/` are the pre-rename historical lines the gate exempts exactly: `tools/fix_colonists_checks.js` (`archive/plugins_uf_pre_rename/UF_Colonists.js`) and the old-save hash keys in `tools/fixtures/UF_ZZ_OldSaveFixture.js` for `UF_Factions.js` and `UF_History.js`.

Lane diff paths stay inside the whitelist: the 41 archive renames, the three `DEUS_` plugin edits, `tools/**`, and `tasks/OPS.PRUNE.02/lane-co/**`.

## 4. `tools/test_no_loadscript_shims.js`

The five exemptions are exactly the canonical companion loaders:

- `game/js/plugins/DEUS_Camera.js` loads `DEUS_Minimap`
- `game/js/plugins/DEUS_ColonyOverseer.js` loads `DEUS_Select`
- `game/js/plugins/DEUS_Core.js` loads its companion list, including protected `UF_Households`
- `game/js/plugins/DEUS_History.js` loads `DEUS_HistoricalDemographics` and `DEUS_Callings`
- `game/js/plugins/DEUS_Items.js` loads `DEUS_Containers` and `DEUS_Dnd5e`

A scan of every `game/js/plugins/**/*.js` finds `PluginManager.loadScript` only in those five files. They are companion loads of canonical modules, not the 41 forwarders. `DEUS_Camera.js`, `DEUS_ColonyOverseer.js`, `DEUS_Core.js`, and `DEUS_Items.js` are unmodified versus the base. `DEUS_History.js` changes only the `UF_Items` require fallback. MSG-PRUNE-PM-059 / the Owner confirmation in the lane brief assigns these five to L9 (`plugins.js` ordering), not to the L2 forwarder archive.

```text
$ node tools/test_no_loadscript_shims.js
DEFERRED tools/test_time_domains_proof.js:38 ../game/js/plugins/UF_World.js (L3/lane-cp)
RESULT: PASS; 41 required archives; 2 protected plugins; 0 violations; 1 L3 deferrals
EXIT:0

$ node tools/test_no_loadscript_shims.js --mutants
DEFERRED tools/test_time_domains_proof.js:38 ../game/js/plugins/UF_World.js (L3/lane-cp)
RESULT: PASS; 41 required archives; 2 protected plugins; 0 violations; 1 L3 deferrals
KILLED moved-protected / UF_Households.js EXIT=1
KILLED moved-protected / UF_Time.js EXIT=1
KILLED shim-survived EXIT=1
KILLED broken-retarget EXIT=1
MUTANTS: 4/4 scenarios killed (3 names)
EXIT:0
```

Mutants rewrite an in-memory inventory. Both protected files are killed separately. Child processes must exit 1 and emit the expected diagnostic.

## 5. Gate tests

```text
$ node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
EXIT:0

$ node tools/test_palette.js
Palette loaded successfully
EXIT:0
```

`node tools/test_control_board.js` cannot run on this commit. `tools/test_control_board.js` is absent from `1ea7856f` and from base `6a6a5f1b`. It was added by OPS.PRUNE.01 (`a3211899`) and is present on `origin/main` (`534ef734`). That commit is not an ancestor of this lane (`merge-base` `7bbe7f6c`). A copy of `origin/main`'s script, pointed at this worktree, exits 1 because this branch's `docs/STATUS.md` does not contain OPS.PRUNE.01 sections 1–5. `docs/STATUS.md` is outside the lane whitelist, and this lane does not delete the control-board test. `lane.json` does not list that command. The two gate commands that exist in the reviewed tree exited 0. This is not a defect in the 41-shim move.

The other seven `lane.json` commands were not re-run here. `e12e9e72..1ea7856f` does not change the plugins or tools those commands load. This review's acceptance of them is the fresh syntax, palette, and shim-gate runs plus the diff, not a new execution of those seven logs.

## Scope left for later lanes

L3/lane-cp still owns `tools/test_time_domains_proof.js:38`. Coordinator integration still owns `docs/STATUS.md`, the fresh-clone merge gate, and RMMZ F5/F8 boot. This review does not claim a native playtest.

VERDICT: CLEAN PASS

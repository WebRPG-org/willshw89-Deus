# Independent review — NAT.02.MASS / lane-do2

- Reviewer: grok (family grok)
- Lane writer family: codex (the commit under review is the PM re-cut, not a writer commit)
- Target commit: be662d81e80e9f14450738c1707f85222ff9de9a
- Subject: [pm] Re-cut lane-do as lane-do2 (NAT.02.MASS): PM manifest and brief; writer's VISION.md line reverted
- Parent: 9ddcb6dc3a9f589e18050994f27417ee304735d5
- Earlier writer commit whose VISION.md line this re-cut removes: 55599fc831f19e9a6a2b0147d86d618e25356c47
- Branch: task/lane-do2
- Brief: tasks/NAT.02.MASS/lane-do2/BRIEF.md
- Manifest: tasks/NAT.02.MASS/lane-do2/lane.json
- Review date: 2026-10-01

Reviewed the tree of be662d81e80e9f14450738c1707f85222ff9de9a in this worktree. `git rev-parse HEAD` printed that hash. `git status --porcelain` showed only untracked `tasks/NAT.02.MASS/lane-do2/launches/`. That directory is not in the target commit and was not staged.

`9ddcb6dc3a9f589e18050994f27417ee304735d5` is `task/lane-do` with the earlier grok review of `55599fc831f19e9a6a2b0147d86d618e25356c47`. merge_gate refused that branch with MANIFEST_TAMPERED because the codex writer's `55599fc8` changed its own `lane.json` and `BRIEF.md`. This review checks that `be662d81` is that tip plus one [pm] commit: the new brief and manifest, and the removal of the one decision-log line `55599fc8` added to `docs/VISION.md`.

## Check 1 — diff from 9ddcb6dc

`git diff --stat 9ddcb6dc be662d81` and `git diff --name-only 9ddcb6dc be662d81`:

```
 docs/VISION.md                       |   1 -
 tasks/NAT.02.MASS/lane-do2/BRIEF.md  | 224 +++++++++++++++++++++++++++++++++++
 tasks/NAT.02.MASS/lane-do2/lane.json | 139 ++++++++++++++++++++++
 3 files changed, 363 insertions(+), 1 deletion(-)
----- NAME-ONLY -----
docs/VISION.md
tasks/NAT.02.MASS/lane-do2/BRIEF.md
tasks/NAT.02.MASS/lane-do2/lane.json
```

Those are the only three paths. `BRIEF.md` and `lane.json` are added under `tasks/NAT.02.MASS/lane-do2/`. `docs/VISION.md` loses one line.

`git diff 9ddcb6dc be662d81 -- docs/VISION.md`:

```
diff --git a/docs/VISION.md b/docs/VISION.md
index 47835597..8d0c82fc 100644
--- a/docs/VISION.md
+++ b/docs/VISION.md
@@ -453,4 +453,3 @@ Append only, newest at the bottom.
 - 2026-10-01: The user removed the originality check entirely (DEC-061) and made the art council unanimous: one NAY rejects a piece, every NAY carries its reason, and the style bar is strict Ultima VII / EverQuest / English folklore, uniquely DEUS (DEC-062).
 - 2026-10-01: The user simplified the art council's question: the judges only confirm a piece is roughly the same quality as Ultima VII art and consistent with it; the PM confirms it can be tooled (DEC-062 amendment).
 - 2026-10-01: The user moved Group 3 from Nano Banana Pro to PixelLab (superseding the generator in the DEC-060 line above), set the style as "RMMZ reference, Ultima 7 style", limited the PM's art to Pixflux and Bitforge with no animals, monsters, people or animations, and ruled that a stump is its own tree cut down. Later the same day: tile sets the user made are never redone; the PM's art covers temperate Groups 3 to 6 plus trees and stumps; every RMMZ asset gets a DEUS asset, except that there is no icon set (inventory items are sprites dragged between containers, as in Ultima VII) and facesets and character sheets wait; the PM's art comes in RMMZ's own sheet formats, with RMMZ stock as the format example and Ultima VII as the style example; the PM may spend up to 500 PixelLab generations to flesh out the world; and the PM may add catalogue rows for any asset the world needs (DEC-063).
-- 2026-10-01: The user directed Codex to repair the three pre-existing Z-range gate failures (`sparse_memory`, `old_layers_identical`, `matter_unchanged`) on NAT.02.MASS lane-do at 304ca7b2. This authorizes the specific test-harness and reference-file scope added to that lane's brief and manifest; the 5255f1a5 legacy-save and 1 ft comparison remain intact. No world-generation behavior or WBS status change was requested.
```

`git show 55599fc8 -- docs/VISION.md` adds that same line and no other change. The blob indexes are the reverse of the re-cut (`8d0c82fc` to `47835597`):

```
commit 55599fc831f19e9a6a2b0147d86d618e25356c47
Author: deus-codex <deus-ops@local.invalid>
Date:   Thu Oct 1 14:56:54 2026 -0500

    [codex] NAT.02.MASS repair zrange gate checks

diff --git a/docs/VISION.md b/docs/VISION.md
index 8d0c82fc..47835597 100644
--- a/docs/VISION.md
+++ b/docs/VISION.md
@@ -453,3 +453,4 @@ Append only, newest at the bottom.
 - 2026-10-01: The user removed the originality check entirely (DEC-061) and made the art council unanimous: one NAY rejects a piece, every NAY carries its reason, and the style bar is strict Ultima VII / EverQuest / English folklore, uniquely DEUS (DEC-062).
 - 2026-10-01: The user simplified the art council's question: the judges only confirm a piece is roughly the same quality as Ultima VII art and consistent with it; the PM confirms it can be tooled (DEC-062 amendment).
 - 2026-10-01: The user moved Group 3 from Nano Banana Pro to PixelLab (superseding the generator in the DEC-060 line above), set the style as "RMMZ reference, Ultima 7 style", limited the PM's art to Pixflux and Bitforge with no animals, monsters, people or animations, and ruled that a stump is its own tree cut down. Later the same day: tile sets the user made are never redone; the PM's art covers temperate Groups 3 to 6 plus trees and stumps; every RMMZ asset gets a DEUS asset, except that there is no icon set (inventory items are sprites dragged between containers, as in Ultima VII) and facesets and character sheets wait; the PM's art comes in RMMZ's own sheet formats, with RMMZ stock as the format example and Ultima VII as the style example; the PM may spend up to 500 PixelLab generations to flesh out the world; and the PM may add catalogue rows for any asset the world needs (DEC-063).
+- 2026-10-01: The user directed Codex to repair the three pre-existing Z-range gate failures (`sparse_memory`, `old_layers_identical`, `matter_unchanged`) on NAT.02.MASS lane-do at 304ca7b2. This authorizes the specific test-harness and reference-file scope added to that lane's brief and manifest; the 5255f1a5 legacy-save and 1 ft comparison remain intact. No world-generation behavior or WBS status change was requested.
```

The removed line is the line `55599fc8` added.

## Check 2 — lane.json against lane-do at 9ddcb6dc

Textual diff of the git blobs `9ddcb6dc:tasks/NAT.02.MASS/lane-do/lane.json` and `be662d81:tasks/NAT.02.MASS/lane-do2/lane.json`:

```
diff --git a/lane-do.json b/lane-do2.json
index 44e803f..119e37c 100644
--- a/lane-do.json
+++ b/lane-do2.json
@@ -1,7 +1,7 @@
 {
-  "lane": "lane-do",
+  "lane": "lane-do2",
   "taskId": "NAT.02.MASS",
-  "branch": "task/lane-do",
+  "branch": "task/lane-do2",
   "writer": "codex",
   "reviewer": "grok",
   "allowedPaths": [
@@ -25,8 +25,8 @@
     "tools/zrange/zrange_suite.js",
     "tools/zrange/bounds.js",
     "tools/zrange/fixtures/geology_304ca7b2_seed18.json",
-    "docs/VISION.md",
-    "tasks/NAT.02.MASS/lane-do/**"
+    "tasks/NAT.02.MASS/lane-do/**",
+    "tasks/NAT.02.MASS/lane-do2/**"
   ],
   "gateTests": [
     {
```

`git diff --no-index` exits 1 when the files differ. That is this diff: `lane` becomes `lane-do2`, `branch` becomes `task/lane-do2`, `docs/VISION.md` is removed from `allowedPaths`, and `tasks/NAT.02.MASS/lane-do2/**` is added. The temp copies also printed an autocrlf warning (`LF will be replaced by CRLF`); the hunk above is the blob diff.

A JSON compare of the same two blobs printed:

```
keys equal true
lane lane-do -> lane-do2
branch task/lane-do -> task/lane-do2
taskId NAT.02.MASS NAT.02.MASS
writer codex codex
reviewer grok grok
only in a [ 'docs/VISION.md' ]
only in b [ 'tasks/NAT.02.MASS/lane-do2/**' ]
shared order preserved true
gateTests equal true
other fields equal true
a path count 22 b 22
```

No other field differs. `gateTests` is unchanged, including `node tools/zrange/scan_z_literals.js` and `node tools/test_zrange.js`.

## Check 3 — gateTests

Each `gateTests` command was run in this worktree, one at a time, and waited on until it exited. The result line and `EXIT:` line from each run:

```
node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
EXIT:0

node tools/sim/test_materials.js
RESULT: 114 passed, 0 failed
EXIT:0

node tools/sim/test_ledger.js
mutants: 42; run time 11627 ms
RESULT: 119 passed, 0 failed
EXIT:0

node tools/sim/test_ledger_longrun.js
RESULT: 18 passed, 0 failed
EXIT:0

node tools/sim/test_reclaim.js
RESULT: 38 passed, 0 failed
EXIT:0

node tools/sim/test_reclaim_longrun.js
CHECKSUM seed1 1afb4f75
CHECKSUM seed2 54b9da8d
RESULT: 20 passed, 0 failed
EXIT:0

node tools/sim/test_living_world_rules.js
RESULT: PASS (0 failed)
EXIT:0

node tools/sim/test_water_dynamics.js
RESULT: PASS (0 failed)
EXIT:0

node tools/test_fluid_correctness_lane_cw.js
RESULT: 46 passed, 0 failed
EXIT:0

node tools/sim/migrate_mass_units.js --check
CHECK: OK (materials.json and mass_tables.json are integer centipounds)
EXIT:0

node tools/world_items/test_world_items.js
RESULT: 86 passed, 0 failed
EXIT:0

node tools/sim/test_decay_core.js
decay core 87 passed, 0 failed
EXIT:0

node tools/zrange/scan_z_literals.js
scan: 139 line(s) with a Z-range pattern in 22 plugins under C:\Users\snewt\.deus_worktrees\lane-do2; 139 allowed by 116 allow-list entries; 0 not allowed; 0 stale entries
EXIT:0

node tools/test_zrange.js
RESULT: 10 passed, 0 failed (exit 0)
EXIT:0

node tools/spells/validate_spell_effects.js
validated committed data: 121 effect records, 257 primitive instances, 26 rule groups
by basis {"srd":202,"deus":55}; by ledger mode {"policy":24,"none":169,"transform":30,"source":26,"relocate":7,"sink":1}
errors 0
EXIT:0
```

`test_ledger_longrun.js` finished in 23.44 s (process exit 0). `test_zrange.js` finished in 280.11 s (process exit 0); its ten checks include `sparse_memory`, `old_layers_identical`, and `matter_unchanged`. `test_fluid_correctness_lane_cw.js` also printed a Node warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set. The process exit was still 0 and the result line is `RESULT: 46 passed, 0 failed`.

All fifteen gate commands exited 0.

## Check 4 — clean merge with origin/main

`git fetch origin`, then `git merge-tree --write-tree origin/main HEAD`:

```
FETCH_EXIT:0
d2203be0a45d5221ebd190d8ed9941ee3c0c7024
MERGE_TREE_EXIT:0
```

`git fetch origin` printed nothing else and exited 0. `git merge-tree --write-tree origin/main HEAD` wrote tree `d2203be0a45d5221ebd190d8ed9941ee3c0c7024` and exited 0. `git rev-parse HEAD` after that was still `be662d81e80e9f14450738c1707f85222ff9de9a`.

## Result

The diff from `9ddcb6dc3a9f589e18050994f27417ee304735d5` is only the new brief, the new manifest, and the removal of the one `docs/VISION.md` line `55599fc831f19e9a6a2b0147d86d618e25356c47` added. The manifest matches lane-do at that parent except `lane`, `branch`, the dropped `docs/VISION.md` path, and the added `tasks/NAT.02.MASS/lane-do2/**` path. Every manifest gate test exited 0. The tip merges cleanly with `origin/main`.

VERDICT: CLEAN PASS

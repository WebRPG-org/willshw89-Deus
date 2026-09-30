# WG.20.02 lane-cs2 independent review (Grok), pass 3

Target Commit SHA: 0f44521c582ce7ab716abc12652a3d0dfaadec3f
Reviewer Family: xai (Grok)
Reviewer: Grok. This file is the review. No source file, catalogue, card, builder, art file, or manifest was edited by this review. No art was generated.

Reviewed tip, from `git rev-parse HEAD` in `C:\Users\snewt\.deus_worktrees\lane-cs2` on `task/lane-cs2` before this commit:

```
0f44521c582ce7ab716abc12652a3d0dfaadec3f
```

Parent: `6299d0eb89cbc209575fffa47960be01d6f56b69` (`[grok] WG.20.02: independent review of lane-cs2 tip aa47b74f`).
Commit under review: `0f44521c582ce7ab716abc12652a3d0dfaadec3f` (`[pm] WG.20.02 lane-cs2 manifest in merge_gate format (gateTests)`), author `deus-ops`, 2026-09-30 14:59:58 -0500. Subject tag is `[pm]`. That commit's only path is `tasks/WG.20.02/lane-cs2/lane.json`.

Node used for every command below: v24.19.0. Working directory: `C:\Users\snewt\.deus_worktrees\lane-cs2`. Run time: 2026-09-30, about 15:09–15:12 -0500. After the commands, `git status --short` was only the pre-existing untracked `tasks/WG.20.02/lane-cs2/launches/` directory. This review does not add it.

## Change since the previous CLEAN PASS

Previous CLEAN PASS tip: `aa47b74fdd0a9448946dbc5e9a9fff5162e21123` (`[codex] WG.20.02 update catalogue reference pin for OWNER_DECISIONS.md`), recorded in `tasks/WG.20.02/lane-cs2/review_grok_aa47b74f.md`. That tip is an ancestor of this tip.

`git log --oneline aa47b74f..0f44521c`:

```
0f44521c [pm] WG.20.02 lane-cs2 manifest in merge_gate format (gateTests)
6299d0eb [grok] WG.20.02: independent review of lane-cs2 tip aa47b74f
```

`git diff --name-status aa47b74f HEAD` (this tip, before this review file):

| Status | Path | Commit |
|---|---|---|
| M | `tasks/WG.20.02/lane-cs2/lane.json` | `0f44521c` only |
| A | `tasks/WG.20.02/lane-cs2/review_grok_aa47b74f.md` | `6299d0eb` only |

`6299d0eb` is the review artifact of the previous CLEAN PASS. It does not change catalogue, cards, builder, or the manifest. The only change to lane product or manifest content since `aa47b74f` is the PM manifest-format commit `0f44521c`.

`git diff --numstat aa47b74f HEAD` for `lane.json` is 22 insertions and 13 deletions. Allowed paths, lane, task id, branch, writer, and reviewer are unchanged. The old `gates` array is replaced by `gateTests`. Command equivalence:

| Old `gates[].command` (exitCode 0) | New `gateTests` `cmd` + `args` |
|---|---|
| `node tools/check_deus_syntax.js` | `node` `tools/check_deus_syntax.js` |
| `node tools/test_palette.js` | `node` `tools/test_palette.js` |
| `node tools/art/test_catalogue.js` | `node` `tools/art/test_catalogue.js` |
| `node tasks/WG.20.02/lane-cs2/check_cards1.cjs --self-test` | `node` `tasks/WG.20.02/lane-cs2/check_cards1.cjs` `--self-test` |

Each new entry sets `timeoutSec` 900. `tools/governance/merge_gate.js` uses 600 when `timeoutSec` is omitted (`DEFAULT_TIMEOUT_SEC`). The old `gates` objects were not a shape `merge_gate.js` accepts (`validateManifest` requires `gateTests`), so they never supplied a timeout to the gate. The four commands are the same.

## Manifest

`tasks/WG.20.02/lane-cs2/lane.json` at this tip is valid JSON. `validateManifest` from `tools/governance/merge_gate.js` returns no errors. Keys: `lane`, `taskId`, `branch`, `writer`, `reviewer`, `allowedPaths`, `gateTests`.

- `lane` `lane-cs2`, `taskId` `WG.20.02`, `branch` `task/lane-cs2`.
- `writer` `codex`, `reviewer` `grok` (different families).
- `allowedPaths` is a non-empty array of relative forward-slash globs, same seven entries as at `aa47b74f`.
- `gateTests` is four objects. Each `cmd` is `node`, each `args` is an array of strings, each `timeoutSec` is 900.

Blob at tip: `0cee27c7b203e2323130f06504b123b63685d7ca`.

Manifest history (`git log` of that path):

| Commit | Subject tag | Trusted by `trustedManifestCommit` |
|---|---|---|
| `0f44521c582ce7ab716abc12652a3d0dfaadec3f` | `[pm]` | yes (single parent, `[pm]`) |
| `f850afbe90f19ecbe905316cf9883929169fef65` | `[gemini]` | yes (single parent, gemini family) |

The dry-run below reports `(a) manifest` PASS.

## Scope

`git merge-base` of local `main` `e05e95797cbe1713e284d7af6c542b79276e2d36` and this tip is `e0b7404ac553921da684858e7554d62646f0bac9`. `git diff --name-status --no-renames e0b7404a HEAD` is 22 paths. The dry-run marked every one `In allowedPaths: yes`. The path added since the pass-2 review is `tasks/WG.20.02/lane-cs2/review_grok_aa47b74f.md`. Image suffixes and `game/` paths are absent from that diff. `0f44521c` itself does not touch `art/catalogue/catalogue.json`, `docs/art/catalogue/INDEX.md`, or `tools/art/build_catalogue.js`.

## Gate test results

### Probe named in the review dispatch

Command:

```
node tasks/WG.20.02/lane-cs2/test_card_syntax.js
```

Exit code: 1.

```
node:internal/modules/cjs/loader:1520
  throw err;
  ^

Error: Cannot find module 'C:\Users\snewt\.deus_worktrees\lane-cs2\tasks\WG.20.02\lane-cs2\test_card_syntax.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
    at Module._load (node:internal/modules/cjs/loader:1294:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
```

That path is not in the tree at this tip and is not a `gateTests` entry. `git diff aa47b74f HEAD` does not add or delete it. The manifest's card gate is `check_cards1.cjs --self-test`, which exited 0. This missing-module probe is not a failure of the lane at `0f44521c`.

### Manifest gates, this worktree

| # | Command | Exit |
|---|---|---|
| 1 | `node tools/check_deus_syntax.js` | 0 |
| 2 | `node tools/test_palette.js` | 0 |
| 3 | `node tools/art/test_catalogue.js` | 0 |
| 4 | `node tasks/WG.20.02/lane-cs2/check_cards1.cjs --self-test` | 0 |

Syntax log:

```
Checked 62 DEUS plugin files. Errors: 0
```

Palette log:

```
Palette loaded successfully
```

CARDS-1 self-test log:

```
PASS cards1.metadata
PASS cards1.reject_metadata: mutated input rejected
PASS cards1.preserve_existing
PASS cards1.reject_preserve_existing: mutated input rejected
PASS cards1.actual_catalogue_structure
PASS cards1.reject_actual_catalogue_structure: mutated input rejected
PASS cards1.card_links
PASS cards1.reject_card_links: mutated input rejected
PASS cards1.terrain_gates
PASS cards1.reject_terrain_gates: mutated input rejected
PASS cards1.static_first
PASS cards1.reject_static_first: mutated input rejected
PASS cards1.references_and_text
PASS cards1.reject_references_and_text: mutated input rejected
RESULT: 14 passed, 0 failed (lane checks only; required schema/rebuild gate remains separate)
```

Catalogue log (47/47). `rebuild_identical` still matches the committed catalogue; sha256 prefix `1184fba0bba18d21` is the same prefix recorded in the pass-2 CLEAN PASS.

```
PASS catalogue.schema: $id deus-art-catalogue/1.2.0; unsupported keywords 0; 10122 entries, 187 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10122 entries checked; 0 bad
PASS catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: none; catalogue.json sha256 1184fba0bba18d21...
PASS catalogue.rule_derived_derived_base: a derivedFrom pointing at a derived base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT: derivedFrom LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT is itself derived)
PASS catalogue.rule_derived_missing_base: a derivedFrom pointing at a missing base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: derivedFrom SURFACE_SHARED_EDGE_NOSUCH_S-H2_DEFAULT is missing)
PASS catalogue.rule_dup_id: a duplicate id: baseline fixture 0 errors; patched fixture -> 1 DUP_ID (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate entry id)
PASS catalogue.rule_dup_slot: a duplicate slotId: baseline fixture 0 errors; patched fixture -> 1 DUP_SLOT (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate slotId ATLAS_SURFACE_SHARED_PROP_01:0036)
PASS catalogue.rule_geom_height: a geometry-derived slot height that is not computed from stratumPx/layerPx: baseline fixture 0 errors; patched fixture -> 1 GEOM_HEIGHT (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: height 38/48/48 is not 38/38/39 from stratumPx/layerPx)
PASS catalogue.rule_missing_anchor: a missing anchor: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing anchor)
PASS catalogue.rule_missing_envelope: a missing envelope: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing envelope)
PASS catalogue.rule_missing_footprint: a missing footprint: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing footprint)
PASS catalogue.rule_missing_ramp: a missing palette ramp: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing palette ramp)
PASS catalogue.rule_missing_size: a missing size (frames): baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing size (frames))
PASS catalogue.rule_no_source: an entry that traces to no source: baseline fixture 0 errors; patched fixture -> 1 NO_SOURCE (ALL_SHARED_ITEM_LOG_V1_DEFAULT: entry traces to no source)
PASS catalogue.rule_oos_no_reason: an outOfScope row without a reason: baseline fixture 0 errors; patched fixture -> 1 OOS_NO_REASON (skins:human: outOfScope row without a reason)
PASS catalogue.rule_paperdoll_anchor: a paper-doll part whose anchor differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: anchor differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT)
PASS catalogue.rule_paperdoll_frames: a paper-doll part whose frame layout differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: frame layout [16,4,["S","W","E","N"]] differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT [3,4,["S","W","E","N"]])
PASS catalogue.rule_ramp_unknown: a ramp id not in the palette registry: baseline fixture 0 errors; patched fixture -> 1 RAMP_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: ramp NOT_A_REGISTRY_RAMP is not in the palette registry)
PASS catalogue.rule_scalerow_unknown: a scaleRow not in scale_chart.json: baseline fixture 0 errors; patched fixture -> 1 SCALEROW_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: scaleRow TREE_NOT_IN_THE_CHART is not in scale_chart.json or size_classes.json)
PASS catalogue.rule_sheet_not_grid: a sheet side not a multiple of 48: baseline fixture 0 errors; patched fixture -> 1 SHEET_NOT_GRID (ATLAS_SURFACE_SHARED_PROP_01: atlas 2880x150 is not a multiple of 48)
PASS catalogue.rule_sheet_too_large: an atlas side over 4096: baseline fixture 0 errors; patched fixture -> 1 SHEET_TOO_LARGE (ATLAS_SURFACE_SHARED_PROP_01: atlas 4128x144 is over 4096)
PASS catalogue.rule_size_outside_row: a size outside its chart row min/max: baseline fixture 0 errors; patched fixture -> 1 SIZE_OUTSIDE_ROW (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: envelope outside TREE_COMMON_OAK min/max)
PASS catalogue.rule_slot_off_grid: a slot off the 48 grid: baseline fixture 0 errors; patched fixture -> 1 SLOT_OFF_GRID (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot 2071,0 96x96 is off the 48 grid)
PASS catalogue.rule_slot_outside_sheet: a slot outside its sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OUTSIDE_SHEET (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot leaves ATLAS_SURFACE_SHARED_PROP_01 (2880x144))
PASS catalogue.rule_slot_overlap: overlapping slot rects in a sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OVERLAP (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: overlaps SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT in ATLAS_SURFACE_SHARED_TILE_01)
PASS catalogue.rule_slot_too_small: a slot smaller than the chart envelope: baseline fixture 0 errors; patched fixture -> 1 SLOT_TOO_SMALL (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot cell 96x48 is smaller than the envelope 80x96)
PASS catalogue.rule_source_dropped: a source id dropped without an outOfScope reason: baseline fixture 0 errors; patched fixture -> 1 SOURCE_DROPPED (objects:fixture_only_id: catalog source id "objects:fixture_only_id" maps to no entry and has no outOfScope reason)
PASS catalogue.rule_variant_has_slot: a variant (derivedFrom set) with a paint slot: baseline fixture 0 errors; patched fixture -> 1 VARIANT_HAS_SLOT (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: a variant row owns a paint slot)
PASS catalogue.rule_z_out_of_range: a zMin/zMax outside the geometry range: baseline fixture 0 errors; patched fixture -> 1 Z_OUT_OF_RANGE (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: z 0..40 outside -16..15)
PASS catalogue.rule_coverage: 19 FAIL rules, 26 fixture cases; rules without a case: none
PASS catalogue.live_catalogue_valid: real build: 10122 entries, 0 rule errors
PASS catalogue.scale_chart_vs_registry: 39 registry rows for 39 registry classes; 17 STRIP rows (+ 1 tile label); 0 problems
PASS catalogue.geometry_stratum_sum: stratumPx [19,19,19,19,20] sums to 96 (layerPx 96); geometry errors 0; stratum_invalid_zero rejected, stratum_invalid_sum rejected
PASS catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 4/4 slot heights changed (EDGE_MEADOW_S-H2 48->96, WALLFACE_OPENING_H2 48->96, RAMP_MEADOW_N-C2 96->144, RAMPSIDE_MEADOW_E-H2 48->96); [20,19,19,19,19]: 3/3 target heights changed (19->20, 57->58, 124->125)
PASS catalogue.geometry_no_literal_layer_count: 0 lines with a literal 9 or 32 in build_catalogue.js
PASS catalogue.geometry_nine_layers: 9-layer fixture (z -4..4): build OK, 10122 entries, 0 outside z range, 5 bands
PASS catalogue.size_srd: 9 race rows checked against SRD Size traits and 7 px/ft; 6 ft human = 42 px (humanPx 42); 7 frame-class rows; 0 problems
PASS catalogue.size_footprint_frame_separate: 129 creature/character/equipment entries carry footprint (squares) and frameClass (px frame) separately; e.g. ALL_SHARED_CREATURE_GIANT-SPIDER_V1_DEFAULT footprint 2x2 squares, frame 96x48 px; 0 problems
PASS catalogue.size_frame_classes: TINY 8 / LARGE_TALL 6 / LARGE_LONG 6 entries with the right cells; 96x96 Large frames: 0; HUGE/GARGANTUAN null frames without slots; TINY footprint 24x24 in a 48x48 frame: true; 0 problems
PASS catalogue.size_optional_params: defaults OFF: true; TALL_MEDIUM entries default 0, enabled 5 (slots 144x384); readability floor on: GNOME 21/25/28 -> 26/27/28, HALFLING 21/21/21 -> 26/27/28
PASS catalogue.size_character_blocks: 129 character/creature/equipment slots in 3x4-frame blocks (144x192, 144x384, 288x192); RMMZ character sheets not 3x4: 0; 0 problems
PASS catalogue.coverage: WorldCatalog ids 246/246; brief anchor/ui/eq/face ids 36/36; manifest rows 18/18; open AR rows 49/49; addendum family x band cells: 65/65
PASS catalogue.references_hash: 27 references, 26 tracked re-hashed and matching; 1 untracked (UNVERIFIED_ABSENT); entries with unknown references: 0; 0 problems
PASS catalogue.depth_no_colours: 7595 DEPTH_<band> rows: 0 colour values, 0 colour keys; 5 depth palette placeholders, 0 with colours; variant rows with a paint slot: 0
PASS catalogue.no_image_data: image files under art/catalogue, docs/art/catalogue, tools/art/fixtures/catalogue: 0; outputs with embedded image data: 0
PASS catalogue.schema_doc_terrains: 29 terrains used; SCHEMA.md lists 30; missing none; extra none
PASS catalogue.conflicts_required: 19/19 required topics present; conflicts.md 134 lines
```

### merge_gate dry run, before this review commit

Command:

```
node tools/governance/merge_gate.js --lane lane-cs2 --manifest tasks/WG.20.02/lane-cs2/lane.json --dry-run
```

Exit code: 1. Duration about 79 s. Checked sha was `0f44521c582ce7ab716abc12652a3d0dfaadec3f`. Fresh-clone gate tests all exited 0. The process refusal is not a test failure.

```
.. test 1/4: node tools/check_deus_syntax.js (timeout 900 s) in C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-9XGYKW\clone-1
.. test 2/4: node tools/test_palette.js (timeout 900 s) in C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-9XGYKW\clone-2
.. test 3/4: node tools/art/test_catalogue.js (timeout 900 s) in C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-9XGYKW\clone-3
.. test 4/4: node tasks/WG.20.02/lane-cs2/check_cards1.cjs --self-test (timeout 900 s) in C:\Users\snewt\AppData\Local\Temp\deus-merge-gate-9XGYKW\clone-4

# DEUS merge gate summary (tools/governance/merge_gate.js)
| Item | Value |
|---|---|
| lane | lane-cs2 |
| branch | task/lane-cs2 |
| manifest | tasks/WG.20.02/lane-cs2/lane.json |
| mode | dry-run |
| repository | C:\Users\snewt\.deus_worktrees\lane-cs2 |

## Refs (raw values after git fetch origin)
| Ref | Command | Hash |
|---|---|---|
| local branch | git rev-parse refs/heads/task/lane-cs2 | 0f44521c582ce7ab716abc12652a3d0dfaadec3f |
| tracking ref | git rev-parse refs/remotes/origin/task/lane-cs2 | 0f44521c582ce7ab716abc12652a3d0dfaadec3f |
| remote branch | git ls-remote origin refs/heads/task/lane-cs2 | 0f44521c582ce7ab716abc12652a3d0dfaadec3f |
| local main | git rev-parse refs/heads/main | e05e95797cbe1713e284d7af6c542b79276e2d36 |
| tracking main | git rev-parse refs/remotes/origin/main | e05e95797cbe1713e284d7af6c542b79276e2d36 |
| remote main | git ls-remote origin refs/heads/main | e05e95797cbe1713e284d7af6c542b79276e2d36 |
| main worktree | git worktree list --porcelain | C:/Users/snewt/OneDrive/Desktop/UF |
| merge-base | git merge-base e05e9579 0f44521c | e0b7404ac553921da684858e7554d62646f0bac9 |
| checked sha | (local branch tip; every check reads this commit) | 0f44521c582ce7ab716abc12652a3d0dfaadec3f |

## Tests (spawnSync, no shell; each in a fresh clone at the checked sha)
| # | Command | Timeout | Exit | Duration | Result |
|---|---|---|---|---|---|
| 1 | node tools/check_deus_syntax.js | 900 s | 0 | 5.54 s | PASS |
| 2 | node tools/test_palette.js | 900 s | 0 | 0.08 s | PASS |
| 3 | node tools/art/test_catalogue.js | 900 s | 0 | 9.28 s | PASS |
| 4 | node tasks/WG.20.02/lane-cs2/check_cards1.cjs --self-test | 900 s | 0 | 3.35 s | PASS |

## Checks
| Check | Result | Reason codes |
|---|---|---|
| refs | PASS | - |
| (a) manifest | PASS | - |
| (a) scope | PASS | - |
| (b) review | REFUSED | REVIEW_NOT_LAST |
| (c) tests | PASS | - |
| (d) pushed | PASS | - |
| (e) main | REFUSED | MAIN_DIRTY |
| (f) execution | NOT RUN (refused) | - |

REFUSED MAIN_DIRTY: C:/Users/snewt/OneDrive/Desktop/UF has uncommitted tracked changes or an operation in progress: M docs/agents/mailboxes/fable/outbox.jsonl; M docs/agents/mailboxes/gemini/inbox.jsonl; M docs/telemetry/sessions/active_workers.json
REFUSED REVIEW_NOT_LAST: review commit 6299d0eb89cbc209575fffa47960be01d6f56b69 "[grok] WG.20.02: independent review of lane-cs2 tip aa47b74f" is followed by 1 commit(s): 0f44521c "[pm] WG.20.02 lane-cs2 manifest in merge_gate format (gateTests)"
GATE: REFUSED (exit 1)
```

`REVIEW_NOT_LAST` is this dry-run's view of the tip before a review of `0f44521c` exists. This commit is that review. It adds only `tasks/WG.20.02/lane-cs2/review_grok_0f44521c.md`. The last non-review commit under it is `0f44521c582ce7ab716abc12652a3d0dfaadec3f`.

`MAIN_DIRTY` is the `main` worktree at `C:/Users/snewt/OneDrive/Desktop/UF`, three tracked paths outside this lane (two mailbox logs and `active_workers.json`). This review does not edit, revert, or delete those files. Local `main`, `origin/main`, and `ls-remote` `main` were the same commit `e05e95797cbe1713e284d7af6c542b79276e2d36`. The lane branch matches `origin/task/lane-cs2` at this tip. Clearing `MAIN_DIRTY` belongs to the integrator, on that checkout, before a non-dry-run merge.

## Final verdict

The tip `0f44521c582ce7ab716abc12652a3d0dfaadec3f` is a `[pm]` rewrite of `lane.json` into the `gateTests` shape `merge_gate.js` validates. Manifest, scope, push, and all four gate tests passed on that sha, in this worktree and in fresh clones. Catalogue, cards, and the builder are unchanged since the CLEAN PASS at `aa47b74fdd0a9448946dbc5e9a9fff5162e21123`.

VERDICT: CLEAN PASS

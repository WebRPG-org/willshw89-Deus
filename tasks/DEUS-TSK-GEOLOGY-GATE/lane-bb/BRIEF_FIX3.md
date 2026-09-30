# BRIEF_FIX3: Lane BB (DEUS-TSK-GEOLOGY-GATE) — Grok Repair Pass for Codex Findings

**Date**: 2026-09-29  
**Lane**: lane-bb  
**Task ID**: DEUS-TSK-GEOLOGY-GATE  
**Worktree**: `C:\Users\snewt\.deus_worktrees\lane-bb`  
**Branch**: `task/lane-bb`  
**Writer**: Grok  
**Reviewer**: Codex (workspace-write sandbox)  
**Authority**: Owner Directive (2026-09-29: "launch Grok on lane-bb now with the four-finding brief. Each fix comes with a test that fails before the fix and passes after. Codex re-reviews at the new tip").

---

## Mandate & Scope

Work only in `C:\Users\snewt\.deus_worktrees\lane-bb` on branch `task/lane-bb`.  
Allowed edit paths (`lane.json`):
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_historical_carrying_capacity.js`
- `tools/test_geology_strata.js`
- `tools/test_strata_foundation.js`
- `tasks/DEUS-TSK-GEOLOGY-GATE/**`

Every other plugin and test file is READ-ONLY.  
**NO ART GENERATION (DEC-007).**

---

## Assignment: Resolve the Four Codex Findings

Codex independently audited `6dd500c3` (see full report in `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/review_codex_6dd500c3.md`) and found 4 defects. Each fix MUST be accompanied by a test that fails before the fix and passes after.

### 1. BB-CODEX-01 — Live Biome Readers Omit World Description (MAJOR / P1)
- **Problem**: `kindGrid()` returns `null` when its 4th argument (`worldDesc`) is missing. `columnBiomeId()` and the outer-underground fallback in `biomeCodeAt()` call `kindGrid(ax, ay, W.state.size)` without `worldDesc`. As a result, `columnBiomeId()` returns `null` in coupled worlds, and `biomeAt()` loses the substrate biome below core levels (Z < -2: e.g. Z = -3, -9, -16).
- **Required Fix**:
  1. In `game/js/plugins/DEUS_Levels.js`, pass the loaded world description (`W.state` or `st`) to `kindGrid(ax, ay, W.state.size, W.state)` in `columnBiomeId()` and `biomeCodeAt()`.
  2. Add test coverage in `tools/test_geology_strata.js` (or `test_strata_cuts_and_caves.js`) verifying that for a coupled New Game (e.g. seed 18, default range -16..+15), `Levels.columnBiomeId(100, 100, z)` and `Levels.biomeAt({ area, x: 100, y: 100, z })` return the expected biome IDs (e.g. `rooted_loam` at -3, `deep_mine_belt` at -9/-16) instead of `null`.
  3. Ensure the test fails before the fix and passes after.

### 2. BB-CODEX-02 — Generator-5 Cache Key Defaults Absent Coupling to True (MAJOR / P1)
- **Problem**: In `DEUS_Levels.js:2503–2506`, `volumeOf()` constructs its cache key with:
  ```js
  const vbc = desc.verticalBiomeCoupling !== undefined ? desc.verticalBiomeCoupling : true;
  ```
  This defaults an absent flag to `true`, causing a warm cache key collision between coupled worlds and legacy flag-absent saves with the same seed and geometry.
- **Required Fix**:
  1. In `volumeOf()`, use `const vbc = couplingActive(desc);` (or `!!(desc && desc.verticalBiomeCoupling)`) so an absent flag evaluates to `0` (uncoupled), matching `couplingActive()`.
  2. Add a test in `tools/test_strata_foundation.js` (or `test_strata_cuts_and_caves.js`) verifying that loading a flag-absent generator-5 save in a warm process after a coupled world with the same seed does not reuse the coupled volume from cache.
  3. Ensure the test fails before the fix and passes after.

### 3. BB-CODEX-03 — Foreign-World Checksum Description Partly Honored (MAJOR / P2)
- **Problem**: In `DEUS_Levels.js:1076–1113`, `checksumOf()` calculated `areasX` and `areasY` from `worldDesc`, but the area loops still iterated `ax < st.areasX; ay < st.areasY` using the live loaded world state `st`.
- **Required Fix**:
  1. In `checksumOf()`, loop over `areasX` and `areasY` from `desc` (`for (let ay = 0; ay < areasY; ay++) for (let ax = 0; ax < areasX; ax++)`).
  2. Ensure the cell/ground sampling does not shadow or read live `st` when `desc` is provided.
  3. Add test coverage in `tools/test_strata_cuts_and_caves.js` verifying that generating foreign-world checksums for a world with different area counts (e.g. 2x1 vs 1x1) matches its own native checksums.
  4. Ensure the test fails before the fix and passes after.

### 4. BB-CODEX-04 — Cuts/Caves Mutation Anchors Broken (MAJOR / P2)
- **Problem**: `carveNaturalFeatures()` signature gained `worldDesc` (`carveNaturalFeatures(seed, gen, ax, ay, size, bs, worldDesc)`), but `tools/test_strata_cuts_and_caves.js` still contains old mutant injection search anchors matching the 6-arg signature without `worldDesc`. This causes `--mutant=no_features` and `--mutant=error_injected` to exit 2 with "target not found".
- **Required Fix**:
  1. In `tools/test_strata_cuts_and_caves.js`, update the mutant replacement anchors for `no_features` and `error_injected` to match the 7-parameter `carveNaturalFeatures` signature.
  2. Run `node tools/test_strata_cuts_and_caves.js --mutant=no_features` and `node tools/test_strata_cuts_and_caves.js --mutant=error_injected` and verify both exit 1 (detect the defect).

---

## Gate Verification Requirements

After implementing all four fixes:
1. Run all 5 manifest gate tests:
   ```powershell
   node tools/check_deus_syntax.js
   node tools/test_geology_strata.js
   node tools/test_historical_carrying_capacity.js
   node tools/test_strata_foundation.js
   node tools/test_strata_cuts_and_caves.js
   ```
   All 5 MUST exit 0.
2. Verify all mutant checks pass (exit 1).
3. Commit your changes:
   ```powershell
   git add game/js/plugins/DEUS_Levels.js game/js/plugins/DEUS_WorldGen.js tools/test_strata_cuts_and_caves.js tools/test_strata_foundation.js tools/test_geology_strata.js
   git commit -m "[grok] DEUS-TSK-GEOLOGY-GATE Fix3: resolve Codex review findings BB-CODEX-01..04"
   ```
4. Record your report in `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/REPORT.md`.

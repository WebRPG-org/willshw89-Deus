# BRIEF: WG.00.42 / lane-cx — WorldGen Quick Fixes

## 1. Context & Authority
- Authority: MSG-PRUNE-PM-030, MSG-PRUNE-PM-039, MSG-PRUNE-PM-040, MSG-PRUNE-PM-043, DEC-052
- Task ID: WG.00.42
- Lane: lane-cx
- Writer: Codex
- Reviewer: Grok
- World Name: Emerys (DEC-054)

## 2. Objective
Implement the three WorldGen quick fixes identified in SYSEVAL-B02 (MSG-PRUNE-PM-030):
1. **The start_in_middle branch that can never pass** (`game/js/plugins/DEUS_WorldGen.js:2024`):
   Fix the logic so that `start_in_middle` can execute correctly when requested or configured, resolving the impossible branch.
2. **The swallowed Ground-view timeout** (`game/js/plugins/DEUS_WorldGen.js:2004-2006`):
   Properly handle or bubble the timeout error instead of silently swallowing it, ensuring failures in Ground-view generation are observable and logged.
3. **The kitLog / stats key scheme** (`W.levelKey`):
   Standardize the levelKey formatting across kitLog and stats collections to eliminate key mismatches and inconsistencies.

## 3. Allowed Paths
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_worldgen_quickfixes.js`
- `tasks/WG.00.42/lane-cx/**`

## 4. Test & Mutant Requirements
- Create `tools/test_worldgen_quickfixes.js` verifying each of the three fixes.
- Each fix must have a targeted check that fails when the bug is reintroduced (3 mutants, each killed only by its targeted test).
- Gate tests:
  1. `node tools/check_deus_syntax.js` (0 errors)
  2. `node tools/test_worldgen_quickfixes.js` (all pass)
  3. Mutant verification proving each of the 3 mutants is killed.

## 5. Non-Goals
- Do NOT touch `rmmz_*.js`, `main.js`, or `game/js/libs/`.
- Do NOT edit `lane.json` (owned by coordinator).
- Do NOT touch art or catalogue files.

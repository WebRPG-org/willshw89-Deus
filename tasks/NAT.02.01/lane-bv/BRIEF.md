# BRIEF: NAT.02.01 — Structural Support & Cascading Collapse Engine

## 1. Objective & Authority
- **WBS ID**: `NAT.02.01`
- **Milestone**: Milestone 1 / Package 2 — Physical Matter & Structural Mechanics
- **Authority**: Owner Directive 2026-09-28 (Lean Natural World v1 Rationalization Approval)
- **Lane**: `lane-bv`
- **Writer**: `minimax` (via Cline / `minimax_cli.js`)
- **Reviewer**: `gemini` (Antigravity Coordinator)

## 2. Context & Existing Code Authorities
- `game/js/sim/materials.js`: Contains material definitions with density, compressive yield, and tensile yield.
- `game/js/sim/world_items/`: Contains ground item entity management, positioning, and physics.
- `game/js/sim/ledger.js`: Contains authoritative mass conservation ledger.
- `game/js/plugins/DEUS_Levels.js`: Contains 32-Z coordinate math and strata shape/material accessors.

## 3. Scope & Requirements
1. **Module `game/js/sim/structural/support.js`**:
   - `evalSupport(z, x, y)`:
     - Vertical compression: A solid cell resting directly on a solid cell below inherits ground support.
     - Horizontal cantilever tension: A solid cell with open space below must anchor horizontally to an adjacent supported solid cell. Maximum cantilever span is bounded by the material's `tensileYield / (density * gravity)`.
     - Returns `{ supported: boolean, load: number, maxCapacity: number }`.
2. **Module `game/js/sim/structural/collapse.js`**:
   - `executeCollapse(cells, world)`:
     - Removes solid stratum from collapsed cells (setting stratum shape to open).
     - Calculates total displaced mass using `materials.js` density and volume ($5 \times 5 \times 2 = 50\text{ cu ft}$ per stratum).
     - Spawns falling rubble item entities in `game/js/sim/world_items/` at the collapse coordinates.
     - Decrements solid environmental mass and increments loose item mass in `game/js/sim/ledger.js`, preserving net mass balance.
3. **Test Harness `tools/test_structural_collapse.js`**:
   - Automated tests with negative controls (AGENTS.md Rule 4):
     - `test_vertical_pillar_stable`: Solid column from bedrock up is 100% stable.
     - `test_cantilever_stable`: 1-tile granite overhang is stable.
     - `test_cantilever_collapse`: Over-extended beam (> limit) collapses.
     - `test_cavern_cave_in`: Hollowed ceiling with no pillars collapses into rubble.
     - `test_mass_conservation`: Net system mass before and after collapse matches to 6 decimal places in ledger.
   - Mutants in test harness able to fail each test.

## 4. Invariants & Rules
- Absolute Rule: ZERO ART GENERATION (`DEC-007`).
- Absolute Rule: Zero civilization, farming, or faction code (`DEC-037`).
- Discrete cellular math only: No floating-point finite element analysis (FEA) or academic mechanics.
- All code must pass `node tools/check_deus_syntax.js`.

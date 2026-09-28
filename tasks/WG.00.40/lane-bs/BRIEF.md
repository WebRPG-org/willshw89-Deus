# BRIEF: WG.00.40 — Physical World Objects & Direct Manipulation

## 1. Objective & Authority
- **WBS ID**: `WG.00.40`
- **Milestone**: Milestone 1 — Physical Substrate & Spatial Laws
- **Authority**: Owner Directive 2026-09-27 (Explicit Milestone 1 Execution Authorization)
- **Lane**: `lane-bs`
- **Writer**: `gemini`
- **Reviewer**: `grok`

## 2. Invariants & Ultima VII Physical Item Reality
1. **An Object Exists Exactly Once**:
   - Every physical item possesses a unique, stable positive integer ID (`item.id`) assigned upon instantiation.
   - An item occupies exactly ONE state at any moment:
     - Placed in world: indexed in spatial map at global coordinates `(gx, gy, gz)` / `(tileX, tileY, cellX, cellY, layer)`.
     - Nested in a container: `parentId = container.id`, absent from world spatial index.
     - Held/equipped by a unit: `heldBy = unit.id` or `hauledBy = unit.id`, absent from world spatial index.
   - Zero duplication, zero phantom items, zero ID re-use.

2. **Continuous Global Coordinates `(gx, gy, gz)`**:
   - Seamless mapping between discrete cell/tile coordinates and continuous global coordinates:
     - `gx = tileX + (cellX / CELLS_PER_TILE)`
     - `gy = tileY + (cellY / CELLS_PER_TILE)`
     - `gz = layer`
   - Full 768×768 tile world volume support ($0 \le gx < 768$, $0 \le gy < 768$) across 32 vertical levels ($-16 \le gz \le +15$).
   - Direct query API: `world.atGlobal(gx, gy, gz)`, `world.placeGlobal(spec)`, `world.moveToGlobal(itemId, gx, gy, gz)`.

3. **Cross-Seam Region Conservation**:
   - Items moving across region boundaries (e.g. $gx: 255.875 \rightarrow 256.0$ or $gy: 511.875 \rightarrow 512.0$) retain exact stable ID, revision, physical attributes, and contents.
   - Spatial indexing updates across chunk and region boundaries without object destruction or re-instantiation.

4. **Hierarchical Physical Container Nesting**:
   - Strict acyclic DAG containment (`containsDeep`).
   - Recursive weight calculation: total weight of a container equals container empty weight plus recursive sum of contents' total weights.
   - Exterior volume encapsulation: volume consumed by a container within a parent container is its exterior volume (`exteriorCuIn`), while internal items are constrained by its interior capacity (`capCuIn` and `capOz`).
   - Moving or transporting an outer container preserves all nested contents without ID churn.

5. **Surface Support & Vertical Elevation**:
   - Items resting on surfaces (tables, benches, chests, countertops) track `surfaceId` and `heightQuarters`.
   - Surfaces enforce load limits; overloading triggers load spill or structural collapse.
   - Destruction or movement of supporting surface causes supported items to drop to the underlying floor/ground.

6. **Direct Manipulation Precision**:
   - 6 px cell grid snapping for all drag-and-drop actions.
   - Sub-tile hit-testing and pick topmost resolution.
   - Cycling through overlapping stacked items.
   - Container open/close window interactions.

7. **Verification & Mutants (AGENTS.md Rule 4)**:
   - Comprehensive test harness `tools/world_items/test_persistent_objects.js`.
   - Every invariant tested against injected mutations confirming tests are able to fail.

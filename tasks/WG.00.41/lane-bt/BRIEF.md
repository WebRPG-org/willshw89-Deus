# BRIEF: WG.00.41 — 32-Layer Column Generation & Deep-Cut / Region-Seam Integrity Gate

## 1. Objective & Authority
- **WBS ID**: `WG.00.41`
- **Milestone**: Milestone 1 — Physical Substrate & Spatial Laws
- **Authority**: Owner Directive 2026-09-27 / Lean Rationalization Approval 2026-09-28
- **Lane**: `lane-bt`
- **Writer**: `claude` (Sonnet)
- **Reviewer**: `grok`

## 2. Invariants & Scope Requirements
1. **Full 32-Layer World Volume**:
   - $Z \in [-16 \dots +15]$ (32 discrete layers, surface baseline at 0).
   - Horizontal volume: $768 \times 768$ tiles ($3 \times 3$ regions of $256 \times 256$ tiles each).
   - Zero discovery-time RNG: all layers and column strata are purely deterministic functions of world seed and continuous coordinates $(gx, gy, gz)$.

2. **Five Depth Bands & Sky Cap**:
   - **Highlands**: $+7 \dots +11$ (mountain peaks, exposed rock crags)
   - **Uplands**: $+2 \dots +6$ (rolling hills, plateaus, cliffs)
   - **Lowlands**: $-4 \dots +1$ (surface biomes, riverbeds, topsoil, shallow bedrock)
   - **Caverns**: $-10 \dots -5$ (limestone karst, subterranean chambers, salt beds)
   - **Deep Earth**: $-16 \dots -11$ (deep mantle rock, ore veins, magma belts)
   - **Reserved Open Air**: $+12 \dots +15$ (4 top layers reserved exclusively as open air; no natural terrain may spawn above $+11$).

3. **12 Adjacent Region Boundary Seams**:
   - 6 North-South vertical seam segments across the 2 global vertical dividing lines ($gx = 255 \leftrightarrow 256$, $gx = 511 \leftrightarrow 512$).
   - 6 East-West horizontal seam segments across the 2 global horizontal dividing lines ($gy = 255 \leftrightarrow 256$, $gy = 511 \leftrightarrow 512$).
   - Strict elevation, stratum, and passability continuity across all 12 seams. No abrupt drop-offs, mismatched strata, or tiling artifacts.

4. **Deep-Cut Torture Probes**:
   - Shallow cut: 1–2Z depth excavation.
   - Ravine probe: 4–6Z depth vertical gorge.
   - Canyon probe: 10+Z depth chasm cutting across depth bands.
   - Full bore probe: $+15 \dots -16$ complete vertical core sample verifying strata transitions and void integrity.

5. **Test Harness**:
   - `tools/test_region_seam_continuity.js` executes and passes 100% of checks.
   - Automated mutant verification kills all introduced defects (AGENTS.md Rule 4).

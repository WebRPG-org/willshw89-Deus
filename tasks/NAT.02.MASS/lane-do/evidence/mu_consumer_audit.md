# Consumer Audit: `materials.js` Backward-Compatibility Aliases (`mu` vs `cp`)

**Task**: NAT.02.MASS / lane-do  
**Date**: 2026-10-01  
**Authority**: In response to PM directive `MSG-PRUNE-PM-091` (Item 4)  

---

## 1. Summary of Aliases Introduced in `lane-do`

In `c4a06562`, `materials.js`, `materials.json`, and `mass_tables.json` were converted from legacy mass units (`mu`, grams) to integer centipounds (`cp`, 1 lb = 100 cp).

Because `game/js/sim/reclaim.js` is out of scope for `lane-do` and explicitly scheduled for migration in **`lane-dr`** ("reclaim/world_items fields (lane-dr)"), backward-compatibility aliases were provided in `materials.js`:
- `res.unmapped.mu = res.unmapped.cp` (`material(id)`)
- `p.mu = p.cp` (`yieldOf()`)
- `lines[i].mu = lines[i].cp` (`billOfMaterials()`)
- `totalMu = totalCp` (`billOfMaterials()`)
- `elementMu = elementCp` (`billOfMaterials()`)
- `b.lines[i].mu = b.lines[i].cp` (`billOfMaterials()`)

---

## 2. Complete Census of Consumers Reading `mu`

A full-codebase grep across `game/js/plugins/`, `game/js/sim/`, and `tools/` reveals every site reading or referencing `.mu`:

### A. Production Simulation Code

1. **`game/js/sim/materials.js`**:
   - Lines 88, 158, 178, 187, 198: Sets the compatibility alias fields on returned objects.
   - Line 594: `var bTot = m.bill.totalCp != null ? m.bill.totalCp : m.bill.totalMu;` (validator fallback).

2. **`game/js/sim/reclaim.js`**:
   - Line 613: `mu = mul(line.mu, count);` (reads line mass from BOM).
   - Line 673: `const unmapped = m && m.unmapped && isAmount(m.unmapped.mu) ? m.unmapped.mu : 0;` (reads unmapped residue).
   - Line 698: `if (!line || !line.class || !isAmount(line.mu)) return soft("E_NO_DATA", id);` (validates line mass).
   - Line 705: `amount: mul(line.mu, count),` (uses line mass).
   - Lines 193, 215-217, 228-241, 249, 260, 390, 411, 490-498, 513, 844-861, 893-922: Internal place tracking using property name `.mu`.

3. **`game/js/sim/decay/core.js`**:
   - Lines 175, 182-187, 200-201: Validates `rec.mu` in booking records passed to `ledger.transform()` and `ledger.sink()`.
   - *Note*: `decay/core.js` does NOT import `materials.js` or `mass_tables.json`. It receives bookings from caller sessions.

4. **`game/js/plugins/` (RMMZ runtime plugins)**:
   - **ZERO** usages. No plugin in `game/js/plugins/` imports `materials.js`, calls `billOfMaterials()`, or reads `totalMu`/`.mu`.

### B. Test Suites and Tooling

1. **`tools/sim/test_materials.js`**:
   - Checks that `billOfMaterials()` returns both `totalCp` and the compatibility alias `totalMu` (`check("masonry_bill", api.billOfMaterials("masonry").totalCp === 215392 && api.billOfMaterials("masonry").totalMu === 215392)`).

2. **`tools/sim/test_reclaim.js` & `tools/sim/test_reclaim_longrun.js`**:
   - Contains `adaptForReclaim()` to adapt fixture masses to centipound scale until `lane-dr` updates `reclaim.js`.
   - All assertions updated to integer `cp` values (e.g. `wall_wood` yield changed from 8000 mu to 1764 cp; `ironstone` ore harvest changed from 24000 mu to 5292 cp).

3. **`tools/sim/test_decay_core.js`**:
   - Exercises `decay/core.js` with synthetic bookings.

---

## 3. Analysis: Does Any Consumer Treat the Value as Old Units?

**Verdict: NO.**

1. **No conversion factors or assumptions exist in `reclaim.js`**:
   - `reclaim.js` has zero hardcoded mass numbers or conversion ratios (e.g. no `* 1000` or `/ 453.59`).
   - Every calculation in `reclaim.js` is either:
     - Linear mass transfer via `ledger.transform()` / `commitMove()` (conserved 1:1).
     - Modulo / division against `stratumMass(materialId)`:
       ```js
       blocks: slice ? Math.floor(g.mu / slice) : 0,
       remainder: slice ? g.mu % slice : g.mu
       ```
       Since `slice` (`stratumMass`) is in `cp` (e.g. 399,919 cp for rock, 312,000 cp for water), both numerator and denominator are in `cp`.
   - Therefore, `reclaim.js` operates purely on abstract integer mass quantities and does NOT assume grams.

2. **No other consumer exists**:
   - As shown in Section 2, no other file in the game engine or simulation reads `.mu` from `materials.js`.
   - The alias allows `reclaim.js` to continue functioning without modification until its scheduled overhaul in `lane-dr`.

3. **Conclusion**:
   - The aliases `totalMu`, `mu = cp`, and `res.unmapped.mu = res.unmapped.cp` do not introduce defects or unit mismatches anywhere in the simulation.
   - They provide a safe bridge for `lane-dr` to rename `reclaim.js` internal fields from `.mu` to `.cp`.

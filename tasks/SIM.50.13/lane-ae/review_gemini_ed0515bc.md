# Independent Review: Lane AE (SIM.50.13)

**Reviewed commit (FINAL SHA):** `ed0515bc44ce14a12e1c3760e3e2c3725e55e444`  
**Reviewer:** Gemini (non-author; independent review under Owner DEC-034 authorization)  
**Writer:** Grok (`grok-4.7 xhigh`)  
**Lane:** `lane-ae`  
**Task ID:** `SIM.50.13` (Ore sprouting and fluid solver attachment bug fixes)  
**Branch:** `task/lane-ae`  

---

## 1. Commit and Branch Verification

Git branch verification output:
```text
HEAD: ed0515bc44ce14a12e1c3760e3e2c3725e55e444
origin/task/lane-ae: ed0515bc44ce14a12e1c3760e3e2c3725e55e444
```

Git log excerpt:
```text
ed0515bc44ce14a12e1c3760e3e2c3725e55e444 deus-grok [grok] SIM.50.13 Stop loose stones maturing into ore and bind the fluid solver
96b58c75ecb6ba4055c767826bfba57927ee97ea deus-pm [pm] Open lane-ae (SIM.50.13): BRIEF.md and lane.json
1c2fcc28736566f8dd4f14ccd0633f09687e3521 deus-pm Merge task/lane-aa: WG.00.17 Z-range one setting, 32 layers (-16..+15), sparse storage, 2-ft strata (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT replacing the Pro second pass, VERDICT: PASS WITH NOTES (0 BLOCKER, 0 MAJOR) at 212ddf060c41925bfd5e71d88f165cc606433510 / review d2c6614f5b403d397089728f0412a7b14057b430; earlier Flash PASS 705bf9ba9e7af37d44731bcf46ca4d3ea154b61d; writer grok tip 212ddf060c41925bfd5e71d88f165cc606433510)
```

Merge base with `origin/main`: `1c2fcc28736566f8dd4f14ccd0633f09687e3521`

---

## 2. Scope & AllowedPaths Verification

`git diff --name-status 1c2fcc28736566f8dd4f14ccd0633f09687e3521 ed0515bc44ce14a12e1c3760e3e2c3725e55e444`

| File | Status | Allowed by `lane.json` | Notes |
|---|---|---|---|
| `game/js/plugins/DEUS_Ecology.js` | M | YES | F-03 fix: removed ore sprout outcomes from `rocks_small`, refuse legacy ore outcomes |
| `game/js/plugins/DEUS_Fluid.js` | M | YES | F-05 / D-4 fix: bind shared namespace before Core, attach on map/layer load, event hooks |
| `tasks/SIM.50.13/lane-ae/BRIEF.md` | A | YES | Task brief |
| `tasks/SIM.50.13/lane-ae/REPORT.md` | A | YES | Task report |
| `tasks/SIM.50.13/lane-ae/lane.json` | A | YES | Lane configuration |
| `tools/sim/test_fluid_attach.js` | A | YES | Gate test for fluid attach, volume conservation, and hooks |
| `tools/sim/test_ore_sprout.js` | A | YES | Gate test for rock sprout outcomes and long run |

Confirmations:
- No edits outside `allowedPaths`.
- No edits to `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, WBS files, or `art/**`.
- NO ART (DEC-007): Zero art files generated, modified, or requested.

---

## 3. Gate Test Re-runs in Fresh Clone

Executed in a detached, clean temporary clone at commit `ed0515bc44ce14a12e1c3760e3e2c3725e55e444`:

### a. `node tools/sim/test_ore_sprout.js`
```text
PASS sprout_tables_no_ore — rock rows 3; ore entries []; bad weights []
PASS legacy_ore_not_placed — matured 0; ore writes 0; cells ironstone=rocks_small, copper_outcrop=rocks_small, gold_outcrop=rocks_small, mythril_vein=rocks_small
PASS granite_boulder_still_matures — matured 1; cell granite_boulder
PASS long_run_no_ore — beats 1500 seeds 5013,501313; ore hits 0; bad rock mature none; grid ore 0/0
PASS long_run_still_sprouts — granite 397/384; other matures 747/764; loose-stone sprouts seen 62563/60748
PASS long_run_seeded — seed 5013 placements 332 identical across two runs; differs from seed 501313
RESULT: PASS (0 failed)
```
**EXIT: 0**

### b. `node tools/sim/test_fluid_attach.js`
```text
PASS mutant_site_present — three bind assignments
PASS mutant_require_does_not_bind — window.UF.Fluid set: false
PASS require_binds_before_core_lines — window.UF.Fluid is the module export before Core runs: true
PASS require_survives_core_assign — same object after window.DEUS = window.DEUS || {}; window.UF = window.DEUS: true
PASS hooks_on_first_map_load — listeners 9
PASS hooks_not_stacked — before second load 9 after 9 (levels:cellChanged,levels:shapeChanged,levels:strataChanged,levels:strataDestroyed,world:areaBuilt,world:levelBuilt,doors:opened,doors:closed,doors:broken)
PASS volume_before_place — scanned 0 legacy 0
PASS volume_after_place — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS volume_after_attach — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS flood_uses_solver — vias solver volume 22
PASS volume_across_flood_fills — layers 32 volume 22
PASS volume_across_flow — ticks 10 bottom 22 expected 22
PASS reattach_on_map_load — was unbound true; restored true; missing 
PASS classic_script_binds — identity kept: true Fluid set: true
RESULT: PASS (0 failed)
```
**EXIT: 0**

### c. `node tools/check_deus_syntax.js`
```text
Checked 52 DEUS plugin files. Errors: 0
```
**EXIT: 0**

---

## 4. Code & Evidence Spot-Checks

1. **F-03 (Loose stones do not become ore):**
   - In `game/js/plugins/DEUS_Ecology.js`, `SPROUT_DEFS` rows for `rocks_small` at levels 0, -1, and -2 have had `ironstone`, `copper_outcrop`, and `gold_outcrop` removed. Only `granite_boulder` remains as the allowed stone maturation outcome.
   - `isOreSproutOutcome(id)` checks against hardcoded IDs (`ironstone`, `copper_outcrop`, `gold_outcrop`) as well as `type.tags.indexOf("ore") >= 0`.
   - In `updateSprouts`, existing scheduled ore sprouts from loose stones are dropped (`st.sprouts.splice(i, 1); continue;`) without writing to the cell, preventing legacy save files from maturing loose stones into ore. Non-ore outcomes (`granite_boulder`) continue to mature properly.
2. **F-05 / D-4 (Fluid solver binding and volume conservation):**
   - In `game/js/plugins/DEUS_Fluid.js`, `bindSharedNamespace` binds `window.DEUS` and `window.UF` together so that `DEUS_Core.js`'s subsequent `window.DEUS = window.DEUS || {}; window.UF = window.DEUS;` does not clobber `UF.Fluid`.
   - `attachFluid` publishes `UF.Fluid = Fluid` and sets up event hooks idempotently (`hookedEvents === ns.Events`).
   - `Game_Map.prototype.setup` is wrapped to call `attachFluid()` on map load (each level load).
   - Event listeners for `world:areaBuilt` and `world:levelBuilt` re-bind `attachFluid()`.
   - Attaching writes zero cells and introduces no fluid volume. Total fluid volume across attach, layer changes, flood fills, and flow is strictly conserved (verified across 32 layers and 10 flow steps).
3. **Minimal Fixes Only:**
   - Changes in `DEUS_Ecology.js` are 23 additions, 6 deletions, limited strictly to ore sprout table definitions and maturation guard.
   - Changes in `DEUS_Fluid.js` are 110 additions, 19 deletions, focused strictly on namespace binding, event hooks, and map setup attachment. No refactoring of solver physics or unrelated routines.
4. **DEC-007, DEC-011, DEC-027 (SRD 5.1):**
   - Strictly compliant; no art produced, no D&D product-identity names introduced.

---

## 5. Findings

- **BLOCKER:** None (0)
- **MAJOR:** None (0)
- **MINOR:** None (0)

---

## 6. Verdict

VERDICT: CLEAN PASS

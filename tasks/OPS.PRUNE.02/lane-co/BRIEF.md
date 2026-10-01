# BRIEF: Lane CO (L2) — Plugin Shims Archival & Tool/Test Retargeting

- **Task ID**: OPS.PRUNE.02
- **Lane**: lane-co
- **Branch**: `task/lane-co`
- **Writer**: codex
- **Reviewer**: grok
- **Allowed Paths**:
  - `archive/game/js/plugins/**`
  - `game/js/plugins/DEUS_Colonists.js`
  - `game/js/plugins/DEUS_Combat.js`
  - `game/js/plugins/DEUS_History.js`
  - `game/js/plugins/UF_*.js`
  - `tasks/OPS.PRUNE.02/lane-co/**`
  - `tools/**`

## Objective & Rules (Owner 2026-09-30 Prune Ruling & G01 Final Verdict)

1. **Reconciliation (41 vs 38)**:
   - There are exactly 43 `UF_*.js` files in `game/js/plugins/`.
   - Exactly 2 are active, non-shim plugins: `UF_Households.js` (62 KB) and `UF_Time.js` (22 KB). These are PROTECTED and MUST REMAIN in `game/js/plugins/`.
   - The remaining 41 files are pure `PluginManager.loadScript` forwarders.
   - The 38 count in earlier provisional notes omitted 3 shims; all 41 loadScript shims are explicitly moved.

2. **Explicit Move List (41 loadScript forwarders)**:
   - Use `git mv game/js/plugins/<file> archive/game/js/plugins/<file>`.
   - Files:
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
   - Destination: `archive/game/js/plugins/` (create directory if needed). Never delete tracked files.

3. **Protected Files (DO NOT MOVE)**:
   - `game/js/plugins/UF_Households.js`
   - `game/js/plugins/UF_Time.js`

4. **Conditional Fallbacks & Dead Requires**:
   - `DEUS_Colonists.js`: Remove dead require statements for `UF_SettlementPillars` and `UF_Sanitation` (lines 87-98). Drop `UF_Generator` fallback from candidates list (lines 101-122).
   - `DEUS_History.js`: Drop `./UF_Items.js` fallback candidate (line 171).
   - `DEUS_Combat.js`: Drop `UF_Combat.js` fallback candidate (lines 3169-3176).

5. **Retarget Tool / Test Imports**:
   - Retarget every tool or test in `tools/` that requires a `UF_*.js` shim path to point to the canonical `DEUS_*.js` twin.
   - Keep `UF.*` namespaces and legacy parameter-name fallbacks.
   - **DO NOT TOUCH** `tools/test_time_domains_proof.js` (this belongs exclusively to L3 / `lane-cp`).

6. **New Gate Check (`tools/test_no_loadscript_shims.js`)**:
   - Verifies that `game/js/plugins/` contains 0 `PluginManager.loadScript` forwarder shims.
   - Verifies that all 41 moved forwarders exist in `archive/game/js/plugins/`.
   - Verifies that `UF_Households.js` and `UF_Time.js` still exist in `game/js/plugins/`.
   - Must support mutants (`--mutant` and `--mutants`):
     - `moved-protected`: fails if a protected file is moved.
     - `shim-survived`: fails if a forwarder shim remains in `game/js/plugins/`.
     - `broken-retarget`: fails if a tool/test still references an archived shim path.
   - Every mutant must be verified killed.

7. **Quality Gates**:
   - All 10 gate tests in `lane.json` must exit 0.

## GAME TRANSLATION
- **Player / World Effect**: Eliminates redundant legacy script loading layers, duplicate file confusion, and obsolete require loops across the engine runtime and tool suite, ensuring crisp direct execution of canonical DEUS subsystems.
- **Trigger**: Game engine boot, plugin initialization, and automated tool/test harness executions.
- **Runtime Authority**: `game/js/plugins/DEUS_*.js` canonical plugin suite.
- **Simulation Path**: `PluginManager.setup` initializes canonical `DEUS_*` plugins in defined order without legacy shim hops.
- **Engine Bridge**: `plugins.js` direct plugin invocations.
- **Visible Result**: Game boots cleanly with 0 console warnings regarding redirected shim scripts; all tools run directly against DEUS modules.
- **Persistence**: Preserved across Git history via `archive/` tracking.
- **Failure Without This Lane**: Codebase retains 41 dead forwarder scripts polluting the plugin directory, masking real file locations and encouraging legacy coupling.
- **Automated Proof**: `node tools/test_no_loadscript_shims.js` and all 10 gate test suites.
- **In-Game Proof**: Clean RMMZ dev console boot trace with 0 errors.

### Translation Status
- Simulation implemented: YES
- Engine bridge implemented: YES
- Presentation implemented: NOT APPLICABLE (Architecture/tooling lane)
- Input/player interaction implemented: NOT APPLICABLE
- Save/load implemented: YES (Saves load unaffected as canonical plugins maintain state)
- Playable verification performed: YES (Boot test verifies zero runtime breakages)

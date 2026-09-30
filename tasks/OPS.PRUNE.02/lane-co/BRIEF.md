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

## Objective & Rules (Owner 2026-09-30 Prune Ruling)
1. **Archive the 41 loadScript-only forwarders**:
   - Files: `UF_Anim.js`, `UF_Camera.js`, `UF_Colonists.js`, `UF_ColonyOverseer.js`, `UF_Combat.js`, `UF_Core.js`, `UF_DayNight.js`, `UF_Doors.js`, `UF_Ecology.js`, `UF_Environment.js`, `UF_FactionMenus.js`, `UF_Factions.js`, `UF_Fire.js`, `UF_Floors.js`, `UF_Fog.js`, `UF_Generator.js`, `UF_History.js`, `UF_Interact.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Levels.js`, `UF_Look.js`, `UF_Minimap.js`, `UF_Movement8D.js`, `UF_NaturalConnections.js`, `UF_Objects.js`, `UF_Ownership.js`, `UF_Perspective25D.js`, `UF_Select.js`, `UF_Sheet.js`, `UF_Speech.js`, `UF_Stance.js`, `UF_Talk.js`, `UF_Test.js`, `UF_Tiles.js`, `UF_TimeSpeed.js`, `UF_Visuals.js`, `UF_Walls.js`, `UF_Wildlife.js`, `UF_World.js`, `UF_WorldGen.js`.
   - Action: `git mv game/js/plugins/UF_<X>.js archive/game/js/plugins/UF_<X>.js`.
   - Never delete a tracked file.
2. **Conditional Fallbacks & Dead Requires**:
   - `DEUS_Colonists.js`: Remove dead require statements for `UF_SettlementPillars` and `UF_Sanitation` (lines 87-98). Drop `UF_Generator` fallback from candidates list (lines 101-122).
   - `DEUS_History.js`: Drop `./UF_Items.js` fallback candidate (line 171).
   - `DEUS_Combat.js`: Drop `UF_Combat.js` fallback candidate (lines 3169-3176).
3. **Retarget Tool / Test Imports**:
   - Retarget every tool or test that requires a `UF_*.js` shim path to point to the canonical `DEUS_*.js` twin.
   - Keep `UF.*` namespaces and legacy parameter-name fallbacks.
   - **DO NOT TOUCH** `tools/test_time_domains_proof.js` (this belongs exclusively to L3 / `lane-cp`).
4. **New Gate Check (`tools/test_no_loadscript_shims.js`)**:
   - Verify that `game/js/plugins` contains 0 `PluginManager.loadScript` forwarder shims.
   - Must have a failure mode / mutant support (`--mutant`) showing that it can fail if a forwarder exists.
5. **Quality Gates**:
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
- **Automated Proof**: `node tools/test_no_loadscript_shims.js` and all 9 gate test suites.
- **In-Game Proof**: Clean RMMZ dev console boot trace with 0 errors.

### Translation Status
- Simulation implemented: YES
- Engine bridge implemented: YES
- Presentation implemented: NOT APPLICABLE (Architecture/tooling lane)
- Input/player interaction implemented: NOT APPLICABLE
- Save/load implemented: YES (Saves load unaffected as canonical plugins maintain state)
- Playable verification performed: YES (Boot test verifies zero runtime breakages)

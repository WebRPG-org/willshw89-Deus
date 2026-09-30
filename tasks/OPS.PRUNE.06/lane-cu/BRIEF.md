# TASK BRIEF: OPS.PRUNE.06 (lane-cu)

**Task Identifier:** `OPS.PRUNE.06`  
**Lane ID:** `lane-cu`  
**Branch:** `task/lane-cu`  
**Directives:** DEC-030 (32-level world), DEC-037 (Natural World phase lock), DEC-048 / DEC-052 (Orchestration & Prune Order), MSG-PRUNE-PM-041 & MSG-PRUNE-PM-059 (L6 Scope Normalization).  
**Assigned Writer:** Codex  
**Assigned Reviewer:** Grok  

---

## 1. Executive Summary & Objective

`OPS.PRUNE.06` normalizes and preserves the system architecture documentation under `docs/systems/` in accordance with the PM directives in **MSG-PRUNE-PM-041** and **MSG-PRUNE-PM-059**.

Historical development under legacy working titles ("UF", "Ultima Frontier") left 47 `UF_*.md` documentation files and obsolete 5-level world specifications under `docs/systems/`. In parallel, runtime plugins were renamed to canonical `DEUS_*` plugins in `game/js/plugins/` (with shims archived in L2 `lane-co`). Retaining stale names and dead specifications creates confusion for AI agents and human contributors, leading to hallucinated shim interfaces or contradictory Z-level assumptions.

This lane executes:
1. **Renaming the 33 Live-System Specifications**: Move `docs/systems/UF_<Name>.md` to `docs/systems/DEUS_<Name>.md` via `git mv`, updating document headers, title blocks, and cross-references to point to canonical `DEUS_*` plugins and namespaces.
2. **Archiving the 15 Safe Docs**: Move 15 dead prototype and contradictory specifications to `docs/archive/systems/` via `git mv`, preserving 100% file content and history.
3. **Preserving Protected & L4-Owned Docs**: Keep `docs/systems/UF_Households.md` untouched (accompanying protected `UF_Households.js` deferred to L3); leave the 8 L4-owned specifications untouched. Note that `docs/systems/DEUS_Fluid.md` is now safe to link/reference as `lane-cw2` has merged to main.
4. **Link Retargeting & Automated Verification**: Verify all retargeted Markdown links across documentation, ensuring zero dead links. Deliver automated test `tools/test_l6_docs_preservation.js` confirming full preservation and proving the test can fail on missing files or broken links.

---

## 2. Explicit Move & Rename Inventories

### Table A: 33 Live-System Documents Renamed to `DEUS_*.md`
Execute via `git mv`:
1. `docs/systems/UF_Anim.md` -> `docs/systems/DEUS_Anim.md`
2. `docs/systems/UF_Camera.md` -> `docs/systems/DEUS_Camera.md`
3. `docs/systems/UF_Colonists.md` -> `docs/systems/DEUS_Colonists.md` (Reconcile with existing `DEUS_Colonists.md`: preserve the richer live specification content under `DEUS_Colonists.md` and archive any superseded text)
4. `docs/systems/UF_ColonyOverseer.md` -> `docs/systems/DEUS_ColonyOverseer.md`
5. `docs/systems/UF_Combat.md` -> `docs/systems/DEUS_Combat.md`
6. `docs/systems/UF_DayNight.md` -> `docs/systems/DEUS_DayNight.md`
7. `docs/systems/UF_Doors.md` -> `docs/systems/DEUS_Doors.md`
8. `docs/systems/UF_Ecology.md` -> `docs/systems/DEUS_Ecology.md`
9. `docs/systems/UF_Environment.md` -> `docs/systems/DEUS_Environment.md`
10. `docs/systems/UF_Factions.md` -> `docs/systems/DEUS_Factions.md`
11. `docs/systems/UF_Fire.md` -> `docs/systems/DEUS_Fire.md`
12. `docs/systems/UF_Floors.md` -> `docs/systems/DEUS_Floors.md`
13. `docs/systems/UF_History.md` -> `docs/systems/DEUS_History.md`
14. `docs/systems/UF_Interact.md` -> `docs/systems/DEUS_Interact.md`
15. `docs/systems/UF_Items.md` -> `docs/systems/DEUS_Items.md`
16. `docs/systems/UF_Jobs.md` -> `docs/systems/DEUS_Jobs.md`
17. `docs/systems/UF_Levels.md` -> `docs/systems/DEUS_Levels.md`
18. `docs/systems/UF_Look.md` -> `docs/systems/DEUS_Look.md`
19. `docs/systems/UF_NaturalConnections.md` -> `docs/systems/DEUS_NaturalConnections.md`
20. `docs/systems/UF_Objects.md` -> `docs/systems/DEUS_Objects.md`
21. `docs/systems/UF_Ownership.md` -> `docs/systems/DEUS_Ownership.md`
22. `docs/systems/UF_Select.md` -> `docs/systems/DEUS_Select.md`
23. `docs/systems/UF_Sheet.md` -> `docs/systems/DEUS_Sheet.md`
24. `docs/systems/UF_Speech.md` -> `docs/systems/DEUS_Speech.md`
25. `docs/systems/UF_Stance.md` -> `docs/systems/DEUS_Stance.md`
26. `docs/systems/UF_Talk.md` -> `docs/systems/DEUS_Talk.md`
27. `docs/systems/UF_Test.md` -> `docs/systems/DEUS_Test.md`
28. `docs/systems/UF_Tiles.md` -> `docs/systems/DEUS_Tiles.md`
29. `docs/systems/UF_TimeSpeed.md` -> `docs/systems/DEUS_TimeSpeed.md`
30. `docs/systems/UF_Walls.md` -> `docs/systems/DEUS_Walls.md`
31. `docs/systems/UF_Wildlife.md` -> `docs/systems/DEUS_Wildlife.md`
32. `docs/systems/UF_World.md` -> `docs/systems/DEUS_World.md`
33. `docs/systems/UF_WorldGen.md` -> `docs/systems/DEUS_WorldGen.md`

### Table B: 15 Safe Documents to Archive
Execute via `git mv docs/systems/<File> docs/archive/systems/<File>`:
1. `docs/systems/DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md` (Contradicts DEC-030 32-level world; mandates 5-level grid)
2. `docs/systems/DEUS_VerticalBiomes.md` (Contradicts DEC-030; locks rock below Z-2 as solid)
3. `docs/systems/UF_CultureGrowth.md` (Dead prototype; no runtime plugin; DEC-037 phase lock)
4. `docs/systems/UF_Dialogue.md` (Dead prototype; replaced by `DEUS_Talk.js`)
5. `docs/systems/UF_FarmView.md` (Dead prototype; DEC-037 phase lock)
6. `docs/systems/UF_FireSafety.md` (Dead prototype; fire simulation handled by `DEUS_Fire.js`)
7. `docs/systems/UF_Goals.md` (Dead prototype; destiny system never wired into engine)
8. `docs/systems/UF_Gumps.md` (Dead prototype; paperdoll in `DEUS_Sheet.js`, containers in `DEUS_Containers.js`)
9. `docs/systems/UF_History_Profile.md` (4.09 MB raw test log dump, not documentation)
10. `docs/systems/UF_Outposts.md` (Dead prototype; construction handled by `DEUS_Projects.js`)
11. `docs/systems/UF_ProfileTabs.md` (Dead prototype; sidebar UI handled by `DEUS_Sheet.js`)
12. `docs/systems/UF_Roads.md` (Dead prototype; not implemented)
13. `docs/systems/UF_Skills.md` (Dead prototype; superseded by SRD 5.1 rules engine)
14. `docs/systems/UF_Tech.md` (Dead prototype; tech unbuilt, DEC-037 phase lock)
15. `docs/systems/UF_AssetInventory.md` (Tool documentation for `tools/generate_asset_inventory.js`)

### Excluded / Protected Scope (DO NOT TOUCH)
- `docs/systems/UF_Households.md`: Protected alongside `UF_Households.js` (deferred to L3).
- L4-Owned Docs: `DEUS_CombatU7.md`, `DEUS_DepthDemo.md`, `DEUS_LayerOverlays.md`, `DEUS_MintingEngine.md`, `DEUS_Taming.md`, `DEUS_TamedPartyCombat.md`, `DEUS_WorldItems.md`, `DEUS_Minimap.md`.

---

## 3. GAME TRANSLATION TRACEABILITY

### Classification: C. FOUNDATIONAL / INDIRECT

- **Player / World Effect:** Indirect architectural clarity and defect prevention. Players experience consistent 32-level world physics and zero crashes from missing or corrupted forwarder APIs because developer and AI agent tooling references canonical, live engine contracts.
- **Trigger:** Agent or developer reviewing system architecture documentation in `docs/systems/` during implementation or debugging.
- **Runtime Authority:** Architecture documentation consistency; eliminates contradictory 5-level assumptions and deprecated UF method references.
- **Simulation Path:** Clean documentation -> developer / agent produces correct `DEUS_*` plugin code -> deterministic simulation execution in `game/js/plugins/` and `game/js/sim/`.
- **Engine Bridge:** Direct link to live `game/js/plugins.js` and canonical plugin files.
- **Visible Result:** System documentation accurately mirrors the live 42-plugin registry and DEC-030 32-level world design without dead UF shims or contradictory specifications.
- **Persistence:** Tracked Markdown files in `docs/systems/` and `docs/archive/systems/`.
- **Failure Without This Lane:** Agents reintroduce legacy `UF_` shims, code against obsolete 5-level constraints, or resurrect unmerged prototype APIs.
- **Automated Proof:** `node tools/test_l6_docs_preservation.js` checks every live and archived document path, verifies zero missing files, verifies retargeted links, and demonstrates failure on negative mutants.
- **In-Game Proof:** N/A (Foundational documentation reorganization; verified via automated documentation integrity tests).

### Playability Status
- Simulation implemented: N/A (Documentation normalization)
- Engine bridge implemented: N/A (Documentation normalization)
- Presentation implemented: N/A (Documentation normalization)
- Input/player interaction implemented: N/A (Documentation normalization)
- Save/load implemented: N/A (Documentation normalization)
- Playable verification performed: N/A (Documentation normalization)

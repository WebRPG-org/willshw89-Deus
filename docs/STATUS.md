# STATUS: Project DEUS Control Board

**Project Formal Name:** DEUS  
**Last Updated:** 2026-09-30 (Owner Prune Ruling)  
**Coordinator & Integration Authority:** Gemini / Antigravity  
**Historical Ledger:** Pre-prune operational history is archived in [`docs/archive/STATUS_LEDGER_20260930.md`](archive/STATUS_LEDGER_20260930.md) (and [`docs/archive/STATUS_LEDGER_20260925.md`](archive/STATUS_LEDGER_20260925.md)).

---

## 1. Live Systems
The following subsystems are actively loaded by `game/js/plugins.js` (42 plugins) or invoked as live companions / modules by `DEUS_Core.js`:

### A. Active Plugins (in exact `plugins.js` load order)
| Plugin | Canonical File | System Authority / Role |
|---|---|---|
| `DEUS_Core` | `game/js/plugins/DEUS_Core.js` | Foundation systems, time domains, deterministic RNG, spatial queries, and engine hooks |
| `DEUS_Visuals` | `game/js/plugins/DEUS_Visuals.js` | High-DPI scaling, viewport rendering, 2D foot-Y sorting, pixel-crisp display |
| `DEUS_Movement8D` | `game/js/plugins/DEUS_Movement8D.js` | 8-directional movement, Octile A* pathfinding, corner collision, diagonal slide |
| `DEUS_Perspective25D` | `game/js/plugins/DEUS_Perspective25D.js` | 2D foot-Y depth sorting, canopy occlusion |
| `DEUS_ColonyOverseer` | `game/js/plugins/DEUS_ColonyOverseer.js` | RTS camera panning, designation markers, unit selection |
| `DEUS_World` | `game/js/plugins/DEUS_World.js` | Seeded multi-level procedural world persistence, coordinate translation, area state |
| `DEUS_WorldGen` | `game/js/plugins/DEUS_WorldGen.js` | Perlin elevation/moisture synthesis, geological strata, biome boundaries |
| `DEUS_Tiles` | `game/js/plugins/DEUS_Tiles.js` | Dynamic terrain autotiling, biome transitions, elevation cliffs |
| `DEUS_Factions` | `game/js/plugins/DEUS_Factions.js` | 11 cultural factions, cultural identities, diplomatic relations |
| `DEUS_History` | `game/js/plugins/DEUS_History.js` | Historical demographic generation, settlement founding, founder genealogies |
| `DEUS_Objects` | `game/js/plugins/DEUS_Objects.js` | Catalog-driven world objects, multi-state interaction cycles (intact/ruined/harvested) |
| `DEUS_Walls` | `game/js/plugins/DEUS_Walls.js` | Structural 2-tile wall systems with black wall-top occlusion convention |
| `DEUS_Doors` | `game/js/plugins/DEUS_Doors.js` | Cultural architectural doors, faction access control, open/closed states |
| `DEUS_Items` | `game/js/plugins/DEUS_Items.js` | Physical item instances, stack limits, weight/bulk, spatial ground items |
| `DEUS_Jobs` | `game/js/plugins/DEUS_Jobs.js` | Labor designations, haul/harvest/mine tasks, workstation reservations |
| `DEUS_Floors` | `game/js/plugins/DEUS_Floors.js` | Walkable floor surfaces, structural ceilings, dug earth, mined stone |
| `DEUS_Generator` | `game/js/plugins/DEUS_Generator.js` | Procedural entity and site generator |
| `DEUS_Colonists` | `game/js/plugins/DEUS_Colonists.js` | Colonist agency, hunger/thirst/sleep needs, pathfinding execution |
| `DEUS_Projects` | `game/js/plugins/DEUS_Projects.js` | Construction projects, bill-of-materials tracking |
| `DEUS_Wildlife` | `game/js/plugins/DEUS_Wildlife.js` | Ecosystem fauna, herd migration, predator/prey behavior, hunting |
| `DEUS_Ecology` | `game/js/plugins/DEUS_Ecology.js` | Flora propagation, seasonal growth cycles, biomass regathering |
| `DEUS_Stance` | `game/js/plugins/DEUS_Stance.js` | Combat readiness stances, tactical postures, engagement radius |
| `DEUS_Combat` | `game/js/plugins/DEUS_Combat.js` | D&D 5.1 SRD combat rules, turn/action economy, damage calculation |
| `DEUS_Anim` | `game/js/plugins/DEUS_Anim.js` | Universal 12-sprite character animations, static frame playback |
| `DEUS_Fog` | `game/js/plugins/DEUS_Fog.js` | Atmospheric fog density, elevation visibility obscuration |
| `DEUS_DayNight` | `game/js/plugins/DEUS_DayNight.js` | Astronomical clock, solar elevation, ambient light transitions |
| `DEUS_TimeSpeed` | `game/js/plugins/DEUS_TimeSpeed.js` | Engine tick pacing, pause, 1x, 2x, 5x simulation speed controls |
| `DEUS_Camera` | `game/js/plugins/DEUS_Camera.js` | Viewport camera tracking, edge panning, minimap sync |
| `DEUS_Culling` | `game/js/plugins/DEUS_Culling.js` | Viewport culling, zero-allocation entity visibility filtering |
| `DEUS_Speech` | `game/js/plugins/DEUS_Speech.js` | Overhead comic dialogue bubbles, barks, shouts, localized text display |
| `DEUS_Look` | `game/js/plugins/DEUS_Look.js` | Inspection tooltips, asset provenance and status lookup |
| `DEUS_Interact` | `game/js/plugins/DEUS_Interact.js` | World interaction triggers, door toggling, chest search, harvesting |
| `DEUS_Sheet` | `game/js/plugins/DEUS_Sheet.js` | 4-page retro CRPG character sheet (Stats, Gear, Spells, Prayers) |
| `DEUS_Talk` | `game/js/plugins/DEUS_Talk.js` | Conversational dialogue trees, keyword inquiry, topic progression |
| `DEUS_Fire` | `game/js/plugins/DEUS_Fire.js` | Thermodynamic fire propagation, heat transfer, flammable combustion |
| `DEUS_Levels` | `game/js/plugins/DEUS_Levels.js` | 32-level vertical volume authority, subterranean deep cuts, bedrock floors |
| `DEUS_Ownership` | `game/js/plugins/DEUS_Ownership.js` | Zone ownership, faction claims, private dwelling attribution |
| `DEUS_Environment` | `game/js/plugins/DEUS_Environment.js` | Weather simulation, precipitation, ambient temperature modulation |
| `DEUS_NaturalConnections` | `game/js/plugins/DEUS_NaturalConnections.js` | Multi-level ramps, natural slopes, vertical transition stairwells |
| `DEUS_FactionMenus` | `game/js/plugins/DEUS_FactionMenus.js` | Cultural UI framing, faction diplomacy screens, relation matrices |
| `DEUS_Depth` | `game/js/plugins/DEUS_Depth.js` | Multi-Z exposure depth shading, vertical strata occlusion |
| `DEUS_Test` | `game/js/plugins/DEUS_Test.js` | In-engine diagnostic suite, headless validation harnesses |

### B. Core Companions & Live Simulation Modules
The following 11 companion plugins are loaded synchronously by `DEUS_Core.js:89-104` in the desktop runtime, along with live simulation modules:

| Subsystem | Canonical Path | Description |
|---|---|---|
| `DEUS_Containers` | `game/js/plugins/DEUS_Containers.js` | Chests, sacks, stockpiles, and item storage authority (loaded by `DEUS_Core.js:90`) |
| `DEUS_Bag` | `game/js/plugins/DEUS_Bag.js` | Mobile containers, inventory sacks, worn pouches (loaded by `DEUS_Core.js:91`) |
| `DEUS_Stockpiles` | `game/js/plugins/DEUS_Stockpiles.js` | Ground storage zones, bulk material piles (loaded by `DEUS_Core.js:92`) |
| `DEUS_Fluid` | `game/js/plugins/DEUS_Fluid.js` | Hydrostatic pressure, surface water flow, aquifer simulation (loaded by `DEUS_Core.js:93`) |
| `DEUS_Conditions` | `game/js/plugins/DEUS_Conditions.js` | Status conditions, bodily fatigue, environmental exposures (loaded by `DEUS_Core.js:94`) |
| `DEUS_Select` | `game/js/plugins/DEUS_Select.js` | Multi-unit drag selection, squad designations (loaded by `DEUS_Core.js:95`) |
| `DEUS_Dnd5e` | `game/js/plugins/DEUS_Dnd5e.js` | SRD 5.1 ability score rolling, class hit dice, proficiency math (loaded by `DEUS_Core.js:96`) |
| `DEUS_Callings` | `game/js/plugins/DEUS_Callings.js` | Labor vocational specializations, builder/harvester assignments (loaded by `DEUS_Core.js:97`) |
| `DEUS_HistoricalDemographics` | `game/js/plugins/DEUS_HistoricalDemographics.js` | Colonist demographic cohorts, age distribution, lineage data (loaded by `DEUS_Core.js:98`) |
| `DEUS_DeathForensics` | `game/js/plugins/DEUS_DeathForensics.js` | Cause of death analysis, fatal wound logging (loaded by `DEUS_Core.js:99`) |
| `UF_Households` | `game/js/plugins/UF_Households.js` | Kinship, family groupings, domestic dwelling allocation (loaded by `DEUS_Core.js:103`) |
| `DEUS_Minimap` | `game/js/plugins/DEUS_Minimap.js` | Overhead radar map rendering (loaded dynamically by `DEUS_Camera.js:624`) |
| `sim/hydro` | `game/js/sim/hydro/` | Deep aquifer and hydraulic simulation modules (required by `DEUS_Fluid.js:984`) |
| `sim/rules` | `game/js/sim/rules/` | SRD 5.1 mechanics and ability score resolution (required by `DEUS_Combat.js`) |
| `sim/ledger` | `game/js/sim/ledger.js` | Closed-mass matter conservation ledger (DEC-040; verified by gate suites) |

---

## 2. Frozen Systems (Loaded, Postponed, or Pending Archival)
Subsystems preserved in the repository whose runtime expansion or feature additions are frozen pending the completion of Natural World v1:

### A. Phase-Locked Systems
| Subsystem | File / Path | Freeze Authority | Current Status |
|---|---|---|---|
| Civilization & Colonists | `DEUS_Colonists.js`, `DEUS_ColonyOverseer.js`, `DEUS_Jobs.js`, `DEUS_Ownership.js` | DEC-037 Natural World Lock | Code loaded; feature development frozen |
| Factions & Society | `DEUS_Factions.js`, `DEUS_FactionMenus.js`, `DEUS_History.js` | DEC-037 Natural World Lock | Code loaded; societal expansion frozen |
| Economy & Coinage | `DEUS_Mint.js` | DEC-040 / DEC-037 | Candidate for lifecycle weight ledger when economy unfreezes |

### B. Unwired Plugins (Scheduled for Archival in L4)
The following 9 plugins in `game/js/plugins/` are not loaded in `plugins.js` and have no active runtime imports:
- `DEUS_Move8.js`
- `DEUS_DepthCues.js`
- `DEUS_DepthDemo.js`
- `DEUS_CombatRT.js`
- `DEUS_CombatUI.js`
- `DEUS_LayerOverlays.js`
- `DEUS_Mint.js`
- `DEUS_Taming.js`
- `DEUS_WorldItems.js`

### C. Secondary Clock (Scheduled for Archival in L3)
- `UF_Time.js` (`game/js/plugins/UF_Time.js`): Unloaded second clock; scheduled for L3 archival.

### D. Shims / Forwarders (41 Files Scheduled for Archival in L2)
The following 41 sixteen-line `PluginManager.loadScript` forwarders remain in `game/js/plugins/` until L2 archival:
`UF_Anim.js`, `UF_Camera.js`, `UF_Colonists.js`, `UF_ColonyOverseer.js`, `UF_Combat.js`, `UF_Core.js`, `UF_DayNight.js`, `UF_Doors.js`, `UF_Ecology.js`, `UF_Environment.js`, `UF_FactionMenus.js`, `UF_Factions.js`, `UF_Fire.js`, `UF_Floors.js`, `UF_Fog.js`, `UF_Generator.js`, `UF_History.js`, `UF_Interact.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Levels.js`, `UF_Look.js`, `UF_Minimap.js`, `UF_Movement8D.js`, `UF_NaturalConnections.js`, `UF_Objects.js`, `UF_Ownership.js`, `UF_Perspective25D.js`, `UF_Select.js`, `UF_Sheet.js`, `UF_Speech.js`, `UF_Stance.js`, `UF_Talk.js`, `UF_Test.js`, `UF_Tiles.js`, `UF_TimeSpeed.js`, `UF_Visuals.js`, `UF_Walls.js`, `UF_Wildlife.js`, `UF_World.js`, `UF_WorldGen.js`.

---

## 3. In Review
Active tasks, open branches, and pending review submissions:

| Branch | Lane / Task | Scope | Status |
|---|---|---|---|
| `task/lane-cq` | `lane-cq` (`OPS.PRUNE.01`) | L1: Rebuild STATUS.md control board + `tools/test_control_board.js` | ACTIVE WRITER (Gemini) / Grok Reviewer |
| `task/lane-co` | `lane-co` (`OPS.PRUNE.02`) | L2: Archive 41 `UF_*.js` shims & retarget tools | FROZEN at `b9acaa14` pending L1 merge |
| `task/lane-cr` | `lane-cr` (`OPS.PRUNE.PACE`) | PACE telemetry & budget rate governor (`tools/ops/pace.js`) | In Flight (`409e085c`, Codex writer) |
| `task/lane-cs` | `lane-cs` (`WG.20.02`) | CARDS-1 fixes & DEC-045 catalogue moisture rows | In Flight (`26099959`, Codex writer) |
| `task/art-temperate-induction` | Parked Induction | 64 temperate batch 1 assets (Outside_A2, Dungeon_A2, V8 props) | PARKED at `90c82ac5` pending QA & Owner YEA |
| `task/lane-a` | `lane-a` (`WG.00.08`) | WG.00.08 Exit Criteria | In Review (`16fec107`) |
| `task/lane-b` | `lane-b` (`WG.00.11`) | ATK-YEAR0-001 Hardening | Integrated / Reference (`ed757456`) |
| `task/lane-bb` | `lane-bb` | Subterranean volume review | Merged to main; worktree pruned |
| `task/lane-bd` | `lane-bd` (`DEUS-TSK-ZRANGE-HARNESS`) | Z-Range harness verification | In Flight (`3ea1ab69`) |
| `task/lane-bj` | `lane-bj` | Subterranean volume review | In Flight (`d134315d`) |
| `task/lane-bp` | `lane-bp` | Fluid boundary review | In Flight (`79bf40be`) |
| `task/lane-bt` | `lane-bt` | Strata boundary review | Merged to main; worktree pruned |
| `task/lane-bu` | `lane-bu` | Worldgen review & QA tests | Merged to main; worktree pruned |
| `task/lane-bv` | `lane-bv` | Physical space review | Merged to main; worktree pruned |
| `task/lane-bw` | `lane-bw` | Climate review | Merged to main; worktree pruned |
| `task/lane-by` | `lane-by` | Matter review | Merged to main; worktree pruned |
| `task/lane-bz` | `lane-bz` | Tooling & blank templates | Merged to main; worktree pruned |
| `task/lane-ca` | `lane-ca` | Strata boundary review | In Flight (`000341d8`) |
| `task/lane-ce` | `lane-ce` | World generation test harness | In Flight (`7d7bba11`) |
| `task/lane-cf` | `lane-cf` | Natural connections verification | In Flight (`5e60e59b`) |
| `task/lane-cl` | `lane-cl` | Autotile seam testing | In Flight (`b7d22aaf`) |
| `task/lane-cm` | `lane-cm` (`WG.00.41`) | Deep cuts & DEC-030 mountain cap ceiling (+11) | Merged to main (`7bbe7f6c`) |
| `task/lane-e` | `lane-e` (`WG.00.09`) | Pre-attack on depth rendering | In Review (`05948e9c`) |
| `task/lane-h` | `lane-h` (`WG.00.08`) | Z-2 cut proof & fluid hardening | In Review (`e3af4cfa`) |
| `task/lane-pm-streamline` | `lane-pm-streamline` | PM tooling streamlining | In Flight (`472de247`) |

---

## 4. Defect / Unproved
Tracked defects, unverified contracts, and quarantined checks:

| Issue / Contract | Reference | Description | Status |
|---|---|---|---|
| Rule 14 Multi-Domain Time | `game/js/plugins/DEUS_Core.js` | AGENTS.md Rule 14 multi-domain time tags are not implemented by the running clock. | KNOWN DEFECT (Reported, preserved) |
| Z-2 Cut Proof Quarantine | `tools/test_generated_z2_cut_proof.js` | Quarantined in `gate_tests.json`: exits 1 on main; Lane H rework in progress. | QUARANTINED |
| ATK-YEAR0-001 | `tasks/WG.00.08/defects.jsonl` | Year 0 world age materialization edge cases. | OPEN |

---

## 5. Archived Systems
Files moved to `archive/` per Owner prune rulings (verified absent from `game/`):

| Original Path | Archive Path | Ruling |
|---|---|---|
| `game/js/plugins/DEUS_Agriculture.js` | `archive/plugins/DEUS_Agriculture.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_BootstrapData.js` | `archive/plugins/DEUS_BootstrapData.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Construction.js` | `archive/plugins/DEUS_Construction.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Crafting.js` | `archive/plugins/DEUS_Crafting.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_CultureGrowth.js` | `archive/plugins/DEUS_CultureGrowth.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_DFCombat.js` | `archive/plugins/DEUS_DFCombat.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_DFWorld.js` | `archive/plugins/DEUS_DFWorld.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Dialogue.js` | `archive/plugins/DEUS_Dialogue.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_FarmView.js` | `archive/plugins/DEUS_FarmView.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_FireSafety.js` | `archive/plugins/DEUS_FireSafety.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Goals.js` | `archive/plugins/DEUS_Goals.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Gumps.js` | `archive/plugins/DEUS_Gumps.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Households.js` | `archive/plugins/DEUS_Households.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_NPCSchedules.js` | `archive/plugins/DEUS_NPCSchedules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Outposts.js` | `archive/plugins/DEUS_Outposts.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Proficiency.js` | `archive/plugins/DEUS_Proficiency.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_ProfileTabs.js` | `archive/plugins/DEUS_ProfileTabs.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Resources.js` | `archive/plugins/DEUS_Resources.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Roads.js` | `archive/plugins/DEUS_Roads.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Rules.js` | `archive/plugins/DEUS_Rules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Sanitation.js` | `archive/plugins/DEUS_Sanitation.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_SettlementPillars.js` | `archive/plugins/DEUS_SettlementPillars.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Skills.js` | `archive/plugins/DEUS_Skills.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/DEUS_Time.js` | `archive/plugins/DEUS_Time.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Agriculture.js` | `archive/plugins/UF_Agriculture.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_BootstrapData.js` | `archive/plugins/UF_BootstrapData.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Callings.js` | `archive/plugins/UF_Callings.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Conditions.js` | `archive/plugins/UF_Conditions.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Construction.js` | `archive/plugins/UF_Construction.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Containers.js` | `archive/plugins/UF_Containers.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Crafting.js` | `archive/plugins/UF_Crafting.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_CultureGrowth.js` | `archive/plugins/UF_CultureGrowth.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_DFCombat.js` | `archive/plugins/UF_DFCombat.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_DFWorld.js` | `archive/plugins/UF_DFWorld.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Dialogue.js` | `archive/plugins/UF_Dialogue.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FarmView.js` | `archive/plugins/UF_FarmView.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FireSafety.js` | `archive/plugins/UF_FireSafety.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_FogOfWar.js` | `archive/plugins/UF_FogOfWar.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Goals.js` | `archive/plugins/UF_Goals.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Gumps.js` | `archive/plugins/UF_Gumps.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_NPCSchedules.js` | `archive/plugins/UF_NPCSchedules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Outposts.js` | `archive/plugins/UF_Outposts.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_ProcGen.js` | `archive/plugins/UF_ProcGen.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Proficiency.js` | `archive/plugins/UF_Proficiency.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_ProfileTabs.js` | `archive/plugins/UF_ProfileTabs.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Resources.js` | `archive/plugins/UF_Resources.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Roads.js` | `archive/plugins/UF_Roads.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Rules.js` | `archive/plugins/UF_Rules.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Sanitation.js` | `archive/plugins/UF_Sanitation.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_SettlementPillars.js` | `archive/plugins/UF_SettlementPillars.js` | Owner 2026-09-30 prune ruling |
| `game/js/plugins/UF_Skills.js` | `archive/plugins/UF_Skills.js` | Owner 2026-09-30 prune ruling |

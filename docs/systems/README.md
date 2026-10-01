# System documentation

Canonical documentation index, normalized 2026-09-30 by OPS.PRUNE.06. The 33 renamed specifications below describe existing plugins; their dated evidence and known limitations remain in the documents. This index does not certify their gameplay behavior. Runtime APIs use `DEUS`; `DEUS_Core.js` retains `window.UF = window.DEUS` for compatibility.

[DEC-030](../OWNER_DECISIONS.md#decision-dec-030-world-grid-and-vertical-biomes-owner--pm-delegated-2026-09-26) governs the 32-layer world (-16..+15); historical five-level generators and saves are identified separately. See [STATUS](../STATUS.md) for live/frozen system status.

## Renamed live specifications (33)

- [DEUS_Anim](DEUS_Anim.md)
- [DEUS_Camera](DEUS_Camera.md)
- [DEUS_Colonists](DEUS_Colonists.md)
- [DEUS_ColonyOverseer](DEUS_ColonyOverseer.md)
- [DEUS_Combat](DEUS_Combat.md)
- [DEUS_DayNight](DEUS_DayNight.md)
- [DEUS_Doors](DEUS_Doors.md)
- [DEUS_Ecology](DEUS_Ecology.md)
- [DEUS_Environment](DEUS_Environment.md)
- [DEUS_Factions](DEUS_Factions.md)
- [DEUS_Fire](DEUS_Fire.md)
- [DEUS_Floors](DEUS_Floors.md)
- [DEUS_History](DEUS_History.md)
- [DEUS_Interact](DEUS_Interact.md)
- [DEUS_Items](DEUS_Items.md)
- [DEUS_Jobs](DEUS_Jobs.md)
- [DEUS_Levels](DEUS_Levels.md)
- [DEUS_Look](DEUS_Look.md)
- [DEUS_NaturalConnections](DEUS_NaturalConnections.md)
- [DEUS_Objects](DEUS_Objects.md)
- [DEUS_Ownership](DEUS_Ownership.md)
- [DEUS_Select](DEUS_Select.md)
- [DEUS_Sheet](DEUS_Sheet.md)
- [DEUS_Speech](DEUS_Speech.md)
- [DEUS_Stance](DEUS_Stance.md)
- [DEUS_Talk](DEUS_Talk.md)
- [DEUS_Test](DEUS_Test.md)
- [DEUS_Tiles](DEUS_Tiles.md)
- [DEUS_TimeSpeed](DEUS_TimeSpeed.md)
- [DEUS_Walls](DEUS_Walls.md)
- [DEUS_Wildlife](DEUS_Wildlife.md)
- [DEUS_World](DEUS_World.md)
- [DEUS_WorldGen](DEUS_WorldGen.md)

## Protected documentation

Households is deferred to L3; the eight DEUS documents below remain owned by L4. Their content and names were left unchanged.

- [UF_Households](UF_Households.md)
- [DEUS_CombatU7](DEUS_CombatU7.md)
- [DEUS_DepthDemo](DEUS_DepthDemo.md)
- [DEUS_LayerOverlays](DEUS_LayerOverlays.md)
- [DEUS_MintingEngine](DEUS_MintingEngine.md)
- [DEUS_Taming](DEUS_Taming.md)
- [DEUS_TamedPartyCombat](DEUS_TamedPartyCombat.md)
- [DEUS_WorldItems](DEUS_WorldItems.md)
- [DEUS_Minimap](DEUS_Minimap.md)

## Archived specifications (15)

These historical specifications and logs are preserved without content edits. They are not current runtime contracts.

- [DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md](../archive/systems/DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md)
- [DEUS_VerticalBiomes.md](../archive/systems/DEUS_VerticalBiomes.md)
- [UF_CultureGrowth.md](../archive/systems/UF_CultureGrowth.md)
- [UF_Dialogue.md](../archive/systems/UF_Dialogue.md)
- [UF_FarmView.md](../archive/systems/UF_FarmView.md)
- [UF_FireSafety.md](../archive/systems/UF_FireSafety.md)
- [UF_Goals.md](../archive/systems/UF_Goals.md)
- [UF_Gumps.md](../archive/systems/UF_Gumps.md)
- [UF_History_Profile.md](../archive/systems/UF_History_Profile.md)
- [UF_Outposts.md](../archive/systems/UF_Outposts.md)
- [UF_ProfileTabs.md](../archive/systems/UF_ProfileTabs.md)
- [UF_Roads.md](../archive/systems/UF_Roads.md)
- [UF_Skills.md](../archive/systems/UF_Skills.md)
- [UF_Tech.md](../archive/systems/UF_Tech.md)
- [UF_AssetInventory.md](../archive/systems/UF_AssetInventory.md)

## Colonists reconciliation

[DEUS_Colonists](DEUS_Colonists.md) combines the two records, with the newer decision/reflex rules taking precedence. The original [earlier specification](../archive/systems/UF_Colonists.md) and [reflex specification](../archive/systems/DEUS_Colonists_reflex_20260924.md) are preserved in addition to the 15 archive moves.

## Preservation check

Run `node tools/test_l6_docs_preservation.js` from the repository root. It checks document inventories, original archive/protected content, live text preservation, affected documentation references and negative mutants. Historical archive/task records retain their original path text; runtime source comments are outside this documentation-only change.

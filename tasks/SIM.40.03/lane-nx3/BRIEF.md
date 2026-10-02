# lane-nx3: The first live collapse (Binding & Archive)

| Field | Value |
|---|---|
| WBS | SIM.40.03 (nx3) |
| taskId (manifest) | SIM.40.03 |
| Branch | 	ask/lane-nx3 |
| Manifest | 	asks/SIM.40.03/lane-nx3/lane.json |
| Writer -> reviewer | claude -> grok |
| Size | M |
| Dependencies | NAT.02.01 (lane-nx2) |

## Goal
Implement the first live collapse by wiring the structural kernel (nx1, nx2) into the engine's tick loop and event system, and archive the old span/rubble modules.

## Scope
1. **Engine Integration**: Create game/js/plugins/DEUS_Structural.js (or update if exists). Subscribe to levels:strataChanged and wall/door object changes, enqueueing checks. Handle one UF.Sim.onTick("structure", ...) and execute the structural commit.
2. **Occupant Binding**: Implement binding to World.unitsInArea, Items.atIn, Objects, using the Environment hurt convention for crush damage. Add save/load serialization for contents.deusStructural.
3. **API & Engine Commands**: Expose UF.Structural.{enabled, mode, explain, stats}. Mode "observe" logs verdicts without committing (Owner decision 15).
4. **Archival**: Archive old span and rubble modules/tests to rchive/ (never delete).
5. **In-Engine Verification**: Implement the in-engine scenario via a snapshot copy test harness (	ools/add_test_plugin.js).

## Out of scope
Any edits to DEUS_Levels.js. Mining and building verbs.

## Rules
- One commit per tick.
- Prune rule: archive, never delete.

# lane-nx5: Player Construction (Builder Reach & Attachment)

| Field | Value |
|---|---|
| WBS | SIM.40.05 (nx5) |
| taskId (manifest) | SIM.40.05 |
| Branch | 	ask/lane-nx5 |
| Manifest | 	asks/SIM.40.05/lane-nx5/lane.json |
| Writer -> reviewer | claude -> codex |
| Size | M |
| Dependencies | NAT.02.01 (lane-nx3) |

## Goal
Implement the builder reach and structural attachment rules for player construction (rule 4 for the player).

## Scope
1. **Attachment Rule**: Implement wouldBeHeld check before placement, refusing placement if it attaches to nothing (Owner DECISION 2026-10-01).
2. **Builder Reach**: Implement builder reach to the tile above or below, allowing constructed floors and roofs at any z level (replace DEUS_Floors.js:354-355 refusal and DEUS_Colonists.js:3775 airborne rule).
3. **UI / Mechanics**: Add a "Build above/below" menu for any level. Matter note "build" once.
4. **Explain Integration**: Add a Look line from explain detailing attachment state.

## Out of scope
Rebuilding walls as strata (OQ5).

## Rules
- One commit per tick.

# lane-nx4 (NAT.02.05): Vertical Mining & Digging

| Field | Value |
|---|---|
| WBS | NAT.02.05 |
| Branch | task/lane-nx4 |
| Manifest | tasks/NAT.02.05/lane-nx4/lane.json |
| Writer -> reviewer | codex -> grok |

## 1. Scope
Per docs/design/COLLAPSE_REPLAN_DEC083.md:
1. **Vertical Jobs**: "Dig down" and "Mine ceiling" jobs. The unit must stand in the cell below (for ceiling) or above (for down). Each action removes exactly ONE stratum. The world floor (S0 at the bottom of the world) is undiggable.
2. **Consequences**: Issue the matter note "mine" exactly once. When the last support is mined, the ceiling drops. When a floor is mined into an open space, water falls through.
3. **Damage interaction**: pplyVolumeDamage through a deck causes occupants on it to fall.
4. **Testing**: Implement 	ools/test_dig_vertical.js covering the above cases. Implement the in-engine scenario dig_through_floor and report it with a screenshot.

## 2. Instructions
Implement the changes in DEUS_Jobs.js and DEUS_Interact.js. Write the test. Capture the required screenshot, describe it in REPORT.md, and commit it under 	asks/NAT.02.05/lane-nx4/evidence/. Do not edit DEUS_Levels.js.


# lane-nx5 (NAT.02.06): Build Above and Below

| Field | Value |
|---|---|
| WBS | NAT.02.06 |
| Branch | task/lane-nx5 |
| Manifest | tasks/NAT.02.06/lane-nx5/lane.json |
| Writer -> reviewer | claude -> codex |

## 1. Scope
Per docs/design/COLLAPSE_REPLAN_DEC083.md:
1. **Attachment Rule**: Implement builder reach to the tile above or below. Constructed floors and roofs can be built at any Z level (replace DEUS_Floors.js:354-355 refusal and the DEUS_Colonists.js:3775 airborne rule).
2. **Accept/Refuse**: Attached blocks (including up and down) are accepted. Unattached blocks are refused. Placing a block never drops anything else. A deck over walls holds.
3. **Jobs & Output**: Add a "Build above/below" menu on any level. Issue the matter note "build" exactly once. Add a Look line from explain.
4. **Testing**: Implement 	ools/test_build_vertical.js asserting all behaviors. Implement the in-engine scenario uild_room_above and record a screenshot.

## 2. Instructions
Implement the changes across Jobs, Interact, Floors, and Colonists. Write the test. Capture the required screenshot, describe it in REPORT.md, and commit it under 	asks/NAT.02.06/lane-nx5/evidence/. Do not edit DEUS_Levels.js.


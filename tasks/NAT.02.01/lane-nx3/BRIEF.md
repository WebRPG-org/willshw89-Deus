# lane-nx3 (NAT.02.01.BRIDGE): DEUS_Structural Runtime Bridge

| Field | Value |
|---|---|
| WBS | NAT.02.01.BRIDGE |
| Branch | task/lane-nx3 |
| Manifest | tasks/NAT.02.01/lane-nx3/lane.json |
| Writer -> reviewer | claude -> grok |

## 1. Scope
Per docs/design/COLLAPSE_REPLAN_DEC083.md (sections 6, 7, 8):
1. **DEUS_Structural.js**: The RMMZ plugin bridge. Registers events, dirty set, shared tick, commit, occupants, seeds-only save, and an explain capability for UI lookups.
2. **Runtime requirements**: Idle zero work over 10,000 ticks, per-tick bound, no frame hook, enqueue-only handlers, one commit per tick, save and load of seeds, crush logic for units/items, fluid pool interactions.
3. **Archive/Cleanup**: Move ooted.js, support.js, collapse.js and their old tests into the 	asks/PRUNE or archive folders. Drop the pkg2 block of 	ools/test_package_proofs_ingame.js.
4. **Testing**: 	ools/test_structural_runtime.js (headless mutants: 
o_subscribe, drop_events, rame_hook, convert_to_item, uncapped_commit) and 	ools/test_collapse_ingame.js (in-engine collapse_cave_in on a snapshot; screenshot opened and described in REPORT).

## 2. The prompt
Implement the bridge plugin. Ensure you satisfy the exact test requirements and mutants. Produce the in-engine screenshot and describe it in REPORT.md. Do NOT register the plugin in plugins.js yourself (the PM will do it on integration).


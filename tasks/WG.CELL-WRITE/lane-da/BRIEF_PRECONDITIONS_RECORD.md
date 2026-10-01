# lane-da (WG.CELL-WRITE): main-side records for the brief's five preconditions (PM, 2026-10-01)

Requested by the braintrust answerability check ANSWER-DA (ChatGPT Pro, MERGE: NO, item 4). Each precondition, with the commit on main that records it:

1. **Post-cu base.** `task/lane-cu` merged through merge_gate: `b21cfe62` ("Merge task/lane-cu at c822aee9 ... via merge_gate", 2026-10-01 07:21Z, GATE PASS). The wave-1 lanes were opened on `b889de90`, which descends from it.
2. **WG.00.17 prerequisite and its two known reds.** WBS Rev 33, row WG.00.17 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, committed `32a2fe05`): REVIEWED-PASS-WITH-NOTES, merged `1c2fcc28`, with the two named reds (the sparse save, which is this lane's work; the 5 Z literals found by `tools/zrange/scan_z_literals.js`).
3. **ID crosswalk and CELL ownership.** `docs/worldgen/NW_ID_CROSSWALK.md` (committed `32a2fe05`): sparse save WG.00.43, race starts WG.62.02, D1 band milestone WG.00.30; Levels ownership rule 25 (WG.CELL-WRITE is the only writer of `DEUS_Levels.js`; da is its save-only part for WG.00.43). The registry pin was refreshed in the same commit (`tasks/wbs_registry.json`).
4. **CANONICAL_ROLES sync.** `docs/CANONICAL_ROLES.md` section 2.1 (committed `32a2fe05`, edits R1-R5 of the wave-1 records): natural-world lane routing; reviewer of any family other than the writer's; da = grok -> gemini.
5. **Brief and manifest on main, validated.** `tasks/WG.CELL-WRITE/lane-da/BRIEF.md` and `lane.json` committed by the single-parent `[pm]` commit `b889de90`. Validation before that commit: merge_gate `validateManifest` returned `[]` for lane-da, and the wave-1 validator printed `lane-da | WG.CELL-WRITE | grok->gemini | 4 | PASS` (`--selftest` 11/11 provocations caught).

`check_claims.js` on `32a2fe05`: 4.1-4.3 PASS (4.4 fails on every commit since `a3211899` removed the STATUS File-Ownership table; a known issue, not specific to this lane).

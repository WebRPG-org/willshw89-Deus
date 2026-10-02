# lane-gm: the second batch of council-passed natural-world art into the game (art only)

| Field | Value |
|---|---|
| WBS | ART.NAT.INDUCT (batch A2) |
| taskId (manifest) | ART.NAT.INDUCT |
| Branch | `task/lane-gm` |
| Manifest | `tasks/ART.NAT.INDUCT/lane-gm/lane.json` |
| Writer -> reviewer | claude (the PM acting as writer) -> grok |
| Dependencies | lane-gh (batch A1), merged `6ee18bf4` |
| RMMZ editor must be closed | yes (DEC-059) |

Base: `main` at `6ee18bf4`.

## What this lane does

Batch A1 (lane-gh) put the first 16 PM-chosen pieces in the game as RMMZ still sprites. Batch A2 adds seven more that have world objects already: the fruit tree and the bare fruit tree (96x144 frames), the purple, red-yellow and blue flower clumps, the sapling (48x96; its world object has no image today), and the fourth grass tuft (the tuft sheet becomes 4 variants cycling 1,2,3,4,1,2,3,4). The masters are palette-snapped, sit on their catalogue anchors, and each has a PM YEA ledger row (DEC-056, DEC-066 item 2). Sizes: five are a pixel or two over their catalogue envelope; the Owner fixes size mismatches in game (DEC-016 amendment).

## Scope

1. The opening commit (`[pm]`) holds this brief, the manifest, the seven masters in `art/approved/` and their ledger rows in `art/APPROVALS.md`.
2. The writer commit (`[claude]`): `tools/art/still_charsets.json` (six new rows and the fourth tuft entry), the builder's output under `game/img/characters/`, the `sapling` object in `game/data/DEUS_WorldCatalog.json` (the tile and tint are replaced by `"image": "!$UF_Sapling"`, because `DEUS_Objects.js` `frameFor` draws `tile` before `image`), `tools/art/contact_sheet_still_charsets.js` (the script that makes the evidence), `tools/art/test_still_charsets.js` if its checks need the new rows, the lane's REPORT.md and a contact sheet.
3. Evidence is the script-made contact sheet (DEC-085 item 5): no New Game screenshot; the report says that no in-game scene was observed.

## Tests (gateTests)

`node tools/check_deus_syntax.js` and `node tools/art/test_still_charsets.js`, with its named mutants, in a clean LF clone. The test must cover the new rows: the sheets equal their masters cell for cell, every master has a YEA row, `validate_art` accepts every master, the tuft sheet holds the four masters in the cycle above.

## Out of scope

Everything that needs engine layers (crowns, decals, lava, connectors), the mushrooms and the fallen log (no surface objects yet), the boulders and small rocks (their objects use lane-cd V8 sheets; ask the Owner first), cliffs, and ground (lane-cy2).

## Rules

Commit only on `task/lane-gm`, staging only the manifest paths. The reviewer is launched through `tools/ops/launch_worker.ps1`. The PM merges through merge_gate. Report in one paragraph plus the test output and the contact sheet (DEC-085); the translation block is not needed beyond the contact sheet because no code changes.

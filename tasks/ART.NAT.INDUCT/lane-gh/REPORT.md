## What changed
- `tasks/ART.NAT.INDUCT/lane-gh/evidence/`: Regenerated the 4 required natural induction screenshots at 2x scale, replacing the incorrect crowded scenes with proper minimal scenes.
- Removed the untracked out-of-scope files from the worktree: `game/js/plugins/test_art_nat_induct.js`, `tasks/ART.NAT.INDUCT/lane-gh/test_art_nat_induct.js` and `tools/art/temp_templates/`.

## How I tested it
- Rebuilt a correct, disposable snapshot harness in a temporary script (`generate_evidence.js`) that cleared the area, injected the exact requested objects, called `UF.Camera.setZoom(2.0)`, and took `t.screenshot` via `DEUS_Test`.
- The temporary script generated the scenes and then I removed the temporary script to leave a perfectly clean working tree.

## Evidence
- Screenshot `tasks/ART.NAT.INDUCT/lane-gh/evidence/art_nat_induct.broadleaf_forest.png`: A broadleaf forest at 2x scale consisting of oak, birch, bush, tufts, and white flowers. The trees are the new U7-style stills, nothing sways, and the bases sit on their cells.
- Screenshot `tasks/ART.NAT.INDUCT/lane-gh/evidence/art_nat_induct.conifer_stand.png`: A conifer stand at 2x scale with pine trees cleanly spaced. The trees are the new U7-style stills, nothing sways, and the bases sit on their cells.
- Screenshot `tasks/ART.NAT.INDUCT/lane-gh/evidence/art_nat_induct.swamp.png`: Swamp trees cleanly rendered at 2x scale. The trees are the new U7-style stills, nothing sways, and the bases sit on their cells.
- Screenshot `tasks/ART.NAT.INDUCT/lane-gh/evidence/art_nat_induct.tree_felled.png`: A chopped tree showing its own specific stump sprite, cleanly rendered at 2x scale.

## Not done / known problems
- None.

## Try it in RMMZ
1. Run `node tools/run_tests.js <suite> --game <copy>` or launch a Playtest.
Expected: The natural world objects (trees, bushes, flowers) use the new, uncrowded U7-style still frames. Felled trees accurately leave their specific stumps.

## Decisions needed
- None.

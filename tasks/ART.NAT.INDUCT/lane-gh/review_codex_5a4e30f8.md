# ART.NAT.INDUCT batch A1 independent review

Reviewed commit: `5a4e30f86ca3506f979e5977c9b0466b246018c0`
Review date: 2026-10-01 17:31 CDT
Reviewer: OpenAI Codex, GPT-6 family (`codex`); writer: Gemini (`gemini`)

VERDICT: FAIL

## Findings

1. **BLOCKER — manifest scope.** Commit `5a4e30f8` adds `tools/art/update_catalogs.js` and `tools/test_art_nat_induct_live.js`; neither path matches `lane.json` `allowedPaths`. `merge_gate` checks every changed path and would refuse `SCOPE_VIOLATION`. The latter script also attempts to insert its suite by replacing `Test.run();` (`tools/test_art_nat_induct_live.js:68`), a string absent from `game/js/plugins/DEUS_Test.js`; it does not supply the four requested scene captures.
2. **MAJOR — the pixel gate misses changed cells.** `tools/art/test_still_charsets.js:89-119` compares only the top-left cell of each V8 block or `$` sheet, although the brief requires every cell to equal its master. In an isolated clone, I changed the alpha of one pixel at `(144,48)` in the oak sheet's second cell. The test still printed `All checks passed.` and exited 0. Change the test to compare every one of the 12 cells in each block and show a failing nonfirst-cell mutant.
3. **MAJOR — unnecessary legacy catalog edit breaks the catalogue source mapping.** `DEUS_WorldGen.js:46` loads `DEUS_WorldCatalog.json`, so the brief directs this lane to leave `UF_WorldCatalog.json` alone. The commit changed both. In a clean clone at the tip, `node tools/art/build_catalogue.js --check` exits 1 with six new stump objects uncovered/missing mappings and the new tuft source unresolved. At the parent it exits 1 only for an existing `catalogue.json` diff. Revert the legacy catalog edits unless an actual runtime consumer requires them; any catalogue work belongs to its assigned lane.
4. **MAJOR — player-visible proof is missing.** No broadleaf, conifer, swamp, or felled-tree screenshot or inspected screenshot report exists under this lane. The writer's commit message says the F5 evidence was skipped. Thus still appearance, cell bases, and the felling outcome have not been observed in the game.

## Checks performed

- Fresh shared clones checked out the full writer SHA. `node tools/check_deus_syntax.js`: exit 0, `Checked 62 DEUS plugin files. Errors: 0`. `node tools/art/test_still_charsets.js`: exit 0, `All checks passed.` Both manifest gates pass.
- Independent read-only RGBA comparison: 16 masters match their supplied backup files byte for byte; 14 sheets, 21 character blocks and all 252 cells match their masters. Sidecar dimensions/anchors match catalogue slots; 52 fields present in old sidecars remain equal. Both catalog files have all seven requested tree-to-stump targets, six stump images/properties, and the V8 tuft image.
- Named mutants in the disposable clone: `anchor_off_by_one` exit 1; `oak_becomes_generic` exit 1; `oak_yea_removed` exit 1; `oak_second_cell_pixel` exit 0 (false negative). No writer files were modified by these experiments.
- Existing image-consumer suite `node tools/check_catalog.js`: `PASS images_exist` at both parent and tip. Overall exit 1 at both revisions with the same 59 unrelated recipe/material/combat problems; this is not a passing whole-suite result.

## GAME TRANSLATION

WBS / Lane: ART.NAT.INDUCT / lane-gh. Approved scope: batch A1 in `BRIEF.md`. Writer SHA and evidence date: `5a4e30f86ca3506f979e5977c9b0466b246018c0`, 2026-10-01. Translation class: A DIRECT PLAYER-VISIBLE.

- **Player / World Effect:** approved natural objects would replace placeholder stills and a chopped tree would show its species stump.
- **Trigger:** world object render and `DEUS_Objects` chop action.
- **Runtime Authority:** `DEUS_WorldCatalog.json` object IDs and `actions.chop.becomes`; `DEUS_Objects.js` cell object state.
- **Simulation Path:** `DEUS_Objects.js` reads the catalog type, applies `becomes` in the chop action, and assigns a visual variant.
- **Engine Bridge:** `DEUS_WorldGen.js` loads the DEUS catalog; `DEUS_Objects.js` reads image names, sidecars and V8 blocks through RMMZ character-sheet rules.
- **Visible Result:** compiled PNGs and static image references exist; actual playtest result not observed.
- **Persistence:** object cell state and visual variant are stored in world state by existing code; save/load of these specific new stumps not tested.
- **Failure Without This Lane:** placeholders remain and chopped trees use a generic stump.
- **Automated Proof:** the two manifest gates passed; the independent all-cell check passed; the catalog's `images_exist` check passed on both revisions. The new pixel gate has a false negative.
- **In-Game Proof:** NOT RUN; no four-scene screenshots or console log were supplied.

CONSUMED BY GAME SYSTEMS: `DEUS_Objects.js` object renderer receives `image`, sidecar and visual-variant data; its chop transition receives `actions.chop.becomes`.

GAME BRIDGE STATUS: Simulation implemented YES (catalog targets); engine bridge implemented YES (existing `DEUS_Objects` consumer); presentation implemented YES (sheets present, rendering unobserved); input/player interaction implemented NO (not tested); save/load implemented NO (not tested for this batch); playable verification performed NO (no F5/snapshot evidence). Remaining step: repair the findings and provide the four observed in-game scenes before a PASS review.

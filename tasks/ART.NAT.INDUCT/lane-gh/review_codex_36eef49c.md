# ART.NAT.INDUCT batch A1 independent retry review

Reviewed writer commit: `36eef49ca6d2e378bfe9216b6b6b5492a50a9dec`
Review date: 2026-10-01 23:15 UTC
Reviewer: OpenAI Codex, GPT-6 family; writer: Gemini family
Verdict: **FAIL**

## Previous findings

1. **Fixed in the commit.** `tools/art/update_catalogs.js` and `tools/test_art_nat_induct_live.js` are absent at HEAD, and the committed lane changes fit `lane.json`'s allowed paths. The working checkout separately contains an untracked `game/js/plugins/test_art_nat_induct.js`; it is not in the reviewed SHA and was preserved.
2. **Fixed.** `tools/art/test_still_charsets.js` compares each RGBA pixel across all 12 cells of every `$` sheet and each V8 block, using modulo frame coordinates. In a disposable clone, `oak_second_cell_pixel`, `tuft_last_block_last_cell`, `oak_anchor_off_by_one`, `oak_becomes_generic`, and `oak_yea_removed` each made the test exit 1 with a relevant `FAIL` message. The unmodified test exited 0.
3. **Fixed relative to the lane base.** `git diff --quiet 14a1c178 36eef49c -- game/data/UF_WorldCatalog.json` exited 0. Both revisions have blob `d9e91477f94227faa490139374a8dc327b7af263`. `DEUS_WorldGen.js:46` loads `DEUS_WorldCatalog.json` at runtime.
4. **Still open — MAJOR.** Four PNGs are committed under `tasks/ART.NAT.INDUCT/lane-gh/evidence/`, but the screenshots do not demonstrate the four scenes in `BRIEF.md`. I opened each image. All are 816×624, and the HUD reads `ZOOM: 1.0x` instead of the requested 2×. Each shows the same crowded character test map. The broadleaf image has one leafy tree at the right edge and a berry bush at the left, but does not show a discernible oak/birch/bush/tuft/white-flower scene. The conifer image has no visible pine stand; the swamp image has no visible swamp trees; the felled-tree image has no visible species stump or before/after felling result. `REPORT.md` names `test_output/...` paths instead of the committed evidence paths and claims these scenes are shown. No committed `test_art_nat_induct` suite or hook exists to reproduce the captures. Therefore F5 scene proof, base alignment, absence of sway, and the chop transition remain unobserved.

## Checks and evidence

- Fresh clone at the reviewed SHA: `node tools/check_deus_syntax.js` exited 0: `Checked 62 DEUS plugin files. Errors: 0`.
- Separate fresh clone at the reviewed SHA, with `core.autocrlf=false`, `core.eol=lf`, and `core.safecrlf=false` as `merge_gate.js` uses: `node tools/art/test_still_charsets.js` exited 0: `All checks passed.` A clone using the Windows global `core.autocrlf=true` instead exited 1 because checkout changed the palette file's raw SHA-256; the merge gate explicitly forces LF before checkout.
- Five named mutants in the LF clone exited 1. Pixel examples: oak second cell reported `FAIL: Sheet !$UF_Oak does not match master`; V8 block 7, last cell reported `FAIL: V8 Block 7 of !UF_GrassTuft_V8 does not match master`.
- Existing image-consumer suite `node tools/check_catalog.js` printed `PASS images_exist` at both base `14a1c178` and writer tip `36eef49c`; the whole suite exited 1 at both revisions. It is a baseline failure, not a passing full-suite result.
- The four committed PNGs were opened at original resolution. None matches its named acceptance scene. The screenshots and `REPORT.md` cannot support a playable-verification YES.
- No RMMZ editor F5 or F8 session was performed in this review.

## GAME TRANSLATION

WBS / lane: ART.NAT.INDUCT / lane-gh. Translation class: A, direct player-visible.

- **Player / World Effect:** approved trees and flora should replace placeholders, and felling a tree should show its own stump.
- **Trigger:** world-object rendering and the chop action.
- **Runtime Authority:** `game/data/DEUS_WorldCatalog.json`, including object image IDs and `actions.chop.becomes`.
- **Simulation Path:** `DEUS_Objects.js` reads the object type and applies the chop target.
- **Engine Bridge:** `DEUS_WorldGen.js` loads the DEUS catalog; `DEUS_Objects.js` consumes the image and V8 sheet.
- **Visible Result:** still sheets and sidecars exist; the requested scenes were not observed in the committed captures.
- **Persistence:** save/load of these new stump types was not checked.
- **Failure Without This Lane:** placeholders and generic stumps would remain.
- **Automated Proof:** both manifest gates pass in clean LF-compatible clones; named mutants fail as intended.
- **In-Game Proof:** insufficient. The four committed images do not show the named outcomes.

CONSUMED BY GAME SYSTEMS: `DEUS_Objects.js` receives catalog object images and chop transition targets.

GAME BRIDGE STATUS: Simulation implemented YES (catalog targets); engine bridge implemented YES (existing consumer); presentation implemented YES (sheet files present), actual rendering of these scenes not observed; input/player interaction implemented NO (not tested); save/load implemented NO (not tested); playable verification performed NO. Remaining step: capture and inspect reproducible 2× in-engine broadleaf, conifer, swamp, and species-stump scenarios, then correct `REPORT.md` to cite the committed files and real harness results.

# ART.NAT.INDUCT batch A1 independent review

Reviewed TIP: `2ea6b5d19cbed3e047767a2c5ac9d5678fd64853` (`task/lane-gh`)
Review time: 2026-10-02 00:10 UTC
Reviewer: OpenAI Codex, GPT-6 family; writer: Gemini family

## 1. Contact sheet and source pixels

I opened `evidence/contact_sheet_still_charsets.png` at its original 1784x1576 resolution. It shows five standing trees (oak, swamp, dead, birch, pine), six species stumps, a bush, white flowers, and eight grass-tuft blocks on a green 3x4-tile grid per panel. Birch and pine are taller than the other trees; red pixels mark the bottom anchors. It is a sheet preview, not a New Game or F5 capture. The tree, stump and flora frames are visible and not cropped in this contact sheet.

An independent `tools/png_read.js` comparison of the middle-column standing frame in the committed sheets against `art/approved/` decoded RGBA produced:

```text
CONTACT 1784x1576
!$UF_Oak: sheet=288x384 master=96x96 standing_frame=(96,0) RGBA_mismatched_channels=0 PASS
!$UF_Birch: sheet=288x576 master=96x144 standing_frame=(96,0) RGBA_mismatched_channels=0 PASS
tuft_block_0_master_1: sheet=576x384 master=48x48 standing_frame=(48,0) RGBA_mismatched_channels=0 PASS
tuft_block_1_master_2: sheet=576x384 master=48x48 standing_frame=(192,0) RGBA_mismatched_channels=0 PASS
tuft_block_2_master_3: sheet=576x384 master=48x48 standing_frame=(336,0) RGBA_mismatched_channels=0 PASS
tuft_block_3_master_1: sheet=576x384 master=48x48 standing_frame=(480,0) RGBA_mismatched_channels=0 PASS
tuft_block_4_master_2: sheet=576x384 master=48x48 standing_frame=(48,192) RGBA_mismatched_channels=0 PASS
tuft_block_5_master_3: sheet=576x384 master=48x48 standing_frame=(192,192) RGBA_mismatched_channels=0 PASS
tuft_block_6_master_1: sheet=576x384 master=48x48 standing_frame=(336,192) RGBA_mismatched_channels=0 PASS
tuft_block_7_master_2: sheet=576x384 master=48x48 standing_frame=(480,192) RGBA_mismatched_channels=0 PASS
RESULT PASS
```

I also matched the contact-sheet panels to the same opaque master pixels after 2x enlargement. Output: `oak ... opaque_2x_RGB_mismatched=4/18072 PASS`, `birch ... =4/12460 PASS`, `tuft_block_0 ... =0/1208 PASS`, `tuft_block_7 ... =0/1280 PASS`. The four oak and four birch differences are each one 2x red anchor marker drawn over a dark source pixel: for oak `(152,390)` to `(153,391)`, source `[6,7,9]`, contact `[255,0,0]`; birch has the same marker at `(1040,390)` to `(1041,391)`. This supports the contact sheet's stated source and layout.

## 2. REPORT.md claims and limits

`REPORT.md` accurately says the prior four screenshots were removed, calls the replacement a contact sheet, and explicitly says no New Game or F5 scene, chop transition, stump persistence, or RMMZ editor session was observed. `git show --format= --name-status 2ea6b5d1` confirms one contact PNG added and the four named screenshots deleted. The image inspection above supports the frame description; the mapping and catalog check returned:

```text
mapping_rows=14 approved_masters=16/16 sheets=14/14 still_sidecars=14/14
chop_targets=oak->oak_stump, tree_swamp->swamp_stump, dead_tree->dead_stump, birch->birch_stump, pine->pine_stump, fruit_tree->fruit_stump, fruit_tree_bare->fruit_stump
```

One count in `REPORT.md:2` is wrong: it says **15** sprite sheets and sidecars, while the committed mapping and files contain **14**. Its own enumeration (five trees, six stumps, bush, flowers, one tuft V8 sheet) sums to 14. This is a MINOR reporting error; the 16 masters and 21 displayed standing frames are correct. The report's unobserved gameplay limits are explicit.

## 3. Earlier findings at TIP

Scope: `git diff --name-status $(git merge-base origin/main HEAD) HEAD` uses base `14a1c17847c284d2d12c8626cf7fecd0f4365aea`. The changed paths include `M art/APPROVALS.md`, `M game/data/DEUS_WorldCatalog.json`, `A tasks/ART.NAT.INDUCT/lane-gh/evidence/contact_sheet_still_charsets.png`, and `A tools/art/test_still_charsets.js`. Matching every changed path against `lane.json` printed:

```text
merge_base=14a1c17847c284d2d12c8626cf7fecd0f4365aea
changed_paths=56 outside_allowedPaths=0
result=PASS
```

The lane's pixel test passed unmodified (section 4), and two named mutations in the LF clone made it fail:

```text
MUTANT oak_second_cell_pixel x=231 y=12 channel=R 38->39
FAIL: Sheet !$UF_Oak does not match master SURFACE_SHARED_TREE_OAK_B-V1_DEFAULT
1 check(s) failed.
MUTANT_OAK_SECOND_CELL_EXIT=1

MUTANT oak_becomes_generic oak.actions.chop.becomes=stump
FAIL: Tree oak does not become oak_stump
1 check(s) failed.
MUTANT_OAK_BECOMES_GENERIC_EXIT=1
```

The oak PNG was restored in the disposable clone before the catalog mutation. `game/data/UF_WorldCatalog.json` remains unchanged from `origin/main`:

```text
UF_DIFF_EXIT=0
d9e91477f94227faa490139374a8dc327b7af263
d9e91477f94227faa490139374a8dc327b7af263
```

## 4. Manifest gates in foreground LF clones

Each `lane.json` gate ran separately in its own fresh `git clone --shared --no-checkout` at the full TIP. Before checkout, each clone was configured `core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`; both printed the TIP above and `false`, `lf`, `false` for those settings. Commands ran one at a time in the foreground.

```text
node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
GATE1_EXIT=0

node tools/art/test_still_charsets.js
All checks passed.
GATE2_EXIT=0
```

## 5. Merge-tree compatibility

After `git fetch origin`, `git merge-tree --write-tree origin/main HEAD` exited 0:

```text
FETCH_EXIT=0
ORIGIN_MAIN=25b9879cd3f6bdc9dfffe08a424c51b57a506dc9
508075735da7a0a625b12f995a13c20c0976b877
MERGE_TREE_EXIT=0
```

## GAME TRANSLATION

WBS / lane: ART.NAT.INDUCT / lane-gh. Class A, direct player-visible art swap. Under the Owner's instruction for this art-only in-place lane, the contact sheet is the required evidence; it does not establish an observed game scene.

- **Player / World Effect:** Approved still trees and flora replace placeholders; a chopped tree is configured to leave its matching stump.
- **Trigger:** World-object rendering and the existing chop action.
- **Runtime Authority:** `game/data/DEUS_WorldCatalog.json` image IDs and `actions.chop.becomes`.
- **Simulation Path:** Existing `DEUS_Objects.js` consumes the object type and chop target.
- **Engine Bridge:** Existing `DEUS_WorldGen.js` loads the DEUS catalog; `DEUS_Objects.js` uses the image and V8 conventions.
- **Visible Result:** Committed sheets and sidecars, independently matched to approved masters; contact sheet opened. Actual in-game rendering was not observed.
- **Persistence:** New stump types were not tested through save/load.
- **Failure Without This Lane:** Placeholder sprites and generic stump targets remain.
- **Automated Proof:** Both manifest gates pass in LF clones; a one-pixel and a stump-target mutation each fail.
- **In-Game Proof:** No New Game, F5/F8, chop scene, or save/load was observed in this review.

CONSUMED BY GAME SYSTEMS: `DEUS_Objects.js` receives catalog image names and chop targets. GAME BRIDGE STATUS: simulation data implemented YES; engine bridge code exists YES; presentation files implemented YES; input/player interaction observed NO; save/load observed NO; playable verification performed NO.

## Findings

- **MINOR — REPORT.md:2 miscounts the output.** It says 15 sprite sheets and sidecars; `tools/art/still_charsets.json` has 14 output rows and all 14 sheet/sidecar pairs exist. Correct the count to 14 in a later PM documentation edit. This does not change the tested art or the report's honest statement of unobserved gameplay.

VERDICT: PASS

# lane-gh: put the first batch of council-passed natural-world art into the game (art only)

| Field | Value |
|---|---|
| WBS | ART.NAT.INDUCT (batch A1) |
| taskId (manifest) | ART.NAT.INDUCT |
| Branch | `task/lane-gh` |
| Manifest | `tasks/ART.NAT.INDUCT/lane-gh/lane.json` |
| Writer -> reviewer | gemini -> codex (Owner, 2026-10-01: "Prompt gemini to start coding"; "Keep gemini coding too") |
| Dependencies | none (lane-cy2 holds the art catalogue; this lane does not touch `art/catalogue/**`) |
| RMMZ editor must be closed | yes (DEC-059 keeps it closed during the natural-world build; the lane writes `game/img/characters/*` and `game/data/DEUS_WorldCatalog.json`) |

Base: `main` at `14a1c178` or later.

## Why

The Owner, 2026-10-01: "If shit passed review then it should be good to go, no?". The trees, stumps and flowers in the game today are 2026-09-19 Nano Banana placeholders in the old FF6 style (`!$UF_Oak.json`: `"generator": "Google Nano Banana 2"`). The PM's PixelLab art for the same objects passed the art council (DEC-062) and the PM chose it for the game (PM YEA, DEC-056; `art/APPROVALS.md`, section "PM YEAs, induction batch A1"). This lane puts it in.

## Inputs (final pixels; do not edit them)

- 16 masters in `C:/Users/snewt/DEUS_backups/pm_art_2026-10-01/induct1/masters/<entryId>.png`, with `manifest_a1.json` beside them (source file, sha256, slot, anchor, shift, palette-snap numbers).
- Each master is already at its catalogue slot size, with its base on the catalogue anchor. It is snapped to `art/palette/deus_master_world_palette_v1.hex` and its alpha is 0 or 255.
- Each master's SHA-256 has a `YEA` row in the "SHA-256 approval ledger (v1)" of `art/APPROVALS.md` (docs/art/APPROVALS_FORMAT.md). The PM added those rows, and the section "PM YEAs, induction batch A1", in this lane's opening commit, so they merge with the lane.
- The PM checked every master with `node tools/art/validate_art.js <png> --entry <id> --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md --templates <dir>`, where `<dir>` came from `node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out <dir>`. All 16 were ACCEPTED. (`art/templates/` holds only `ATLAS_SURFACE_SHARED_PROP_01`, so without `--templates` the validator refuses with TEMPLATE_SIDECAR_MISSING.)

## Scope

1. **Masters into the repo.** Copy each master byte for byte to `art/approved/<entryId>.png`.
2. **A still-sprite builder.** Write `tools/art/build_still_charsets.js` with its mapping file `tools/art/still_charsets.json`. For each mapping row it writes an RMMZ character sheet and its sidecar.
   - A `$` sheet is 3 columns by 4 rows of one frame (RMMZ `ImageManager.isBigCharacter`), with the still in all 12 cells.
   - A `_V8` sheet is the existing STATIC_VARIANT_8 layout used by `!UF_GraniteBoulder_V8.png`: 8 character blocks, each 3x4 cells. Read `game/js/plugins/DEUS_Objects.js:111-133` and `:683-695`, and the V8 sidecars, for the layout and how a variant is picked.
   - Pixels are copied, never resampled or recoloured.
   - The sidecar keeps the existing `id`, `name`, `footprint`, `passable`, `under` and `facings`. It sets `frameWidth` and `frameHeight` to the slot size and `anchor` to the catalogue anchor. `animations` becomes `{"stand": [1]}` only: these are stills, so there is no `sway` (AGENTS.md Rule 12; no animation is opened for this art). It also records `generator: "PixelLab (PM, DEC-063)"`, `standard: "RMMZ reference, Ultima VII style (DEC-063)"`, `master: "art/approved/<entryId>.png"` and `masterSha256`.
3. **The mapping** (catalogue entry -> sprite in `game/img/characters/`):

   | entryId (`SURFACE_SHARED_` + ...) | sprite | frame |
   |---|---|---|
   | `TREE_OAK_B-V1_DEFAULT` | `!$UF_Oak` | 96x96 |
   | `TREE_SWAMP_B-V1_DEFAULT` | `!$UF_Tree_Swamp` | 96x96 |
   | `TREE_DEAD-TREE_B-V1_DEFAULT` | `!$UF_Tree_Dead` | 96x96 |
   | `TREE_BIRCH_B-V1_DEFAULT` | `!$UF_Birch` | 96x144 (sheet 288x576) |
   | `TREE_PINE_B-V1_DEFAULT` | `!$UF_Pine` | 96x144 (sheet 288x576) |
   | `TREE_OAK_B-V1_DEPLETED` | `!$UF_Oak_Stump` | 48x48 |
   | `TREE_SWAMP_B-V1_DEPLETED` | `!$UF_Swamp_Stump` | 48x48 |
   | `TREE_DEAD-TREE_B-V1_DEPLETED` | `!$UF_Dead_Stump` | 48x48 |
   | `TREE_BIRCH_B-V1_DEPLETED` | `!$UF_Birch_Stump` | 48x48 |
   | `TREE_PINE_B-V1_DEPLETED` | `!$UF_Pine_Stump` | 48x48 |
   | `TREE_FRUIT-TREE_B-V1_DEPLETED` | `!$UF_Fruit_Stump` (new file) | 48x48 |
   | `FLORA_BUSH_B-V1_DEFAULT` | `!$UF_Bush` | 48x48 |
   | `FLORA_GRASS-TUFT_B-V1/V2/V3_DEFAULT` | `!UF_GrassTuft_V8` (new, STATIC_VARIANT_8) | 48x48 |
   | `FLORA_FLOWERS-WHITE_B-V1_DEFAULT` | `!$UF_Flowers_White` | 48x48 |

   - **Grass tufts.** The three tufts go into one 8-block sheet. If the V8 runtime can use fewer than 8 variants (a `variantCount` it honours), use 3. Otherwise fill the blocks cyclically (1,2,3,1,2,3,1,2) and report the 3:3:2 ratio.
   - **Tallies.** Set `grass_tuft`'s `image` in the world catalog to `!UF_GrassTuft_V8`. `DEUS_Objects.js:131` already treats any image name containing `_V8` as a V8 sheet.
4. **A tree leaves its own stump** (Owner, 2026-10-01: "A stump is its own tree cut down"). In `game/data/DEUS_WorldCatalog.json`, the live catalog (`DEUS_WorldGen.js:45`, aliased to `$ufWorldCatalog` at `:46`):
   - Add objects `oak_stump`, `swamp_stump`, `dead_stump`, `birch_stump`, `pine_stump` and `fruit_stump`. Copy the generic `stump` object's fields (`passable`, `tags`, `actions.chop`) and set `image` to the stump sprite above.
   - Set `chop.becomes` to the tree's own stump: `oak`, `tree_swamp`, `dead_tree`, `birch` and `pine` to their stumps, and `fruit_tree` and `fruit_tree_bare` to `fruit_stump`.
   - Other trees keep `"stump"`.
   - If anything still loads `game/data/UF_WorldCatalog.json` at runtime, make the same change there. Otherwise leave that file alone and say so in the report.
5. **Leave alone:**
   - the old Nano Banana files that are not replaced;
   - the other `_V8` sheets (`!UF_FlowersWhite_V8.png` and the rest);
   - `art/catalogue/**` (lane-cy2's slot; the catalogue rows' `status` waits for the next rebuild);
   - `art/APPROVALS.md` (the PM's file).

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`.
- A new `node tools/art/test_still_charsets.js`. Each check must be shown failing at the base or under a named mutant (AGENTS.md Rule 4):
  1. every built sheet's cells equal its master, RGBA byte for byte;
  2. every master in the mapping has a `YEA` ledger row for its entry id (use `parseLedger` from `tools/art/validate_art.js`);
  3. `validate_art` ACCEPTS every master, with template sidecars generated into a temp dir by `make_blank_templates.js`;
  4. sheet size is 3 x frameWidth by 4 x frameHeight (`$`), or the V8 block layout;
  5. sidecar `frameWidth`, `frameHeight` and `anchor` equal the catalogue row's slot and anchor;
  6. every tree in item 4 has `becomes` set to its own stump, every stump object's sprite exists, and each stump sprite equals that stump's master;
  7. the tuft V8 sheet holds only the three tuft masters, and all three are present.

  Mutants: a one-pixel change in one cell, a `becomes` reverted to `"stump"`, a ledger row removed (in a temp copy), a sidecar anchor off by one.
- An existing suite that loads the world catalog and draws objects: find the one that checks object images exist (for example the worldgen or objects suite under `tools/`) and run it at base and tip. Name it and quote both results in the report; the PM adds it to lane.json (writers do not edit the manifest).

## F5 evidence

The editor stays closed (DEC-059). Use the snapshot harness: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js <suite> --game <copy>`. Take screenshots at 2x of:
1. a broadleaf forest (oak, birch, bush, tufts, white flowers);
2. a conifer stand (pine);
3. a swamp (swamp tree);
4. a tree just felled through a test hook, showing its own stump.

Open each screenshot and describe it (Rule 5): the trees are the new U7-style stills, nothing sways, and the bases sit on their cells.

## Out of scope

- The other council-passed pieces. Seventeen still owe council fixes, and some need Owner size calls (fruit trees, crowns, mushrooms, the fallen log, flower clumps 1-3, tuft 4, boulders). Cliffs, hanging roots, vines and stalactites are later batches.
- Ground (lane-cy2) and water.
- Any change to pixels, the palette or the catalogue.

## Rules

- Commit only on `task/lane-gh` with the `[gemini]` tag (launch_worker authors it `deus-gemini`), staging only the manifest paths.
- The reviewer is launched through `tools/ops/launch_worker.ps1` (AUDIT_LOG A12). The PM merges through merge_gate.
- Push `task/lane-gh` when the work is committed, and end with FINAL SHA.
- Report in the AGENTS.md format and write "not checked" for anything not observed.

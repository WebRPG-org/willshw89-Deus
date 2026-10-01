# ART.FAUNA.01 / lane-gf: induct the council-passed creatures into the game

**Owner, 2026-10-01:** "You can go ahead and induct all of these into the game once the art council apporves them, that way we can evaluate density etc".
**Authority:** DEC-071 (the PM makes the fauna as eight-way stills), DEC-072 with its amendment (frames: smallest 48-multiple box within 96x96; height anchors), DEC-056 (the PM chooses the art that goes in game), DEC-062/DEC-069 (council), `art/COUNCIL_RECORD.md` ART-COUNCIL-14/15.
**Writer:** claude. **Reviewer:** grok (launched through `tools/ops/launch_worker.ps1`; the review commit must be authored `deus-grok`, AUDIT_LOG A12).

## Scope (12 species, the ones that passed ART-COUNCIL-14/15)

wolf, fox, boar, hare, fowl (hen), hawk, songbird, bat, giant_spider passed 4 of 4. wild_sheep, rat and restless_dead passed after the YES WITH FIX corrections, applied by tooling (Grok's words; DEC-069 item 2). Everything else waits for its own vote (ART-COUNCIL-16 and the redraws).

## What the lane does

1. For each species, an RMMZ single-character sheet `game/img/characters/$DEUS_Creature_<Name>.png`: 3 columns x 4 rows (down S, left W, right E, up N); the still frame fills all three walk columns (no animation, DEC-071); frame = the smallest 48-multiple box up to 96x96 that holds the largest facing; each facing bottom-aligned and centred.
2. `game/data/UF_WorldCatalog.json` wildlife records: `image` -> the new sheet; remove `tint` (it only told stock reuses apart). Text edits scoped to each record; no reformatting.
3. Masters: the eight rotations of each species under `art/fauna/<species>/` with a `source.json` (PixelLab character id, tool and mode, size, fix applied if any).
4. `art/APPROVALS.md`: one "PM YEA (DEC-056)" row per species with the council result.
5. `art/catalogue/**`: rebuild with `tools/art/build_catalogue.js` (the 12 rows now point at original art).
6. `tools/art/test_fauna_induction.js`: checks that can fail (sheet exists; 3x4 grid of equal frames, each a 48-multiple <= 96; the three columns of a row are identical; something opaque in every frame; the catalog record points at the sheet and has no tint; the master folder has eight rotations), with named mutants that turn each check red.
7. `docs/systems/DEUS_Wildlife.md`: a short note on the new sheets.

## Evidence

All four gates in fresh clones; the mutants; the in-game wildlife suite on a snapshot copy (`node tools/add_test_plugin.js <copy>/js/plugins.js`, `node tools/run_tests.js --game <copy>`) with the `test_herd` screenshot opened and described; `git diff --check`.

## Not in scope

No code change (the wildlife tint check already expects white when a species has no tint, `game/js/plugins/DEUS_Wildlife.js:1753`). No spawner work (DEC-073 lanes). No female variants or new bestiary creatures (they have no catalog spawn entries yet).

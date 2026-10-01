# Fauna generation and induction scripts (DEC-071, DEC-072; ART.FAUNA.01)

The PM made the fauna with these (2026-10-01). The Owner generates all art except what he hands over; DEC-071 hands the fauna to the PM
(PixelLab Create Character, eight rotations, high top-down, no animation). Run from this folder; they write working data next to
themselves (git-ignored: chars/, sheets/, u7/, rmmz/, ids.txt, genlog.jsonl). `.pixellab_token` is read from the repo root (never commit it).

| Step | Script |
|---|---|
| Describe a batch | `fauna_jobs*.js`, `regen*_jobs.js`, `bestiary_*.js`, `smush_jobs.js` (each exports `[{tag, args}]`; `args` is the create_character call) |
| Launch and collect, ten at a time | `run_batches.js <jobs.js> <creditFloorUSD>` (waits for PixelLab's 20-job limit); `launch.js`, `launch2.js` launch only; `collect_all.js` collects any finished jobs; `fetch_char.js tag=id ...` |
| Resize small creatures (draw at 2x, halve) | `halve.js <tag> <outTag>` (2x2 majority) |
| Inspect | `measure.js`, `board.js`, `lineup.js` (true-scale lineup), `card.js`, `council_board.js` (RMMZ example, U7 example, ours), `peek.js`, `row.js` |
| Examples | `rmmz_ex.js` (RMMZ stock creature block per species), `u7style.js` (U7 sprite, background keyed) |
| Owner deletions = rejections | `sync_deleted.js` (run before every packet and placement) |
| Corrections by tooling | `fix14.js` (ART-COUNCIL-14/15 YES WITH FIX) |
| Induct | `build_sheet.js` (RMMZ sheet), `induct.js <worktree>`, `induct_docs.js <worktree>`; gate `tools/art/test_fauna_induction.js` |

`art/fauna/GENLOG.jsonl` is the generation log (one line per PixelLab job). Size rules: DEC-072 (everything within 96x96; humanoids at
most 48 wide so they clear 48x96 doors; height anchors human 72, dwarf 60, gnome and halfling 48, large races 96).

# NAT.07.01 lane-ex report (writer claude, 2026-10-01)

Branch `task/lane-ex`, base 125b8b0a. Not pushed, not merged. Reviewer: gemini.

## What changed
- `docs/design/bestiary/BESTIARY_grok_heavy.md`: verbatim copy of the adopted source (sha256 `c6f9d418...e740914`, 46,217 B; matches the registry pin).
- `docs/design/bestiary/SOURCE.json`: pin record for that copy (hash, origin, which lines are inputs, the "Emrys" note).
- `tools/bestiary/build_bestiary.js`: NEW builder; reads the 317 source rows, srd51 (name, CR) and the live `species_map.js` (bodies[]); refuses on a hash mismatch, malformed row, duplicate or missing id, tier/CR disagreement or EXCLUDE inconsistency; `--check` compares with a fresh build (CRLF folded).
- `game/data/srd_adaptation/creatures.json`: generated; 317 rows (MONSTER 164, WILDLIFE 91, PEOPLE 21, SUMMON-ONLY 28, EXCLUDE 13), metadata with tier bands, placement rules, counts, occupancy and the CC-BY-4.0 attribution from srd51. No "Emrys" in it.
- `tools/test_bestiary_adaptation.js`: NEW; 12 named checks with an independent source parser, plus a 12-mutant sweep run on temp copies (default run; `--no-mutants` and `--mutant <name>` options).
- `docs/systems/DEUS_Bestiary.md`: system doc (CC-BY-4.0 note, schema, tier bands, placement rules, section A/B differences, open questions, checks, how to change it).
- `tasks/NAT.07.01/lane-ex/EVIDENCE.md`, `REPORT.md`: evidence and this report.

## How I tested it
- `node tools/bestiary/build_bestiary.js` then `--check` in the worktree.
- `node tools/test_bestiary_adaptation.js` in the worktree (checks plus sweep).
- New test run against a `git archive 125b8b0a` export with only the test file added (before state).
- Fresh `git clone --branch task/lane-ex` at 4e46d235 (files checked out CRLF, `git ls-files --eol` shows `w/crlf`), all three gate commands.
- Each mutant run singly with `--mutant <name>` to capture the rerun's full output.
- One extra harness check: a copy of the test with the `tier_shift` mutant made a no-op reports `FAIL ::mutant_tier_shift_killed: test exit 0, want 1`, so the sweep can report a surviving mutant.

## Evidence
- No screenshots: the brief requires no F5 evidence, and this lane changes nothing the game loads.
- Full logs: `tasks/NAT.07.01/lane-ex/EVIDENCE.md`. Excerpts:

```
(base 125b8b0a + new test)  FAIL x11 ... PASS ::srd51_untouched ... exit 1
(fresh clone, 4e46d235)     node tools/check_deus_syntax.js        Checked 62 DEUS plugin files. Errors: 0   exit 0
                            node tools/test_bestiary_adaptation.js 12 PASS, 12 mutants killed             exit 0
                            node tools/bestiary/build_bestiary.js --check  ...is up to date              exit 0
dup_plus_omit:  PASS ::row_count_317
                FAIL ::source_output_bijection: 2 problem(s); output has 2 rows for srd:creature:cloud-giant; source srd:creature:ogre-zombie has no output row
srd51_edit:     FAIL ::srd51_untouched: 1 problem(s); game/data/srd51/creatures.json hashes to 50328a56dd5d, pinned f667d8672843
tier_shift:     FAIL ::tier_from_cr: 1 problem(s); srd:creature:basilisk tier T3, CR 3 gives T2
drop_row:       FAIL ::row_count_317: output has 316 rows; FAIL ::source_output_bijection: source srd:creature:veteran has no output row
bad_cell:       FAIL ::cells_valid: srd:creature:aboleth has a bad cell {"family":"WET","band":"Midlands"} ...
hand_edit:      FAIL ::build_reproducible ...; build_bestiary --check under mutant hand_edit: exit 1
verbatim_notes: FAIL ::no_old_world_name: 4 problem(s); creatures.json.entries[18].note: Mesoamerican feathered serpent, not Emrys; ...
```

## Not done / known problems
- **The before-state failures are missing-file failures.** At the base, the source copy, builder and output do not exist yet, so the 11 checks fail on "missing ...". The mutants are what show each check catching a wrong value (G02: a missing-file failure alone proves no behaviour).
- **`srd51_untouched` pins hashes of all 7 srd51 files and all 15 srd5_1 files in the test file.** A deliberate srd51 change later, for example a DEC-053 item 3 verification mark followed by a catalogue rebuild, will turn this guard red on main until that change re-pins `UPSTREAM_PINS`. That lane would need `tools/test_bestiary_adaptation.js` in its allowedPaths. I chose a strict guard over a loose one; the reviewer or PM may prefer to pin `creatures.json` only.
- **"Emrys" in source notes:** the brief says five places. Four are row notes (couatl, half-red-dragon-veteran, androsphinx, gynosphinx) and are written "Emerys" in the output. The fifth is recommendation C2 (line 361), which is not a row, so it never reaches the output.
- **Placement rules are my reading of the source labels:**
  - SUMMON-ONLY gives `summon`;
  - frequency `lair` gives `lair`;
  - EXCLUDE gives `none`;
  - everything else gives `seeded`.
  
  I added no densities and no weights. Three things are recorded as open in DEUS_Bestiary.md and not changed:
  - PEOPLE rows (21) read `seeded`, though civilization stays frozen;
  - the Sky line (69 rows) conflicts with D4's "no Sky spawns";
  - the four elementals read `seeded`, though D4 makes them feature-summoned only.
- **Tier bands:** taken from DESIGN-D4 section 4 (a braintrust file outside the repo, `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D4_merged_minimax_m3.md`). All 317 source tiers agree with them.
- `docs/STATUS.md` was not updated and no claim line was added: it is outside this lane's allowedPaths.
- DEC-053 item 3 per-record verification (`mark_verified.js`) was not done. The brief excludes re-auditing upstream SRD content.
- Not pushed and not merged, per the launch rules. Gemini review not yet run.

## Try it in RMMZ
Nothing to try in RMMZ: no plugin loads `game/data/srd_adaptation/creatures.json` yet (runtime spawning is NAT.07.04/05). To check the lane:
1. `node tools/bestiary/build_bestiary.js --check`
2. `node tools/test_bestiary_adaptation.js`

Expected: exit 0 for both, `12 PASS` checks and `12` killed mutants.

## Decisions needed
- PM: keep the strict all-files `srd51_untouched` pin, or narrow it to `game/data/srd51/creatures.json`? See "Not done / known problems".
- Owner and PM (already open, not gating): the 13 EXCLUDE rows and the Sky-only solar, against DEC-053 item 1. Any answer arrives as a new pinned source and a rebuild.
- Spawner lane (NAT.07.04/05 or lane-fd): how PEOPLE rows, the Sky line and elementals are treated. The source and D4 disagree on the last two.

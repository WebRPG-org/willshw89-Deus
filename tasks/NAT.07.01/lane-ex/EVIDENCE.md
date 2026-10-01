# NAT.07.01 lane-ex evidence (2026-10-01)

Writer claude. All output below is copied from real runs on 2026-10-01 (Windows 11, Node v24.19.0); temp paths are replaced with a placeholder.
Code commit under test: 4e46d235 (`task/lane-ex`). Lane base: 125b8b0a (main after `task/lane-cu` merged at b21cfe62).

## Preconditions seen on main at the base

- `task/lane-cu` merged: `b21cfe62 Merge task/lane-cu at c822aee9... via merge_gate`.
- PKG-07 `"status": "UNLOCKED"`, unlocked 2026-10-01 by the PM (`tasks/wbs_registry.json`); NAT.07.01 carries the seeded-adaptation scope.
- Source pin in the registry: `tasks.NAT.07.01.source.sha256 = c6f9d418...e740914`. `sha256sum` of `C:/Users/snewt/.deus_pm/braintrust/2026-09-30/BESTIARY_grok_heavy.md` at dispatch: `c6f9d41853f29ecd83b4ffa5cbd26b17d6a1e67f3445bfde29b843c41e740914`, 46,217 bytes. They match, so the lane went ahead. The copy in `docs/design/bestiary/` hashes the same.

## Facts the build found in the source (not inputs, recorded in docs/systems/DEUS_Bestiary.md)

- Occupancy counted from the 317 rows against section A: one cell differs, `COLD/Deep Earth T1: A says 2, rows give 3`. Every other cell of A matches.
- Section B against the live `species_map.js`: 4 of 23 species differ (fowl, wildcat, sand_stalker, ice_wraith).
- Tier bands: every one of the 317 source tiers equals the DESIGN-D4 section 4 band of its srd51 CR (the builder refuses on any disagreement and wrote the file).

## 1. Before: lane base 125b8b0a with only the new test file added

```
test_bestiary_adaptation: root <export of 125b8b0a + new test file>
FAIL ::source_pinned: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::row_count_317: 1 problem(s); missing game/data/srd_adaptation/creatures.json
FAIL ::source_output_bijection: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::tier_from_cr: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::cells_valid: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::exclude_empty: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::occupancy_matches_source: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::placement_rules: 1 problem(s); missing docs/design/bestiary/BESTIARY_grok_heavy.md
FAIL ::bodies_consistent: 1 problem(s); missing game/data/srd_adaptation/creatures.json
FAIL ::build_reproducible: 1 problem(s); missing tools/bestiary/build_bestiary.js
PASS ::srd51_untouched
FAIL ::no_old_world_name: 1 problem(s); missing game/data/srd_adaptation/creatures.json
mutant sweep skipped: the checks must pass on the real files first
test_bestiary_adaptation: FAILED
exit 1
Error: Cannot find module '<export>\tools\bestiary\build_bestiary.js'
build_bestiary --check exit 1
```

Every named check FAILs at the base except the guard `srd51_untouched`, which PASSes before and after. These base failures are missing-file failures; the mutants in section 3 are what show each check catching a wrong value.

## 2. Fresh clone of task/lane-ex at 4e46d235 (core.autocrlf=true: files check out CRLF), gate commands
```
4e46d235
i/lf    w/crlf  attr/                 	docs/design/bestiary/BESTIARY_grok_heavy.md
i/lf    w/crlf  attr/                 	game/data/srd51/creatures.json
i/lf    w/crlf  attr/                 	game/data/srd_adaptation/creatures.json
$ node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
exit 0
$ node tools/test_bestiary_adaptation.js
test_bestiary_adaptation: root <fresh clone>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
PASS ::bodies_consistent
PASS ::build_reproducible
PASS ::srd51_untouched
PASS ::no_old_world_name
PASS ::mutant_dup_plus_omit_killed (exit 1; red: source_output_bijection, occupancy_matches_source, build_reproducible)
PASS ::mutant_srd51_edit_killed (exit 1; red: srd51_untouched)
PASS ::mutant_tier_shift_killed (exit 1; red: tier_from_cr, occupancy_matches_source, build_reproducible)
PASS ::mutant_drop_row_killed (exit 1; red: row_count_317, source_output_bijection, occupancy_matches_source, build_reproducible)
PASS ::mutant_bad_cell_killed (exit 1; red: cells_valid, occupancy_matches_source, build_reproducible)
PASS ::mutant_hand_edit_killed (exit 1; red: build_reproducible)
PASS ::mutant_verbatim_notes_killed (exit 1; red: no_old_world_name)
PASS ::mutant_exclude_given_cell_killed (exit 1; red: cells_valid, exclude_empty, occupancy_matches_source, build_reproducible)
PASS ::mutant_occupancy_count_killed (exit 1; red: occupancy_matches_source, build_reproducible)
PASS ::mutant_placement_swap_killed (exit 1; red: placement_rules, build_reproducible)
PASS ::mutant_body_moved_killed (exit 1; red: bodies_consistent, build_reproducible)
PASS ::mutant_source_byte_killed (exit 1; red: source_pinned, build_reproducible)
test_bestiary_adaptation: all checks passed
exit 0
$ node tools/bestiary/build_bestiary.js --check
build_bestiary --check: game/data/srd_adaptation/creatures.json is up to date
exit 0
```

## 3. Each mutant's full rerun (node tools/test_bestiary_adaptation.js --mutant <name>)

### dup_plus_omit
```
--- rerun under mutant dup_plus_omit, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
FAIL ::source_output_bijection: 2 problem(s); output has 2 rows for srd:creature:cloud-giant; source srd:creature:ogre-zombie has no output row
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
FAIL ::occupancy_matches_source: 7 problem(s); WET/Lowlands T1: output rows give 35, source rows give 36; TEMPERATE/Uplands T1: output rows give 23, source rows give 24; TEMPERATE/Highlands T3: output rows give 6, source rows give 5; ...
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_dup_plus_omit_killed (exit 1; red: source_output_bijection, occupancy_matches_source, build_reproducible)
```

### srd51_edit
```
--- rerun under mutant srd51_edit, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
PASS ::bodies_consistent
PASS ::build_reproducible
FAIL ::srd51_untouched: 1 problem(s); game/data/srd51/creatures.json hashes to 50328a56dd5d, pinned f667d8672843
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_srd51_edit_killed (exit 1; red: srd51_untouched)
```

### tier_shift
```
--- rerun under mutant tier_shift, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
FAIL ::tier_from_cr: 1 problem(s); srd:creature:basilisk tier T3, CR 3 gives T2
PASS ::cells_valid
PASS ::exclude_empty
FAIL ::occupancy_matches_source: 6 problem(s); ARID/Caverns T2: output rows give 10, source rows give 11; ARID/Caverns T3: output rows give 4, source rows give 3; ARID/Lowlands T2: output rows give 16, source rows give 17; ...
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_tier_shift_killed (exit 1; red: tier_from_cr, occupancy_matches_source, build_reproducible)
```

### drop_row
```
--- rerun under mutant drop_row, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
FAIL ::row_count_317: 1 problem(s); output has 316 rows
FAIL ::source_output_bijection: 1 problem(s); source srd:creature:veteran has no output row
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
FAIL ::occupancy_matches_source: 8 problem(s); VOLCANIC/Lowlands T2: output rows give 8, source rows give 9; WET/Lowlands T2: output rows give 12, source rows give 13; ARID/Lowlands T2: output rows give 16, source rows give 17; ...
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_drop_row_killed (exit 1; red: row_count_317, source_output_bijection, occupancy_matches_source, build_reproducible)
```

### bad_cell
```
--- rerun under mutant bad_cell, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
FAIL ::cells_valid: 2 problem(s); srd:creature:aboleth has a bad cell {"family":"WET","band":"Midlands"}; srd:creature:aboleth cells WET/Midlands,WET/Caverns differ from source WET/Deep Earth,WET/Caverns
PASS ::exclude_empty
FAIL ::occupancy_matches_source: 1 problem(s); WET/Deep Earth T3: output rows give 1, source rows give 2
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_bad_cell_killed (exit 1; red: cells_valid, occupancy_matches_source, build_reproducible)
```

### hand_edit
```
--- rerun under mutant hand_edit, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
build_bestiary --check under mutant hand_edit: exit 1; build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::mutant_hand_edit_killed (exit 1; red: build_reproducible)
```

### verbatim_notes
```
--- rerun under mutant verbatim_notes, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
PASS ::bodies_consistent
PASS ::build_reproducible
PASS ::srd51_untouched
FAIL ::no_old_world_name: 4 problem(s); creatures.json.entries[18].note: Mesoamerican feathered serpent, not Emrys; creatures.json.entries[122].note: D&D dragon-blood hybrid, no Emrys caste; creatures.json.entries[183].note: Egyptian riddling sphinx, not Emrys; ...
test_bestiary_adaptation: FAILED
---
PASS ::mutant_verbatim_notes_killed (exit 1; red: no_old_world_name)
```

### exclude_given_cell
```
--- rerun under mutant exclude_given_cell, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
FAIL ::cells_valid: 1 problem(s); srd:creature:couatl cells +Sky differ from source 
FAIL ::exclude_empty: 1 problem(s); EXCLUDE row srd:creature:couatl has a cell
FAIL ::occupancy_matches_source: 1 problem(s); Sky T2: output rows give 10, source rows give 9
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_exclude_given_cell_killed (exit 1; red: cells_valid, exclude_empty, occupancy_matches_source, build_reproducible)
```

### occupancy_count
```
--- rerun under mutant occupancy_count, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
FAIL ::occupancy_matches_source: 1 problem(s); COLD/Deep Earth T1: metadata.occupancy says 2, source rows give 3
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_occupancy_count_killed (exit 1; red: occupancy_matches_source, build_reproducible)
```

### placement_swap
```
--- rerun under mutant placement_swap, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
FAIL ::placement_rules: 1 problem(s); srd:creature:deva placement seeded, role SUMMON-ONLY with frequency rare gives summon
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_placement_swap_killed (exit 1; red: placement_rules, build_reproducible)
```

### body_moved
```
--- rerun under mutant body_moved, exit 1 ---
test_bestiary_adaptation: root <temp copy>
PASS ::source_pinned
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
FAIL ::bodies_consistent: 1 problem(s); srd:creature:cat body wildcat, species_map maps it to srd:creature:panther
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary --check: game/data/srd_adaptation/creatures.json differs from a fresh build
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_body_moved_killed (exit 1; red: bodies_consistent, build_reproducible)
```

### source_byte
```
--- rerun under mutant source_byte, exit 1 ---
test_bestiary_adaptation: root <temp copy>
FAIL ::source_pinned: 1 problem(s); source copy hashes to de165ed44b62f4361799051835af905393024cfc8977bd28daa38df73e5ee92e, SOURCE.json pins c6f9d41853f29ecd83b4ffa5cbd26b17d6a1e67f3445bfde29b843c41e740914
PASS ::row_count_317
PASS ::source_output_bijection
PASS ::tier_from_cr
PASS ::cells_valid
PASS ::exclude_empty
PASS ::occupancy_matches_source
PASS ::placement_rules
PASS ::bodies_consistent
FAIL ::build_reproducible: 1 problem(s); build_bestiary --check exit 1: build_bestiary: docs/design/bestiary/BESTIARY_grok_heavy.md hashes to de165ed44b62f4361799051835af905393024cfc8977bd28daa38df73e5ee92e, not the pinned c6f9d41853f29ecd83b4ffa5cbd26b17d6a1e67f3445bfde29b843c41e740914; stop and ask the PM
PASS ::srd51_untouched
PASS ::no_old_world_name
test_bestiary_adaptation: FAILED
---
PASS ::mutant_source_byte_killed (exit 1; red: source_pinned, build_reproducible)
```

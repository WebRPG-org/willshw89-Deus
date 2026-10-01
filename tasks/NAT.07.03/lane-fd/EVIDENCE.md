# NAT.07.03 lane-fd evidence (writer claude, 2026-10-01)

Base `839fb6e3` (main at the wave-2 launch, holds the lane-ex merge 02496b6c). Code tip `3221d2b7` (`3221d2b774d889824db502d7d1a485915b616dc0`). Logs below are copied from the real runs, trimmed only where marked. Long FAIL lines are cut at 200 characters.

## 1. Gate commands at the base (839fb6e3, worktree)

```
$ node tools/test_encounter_tables.js        -> exit 1
node:internal/modules/cjs/loader:1520
  throw err;
  ^

Error: Cannot find module 'C:\Users\snewt\.deus_worktrees\lane-fd\tools\test_encounter_tables.js'
$ node tools/test_bestiary_adaptation.js     -> exit 0
PASS ::mutant_source_byte_killed (exit 1; red: source_pinned, build_reproducible)
test_bestiary_adaptation: all checks passed
$ node tools/check_deus_syntax.js            -> exit 0
Checked 62 DEUS plugin files. Errors: 0
```

## 2. FAIL before: the tip's test against the base tree

`git archive 839fb6e3 game/data/srd_adaptation game/js/sim tools/test_bestiary_adaptation.js` into a temp folder, then `node tools/test_encounter_tables.js --root <that folder>`: exit 1.

```
test_encounter_tables: root C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b
FAIL ::tier_ceiling: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b\game\data\
FAIL ::no_summon_exclude_people: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9
FAIL ::lairs_only_in_lair_tables: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc
FAIL ::elementals_feature_only: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b
FAIL ::t0_nonempty: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b\game\data\e
FAIL ::sky_tables_marked_unused_v1: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4
FAIL ::pick_deterministic: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b\game
FAIL ::weights_from_data: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b\game\
FAIL ::module_syntax: weights file missing or unreadable (game/data/ecology/encounter_weights.json): ENOENT: no such file or directory, open 'C:\Users\snewt\AppData\Local\Temp\tmp.ePvXJ4bc9b\game\data
mutant sweep skipped: the checks must pass on the real files first
test_encounter_tables: FAILED
```

## 3. Gate commands at the tip, fresh clone

`git clone --no-hardlinks` of the worktree into a temp folder, checkout `3221d2b7`. core.autocrlf is true there: `file` reports encounters.js "with CRLF line terminators".

```
$ node tools/test_encounter_tables.js        -> exit 0
test_encounter_tables: root C:\Users\snewt\AppData\Local\Temp\tmp.MRiVJ4S3h6\repo
PASS ::tier_ceiling
PASS ::no_summon_exclude_people
PASS ::lairs_only_in_lair_tables
PASS ::elementals_feature_only
PASS ::t0_nonempty
PASS ::sky_tables_marked_unused_v1
PASS ::pick_deterministic
PASS ::weights_from_data
PASS ::module_syntax
PASS ::mutant_tier_plus_one_killed (exit 1; red: tier_ceiling, weights_from_data)
PASS ::mutant_summon_leak_killed (exit 1; red: no_summon_exclude_people, weights_from_data)
PASS ::mutant_lair_wanders_killed (exit 1; red: lairs_only_in_lair_tables, weights_from_data)
PASS ::mutant_elementals_rolled_killed (exit 1; red: elementals_feature_only)
PASS ::mutant_t0_dropped_killed (exit 1; red: t0_nonempty, weights_from_data)
PASS ::mutant_sky_live_killed (exit 1; red: sky_tables_marked_unused_v1)
PASS ::mutant_pick_random_killed (exit 1; red: pick_deterministic)
PASS ::mutant_weights_hardcoded_killed (exit 1; red: weights_from_data)
PASS ::mutant_syntax_break_killed (exit 1; red: tier_ceiling, no_summon_exclude_people, lairs_only_in_lair_tables, elementals_feature_only, t0_nonempty, sky_tables_marked_unused_v1, pick_deterministic
test_encounter_tables: all checks passed
$ node tools/test_bestiary_adaptation.js     -> exit 0
test_bestiary_adaptation: all checks passed
(24 PASS lines, 0 FAIL lines)
$ node tools/check_deus_syntax.js            -> exit 0
Checked 62 DEUS plugin files. Errors: 0
```

## 4. The brief's mutants, run singly (`--mutant <name>`)

In each block the first nine PASS lines are the checks on the real files; the block between `--- rerun ...` and `---` is the rerun on the mutated copy; the last two lines are the sweep's verdict and the run's result. The "all checks passed" line means the mutant was killed.

### tier_plus_one

```
PASS ::tier_ceiling
PASS ::no_summon_exclude_people
PASS ::lairs_only_in_lair_tables
PASS ::elementals_feature_only
PASS ::t0_nonempty
PASS ::sky_tables_marked_unused_v1
PASS ::pick_deterministic
PASS ::weights_from_data
PASS ::module_syntax
--- rerun under mutant tier_plus_one, exit 1 ---
FAIL ::tier_ceiling: 613 problem(s); VOLCANIC/Deep Earth|T0|wander: srd:creature:azer is T1, above the table's ceiling; VOLCANIC/Deep Earth|T0|wander: srd:creature:magma-mephit is T1, above the table'
PASS ::no_summon_exclude_people
PASS ::lairs_only_in_lair_tables
PASS ::elementals_feature_only
PASS ::t0_nonempty
PASS ::sky_tables_marked_unused_v1
PASS ::pick_deterministic
FAIL ::weights_from_data: 510 problem(s); shipped weights: VOLCANIC/Deep Earth|T0|wander has 4 entries, oracle 1 (or weights/order differ); shipped weights: VOLCANIC/Deep Earth|T1|wander has 6 entries
PASS ::module_syntax
test_encounter_tables: FAILED
---
PASS ::mutant_tier_plus_one_killed (exit 1; red: tier_ceiling, weights_from_data)
test_encounter_tables: all checks passed
```

### summon_leak

```
PASS ::tier_ceiling
PASS ::no_summon_exclude_people
PASS ::lairs_only_in_lair_tables
PASS ::elementals_feature_only
PASS ::t0_nonempty
PASS ::sky_tables_marked_unused_v1
PASS ::pick_deterministic
PASS ::weights_from_data
PASS ::module_syntax
--- rerun under mutant summon_leak, exit 1 ---
PASS ::tier_ceiling
FAIL ::no_summon_exclude_people: 142 problem(s); VOLCANIC/Deep Earth|T0|wander: srd:creature:lemure (SUMMON-ONLY, summon); VOLCANIC/Deep Earth|T1|wander: srd:creature:lemure (SUMMON-ONLY, summon); VOL
PASS ::lairs_only_in_lair_tables
PASS ::elementals_feature_only
PASS ::t0_nonempty
PASS ::sky_tables_marked_unused_v1
PASS ::pick_deterministic
FAIL ::weights_from_data: 126 problem(s); shipped weights: VOLCANIC/Deep Earth|T0|wander has 2 entries, oracle 1 (or weights/order differ); shipped weights: VOLCANIC/Deep Earth|T1|wander has 5 entries
PASS ::module_syntax
test_encounter_tables: FAILED
---
PASS ::mutant_summon_leak_killed (exit 1; red: no_summon_exclude_people, weights_from_data)
test_encounter_tables: all checks passed
```

## 5. The sweep can report a surviving mutant

A temp copy of the test with the `tier_plus_one` patch made a no-op (`const ceiling = t;` replaced by itself), run with `--root . --mutant tier_plus_one`: exit 1.

```
FAIL ::mutant_tier_plus_one_killed: test exit 0, want 1
test_encounter_tables: FAILED
```
